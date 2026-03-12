import { useState, useCallback } from "react";

import type { FileItem } from "../model/types";

export interface UseFileManagerResult {
  files: FileItem[];
  createFile: (file: FileItem) => void;
  deleteFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
}

export function useFileManager(
  initialFiles: FileItem[],
): UseFileManagerResult {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);

  const createFile = useCallback((file: FileItem) => {
    setFiles((prev) => [...prev, file]);
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateFile = useCallback(
    (fileId: string, updates: Partial<FileItem>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  return { files, createFile, deleteFile, updateFile };
}
