import { useState, useCallback, useMemo } from "react";

import type { Folder, DropZone } from "../model/types";
import {
  findFolderById,
  buildBreadcrumbNames,
  updateFolderInTree,
  deleteFolderFromTree,
  insertFolderIntoTree,
  moveFolderInTree,
} from "../utils/folderTree";

export interface UseFolderTreeResult {
  folders: Folder[];
  /** ID-based path from root to the currently selected folder. */
  selectedFolderPath: string[] | null;
  selectedFolder: Folder | null;
  selectedBreadcrumbs: string[];
  /** Navigate to any folder given its full ID path from root. */
  navigateToFolder: (idPath: string[]) => void;
  /** Navigate one level deeper into a subfolder of the current selection. */
  navigateToSubfolder: (subfolder: Folder) => void;
  /** Navigate back to the breadcrumb at the given index. */
  navigateBreadcrumb: (index: number) => void;
  clearFolderSelection: () => void;
  createFolder: (
    parentId: string | null,
    name: string,
    emoji: string,
    prompt: string,
  ) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (folderId: string) => void;
  moveFolder: (dragId: string, targetId: string, zone: DropZone) => void;
}

export function useFolderTree(
  initialFolders: Folder[],
): UseFolderTreeResult {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [selectedFolderPath, setSelectedFolderPath] = useState<
    string[] | null
  >(null);

  const selectedFolder = useMemo(
    () =>
      selectedFolderPath
        ? findFolderById(
            selectedFolderPath[selectedFolderPath.length - 1],
            folders,
          )
        : null,
    [selectedFolderPath, folders],
  );

  const selectedBreadcrumbs = useMemo(
    () =>
      selectedFolderPath
        ? buildBreadcrumbNames(selectedFolderPath, folders)
        : [],
    [selectedFolderPath, folders],
  );

  const navigateToFolder = useCallback((idPath: string[]) => {
    setSelectedFolderPath(idPath);
  }, []);

  const navigateToSubfolder = useCallback((subfolder: Folder) => {
    setSelectedFolderPath((prev) =>
      prev ? [...prev, subfolder.id] : [subfolder.id],
    );
  }, []);

  const navigateBreadcrumb = useCallback((index: number) => {
    setSelectedFolderPath((prev) =>
      prev ? prev.slice(0, index + 1) : null,
    );
  }, []);

  const clearFolderSelection = useCallback(() => {
    setSelectedFolderPath(null);
  }, []);

  const createFolder = useCallback(
    (
      parentId: string | null,
      name: string,
      emoji: string,
      prompt: string,
    ) => {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name,
        emoji,
        prompt,
      };
      setFolders((prev) => insertFolderIntoTree(newFolder, parentId, prev));
    },
    [],
  );

  const updateFolder = useCallback(
    (folderId: string, updates: Partial<Folder>) => {
      setFolders((prev) => updateFolderInTree(folderId, updates, prev));
    },
    [],
  );

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => deleteFolderFromTree(folderId, prev));
    // Clear selection if the deleted folder was selected or is an ancestor
    setSelectedFolderPath((prev) => {
      if (!prev || !prev.includes(folderId)) return prev;
      const idx = prev.indexOf(folderId);
      return idx === 0 ? null : prev.slice(0, idx);
    });
  }, []);

  const moveFolder = useCallback(
    (dragId: string, targetId: string, zone: DropZone) => {
      setFolders((prev) => moveFolderInTree(dragId, targetId, zone, prev));
    },
    [],
  );

  return {
    folders,
    selectedFolderPath,
    selectedFolder,
    selectedBreadcrumbs,
    navigateToFolder,
    navigateToSubfolder,
    navigateBreadcrumb,
    clearFolderSelection,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
  };
}
