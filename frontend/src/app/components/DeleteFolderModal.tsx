import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import type { Folder } from "../Workspace";

interface DeleteFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onConfirm: (recursive: boolean) => Promise<void>;
}

export function DeleteFolderModal({ isOpen, folder, onClose, onConfirm }: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const hasContents = (folder.subfolders && folder.subfolders.length > 0) || folder.fileCount > 0;

  const handleDelete = async (recursive: boolean) => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(recursive);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        // Handle 409 Conflict - folder is non-empty
        if (err.message.includes("409") || err.message.includes("non-empty") || err.message.includes("Conflict")) {
          setError("Папка содержит файлы или подпапки. Выберите «Удалить всё» для полного удаления.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Ошибка при удалении папки");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div 
        className="bg-[#1a1a1a] border border-white/20 rounded-xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-lg font-semibold text-white">Удалить папку</h2>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-gray-300 mb-2">
            Вы уверены, что хотите удалить папку <span className="font-medium text-white">«{folder.name}»</span>?
          </p>
          
          {hasContents ? (
            <p className="text-sm text-gray-400 mb-4">
              Эта папка содержит {folder.subfolders?.length || 0} подпапок и {folder.fileCount || 0} файлов.
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-4">
              Папка пуста.
            </p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          
          {hasContents ? (
            <>
              <button
                onClick={() => handleDelete(false)}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                Удалить только папку
              </button>
              <button
                onClick={() => handleDelete(true)}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={14} className="animate-spin" />}
                Удалить всё
              </button>
            </>
          ) : (
            <button
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
