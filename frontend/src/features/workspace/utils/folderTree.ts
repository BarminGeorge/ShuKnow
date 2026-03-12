import type { Folder, DropZone } from "../model/types";

// ── Traversal ─────────────────────────────────────────────────────────────────

/** Recursively find a folder by its ID anywhere in the tree. */
export function findFolderById(id: string, tree: Folder[]): Folder | null {
  for (const folder of tree) {
    if (folder.id === id) return folder;
    if (folder.subfolders) {
      const found = findFolderById(id, folder.subfolders);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Return the full path of folder IDs from root down to the target ID.
 * Returns null if not found.
 */
export function getIdPath(
  id: string,
  tree: Folder[],
  current: string[] = [],
): string[] | null {
  for (const folder of tree) {
    const path = [...current, folder.id];
    if (folder.id === id) return path;
    if (folder.subfolders) {
      const found = getIdPath(id, folder.subfolders, path);
      if (found) return found;
    }
  }
  return null;
}

/** Resolve display names for each ID in an ID-based path (used for breadcrumbs). */
export function buildBreadcrumbNames(
  idPath: string[],
  tree: Folder[],
): string[] {
  const names: string[] = [];
  let current: Folder[] = tree;
  for (const id of idPath) {
    const match = current.find((f) => f.id === id);
    if (!match) break;
    names.push(match.name);
    current = match.subfolders ?? [];
  }
  return names;
}

// ── Immutable mutations ────────────────────────────────────────────────────────

/** Return a new tree with the folder matching `id` shallowly updated. */
export function updateFolderInTree(
  id: string,
  updates: Partial<Folder>,
  tree: Folder[],
): Folder[] {
  return tree.map((folder) => {
    if (folder.id === id) return { ...folder, ...updates };
    if (folder.subfolders) {
      return {
        ...folder,
        subfolders: updateFolderInTree(id, updates, folder.subfolders),
      };
    }
    return folder;
  });
}

/** Return a new tree with the folder matching `id` removed. */
export function deleteFolderFromTree(id: string, tree: Folder[]): Folder[] {
  return tree
    .filter((f) => f.id !== id)
    .map((folder) => {
      if (folder.subfolders) {
        return {
          ...folder,
          subfolders: deleteFolderFromTree(id, folder.subfolders),
        };
      }
      return folder;
    });
}

/** Return a new tree with `newFolder` appended as last child of `parentId` (root if null). */
export function insertFolderIntoTree(
  newFolder: Folder,
  parentId: string | null,
  tree: Folder[],
): Folder[] {
  if (parentId === null) return [...tree, newFolder];
  return tree.map((folder) => {
    if (folder.id === parentId) {
      return {
        ...folder,
        subfolders: [...(folder.subfolders ?? []), newFolder],
      };
    }
    if (folder.subfolders) {
      return {
        ...folder,
        subfolders: insertFolderIntoTree(newFolder, parentId, folder.subfolders),
      };
    }
    return folder;
  });
}

// ── Move ──────────────────────────────────────────────────────────────────────

function isDescendantOf(
  ancestorId: string,
  candidateId: string,
  tree: Folder[],
): boolean {
  const ancestor = findFolderById(ancestorId, tree);
  if (!ancestor?.subfolders) return false;
  for (const child of ancestor.subfolders) {
    if (child.id === candidateId) return true;
    if (isDescendantOf(child.id, candidateId, tree)) return true;
  }
  return false;
}

function extractFolder(
  id: string,
  tree: Folder[],
): [Folder | null, Folder[]] {
  let extracted: Folder | null = null;

  const filter = (items: Folder[]): Folder[] =>
    items.reduce<Folder[]>((acc, folder) => {
      if (folder.id === id) {
        extracted = folder;
        return acc;
      }
      if (folder.subfolders) {
        return [...acc, { ...folder, subfolders: filter(folder.subfolders) }];
      }
      return [...acc, folder];
    }, []);

  return [extracted, filter(tree)];
}

function insertRelativeTo(
  toInsert: Folder,
  targetId: string,
  zone: DropZone,
  tree: Folder[],
): Folder[] {
  const result: Folder[] = [];
  for (const folder of tree) {
    if (folder.id === targetId) {
      if (zone === "before") {
        result.push(toInsert, folder);
      } else if (zone === "after") {
        result.push(folder, toInsert);
      } else {
        // inside: prepend as first subfolder
        result.push({
          ...folder,
          subfolders: [toInsert, ...(folder.subfolders ?? [])],
        });
      }
    } else {
      result.push(
        folder.subfolders
          ? {
              ...folder,
              subfolders: insertRelativeTo(
                toInsert,
                targetId,
                zone,
                folder.subfolders,
              ),
            }
          : folder,
      );
    }
  }
  return result;
}

/**
 * Move the folder with `dragId` relative to `targetId` per `zone`.
 * Returns the original tree if the move is invalid
 * (same node, or dropping a folder into its own descendant).
 */
export function moveFolderInTree(
  dragId: string,
  targetId: string,
  zone: DropZone,
  tree: Folder[],
): Folder[] {
  if (dragId === targetId) return tree;
  // Prevent dropping a folder into its own subtree
  if (isDescendantOf(dragId, targetId, tree)) return tree;

  const [extracted, treeWithout] = extractFolder(dragId, tree);
  if (!extracted) return tree;

  return insertRelativeTo(extracted, targetId, zone, treeWithout);
}
