import { useState } from "react";
import { Folder as FolderIcon, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/app/components/ui/context-menu";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { useFileSystemStore } from "@/stores/fileSystemStore";
import { useUiStore } from "@/stores/uiStore";
import type { Folder } from "@/types";

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const files = useFileSystemStore((s) => s.files);
  const deleteFolder = useFileSystemStore((s) => s.deleteFolder);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const fileCount = files.filter((f) => f.folderId === folder.id).length;

  const handleEdit = () => {
    setRightPanel({ type: "folder", folderId: folder.id });
  };

  const handleConfirmDelete = () => {
    deleteFolder(folder.id);
    setDeleteOpen(false);
  };

  const iconContent = folder.iconImage ? (
    <img
      src={folder.iconImage}
      alt={folder.name}
      className="w-9 h-9 rounded-lg object-cover"
    />
  ) : folder.iconEmoji ? (
    <span className="text-2xl leading-none">{folder.iconEmoji}</span>
  ) : (
    <FolderIcon size={22} className="text-gray-400" />
  );

  const fileBadge =
    fileCount === 1
      ? "1 файл"
      : fileCount >= 2 && fileCount <= 4
        ? `${fileCount} файла`
        : fileCount > 0
          ? `${fileCount} файлов`
          : null;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }}
            className="bg-[#111111] border border-white/10 rounded-xl p-4 cursor-pointer
              hover:border-white/25 hover:bg-[#181818] transition-all select-none"
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 flex-shrink-0">
                {iconContent}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate leading-tight">
                  {folder.name}
                </p>
                {fileBadge && (
                  <span className="text-xs text-gray-500">{fileBadge}</span>
                )}
              </div>
            </div>

            {folder.description && (
              <p className="text-xs text-gray-500 line-clamp-1 leading-relaxed mt-1">
                {folder.description}
              </p>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="bg-[#1a1a1a] border-white/20 text-white min-w-[160px]">
          <ContextMenuItem
            className="text-gray-300 focus:bg-white/10 focus:text-white cursor-pointer gap-2"
            onClick={handleEdit}
          >
            <Pencil size={14} />
            Редактировать
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem
            variant="destructive"
            className="cursor-pointer gap-2"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={14} />
            Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <DeleteConfirmDialog
        isOpen={deleteOpen}
        title={`Удалить папку «${folder.name}»?`}
        description="Все вложенные папки и файлы будут удалены безвозвратно."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
