/**
 * fileSystemStore — canonical source of truth for all folders and files.
 * Persists to localStorage so data survives page refreshes.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Folder, FileItem, FolderId, FileId, DropZone } from '@/types';

interface FileSystemState {
  folders: Folder[];
  files: FileItem[];

  // Folder mutations
  addFolder: (folder: Folder) => void;
  updateFolder: (id: FolderId, patch: Partial<Omit<Folder, 'id'>>) => void;
  deleteFolder: (id: FolderId) => void;
  setFolders: (folders: Folder[]) => void;
  moveFolder: (dragId: FolderId, targetId: FolderId, zone: DropZone) => void;

  // File mutations
  addFile: (file: FileItem) => void;
  updateFile: (id: FileId, patch: Partial<Omit<FileItem, 'id'>>) => void;
  deleteFile: (id: FileId) => void;
  setFiles: (files: FileItem[]) => void;
}

/** Recursively update a folder within the tree */
function updateFolderInTree(
  folders: Folder[],
  id: FolderId,
  patch: Partial<Omit<Folder, 'id'>>
): Folder[] {
  return folders.map((f) => {
    if (f.id === id) return { ...f, ...patch, updatedAt: new Date().toISOString() };
    if (f.subfolders.length > 0)
      return { ...f, subfolders: updateFolderInTree(f.subfolders, id, patch) };
    return f;
  });
}

/** Recursively delete a folder from the tree */
function deleteFolderFromTree(folders: Folder[], id: FolderId): Folder[] {
  return folders
    .filter((f) => f.id !== id)
    .map((f) => ({
      ...f,
      subfolders: deleteFolderFromTree(f.subfolders, id),
    }));
}

/** Find a folder by ID anywhere in the tree */
function findFolderById(folders: Folder[], id: FolderId): Folder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findFolderById(f.subfolders, id);
    if (found) return found;
  }
  return null;
}

/** Find the parent folder array and index of a folder by ID */
function findFolderLocation(
  folders: Folder[],
  id: FolderId,
  parent: Folder[] | null = null,
): { list: Folder[]; index: number; parent: Folder[] | null } | null {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === id) return { list: folders, index: i, parent };
    const found = findFolderLocation(folders[i].subfolders, id, folders[i].subfolders);
    if (found) return found;
  }
  return null;
}

/** Insert a folder into a list at a given index */
function insertAt(list: Folder[], folder: Folder, index: number): Folder[] {
  const copy = [...list];
  copy.splice(index, 0, folder);
  return copy;
}

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      folders: [],
      files: [],

      setFolders: (folders) => set({ folders }),
      setFiles: (files) => set({ files }),

      addFolder: (folder) =>
        set((state) => {
          if (!folder.parentId) {
            return { folders: [...state.folders, folder] };
          }
          return {
            folders: updateFolderInTree(state.folders, folder.parentId, {
              subfolders: [
                ...(findFolderById(state.folders, folder.parentId)?.subfolders ?? []),
                folder,
              ],
            } as Partial<Folder>),
          };
        }),

      updateFolder: (id, patch) =>
        set((state) => ({
          folders: updateFolderInTree(state.folders, id, patch),
        })),

      deleteFolder: (id) =>
        set((state) => ({
          folders: deleteFolderFromTree(state.folders, id),
          // Also remove files in the deleted folder
          files: state.files.filter((f) => f.folderId !== id),
        })),

      moveFolder: (dragId, targetId, zone) => {
        if (!zone || dragId === targetId) return;
        const { folders } = get();

        const draggedFolder = findFolderById(folders, dragId);
        if (!draggedFolder) return;

        // Remove drag item from tree
        const withoutDragged = deleteFolderFromTree(folders, dragId);

        if (zone === 'inside') {
          // Nest draggedFolder as the last child of targetId
          set({
            folders: updateFolderInTree(withoutDragged, targetId, {
              subfolders: [
                ...(findFolderById(withoutDragged, targetId)?.subfolders ?? []),
                { ...draggedFolder, parentId: targetId },
              ],
            } as Partial<Folder>),
          });
          return;
        }

        // 'before' or 'after': insert as sibling of target
        const targetLoc = findFolderLocation(withoutDragged, targetId);
        if (!targetLoc) return;

        const insertIndex =
          zone === 'before' ? targetLoc.index : targetLoc.index + 1;
        const newFolder = {
          ...draggedFolder,
          parentId: findFolderById(withoutDragged, targetId)?.parentId ?? null,
        };

        const newList = insertAt(targetLoc.list, newFolder, insertIndex);

        if (targetLoc.parent === null) {
          // Target is at root level
          set({ folders: newList });
        } else {
          // Rebuild the parent's subfolders in the tree
          const newFolders = (function rebuild(list: Folder[]): Folder[] {
            return list.map((f) => {
              if (f.subfolders === targetLoc.list)
                return { ...f, subfolders: newList };
              return { ...f, subfolders: rebuild(f.subfolders) };
            });
          })(withoutDragged);
          set({ folders: newFolders });
        }
      },

      addFile: (file) =>
        set((state) => ({ files: [...state.files, file] })),

      updateFile: (id, patch) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? { ...f, ...patch, updatedAt: new Date().toISOString() }
              : f
          ),
        })),

      deleteFile: (id) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
        })),
    }),
    {
      name: 'shuknow-fs',
    }
  )
);
