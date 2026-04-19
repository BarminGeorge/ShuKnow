import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import type { Folder } from "../../api/types";

interface DeleteFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onConfirm: (isRecursiveDelete: boolean) => Promise<void>;
}

export function DeleteFolderModal({ isOpen, folder, onClose, onConfirm }: DeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const hasContents = (folder.subfolders && folder.subfolders.length > 0) || folder.fileCount > 0;

  const handleDelete = async (isRecursiveDelete: boolean) => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm(isRecursiveDelete);
      onClose();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        const isNonEmptyFolderError = caughtError.message.includes("409") || 
                                       caughtError.message.includes("non-empty") || 
                                       caughtError.message.includes("Conflict");
        if (isNonEmptyFolderError) {
          setErrorMessage("Папка содержит файлы или подпапки. Выберите «Удалить всё» для полного удаления.");
        } else {
          setErrorMessage(caughtError.message);
        }
      } else {
        setErrorMessage("Ошибка при удалении папки");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={handleClose}>
      <div 
        className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border border-rose-200/10 bg-rose-500/10 text-rose-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-lg font-semibold text-gray-100">Удалить папку</h2>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

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

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-300/20 rounded-lg text-sm text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex gap-3 justify-end bg-white/[0.01]">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.045] text-sm text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-colors hover:border-white/14 hover:bg-white/[0.065] disabled:opacity-50"
          >
            Отмена
          </button>
          
          {hasContents ? (
            <button
              onClick={() => handleDelete(true)}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200/18 bg-rose-500/14 text-sm font-medium text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-rose-200/28 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Удалить всё
            </button>
          ) : (
            <button
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200/18 bg-rose-500/14 text-sm font-medium text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-rose-200/28 hover:bg-rose-500/20 disabled:opacity-50"
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
