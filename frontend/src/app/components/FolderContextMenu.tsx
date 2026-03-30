import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FolderContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
}

export function FolderContextMenu({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  position,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const padding = 8;

      let x = position.x;
      let y = position.y;

      // Adjust horizontal position
      if (x + menuWidth + padding > window.innerWidth) {
        x = window.innerWidth - menuWidth - padding;
      }

      // Adjust vertical position
      if (y + menuHeight + padding > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
      }

      setAdjustedPosition({ x, y });
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-[#1a1a1a]/95 backdrop-blur-sm border border-white/[0.08] rounded-xl shadow-lg py-1 min-w-[160px] overflow-hidden"
        style={{
          top: `${adjustedPosition.y}px`,
          left: `${adjustedPosition.x}px`,
        }}
      >
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2.5"
        >
          <Edit3 size={14} className="text-gray-500" />
          Редактировать
        </button>
        <div className="h-px bg-white/[0.06] mx-2" />
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors flex items-center gap-2.5"
        >
          <Trash2 size={14} className="text-gray-500" />
          Удалить
        </button>
      </div>
    </>
  );
}
