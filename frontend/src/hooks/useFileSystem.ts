import { useFileSystemStore } from '@/stores/fileSystemStore';
import type { FolderId, FileId } from '@/types';

/**
 * Convenience hook for common file-system operations,
 * exposing a stable API that components can depend on
 * without importing store internals directly.
 */
export function useFileSystem() {
  const folders = useFileSystemStore((s) => s.folders);
  const files = useFileSystemStore((s) => s.files);
  const addFolder = useFileSystemStore((s) => s.addFolder);
  const updateFolder = useFileSystemStore((s) => s.updateFolder);
  const deleteFolder = useFileSystemStore((s) => s.deleteFolder);
  const addFile = useFileSystemStore((s) => s.addFile);
  const updateFile = useFileSystemStore((s) => s.updateFile);
  const deleteFile = useFileSystemStore((s) => s.deleteFile);

  const getFilesForFolder = (folderId: FolderId) =>
    files.filter((f) => f.folderId === folderId);

  const getFileById = (fileId: FileId) =>
    files.find((f) => f.id === fileId) ?? null;

  return {
    folders,
    files,
    addFolder,
    updateFolder,
    deleteFolder,
    addFile,
    updateFile,
    deleteFile,
    getFilesForFolder,
    getFileById,
  };
}
