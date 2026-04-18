import { Edit3, Plus, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

interface SidebarFolderContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubfolder: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
}

export function SidebarFolderContextMenu({
  isOpen,
  onClose,
  onAddSubfolder,
  onEdit,
  onDelete,
  position,
}: SidebarFolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const padding = 8;
    let x = position.x;
    let y = position.y;

    if (x + menu.offsetWidth + padding > window.innerWidth) {
      x = window.innerWidth - menu.offsetWidth - padding;
    }

    if (y + menu.offsetHeight + padding > window.innerHeight) {
      y = window.innerHeight - menu.offsetHeight - padding;
    }

    setAdjustedPosition({ x: Math.max(padding, x), y: Math.max(padding, y) });
  }, [isOpen, position]);

  if (!isOpen) return null;

  const menuItems = [
    {
      label: "Добавить подпапку",
      icon: Plus,
      onClick: onAddSubfolder,
    },
    {
      label: "Редактировать",
      icon: Edit3,
      onClick: onEdit,
    },
    {
      label: "Удалить",
      icon: Trash2,
      onClick: onDelete,
      danger: true,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d0d]/95 py-1 shadow-[0_18px_42px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md"
        style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                item.danger
                  ? "text-gray-300 hover:bg-violet-950/30 hover:text-violet-200"
                  : "text-gray-300 hover:bg-white/[0.055] hover:text-gray-100"
              } ${index > 0 ? "border-t border-white/[0.055]" : ""}`}
            >
              <Icon size={14} className={item.danger ? "text-violet-300/70" : "text-gray-500"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
