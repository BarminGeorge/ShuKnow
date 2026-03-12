import { useMemo } from "react";
import { useFileSystemStore } from "@/stores/fileSystemStore";
import { useUiStore } from "@/stores/uiStore";
import { FolderCard } from "./FolderCard";
import { FileCard } from "./FileCard";
import type { Folder, FileItem, FolderId, SortField, SortDir } from "@/types";

interface FolderContentGridProps {
  folderId: FolderId;
  sortField: SortField;
  sortDir: SortDir;
  viewMode: "grid" | "list";
}

function findFolderById(id: FolderId, list: Folder[]): Folder | null {
  for (const f of list) {
    if (f.id === id) return f;
    const found = findFolderById(id, f.subfolders);
    if (found) return found;
  }
  return null;
}

function sortFolders(items: Folder[], _field: SortField, dir: SortDir): Folder[] {
  return [...items].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name, "ru");
    return dir === "asc" ? cmp : -cmp;
  });
}

function sortFiles(items: FileItem[], field: SortField, dir: SortDir): FileItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (field === "date") {
      cmp = a.createdAt.localeCompare(b.createdAt);
    } else if (field === "type") {
      cmp = a.type.localeCompare(b.type);
    } else {
      cmp = a.name.localeCompare(b.name, "ru");
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export function FolderContentGrid({
  folderId,
  sortField,
  sortDir,
  viewMode,
}: FolderContentGridProps) {
  const folders = useFileSystemStore((s) => s.folders);
  const allFiles = useFileSystemStore((s) => s.files);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const rawSubfolders = useMemo(
    () => findFolderById(folderId, folders)?.subfolders ?? [],
    [folderId, folders],
  );

  const rawFiles = useMemo(
    () => allFiles.filter((f) => f.folderId === folderId),
    [folderId, allFiles],
  );

  const subfolders = useMemo(
    () => sortFolders(rawSubfolders, sortField, sortDir),
    [rawSubfolders, sortField, sortDir],
  );

  const files = useMemo(
    () => sortFiles(rawFiles, sortField, sortDir),
    [rawFiles, sortField, sortDir],
  );

  const isEmpty = subfolders.length === 0 && files.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-6xl mb-4 opacity-60">📂</span>
        <p className="text-base font-medium text-gray-400 mb-1">Папка пуста</p>
        <p className="text-sm text-gray-600">
          Создайте вложенную папку или добавьте файл
        </p>
      </div>
    );
  }

  const gridClass =
    viewMode === "grid"
      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      : "flex flex-col gap-2";

  return (
    <div className={gridClass}>
      {subfolders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onClick={() => setRightPanel({ type: "folder", folderId: folder.id })}
        />
      ))}
      {files.map((file) => (
        <FileCard key={file.id} file={file} onClick={() => {}} />
      ))}
    </div>
  );
}
