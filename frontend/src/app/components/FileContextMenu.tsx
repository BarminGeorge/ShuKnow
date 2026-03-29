import { Trash2, FileEdit } from "lucide-react";

interface FileContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
  isPhoto?: boolean;
}

export function FileContextMenu({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  position,
  isPhoto = false,
}: FileContextMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed z-50 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
      >
        {!isPhoto && (
          <>
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors flex items-center gap-3"
            >
              <FileEdit size={15} className="text-gray-400" />
              Редактировать
            </button>
            <div className="h-px bg-white/10 mx-3 my-0.5" />
          </>
        )}
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-3"
        >
          <Trash2 size={15} className="text-gray-400" />
          Удалить
        </button>
      </div>
    </>
  );
}
