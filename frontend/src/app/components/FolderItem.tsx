import { useEffect, useRef, useState } from "react";
import { useDrag, useDragLayer, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Edit3, Plus, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import type { Folder } from "../../api/types";
import { useWorkspaceView } from "../hooks/useWorkspaceView";

interface FolderItemProps {
  folder: Folder;
  path: string[];
  moveFolder: (dragPath: string[], hoverPath: string[], dropZone: "before" | "after" | "inside") => void;
  onEditFolder: (folder: Folder, path: string[]) => void;
  onAddSubfolder: (parentPath: string[]) => void;
  onDeleteFolder: (path: string[]) => void;
  depth?: number;
}

const FOLDER_TYPE = "FOLDER";
const HOVER_TO_NEST_DELAY = 600;

interface DragItem {
  path: string[];
  name: string;
  emoji?: string;
  depth: number;
  hasSubfolders: boolean;
  isExpanded: boolean;
  sourceWidth: number;
  sourceHeight: number;
}

type DropZone = "before" | "after" | "inside" | null;

export function FolderItem({
  folder,
  path,
  moveFolder,
  onEditFolder,
  onAddSubfolder,
  onDeleteFolder,
  depth = 0,
}: FolderItemProps) {
  const { setSelectedFolderPath, setViewMode } = useWorkspaceView();
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [isHovered, setIsHovered] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: FOLDER_TYPE,
    item: () => {
      setIsDraggingState(true);
      const rect = ref.current?.getBoundingClientRect();

      return {
        path,
        name: folder.name,
        emoji: folder.emoji,
        depth,
        hasSubfolders,
        isExpanded,
        sourceWidth: rect?.width ?? 240,
        sourceHeight: rect?.height ?? 36,
      };
    },
    end: () => {
      setIsDraggingState(false);
      dragStartPosRef.current = null;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const [{ isOver }, drop] = useDrop({
    accept: FOLDER_TYPE,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;

      const dragPath = item.path;
      const hoverPath = path;
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }
      if (hoverPath.join("/").startsWith(dragPath.join("/"))) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const hoverHeight = hoverBoundingRect.bottom - hoverBoundingRect.top;
      const topZoneEnd = hoverHeight * 0.25;
      const bottomZoneStart = hoverHeight * 0.75;

      let currentDropZone: DropZone = null;

      if (hoverClientY < topZoneEnd) {
        currentDropZone = "before";
        clearHoverTimeout();
      } else if (hoverClientY > bottomZoneStart) {
        currentDropZone = "after";
        clearHoverTimeout();
      } else {
        currentDropZone = "inside";
        
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (hasSubfolders && !isExpanded) {
              setIsExpanded(true);
            }
          }, HOVER_TO_NEST_DELAY);
        }
      }

      setDropZone(currentDropZone);
    },
    drop: (item: DragItem, monitor) => {
      if (!ref.current) return;

      const dragPath = item.path;
      const hoverPath = path;
      clearHoverTimeout();
      const finalDropZone = dropZone || "after";
      setDropZone(null);
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) return;
      if (hoverPath.join("/").startsWith(dragPath.join("/"))) return;

      moveFolder(dragPath, hoverPath, finalDropZone);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  drag(drop(ref));

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragStartPosRef.current) {
      const deltaX = Math.abs(e.clientX - dragStartPosRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPosRef.current.y);
      const threshold = 5;
      if (deltaX > threshold || deltaY > threshold || isDraggingState) {
        dragStartPosRef.current = null;
        return;
      }
    }
    setSelectedFolderPath(path);
    setViewMode('folder');
    dragStartPosRef.current = null;
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div className="relative">
        {/* Drop indicator - Before */}
        {isOver && dropZone === "before" && (
          <div className="absolute top-0 left-3 right-3 h-0.5 bg-indigo-500 rounded-full z-10" />
        )}

        <div
          ref={ref}
          className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none ${
            isDragging ? "opacity-50" : ""
          } ${dropZone === "inside" && isOver ? "bg-indigo-500/20 border border-indigo-500/50 rounded-lg" : ""}`}
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
          {hasSubfolders && (
            <button
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-200"
              onClick={handleToggleExpand}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {!hasSubfolders && <div className="w-4" />}

          <div className="flex items-center gap-2 flex-1">
            {folder.emoji && (
              <span className="text-xl select-none flex-shrink-0">{folder.emoji}</span>
            )}
            <span className="text-sm text-gray-200 select-none whitespace-nowrap">{folder.name}</span>
          </div>

          {isHovered && !isDraggingState && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolder(folder, path);
                }}
                title="Редактировать папку"
              >
                <Edit3 size={14} />
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubfolder(path);
                }}
                title="Добавить подпапку"
              >
                <Plus size={14} />
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(path);
                }}
                title="Удалить папку"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Drop indicator - After */}
        {isOver && dropZone === "after" && (
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-500 rounded-full z-10" />
        )}
      </div>

      {isExpanded && hasSubfolders && (
        <div>
          {folder.subfolders!.map((subfolder, index) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              path={[...path, index.toString()]}
              moveFolder={moveFolder}
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

export function SidebarFolderDragLayer() {
  const { isDragging, item, sourceOffset, itemType } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as DragItem | null,
    sourceOffset: monitor.getSourceClientOffset(),
    itemType: monitor.getItemType(),
  }));

  if (!isDragging || !item || !sourceOffset || itemType !== FOLDER_TYPE) return null;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      <div
        className="absolute flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 shadow-lg shadow-black/30 select-none"
        style={{
          left: sourceOffset.x,
          top: sourceOffset.y,
          width: item.sourceWidth,
          height: item.sourceHeight,
          paddingLeft: `${item.depth * 16 + 12}px`,
          paddingRight: 12,
        }}
      >
        {item.hasSubfolders ? (
          <div className="w-4 h-4 flex items-center justify-center text-gray-300">
            {item.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        ) : (
          <div className="w-4" />
        )}

        <div className="flex items-center gap-2 min-w-0">
          {item.emoji && (
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
          )}
          <span className="text-sm text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis">
            {item.name}
          </span>
        </div>
      </div>
    </div>
  );
}
