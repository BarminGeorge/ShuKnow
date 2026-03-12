import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Edit3, Plus, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import type { Folder } from "../App";

interface FolderItemProps {
  folder: Folder;
  path: string[];
  moveFolder: (dragPath: string[], hoverPath: string[], dropZone: "before" | "after" | "inside") => void;
  onFolderClick: (folder: Folder, path: string[]) => void;
  onEditFolder: (folder: Folder, path: string[]) => void;
  onAddSubfolder: (parentPath: string[]) => void;
  onDeleteFolder: (path: string[]) => void;
  depth?: number;
}

const FOLDER_TYPE = "FOLDER";
const HOVER_TO_NEST_DELAY = 600; // ms

interface DragItem {
  path: string[];
}

type DropZone = "before" | "after" | "inside" | null;

export function FolderItem({
  folder,
  path,
  moveFolder,
  onFolderClick,
  onEditFolder,
  onAddSubfolder,
  onDeleteFolder,
  depth = 0,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [isHovered, setIsHovered] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track mouse movement to distinguish drag from click
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

  const [{ isDragging }, drag] = useDrag({
    type: FOLDER_TYPE,
    item: () => {
      setIsDraggingState(true);
      return { path };
    },
    end: () => {
      setIsDraggingState(false);
      dragStartPosRef.current = null;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: FOLDER_TYPE,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;

      const dragPath = item.path;
      const hoverPath = path;

      // Don't replace items with themselves
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }

      // Can't drop a parent into its own child
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

      // Calculate drop zones: 25% top, 50% middle, 25% bottom
      const topZoneEnd = hoverHeight * 0.25;
      const bottomZoneStart = hoverHeight * 0.75;

      let currentDropZone: DropZone = null;

      if (hoverClientY < topZoneEnd) {
        // Top 25% - insert before
        currentDropZone = "before";
        clearHoverTimeout();
      } else if (hoverClientY > bottomZoneStart) {
        // Bottom 25% - insert after
        currentDropZone = "after";
        clearHoverTimeout();
      } else {
        // Middle 50% - nest inside (with delay)
        currentDropZone = "inside";
        
        if (!hoverTimeoutRef.current) {
          // Start hover-to-nest timer
          hoverTimeoutRef.current = setTimeout(() => {
            // Auto-expand if has subfolders
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

      // Clear hover state
      clearHoverTimeout();
      const finalDropZone = dropZone || "after";
      setDropZone(null);

      // Don't replace items with themselves
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) return;

      // Can't drop a parent into its own child
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
    // Track initial mouse position
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    // Check if this was a drag or a click
    if (dragStartPosRef.current) {
      const deltaX = Math.abs(e.clientX - dragStartPosRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPosRef.current.y);
      const threshold = 5; // pixels

      // If mouse moved more than threshold, it was a drag, not a click
      if (deltaX > threshold || deltaY > threshold || isDraggingState) {
        dragStartPosRef.current = null;
        return;
      }
    }

    // This was a genuine click - select folder (don't toggle expand/collapse)
    onFolderClick(folder, path);
    dragStartPosRef.current = null;
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to parent
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div className="relative">
        {/* Drop indicator - Before */}
        {isOver && dropZone === "before" && (
          <div className="absolute top-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full z-10" />
        )}

        <div
          ref={ref}
          className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none ${
            isDragging ? "opacity-50" : ""
          } ${dropZone === "inside" && isOver ? "bg-blue-500/20 border border-blue-500/50 rounded-lg" : ""}`}
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

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {folder.emoji && (
              <span className="text-xl select-none">{folder.emoji}</span>
            )}
            <span className="text-sm text-gray-200 truncate select-none">{folder.name}</span>
          </div>

          {isHovered && !isDraggingState && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolder(folder, path);
                }}
                title="Редактировать папку"
              >
                <Edit3 size={14} />
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubfolder(path);
                }}
                title="Добавить подпапку"
              >
                <Plus size={14} />
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
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
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full z-10" />
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