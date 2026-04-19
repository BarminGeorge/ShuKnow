import { Edit3, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

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

  useLayoutEffect(() => {
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
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={menuRef}
        className="fixed z-50 min-w-[176px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d0d]/95 py-1 shadow-[0_18px_42px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
        style={{
          top: adjustedPosition.y,
          left: adjustedPosition.x,
        }}
      >
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/[0.055] hover:text-gray-100"
        >
          <Edit3 size={14} className="text-gray-500" />
          Редактировать
        </button>
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex w-full items-center gap-2.5 border-t border-white/[0.055] px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-violet-950/30 hover:text-violet-200"
        >
          <Trash2 size={14} className="text-violet-300/70" />
          Удалить
        </button>
      </div>
    </>
  );
}
