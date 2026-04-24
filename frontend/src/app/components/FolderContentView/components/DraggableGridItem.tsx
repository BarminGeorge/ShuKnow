import { useState, useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { MoreVertical } from "lucide-react";
import type { Folder, FileItem } from "../../../../api/types";
import type { DraggableGridItemProps, DropIntent, GridItemType } from "../types";
import { GRID_ITEM_TYPE } from "../constants";
import {
  getFileNameWithoutExtension,
  getFileExtension,
  formatRelativeDate,
  formatFolderStats,
  calculateDropIntent,
} from "../helpers";

function getFolderStats(folder: Folder, allFiles: FileItem[]) {
  const subfolderCount = folder.subfolders?.length || 0;
  const folderFiles = allFiles.filter((file) => file.folderId === folder.id);

  if (folderFiles.length === 0 && folder.fileCount > 0) {
    return {
      subfolderCount,
      fileCount: folder.fileCount,
      photoCount: 0,
    };
  }

  return {
    subfolderCount,
    fileCount: folderFiles.filter((file) => file.type !== "photo").length,
    photoCount: folderFiles.filter((file) => file.type === "photo").length,
  };
}

export function DraggableGridItem({
  item,
  index,
  moveItem,
  onDragEnd,
  onFileContextMenu,
  onFolderContextMenu,
  onFolderClick,
  onFileDoubleClick,
  onMoveItemToFolder,
  editingFileId,
  onFileNameChange,
  onEditingComplete,
  currentFolderSubfolderIds = [],
  allFiles,
  openContextMenuId,
}: DraggableGridItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  // "刚刚放下"状态 — 用于 landing 动画
  const [justDropped, setJustDropped] = useState(false);
  // 当前放置意图状态
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  // 用于追踪上一次的意图，避免频繁状态更新
  const lastIntentRef = useRef<DropIntent>(null);
  // Throttle: prevent moveItem from firing more than once per 150ms
  const lastMoveTimeRef = useRef<number>(0);

  // 获取元素名称用于 CustomDragLayer
  const itemName = item.type === "folder"
    ? (item.data as Folder).name
    : (item.data as FileItem).name;

  // Получаем contentUrl и fileType для превью фото
  const fileData = item.type === "file" ? (item.data as FileItem) : null;
  const contentUrl = fileData?.contentUrl;
  const fileType = fileData?.type;
  
  // Get additional data for drag preview
  const folderData = item.type === "folder" ? (item.data as Folder) : null;
  const emoji = folderData?.emoji;
  const relativeDate = fileData ? formatRelativeDate(fileData.createdAt || fileData.updatedAt) : null;
  
  // Calculate metaText for folder preview
  const getMetaText = () => {
    if (item.type !== "folder") return null;
    const folder = folderData!;
    const { subfolderCount, fileCount, photoCount } = getFolderStats(folder, allFiles);
    return formatFolderStats(subfolderCount, fileCount, photoCount);
  };
  const metaText = getMetaText();

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: GRID_ITEM_TYPE,
    item: () => {
      const rect = ref.current?.getBoundingClientRect();
      return {
        index,
        id: item.id,
        origType: item.type,
        name: itemName,
        contentUrl,
        fileType,
        emoji,
        relativeDate,
        metaText,
        sourceWidth: rect?.width ?? 280,
        sourceHeight: rect?.height ?? 180,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, monitor) => {
      // 启动 landing 动画
      setJustDropped(true);
      setDropIntent(null);
      lastIntentRef.current = null;
      onDragEnd(monitor.getDropResult() as { movedIntoFolder?: boolean; moved?: boolean } | undefined);

      // 动画结束后清除状态
      setTimeout(() => setJustDropped(false), 400);
    },
  });

  // 抑制浏览器默认的 drag preview（防止 snap-back 动画）
  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  // Ensure pointer events are restored after drag ends
  useEffect(() => {
    if (!isDragging) {
      // Force cleanup any lingering drag state
      document.body.style.cursor = '';
    }
  }, [isDragging]);

  // 辅助函数：检查 candidateId 是否是 ancestorFolder 的后代
  const isDescendantOf = (ancestorFolder: Folder, candidateId: string): boolean => {
    if (!ancestorFolder.subfolders) return false;
    for (const sub of ancestorFolder.subfolders) {
      if (sub.id === candidateId) return true;
      if (isDescendantOf(sub, candidateId)) return true;
    }
    return false;
  };

  // 验证是否可以嵌套到目标文件夹（用于视觉反馈）
  const canNestIntoFolder = (draggedItem: { id: string; origType: GridItemType }): boolean => {
    // 必须是文件夹才能接受嵌套
    if (item.type !== "folder") return false;
    // 不能拖到自己身上
    if (draggedItem.id === item.id) return false;
    
    const targetFolder = item.data as Folder;
    
    // 如果拖动的是文件夹，需要进行额外的验证
    if (draggedItem.origType === "folder") {
      // 防止循环引用：目标文件夹不能是被拖动文件夹的后代
      // 注意：这里检查的是目标文件夹是否是被拖动文件夹的后代
      // 但由于我们无法访问被拖动文件夹的完整数据，我们只能检查基本情况
      if (isDescendantOf(targetFolder, draggedItem.id)) {
        return false; // 目标文件夹已经在被拖动文件夹内部（不会发生，因为被拖动的是祖先）
      }
      
      // 检查目标文件夹是否已经包含被拖动的文件夹
      if (targetFolder.subfolders?.some(f => f.id === draggedItem.id)) {
        return false; // 已经是目标文件夹的子文件夹
      }
    }
    
    // 文件的验证在 drop 时进行
    return true;
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: GRID_ITEM_TYPE,
    hover: (draggedItem: { index: number; id: string; origType: GridItemType }, monitor) => {
      if (!ref.current) return;
      
      const dragIndex = draggedItem.index;
      const hoverIndex = index;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) return;

      const width = hoverBoundingRect.right - hoverBoundingRect.left;
      const height = hoverBoundingRect.bottom - hoverBoundingRect.top;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // 计算当前放置意图
      let intent = calculateDropIntent(
        hoverClientX,
        hoverClientY,
        width,
        height,
        item.type,
        draggedItem.id,
        item.id
      );

      // 如果是嵌套意图，验证是否真的可以嵌套
      if (intent === "nest") {
        // 创建一个临时对象用于验证
        const draggedItemForValidation = { id: draggedItem.id, origType: draggedItem.origType };
        if (!canNestIntoFolder(draggedItemForValidation)) {
          // 如果不能嵌套，回退到重新排序意图（仅对文件有效）
          intent = item.type === "folder" ? "reorder" : null;
        }
      }

      // 只在意图变化时更新状态（避免频繁重渲染）
      if (intent !== lastIntentRef.current) {
        setDropIntent(intent);
        lastIntentRef.current = intent;
      }

      // 嵌套意图：不触发排序，只更新视觉状态
      if (intent === "nest") {
        return;
      }

      // 重新排序意图：执行排序逻辑 (throttled)
      if (intent === "reorder" && dragIndex !== hoverIndex) {
        const hoverMiddleX = width / 2;

        // 判断是否应该移动
        if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
        if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

        // Throttle: only allow move every 150ms to prevent flicker
        const now = Date.now();
        if (now - lastMoveTimeRef.current < 150) return;
        lastMoveTimeRef.current = now;

        moveItem(dragIndex, hoverIndex);
        draggedItem.index = hoverIndex;
      }
    },
    drop: (draggedItem: { index: number; id: string; origType: GridItemType }, monitor) => {
      // 如果是嵌套意图，执行嵌套操作
      if (dropIntent === "nest" && canNestIntoFolder(draggedItem)) {
        onMoveItemToFolder(draggedItem.id, item.id, draggedItem.origType);
        return { movedIntoFolder: true };
      }

      if (dropIntent === "reorder" && draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }

      // 否则执行重新排序（已在hover中完成，这里只需清理状态）
      setDropIntent(null);
      lastIntentRef.current = null;
      return { moved: true };
    },
    canDrop: (draggedItem) => {
      // 文件总是可以拖放到其他位置进行排序
      // 文件夹的特殊验证在 canNestIntoFolder 中处理
      return draggedItem.id !== item.id;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // 当离开目标区域时重置意图状态
  useEffect(() => {
    if (!isOver) {
      setDropIntent(null);
      lastIntentRef.current = null;
    }
  }, [isOver]);

  drag(drop(ref));

  // Handle click to open file
  const handleFileClick = (fileId: string) => {
    // Ignore clicks if item was being dragged
    if (isDragging) return;
    onFileDoubleClick(fileId);
  };

  if (item.type === "folder") {
    const folder = item.data as Folder;
    
    // Count all items in folder for meta info
    const { subfolderCount, fileCount, photoCount } = getFolderStats(folder, allFiles);
    const metaText = formatFolderStats(subfolderCount, fileCount, photoCount);

    // 根据 dropIntent 决定视觉样式
    const getDropZoneStyles = () => {
      if (!isOver || !canDrop) return "";
      
      if (dropIntent === "nest") {
        return "ring-2 ring-violet-300/35 scale-[1.02] shadow-[0_0_20px_rgba(167,139,250,0.16)]";
      }
      
      if (dropIntent === "reorder") {
        return "ring-1 ring-violet-300/30";
      }
      
      return "";
    };

    // 动画类：根据状态返回不同的动画效果
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; // landing 动画
      return "opacity-100 transition-all duration-200 ease-out";
    };

    return (
      <div
        ref={ref}
        data-grid-item-id={item.id}
        className={`
          group relative h-[180px] rounded-2xl overflow-hidden cursor-pointer
          ${getItemAnimationClass()} ${getDropZoneStyles()}
          bg-[linear-gradient(135deg,rgba(76,29,149,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))]
          border-violet-200/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.16)]
          hover:border-violet-200/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_30px_rgba(0,0,0,0.20)]
          hover:-translate-y-[1px]
          border
        `}
        onClick={() => onFolderClick(folder)}
      >
        {/* Content - Single unified block */}
        <div className="h-full px-7 py-6 flex flex-col justify-between">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/32 to-transparent" />

          {/* Top: Emoji */}
          <div className="flex items-start justify-between">
            <span className="text-[40px] leading-none">
              {folder.emoji || "📁"}
            </span>
            {/* Context menu button - always visible when menu is open */}
            <button
              className={`w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-opacity ${openContextMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onFolderContextMenu(folder.id, e);
              }}
            >
              <MoreVertical size={14} className="text-white/60" strokeWidth={1.5} />
            </button>
          </div>
          
          {/* Bottom: Name and Meta */}
          <div className="min-w-0">
            <p className="text-[18px] font-medium text-[rgba(255,255,255,0.92)] whitespace-nowrap overflow-hidden text-ellipsis">
              {folder.name}
            </p>
            <p className="text-[13px] text-[rgba(255,255,255,0.60)] mt-1 font-normal">
              {metaText}
            </p>
          </div>
        </div>
        
        {/* 嵌套意图指示器：显示一个半透明的覆盖层提示 */}
        {dropIntent === "nest" && (
          <div className="absolute inset-0 bg-violet-400/10 pointer-events-none rounded-2xl" />
        )}
      </div>
    );
  } else {
    const file = item.data as FileItem;

    // 文件只支持重新排序意图
    const getFileDropStyles = () => {
      if (!isOver || !canDrop) return "";
      if (dropIntent === "reorder") return "ring-1 ring-indigo-500/30";
      return "";
    };

    // 动画类：根据状态返回不同的动画效果
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; // landing 动画
      return "opacity-100 transition-all duration-200 ease-out";
    };

    // Get display name without extension
    const displayName = getFileNameWithoutExtension(file.name);
    const fileExtension = getFileExtension(file.name);
    const extensionKey = file.name.split(".").pop()?.toLowerCase() || "";

    const getFileVisualStyle = () => {
      if (file.type === "pdf") {
        return {
          badgeBg: "bg-rose-300/10",
          badgeText: "text-rose-200",
          card: "bg-[linear-gradient(135deg,rgba(157,23,77,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-rose-200/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.16)] hover:border-rose-200/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_30px_rgba(0,0,0,0.20)]",
          line: "via-rose-200/28",
        };
      }

      if (["md", "txt", "rtf"].includes(extensionKey)) {
        return {
          badgeBg: "bg-[rgba(129,140,248,0.15)]",
          badgeText: "text-[#818cf8]",
          card: "bg-[linear-gradient(135deg,rgba(67,56,202,0.14),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-indigo-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.16)] hover:border-indigo-300/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_30px_rgba(0,0,0,0.20)]",
          line: "via-indigo-300/34",
        };
      }

      return {
        badgeBg: "bg-sky-300/10",
        badgeText: "text-sky-200",
        card: "bg-[linear-gradient(135deg,rgba(3,105,161,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-sky-200/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.16)] hover:border-sky-200/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_30px_rgba(0,0,0,0.20)]",
        line: "via-sky-200/28",
      };
    };

    const fileVisualStyle = getFileVisualStyle();

    // Get file type badge info
    const getTypeBadge = () => {
      if (file.type === "pdf") {
        return { label: "PDF", bgColor: fileVisualStyle.badgeBg, textColor: fileVisualStyle.badgeText };
      }

      return { label: fileExtension, bgColor: fileVisualStyle.badgeBg, textColor: fileVisualStyle.badgeText };
    };

    const typeBadge = getTypeBadge();

    // Get relative date for meta info
    const relativeDate = formatRelativeDate(file.createdAt || file.updatedAt);

    // Photo card - special design with thumbnail and overlay
    if (file.type === "photo" && file.contentUrl) {
      return (
        <div
          ref={ref}
          data-grid-item-id={item.id}
          className={`
            group relative h-[180px] rounded-2xl overflow-hidden cursor-pointer
            ${getItemAnimationClass()} ${getFileDropStyles()}
            shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(0,0,0,0.16)]
            hover:-translate-y-[1px] hover:ring-1 hover:ring-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_14px_30px_rgba(0,0,0,0.20)]
          `}
          onClick={() => handleFileClick(file.id)}
          title="Нажмите для открытия"
        >
          {/* Thumbnail fills entire card */}
          <img
            src={file.contentUrl}
            alt={file.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/16 to-black/4" />
          
          {/* Format badge - top left */}
          <span className="absolute top-6 left-7 text-[12px] font-semibold uppercase tracking-wide px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white/85">
            {fileExtension}
          </span>
          
          {/* Content at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-7 py-6 min-w-0">
            {editingFileId === file.id ? (
              <input
                type="text"
                value={file.name}
                onChange={(e) => onFileNameChange(file.id, e.target.value)}
                onBlur={onEditingComplete}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onEditingComplete();
                }}
                                  className="w-full text-[18px] text-white font-medium bg-black/50 px-2 py-1 rounded outline-none border border-indigo-500"                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <p className="text-[18px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayName}
                </p>
                {relativeDate && (
                  <p className="text-[13px] text-white/60 mt-1 font-normal">
                    {relativeDate}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Context menu button - always visible when menu is open */}
          <button
            aria-label="More options"
            className={`absolute top-6 right-7 w-6 h-6 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center transition-opacity z-10 ${openContextMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onFileContextMenu(file.id, e);
            }}
          >
            <MoreVertical size={14} className="text-white/70" strokeWidth={1.5} />
          </button>
        </div>
      );
    }

    // Regular file card - with badge and date meta
    return (
      <div
        ref={ref}
        data-grid-item-id={item.id}
        className={`
          group relative h-[180px] rounded-2xl overflow-hidden cursor-pointer
          ${getItemAnimationClass()} ${getFileDropStyles()}
          ${fileVisualStyle.card}
          hover:-translate-y-[1px]
          border
        `}
        onClick={() => handleFileClick(file.id)}
        title="Нажмите для открытия"
      >
        {/* Content - Single unified block */}
        <div className="h-full px-7 py-6 flex flex-col justify-between">
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${fileVisualStyle.line} to-transparent`} />

          {/* Top: Type badge and menu */}
          <div className="flex items-start justify-between">
            <span className={`
              text-[12px] font-semibold uppercase tracking-wide
              px-3 py-1 rounded-lg
              ${typeBadge.bgColor} ${typeBadge.textColor}
            `}>
              {typeBadge.label}
            </span>
            {/* Context menu button - always visible when menu is open */}
            <button
              className={`w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-opacity ${openContextMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onFileContextMenu(file.id, e);
              }}
            >
              <MoreVertical size={14} className="text-white/60" strokeWidth={1.5} />
            </button>
          </div>
          
          {/* Bottom: Name and Date */}
          <div className="min-w-0">
            {editingFileId === file.id ? (
              <input
                type="text"
                value={file.name}
                onChange={(e) => onFileNameChange(file.id, e.target.value)}
                onBlur={onEditingComplete}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onEditingComplete();
                }}
                className="w-full text-[18px] text-white font-medium bg-black/30 px-2 py-1 rounded outline-none border border-indigo-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <p className="text-[18px] font-medium text-[rgba(255,255,255,0.92)] whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayName}
                </p>
                {relativeDate && (
                  <p className="text-[13px] text-[rgba(255,255,255,0.60)] mt-1 font-normal">
                    {relativeDate}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
