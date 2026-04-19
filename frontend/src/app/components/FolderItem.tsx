import { useEffect, useRef, useState } from "react";
import { useDrag, useDragLayer, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { Folder } from "../../api/types";
import { useWorkspaceView } from "../hooks/useWorkspaceView";
import { GRID_ITEM_TYPE } from "./FolderContentView/constants";
import type { GridItemType } from "./FolderContentView/types";

interface FolderItemProps {
  folder: Folder;
  path: string[];
  moveFolder: (dragPath: string[], hoverPath: string[], dropZone: "before" | "after" | "inside") => void;
  onEditFolder: (folder: Folder, path: string[]) => void;
  onAddSubfolder: (parentPath: string[]) => void;
  onDeleteFolder: (path: string[]) => void;
  onOpenContextMenu: (folder: Folder, path: string[], position: { x: number; y: number }) => void;
  onMoveGridItemToFolder?: (itemId: string, targetFolderId: string, itemType: GridItemType) => void;
  depth?: number;
}

const FOLDER_TYPE = "FOLDER";
const HOVER_TO_NEST_DELAY = 600;

interface DragItem {
  path: string[];
  name: string;
  emoji?: string;
  depth: number;
}

interface GridDragItem {
  id: string;
  origType: GridItemType;
}

type DropZone = "before" | "after" | "inside" | null;

export function FolderItem({
  folder,
  path,
  moveFolder,
  onEditFolder,
  onAddSubfolder,
  onDeleteFolder,
  onOpenContextMenu,
  onMoveGridItemToFolder,
  depth = 0,
}: FolderItemProps) {
  const { setSelectedFolderPath, setViewMode } = useWorkspaceView();
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const [isPointerHovered, setIsPointerHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const latestDropZoneRef = useRef<DropZone>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
  const isAnySidebarFolderDragging = useDragLayer((monitor) => (
    monitor.isDragging() && monitor.getItemType() === FOLDER_TYPE
  ));

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: FOLDER_TYPE,
    item: () => {
      setIsDraggingState(true);
      setIsPointerHovered(false);

      return {
        path,
        name: folder.name,
        emoji: folder.emoji,
        depth,
      };
    },
    end: () => {
      setIsDraggingState(false);
      setIsPointerHovered(false);
      dragStartPosRef.current = null;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const updateDropZone = (nextDropZone: DropZone) => {
    latestDropZoneRef.current = nextDropZone;
    setDropZone(nextDropZone);
  };

  const getDropZoneFromPointer = (monitor: Parameters<NonNullable<Parameters<typeof useDrop>[0]["hover"]>>[1]) => {
    if (!ref.current) return null;

    const hoverBoundingRect = ref.current.getBoundingClientRect();
    const clientOffset = monitor.getClientOffset();

    if (!clientOffset) return null;

    const hoverClientY = clientOffset.y - hoverBoundingRect.top;
    const hoverHeight = hoverBoundingRect.bottom - hoverBoundingRect.top;
    const topZoneEnd = hoverHeight * 0.25;
    const bottomZoneStart = hoverHeight * 0.75;

    if (hoverClientY < topZoneEnd) {
      return "before";
    }

    if (hoverClientY > bottomZoneStart) {
      return "after";
    }

    return "inside";
  };

  const [{ isOver }, drop] = useDrop({
    accept: [FOLDER_TYPE, GRID_ITEM_TYPE],
    hover: (item: DragItem | GridDragItem, monitor) => {
      if (!ref.current) return;

      const itemType = monitor.getItemType();
      if (itemType === GRID_ITEM_TYPE) {
        const gridItem = item as GridDragItem;
        updateDropZone(gridItem.id === folder.id ? null : "inside");
        clearHoverTimeout();
        return;
      }

      const dragPath = item.path;
      const hoverPath = path;
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) {
        clearHoverTimeout();
        updateDropZone(null);
        return;
      }
      if (hoverPath.join("/").startsWith(dragPath.join("/"))) {
        clearHoverTimeout();
        updateDropZone(null);
        return;
      }

      const currentDropZone = getDropZoneFromPointer(monitor);
      if (!currentDropZone) {
        clearHoverTimeout();
        updateDropZone(null);
        return;
      }

      if (currentDropZone === "before" || currentDropZone === "after") {
        clearHoverTimeout();
      } else if (currentDropZone === "inside") {
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            if (hasSubfolders && !isExpanded) {
              setIsExpanded(true);
            }
          }, HOVER_TO_NEST_DELAY);
        }
      }

      updateDropZone(currentDropZone);
    },
    drop: (item: DragItem | GridDragItem, monitor) => {
      if (!ref.current) return;
      if (monitor.didDrop()) return;

      const itemType = monitor.getItemType();
      if (itemType === GRID_ITEM_TYPE) {
        const gridItem = item as GridDragItem;
        updateDropZone(null);

        if (gridItem.id !== folder.id) {
          onMoveGridItemToFolder?.(gridItem.id, folder.id, gridItem.origType);
        }

        return { movedToSidebarFolder: true };
      }

      const dragPath = item.path;
      const hoverPath = path;
      clearHoverTimeout();
      const finalDropZone = getDropZoneFromPointer(monitor) || latestDropZoneRef.current || "after";
      updateDropZone(null);
      if (JSON.stringify(dragPath) === JSON.stringify(hoverPath)) return;
      if (hoverPath.join("/").startsWith(dragPath.join("/"))) return;

      moveFolder(dragPath, hoverPath, finalDropZone);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  useEffect(() => {
    if (!isOver && dropZone !== null) {
      clearHoverTimeout();
      updateDropZone(null);
    }
  }, [isOver, dropZone]);

  useEffect(() => {
    if (!isAnySidebarFolderDragging) {
      clearHoverTimeout();
      updateDropZone(null);
      setIsPointerHovered(false);
    }
  }, [isAnySidebarFolderDragging]);

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenContextMenu(folder, path, { x: e.clientX, y: e.clientY });
  };

  return (
    <div className="min-w-full">
      <div className="relative min-w-full">
        {/* Drop indicator - Before */}
        {isOver && dropZone === "before" && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-700/80 z-10" />
        )}

        <div
          ref={ref}
          className={`group relative flex min-w-full items-center gap-2 px-3 py-2 cursor-pointer transition-colors select-none before:absolute before:inset-y-0 before:left-0 before:right-0 before:bg-white/[0.045] before:opacity-0 before:transition-opacity ${
            !isAnySidebarFolderDragging && isPointerHovered ? "before:opacity-100" : ""
          } ${
            isDragging ? "opacity-50" : ""
          } ${dropZone === "inside" && isOver ? "before:bg-[linear-gradient(90deg,rgba(76,29,149,0.22),rgba(255,255,255,0.04))] before:opacity-100" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onMouseEnter={() => {
            if (!isAnySidebarFolderDragging) {
              setIsPointerHovered(true);
            }
          }}
          onMouseMove={() => {
            if (!isAnySidebarFolderDragging) {
              setIsPointerHovered(true);
            }
          }}
          onMouseLeave={() => {
            setIsPointerHovered(false);
            clearHoverTimeout();
            updateDropZone(null);
          }}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {hasSubfolders && (
            <button
              className="relative z-[1] w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-200"
              onClick={handleToggleExpand}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {!hasSubfolders && <div className="relative z-[1] w-4" />}

          <div className="relative z-[1] flex flex-1 items-center gap-2">
            {folder.emoji && (
              <span className="text-xl select-none flex-shrink-0">{folder.emoji}</span>
            )}
            <span className="text-sm text-gray-200 select-none whitespace-nowrap">{folder.name}</span>
          </div>
        </div>

        {/* Drop indicator - After */}
        {isOver && dropZone === "after" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-700/80 z-10" />
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
              onOpenContextMenu={onOpenContextMenu}
              onMoveGridItemToFolder={onMoveGridItemToFolder}
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
        className="absolute flex items-center gap-2 select-none"
        style={{
          left: sourceOffset.x + item.depth * 16 + 36,
          top: sourceOffset.y,
        }}
      >
        <div className="flex items-center gap-2">
          {item.emoji && (
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
          )}
          <span className="text-sm text-gray-100 whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {item.name}
          </span>
        </div>
      </div>
    </div>
  );
}
