import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Edit3, Plus, ChevronRight, ChevronDown, Trash2 } from "lucide-react";

import type { Folder, DropZone } from "@/features/workspace/model/types";

interface FolderItemProps {
  folder: Folder;
  /** Full ID path from the tree root to this folder (inclusive). */
  idPath: string[];
  onMoveFolder: (dragId: string, targetId: string, zone: DropZone) => void;
  onFolderClick: (idPath: string[]) => void;
  onEditFolder: (folder: Folder) => void;
  onAddSubfolder: (parentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  depth?: number;
}

const FOLDER_DND_TYPE = "FOLDER";
const HOVER_TO_NEST_DELAY_MS = 600;

interface DragItem {
  folderId: string;
}

export function FolderItem({
  folder,
  idPath,
  onMoveFolder,
  onFolderClick,
  onEditFolder,
  onAddSubfolder,
  onDeleteFolder,
  depth = 0,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [isHovered, setIsHovered] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDraggingLocally, setIsDraggingLocally] = useState(false);

  const hasSubfolders = (folder.subfolders?.length ?? 0) > 0;

  const [{ isDragging }, drag] = useDrag({
    type: FOLDER_DND_TYPE,
    item: (): DragItem => {
      setIsDraggingLocally(true);
      return { folderId: folder.id };
    },
    end: () => {
      setIsDraggingLocally(false);
      dragStartPosRef.current = null;
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const [{ isOver }, drop] = useDrop({
    accept: FOLDER_DND_TYPE,
    hover: (item: DragItem, monitor) => {
      if (!ref.current || item.folderId === folder.id) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }

      const rect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }

      const relY = clientOffset.y - rect.top;
      const height = rect.bottom - rect.top;
      const topZoneEnd = height * 0.25;
      const bottomZoneStart = height * 0.75;

      let zone: DropZone;
      if (relY < topZoneEnd) {
        zone = "before";
        clearHoverTimeout();
      } else if (relY > bottomZoneStart) {
        zone = "after";
        clearHoverTimeout();
      } else {
        zone = "inside";
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (hasSubfolders) setIsExpanded(true);
          }, HOVER_TO_NEST_DELAY_MS);
        }
      }

      setDropZone(zone);
    },
    drop: (item: DragItem) => {
      clearHoverTimeout();
      const zone = dropZone ?? "after";
      setDropZone(null);
      if (item.folderId !== folder.id) {
        onMoveFolder(item.folderId, folder.id, zone);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  drag(drop(ref));

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragStartPosRef.current) {
      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      // Treat as drag if mouse moved more than 5px
      if (dx > 5 || dy > 5 || isDraggingLocally) {
        dragStartPosRef.current = null;
        return;
      }
    }
    onFolderClick(idPath);
    dragStartPosRef.current = null;
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div>
      <div className="relative">
        {isOver && dropZone === "before" && (
          <div
            aria-hidden
            className="absolute top-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full z-10"
          />
        )}

        <div
          ref={ref}
          role="treeitem"
          aria-expanded={hasSubfolders ? isExpanded : undefined}
          aria-selected={false}
          className={[
            "group relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none",
            isDragging ? "opacity-50" : "",
            isOver && dropZone === "inside"
              ? "bg-blue-500/20 border border-blue-500/50"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            clearHoverTimeout();
            setDropZone(null);
          }}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        >
          {/* Expand / collapse toggle */}
          {hasSubfolders ? (
            <button
              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-200"
              onClick={handleToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown size={16} aria-hidden />
              ) : (
                <ChevronRight size={16} aria-hidden />
              )}
            </button>
          ) : (
            <div className="w-4" aria-hidden />
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {folder.emoji && (
              <span aria-hidden className="text-xl select-none">
                {folder.emoji}
              </span>
            )}
            <span className="text-sm text-gray-200 truncate">{folder.name}</span>
          </div>

          {/* Action buttons — visible on hover */}
          {isHovered && !isDraggingLocally && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                aria-label={`Редактировать папку ${folder.name}`}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolder(folder);
                }}
              >
                <Edit3 size={14} aria-hidden />
              </button>
              <button
                aria-label={`Добавить подпапку в ${folder.name}`}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubfolder(folder.id);
                }}
              >
                <Plus size={14} aria-hidden />
              </button>
              <button
                aria-label={`Удалить папку ${folder.name}`}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          )}
        </div>

        {isOver && dropZone === "after" && (
          <div
            aria-hidden
            className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full z-10"
          />
        )}
      </div>

      {isExpanded && hasSubfolders && (
        <div role="group">
          {folder.subfolders!.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              idPath={[...idPath, subfolder.id]}
              onMoveFolder={onMoveFolder}
              onFolderClick={onFolderClick}
              onEditFolder={onEditFolder}
              onAddSubfolder={onAddSubfolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}