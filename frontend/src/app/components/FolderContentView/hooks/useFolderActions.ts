import { useCallback } from "react";
import type { Folder } from "../../../../api/types";

interface UseFolderActionsProps {
  selectedFolderPath: string[] | null;
  updateFolder: (path: string[], updates: Partial<Folder>) => void;
}

export function useFolderActions({ selectedFolderPath, updateFolder }: UseFolderActionsProps) {
  // Handler for updating folder
  const handleUpdateFolder = useCallback((updates: Partial<Folder>) => {
    if (!selectedFolderPath || selectedFolderPath.length === 0) {
      console.warn('Cannot update folder: no folder path selected');
      return;
    }
    updateFolder(selectedFolderPath, updates);
  }, [updateFolder, selectedFolderPath]);

  return {
    handleUpdateFolder,
  };
}
