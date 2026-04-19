import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Удалить",
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200/10 bg-rose-500/10 text-rose-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <AlertTriangle size={18} />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-400">{description}</p>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/[0.07] bg-white/[0.01] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.055] hover:text-gray-200"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg border border-rose-200/18 bg-rose-500/14 px-4 py-2 text-sm font-medium text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-rose-200/28 hover:bg-rose-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
