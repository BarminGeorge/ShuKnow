import { useState } from "react";
import { FileText, Image as ImageIcon, File, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
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
import type { FileItem, FileType } from "@/types";

interface FileCardProps {
  file: FileItem;
  onClick: () => void;
}

const TYPE_LABEL: Record<FileType, string> = {
  markdown: "MD",
  text: "TXT",
  image: "Фото",
  other: "Файл",
};

function getFileIcon(type: FileType) {
  switch (type) {
    case "markdown":
      return <FileText size={22} className="text-emerald-400" />;
    case "text":
      return <FileText size={22} className="text-blue-400" />;
    case "image":
      return <ImageIcon size={22} className="text-violet-400" />;
    case "other":
      return <File size={22} className="text-gray-400" />;
  }
}

export function FileCard({ file, onClick }: FileCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteFile = useFileSystemStore((s) => s.deleteFile);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const handleOpen = () => {
    setRightPanel({ type: "file", fileId: file.id });
    onClick();
  };

  const handleConfirmDelete = () => {
    deleteFile(file.id);
    setDeleteOpen(false);
  };

  const dateStr = (() => {
    try {
      return format(new Date(file.createdAt), "d MMM yyyy", { locale: ru });
    } catch {
      return "";
    }
  })();

  const excerpt =
    file.type !== "image" && file.content
      ? file.content.replace(/#+\s/g, "").slice(0, 140)
      : null;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleOpen();
            }}
            className="bg-[#111111] border border-white/10 rounded-xl p-4 cursor-pointer
              hover:border-white/25 hover:bg-[#181818] transition-all select-none"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 flex-shrink-0">
                {getFileIcon(file.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate leading-tight">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold text-gray-400 bg-white/8 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {TYPE_LABEL[file.type]}
                  </span>
                  {dateStr && (
                    <span className="text-xs text-gray-600">{dateStr}</span>
                  )}
                </div>
              </div>
            </div>

            {excerpt && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {excerpt}
              </p>
            )}

            {file.type === "image" && file.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden bg-white/5 h-20">
                <img
                  src={file.imageUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="bg-[#1a1a1a] border-white/20 text-white min-w-[160px]">
          <ContextMenuItem
            className="text-gray-300 focus:bg-white/10 focus:text-white cursor-pointer gap-2"
            onClick={handleOpen}
          >
            <ExternalLink size={14} />
            Открыть
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
        title={`Удалить файл «${file.name}»?`}
        description="Файл будет удалён безвозвратно."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
