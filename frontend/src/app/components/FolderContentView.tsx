import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { ChevronRight, MoreVertical, FileText, ArrowLeft, Plus, Folder as FolderIcon, Image as ImageIcon, Smile, Upload } from "lucide-react";
import { useDrag, useDrop, useDragLayer } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { getEmptyImage } from "react-dnd-html5-backend";
import { FileContextMenu } from "./FileContextMenu";
import { FolderContextMenu } from "./FolderContextMenu";
import { EditFileModal } from "./EditFileModal";
import { EditFolderModal } from "./EditFolderModal";
import { CreateFileModal } from "./CreateFileModal";
import { CreateFolderModal } from "./CreateFolderModal";
import { EmojiPicker } from "./EmojiPicker";
import type { Folder, FileItem } from "../App";

type GridItemType = "folder" | "file";

interface GridItem {
  id: string;
  type: GridItemType;
  data: Folder | FileItem;
  order: number;
}

interface FolderContentViewProps {
  folder: Folder;
  breadcrumbs: string[];
  onBack: () => void;
  onUpdateFolder: (updates: Partial<Folder>) => void;
  onNavigateToSubfolder: (subfolder: Folder, subfolderIndex: number) => void;
  onBreadcrumbClick: (index: number) => void;
  files: FileItem[];
  onOpenFile: (fileId: string) => void;
  onCreateFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateFile: (fileId: string, updates: Partial<FileItem>) => void;
}

const GRID_ITEM_TYPE = "GRID_ITEM";

// 放置意图类型：重新排序 vs 嵌套到文件夹内
type DropIntent = "reorder" | "nest" | null;

// 计算放置意图的辅助函数
function calculateDropIntent(
  hoverClientX: number,
  hoverClientY: number,
  width: number,
  height: number,
  targetType: GridItemType,
  draggedId: string,
  targetId: string
): DropIntent {
  // 不能拖到自己身上
  if (draggedId === targetId) return null;
  
  // 文件只能触发重新排序意图（文件不能接受嵌套）
  if (targetType === "file") return "reorder";
  
  // 文件夹：根据位置判断意图
  // 中心区域（中间60%宽度和高度）= 嵌套意图
  // 边缘区域（左右各20%宽度，或上下各20%高度）= 重新排序意图
  const centerXStart = width * 0.2;
  const centerXEnd = width * 0.8;
  const centerYStart = height * 0.2;
  const centerYEnd = height * 0.8;
  
  const isInCenterX = hoverClientX >= centerXStart && hoverClientX <= centerXEnd;
  const isInCenterY = hoverClientY >= centerYStart && hoverClientY <= centerYEnd;
  
  if (isInCenterX && isInCenterY) {
    return "nest"; // 中心区域：嵌套意图
  }
  
  return "reorder"; // 边缘区域：重新排序意图
}

// 自定义 Drag Layer：在拖拽时显示自定义的拖拽预览
function CustomDragLayer() {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
  }));

  if (!isDragging || !currentOffset || !item) return null;

  const isFolder = item.origType === "folder";

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 9999,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: currentOffset.x - 70,
          top: currentOffset.y - 50,
        }}
        className="animate-drag-pickup"
      >
        <div className={`
          w-[140px] h-[100px] rounded-xl flex flex-col items-center justify-center
          bg-[#1e1e1e]/95 backdrop-blur-md
          border-2 ${isFolder ? 'border-blue-500/50' : 'border-purple-500/50'}
          shadow-2xl shadow-black/60
          transform rotate-[2deg] scale-95
        `}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
            isFolder ? 'bg-blue-500/20' : 'bg-purple-500/20'
          }`}>
            {isFolder 
              ? <FolderIcon size={22} className="text-blue-400" /> 
              : <FileText size={22} className="text-purple-400" />
            }
          </div>
          <span className="text-[11px] text-gray-300 truncate max-w-[120px] px-2 font-medium">
            {item.name || "Перемещение..."}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DraggableGridItemProps {
  item: GridItem;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onFileContextMenu: (fileId: string, event: React.MouseEvent) => void;
  onFolderContextMenu: (folderId: string, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder) => void;
  onFileDoubleClick: (fileId: string) => void;
  onMoveItemToFolder: (itemId: string, destFolderId: string, itemType: GridItemType) => void;
  editingFileId: string | null;
  onFileNameChange: (fileId: string, newName: string) => void;
  onEditingComplete: () => void;
  // 新增：父文件夹的子文件夹ID列表，用于验证
  currentFolderSubfolderIds?: string[];
}

function DraggableGridItem({
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
}: DraggableGridItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  // "刚刚放下"状态 — 用于 landing 动画
  const [justDropped, setJustDropped] = useState(false);
  // 当前放置意图状态
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  // 用于追踪上一次的意图，避免频繁状态更新
  const lastIntentRef = useRef<DropIntent>(null);

  // 获取元素名称用于 CustomDragLayer
  const itemName = item.type === "folder" 
    ? (item.data as Folder).name 
    : (item.data as FileItem).name;

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: GRID_ITEM_TYPE,
    item: () => ({ 
      index, 
      id: item.id, 
      origType: item.type,
      name: itemName, // 传递名称给 drag preview
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, _monitor) => {
      // 启动 landing 动画
      setJustDropped(true);
      setDropIntent(null);
      lastIntentRef.current = null;
      onDragEnd();
      
      // 动画结束后清除状态
      setTimeout(() => setJustDropped(false), 400);
    },
  });

  // 抑制浏览器默认的 drag preview（防止 snap-back 动画）
  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

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

      // 重新排序意图：执行排序逻辑
      if (intent === "reorder" && dragIndex !== hoverIndex) {
        const hoverMiddleX = width / 2;

        // 判断是否应该移动
        if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
        if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

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
      // 否则执行重新排序（已在hover中完成，这里只需清理状态）
      setDropIntent(null);
      lastIntentRef.current = null;
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
    
    // 根据 dropIntent 决定视觉样式
    const getDropZoneStyles = () => {
      if (!isOver || !canDrop) return "border-white/10";
      
      if (dropIntent === "nest") {
        // 嵌套意图：绿色发光边框，轻微放大，表示"放入文件夹"
        return "border-green-500 ring-2 ring-green-500/40 scale-[1.03] shadow-[0_0_20px_rgba(34,197,94,0.3)]";
      }
      
      if (dropIntent === "reorder") {
        // 重新排序意图：蓝色边框，不放大，表示"在此位置插入"
        return "border-blue-500 ring-1 ring-blue-500/30";
      }
      
      return "border-white/10";
    };

    // 动画类：根据状态返回不同的动画效果
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; // landing 动画
      return "opacity-100 scale-100 transition-all duration-200 ease-out";
    };

    return (
      <div
        ref={ref}
        data-grid-item-id={item.id}
        className={`group relative bg-[#1a1a1a] border rounded-xl overflow-hidden hover:border-blue-400/50 cursor-pointer ${getItemAnimationClass()} ${getDropZoneStyles()}`}
        onClick={() => onFolderClick(folder)}
      >
        <div className="aspect-[4/3] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none">
          <div className="w-20 h-20 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
            <FolderIcon size={40} className="text-blue-400" />
          </div>
          <div className="w-full text-center">
            {folder.emoji && (
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{folder.emoji}</span>
              </div>
            )}
            <p className="text-sm text-gray-200 font-medium line-clamp-2">{folder.name}</p>
          </div>
        </div>
        {/* 嵌套意图指示器：显示一个半透明的覆盖层提示 */}
        {dropIntent === "nest" && (
          <div className="absolute inset-0 bg-green-500/10 pointer-events-none rounded-xl" />
        )}
        <button
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFolderContextMenu(folder.id, e);
          }}
        >
          <MoreVertical size={16} className="text-white" />
        </button>
      </div>
    );
  } else {
    const file = item.data as FileItem;
    const formattedDate = new Date(file.createdAt).toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short" 
    }).replace(".", "");

    // 文件只支持重新排序意图
    const getFileDropStyles = () => {
      if (!isOver || !canDrop) return "border-white/10";
      if (dropIntent === "reorder") return "border-blue-500 ring-1 ring-blue-500/30";
      return "border-white/10";
    };

    // 动画类：根据状态返回不同的动画效果
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; // landing 动画
      return "opacity-100 scale-100 transition-all duration-200 ease-out";
    };

    return (
      <div
        ref={ref}
        data-grid-item-id={item.id}
        className={`group relative bg-[#1a1a1a] border rounded-xl overflow-hidden hover:border-white/30 cursor-pointer ${getItemAnimationClass()} ${getFileDropStyles()}`}
        onClick={() => handleFileClick(file.id)}
        title="Нажмите для открытия"
      >
        {file.type === "photo" && file.imageUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={file.imageUrl}
              alt={file.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {editingFileId === file.id ? (
                <input
                  type="text"
                  value={file.name}
                  onChange={(e) => onFileNameChange(file.id, e.target.value)}
                  onBlur={onEditingComplete}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") onEditingComplete();
                  }}
                  className="w-full text-sm text-white font-medium bg-black/50 px-2 py-1 rounded outline-none border border-blue-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-sm text-white font-medium truncate">{file.name}</p>
              )}
              <p className="text-xs text-gray-300 mt-1">{formattedDate}</p>
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center mb-3">
              {file.type === "photo" ? (
                <ImageIcon size={32} className="text-purple-400" />
              ) : (
                <FileText size={32} className="text-blue-400" />
              )}
            </div>
            {editingFileId === file.id ? (
              <input
                type="text"
                value={file.name}
                onChange={(e) => onFileNameChange(file.id, e.target.value)}
                onBlur={onEditingComplete}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") onEditingComplete();
                }}
                className="w-full text-sm text-white font-medium bg-[#0d0d0d] px-2 py-1 rounded outline-none border border-blue-500 text-center mb-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="text-sm text-gray-200 font-medium text-center line-clamp-2 mb-2">{file.name}</p>
            )}
            <p className="text-xs text-gray-400">{formattedDate}</p>
          </div>
        )}

        <button
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFileContextMenu(file.id, e);
          }}
        >
          <MoreVertical size={16} className="text-white" />
        </button>
      </div>
    );
  }
}

export function FolderContentView({
  folder,
  breadcrumbs,
  onBack,
  onUpdateFolder,
  onNavigateToSubfolder,
  onBreadcrumbClick,
  files,
  onOpenFile,
  onCreateFile,
  onDeleteFile,
  onUpdateFile,
}: FolderContentViewProps) {
  const [title, setTitle] = useState(folder.name);
  const [emoji, setEmoji] = useState(folder.emoji || "");
  const [aiPrompt, setAiPrompt] = useState(folder.prompt || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  
  const [editFileModal, setEditFileModal] = useState<{ isOpen: boolean; file: FileItem | null; }>({ isOpen: false, file: null });
  const [editFolderModal, setEditFolderModal] = useState<{ isOpen: boolean; folder: Folder | null; }>({ isOpen: false, folder: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ isOpen: boolean; fileId: string; position: { x: number; y: number }; }>({ isOpen: false, fileId: "", position: { x: 0, y: 0 } });
  const [folderContextMenu, setFolderContextMenu] = useState<{ isOpen: boolean; folderId: string; position: { x: number; y: number }; }>({ isOpen: false, folderId: "", position: { x: 0, y: 0 } });

  // Refs for state management without re-renders
  const orderRef = useRef<string[]>([]);
  const updateRef = useRef(onUpdateFolder);
  const hasOrderChangedRef = useRef(false);

  // Keep fresh update function
  useEffect(() => {
    updateRef.current = onUpdateFolder;
  }, [onUpdateFolder]);

  // Silently update order ref on grid changes
  useEffect(() => {
    const newOrder = gridItems.map((item) => item.id);
    const hasChanged = JSON.stringify(newOrder) !== JSON.stringify(orderRef.current);
    orderRef.current = newOrder;
    if (hasChanged && newOrder.length > 0) {
      hasOrderChangedRef.current = true;
    }
  }, [gridItems]);

  // Sync metadata (if changed externally)
  useEffect(() => {
    setTitle(folder.name);
    setEmoji(folder.emoji || "");
    setAiPrompt(folder.prompt || "");
  }, [folder.name, folder.emoji, folder.prompt]);

  // Rebuild grid only on folder change
  useEffect(() => {
    const folderFiles = files.filter((f) => f.folderId === folder.id);
    const items: GridItem[] = [];
    let order = 0;

    // Add subfolders first
    if (folder.subfolders) {
      folder.subfolders.forEach((subfolder) => {
        items.push({ id: subfolder.id, type: "folder", data: subfolder, order: order++ });
      });
    }

    // Add files
    folderFiles.forEach((file) => {
      items.push({ id: file.id, type: "file", data: file, order: order++ });
    });

    // Apply custom order if exists
    if (folder.customOrder && folder.customOrder.length > 0) {
      const orderedItems: GridItem[] = [];
      const itemsMap = new Map(items.map((item) => [item.id, item]));
      
      folder.customOrder.forEach((id) => {
        const item = itemsMap.get(id);
        if (item) {
          orderedItems.push(item);
          itemsMap.delete(id);
        }
      });
      
      // Add remaining items (new files/folders not in customOrder)
      itemsMap.forEach((item) => orderedItems.push(item));
      setGridItems(orderedItems);
    } else {
      setGridItems(items);
    }
  }, [folder.id, files, folder.subfolders]);

  const handleFileContextMenu = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setFileContextMenu({ isOpen: true, fileId, position: { x: rect.right - 180, y: rect.bottom + 5 } });
  };

  const handleFolderContextMenu = (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setFolderContextMenu({ isOpen: true, folderId, position: { x: rect.right - 180, y: rect.bottom + 5 } });
  };

  const handleEditFile = () => {
    const file = files.find((f) => f.id === fileContextMenu.fileId);
    if (file) setEditFileModal({ isOpen: true, file });
    setFileContextMenu({ ...fileContextMenu, isOpen: false });
  };

  const handleSaveFileEdit = (name: string, prompt: string) => {
    if (!editFileModal.file) return;
    onUpdateFile(editFileModal.file.id, { name, prompt });
    setEditFileModal({ isOpen: false, file: null });
  };

  const handleDeleteFile = () => {
    if (confirm("Вы уверены, что хотите удалить этот файл?")) {
      onDeleteFile(fileContextMenu.fileId);
    }
    setFileContextMenu({ ...fileContextMenu, isOpen: false });
  };

  const handleEditFolder = () => {
    const targetFolder = folder.subfolders?.find((f) => f.id === folderContextMenu.folderId);
    if (targetFolder) setEditFolderModal({ isOpen: true, folder: targetFolder });
    setFolderContextMenu({ ...folderContextMenu, isOpen: false });
  };

  const handleSaveFolderEdit = (name: string, emoji: string, prompt: string) => {
    if (!editFolderModal.folder) return;
    const updatedSubfolders = folder.subfolders?.map((f) =>
      f.id === editFolderModal.folder!.id ? { ...f, name, emoji, prompt } : f
    );
    onUpdateFolder({ subfolders: updatedSubfolders });
    setEditFolderModal({ isOpen: false, folder: null });
  };

  const handleDeleteFolder = () => {
    if (confirm("Вы уверены, что хотите удалить эту папку и все её содержимое?")) {
      const updatedSubfolders = folder.subfolders?.filter((f) => f.id !== folderContextMenu.folderId);
      onUpdateFolder({ subfolders: updatedSubfolders });
      
      // Also delete all files in this subfolder
      const filesToDelete = files.filter((f) => f.folderId === folderContextMenu.folderId);
      filesToDelete.forEach((file) => onDeleteFile(file.id));
    }
    setFolderContextMenu({ ...folderContextMenu, isOpen: false });
  };

  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  const handleCreateFile = () => {
    setIsCreateFileModalOpen(true);
  };

  const handleCreateFileFromModal = (name: string, prompt: string) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      type: "text",
      folderId: folder.id,
      content: "",
      prompt: prompt || undefined,
      createdAt: new Date().toISOString(),
    };
    onCreateFile(newFile);
  };

  // Handle dropped files from OS file explorer
  const handleDroppedFiles = useCallback((files: File[]) => {
    files.forEach((file, index) => {
      const isImage = file.type.startsWith("image/");
      
      if (isImage) {
        // Create object URL for image preview
        const imageUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "photo",
          folderId: folder.id,
          imageUrl,
          createdAt: new Date().toISOString(),
        };
        onCreateFile(newFile);
      } else {
        // For text files, try to read content
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string || "";
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folder.id,
            content,
            createdAt: new Date().toISOString(),
          };
          onCreateFile(newFile);
        };
        reader.onerror = () => {
          // If reading fails, create empty text file
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folder.id,
            content: "",
            createdAt: new Date().toISOString(),
          };
          onCreateFile(newFile);
        };
        reader.readAsText(file);
      }
    });
  }, [folder.id, onCreateFile]);

  const handleCreateFolderFromModal = (name: string, emoji: string, prompt: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      emoji,
      prompt,
    };
    onUpdateFolder({
      subfolders: [...(folder.subfolders || []), newFolder]
    });
  };

  const handleFileNameChange = (fileId: string, newName: string) => {
    onUpdateFile(fileId, { name: newName });
  };

  // === FLIP 动画逻辑 ===
  const gridRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // 在 DOM 更新之前捕获所有元素的位置
  const captureGridPositions = useCallback(() => {
    if (!gridRef.current) return;
    const rects = new Map<string, DOMRect>();
    Array.from(gridRef.current.children).forEach((child) => {
      const id = (child as HTMLElement).dataset.gridItemId;
      if (id) rects.set(id, child.getBoundingClientRect());
    });
    prevRectsRef.current = rects;
  }, []);

  // 在 DOM 更新之后应用 FLIP 动画
  useLayoutEffect(() => {
    if (!gridRef.current || prevRectsRef.current.size === 0) return;

    Array.from(gridRef.current.children).forEach((child) => {
      const el = child as HTMLElement;
      const id = el.dataset.gridItemId;
      if (!id) return;

      const prevRect = prevRectsRef.current.get(id);
      if (!prevRect) return;

      const currRect = el.getBoundingClientRect();
      const dx = prevRect.left - currRect.left;
      const dy = prevRect.top - currRect.top;

      // 如果位置没有变化，跳过
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      // Invert: 将元素移回旧位置
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = 'none';

      // Play: 动画到新位置
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transform = '';
          el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';

          const cleanup = () => {
            el.style.transform = '';
            el.style.transition = '';
            el.removeEventListener('transitionend', cleanup);
          };
          el.addEventListener('transitionend', cleanup);
        });
      });
    });

    prevRectsRef.current.clear();
  }, [gridItems]);

  // 包装 moveGridItem 以支持 FLIP
  const moveGridItemWithFlip = useCallback((dragIndex: number, hoverIndex: number) => {
    captureGridPositions(); // 在更新前捕获位置
    const newItems = [...gridItems];
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setGridItems(newItems);
  }, [captureGridPositions, gridItems]);

  const moveGridItem = (dragIndex: number, hoverIndex: number) => {
    const newItems = [...gridItems];
    const draggedItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setGridItems(newItems);
  };

  const handleDragEnd = () => {
    // Save custom order only after drag operation
    if (hasOrderChangedRef.current && orderRef.current.length > 0) {
      onUpdateFolder({ customOrder: orderRef.current });
      hasOrderChangedRef.current = false;
    }
  };

  const handleFolderClick = (subfolder: Folder) => {
    const subfolderIndex = folder.subfolders?.findIndex((f) => f.id === subfolder.id) ?? -1;
    if (subfolderIndex !== -1) {
      onNavigateToSubfolder(subfolder, subfolderIndex);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title !== folder.name) onUpdateFolder({ name: title });
  };

  const handlePromptBlur = () => {
    if (aiPrompt !== folder.prompt) onUpdateFolder({ prompt: aiPrompt });
  };

  const folderFiles = files.filter((f) => f.folderId === folder.id);
  const subfolderCount = folder.subfolders?.length || 0;
  const fileCount = folderFiles.length;

  // Drop zone for files from OS
  const [{ isFileOver }, fileDropRef] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item: { files: File[] }) => {
      if (item.files && item.files.length > 0) {
        handleDroppedFiles(item.files);
      }
    },
    collect: (monitor) => ({
      isFileOver: monitor.isOver() && monitor.canDrop(),
    }),
  });

  return (
    <div 
      ref={fileDropRef}
      className={`h-full flex flex-col bg-[#121212] transition-colors ${
        isFileOver ? "bg-blue-500/5" : ""
      }`}
    >
      {/* Header Section */}
      <div className="border-b border-white/10 px-8 py-6">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`transition-colors block max-w-[150px] truncate ${
                    index < breadcrumbs.length - 1 ? "hover:text-gray-200 hover:underline cursor-pointer" : "text-gray-200"
                  }`}
                  onClick={() => {
                    if (index < breadcrumbs.length - 1) onBreadcrumbClick(index);
                  }}
                >
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Title & Emoji */}
        <div className="flex items-center gap-3 mb-4">
          {/* Emoji picker trigger */}
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className={`flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors group ${
              emoji ? "w-14 h-14 text-4xl" : "w-14 h-14"
            }`}
            title={emoji ? "Изменить иконку" : "Добавить иконку"}
          >
            {emoji ? (
              <span className="leading-none">{emoji}</span>
            ) : (
              <span className="flex flex-col items-center gap-0.5 text-gray-600 group-hover:text-gray-400 transition-colors">
                <Smile size={22} />
                <span className="text-[9px] leading-none">иконка</span>
              </span>
            )}
          </button>

          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); }}
              maxLength={50}
              className="text-3xl font-semibold bg-transparent text-white border-b-2 border-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <div className="flex-1">
              <h1
                className="text-3xl font-semibold text-white cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => setIsEditingTitle(true)}
                title="Кликните чтобы изменить название"
              >
                {title}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {subfolderCount > 0 && `${subfolderCount} ${subfolderCount === 1 ? "папка" : "папок"}`}
                {subfolderCount > 0 && fileCount > 0 && " • "}
                {fileCount > 0 && `${fileCount} ${fileCount === 1 ? "файл" : "файлов"}`}
              </p>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setIsCreateFolderModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-lg transition-colors text-sm border border-white/10"
              title="Создать папку"
            >
              <FolderIcon size={16} />
              Создать папку
            </button>
            <button
              onClick={handleCreateFile}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              title="Создать файл"
            >
              <Plus size={16} />
              Создать файл
            </button>
          </div>
        </div>

        {/* AI Prompt Field */}
        <div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onBlur={handlePromptBlur}
            placeholder="Инструкция для ИИ: что должно попадать в эту папку..."
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/20 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-purple-500/50 transition-colors"
            rows={2}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6 relative">
        {/* Drop overlay when dragging files */}
        {isFileOver && gridItems.length > 0 && (
          <div className="absolute inset-0 bg-blue-500/5 border-2 border-dashed border-blue-500/50 rounded-xl z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-[#1a1a1a] px-6 py-4 rounded-xl border border-blue-500/30">
              <div className="flex items-center gap-3">
                <Upload size={24} className="text-blue-400" />
                <span className="text-blue-300 text-lg">Отпустите файлы для загрузки</span>
              </div>
            </div>
          </div>
        )}
        {/* 自定义拖拽预览层 */}
        <CustomDragLayer />
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridItems.map((item, index) => (
            <DraggableGridItem
              key={item.id}
              item={item}
              index={index}
              moveItem={moveGridItemWithFlip}
              onDragEnd={handleDragEnd}
              onFileContextMenu={handleFileContextMenu}
              onFolderContextMenu={handleFolderContextMenu}
              onFolderClick={handleFolderClick}
              onFileDoubleClick={onOpenFile}
              onMoveItemToFolder={(itemId, destFolderId, itemType) => {
                if (itemType === "file") {
                  onUpdateFile(itemId, { folderId: destFolderId });
                } else if (itemType === "folder") {
                  const items = folder.subfolders || [];
                  const draggedFolder = items.find(f => f.id === itemId);
                  if (draggedFolder) {
                    const newSubfolders = items.map(f => {
                      if (f.id === destFolderId) {
                        return { ...f, subfolders: [...(f.subfolders || []), draggedFolder] };
                      }
                      return f;
                    }).filter(f => f.id !== itemId);
                    onUpdateFolder({ subfolders: newSubfolders });
                  }
                }
                setGridItems((prev) => prev.filter(i => i.id !== itemId));
              }}
              editingFileId={editingFileId}
              onFileNameChange={handleFileNameChange}
              onEditingComplete={() => setEditingFileId(null)}
            />
          ))}
        </div>

        {/* Empty State */}
        {gridItems.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full text-center ${
            isFileOver ? "ring-2 ring-blue-500/50 ring-inset rounded-xl" : ""
          }`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${
              isFileOver ? "bg-blue-500/10" : "bg-white/5"
            }`}>
              {isFileOver ? (
                <Upload size={40} className="text-blue-400" />
              ) : (
                <span className="text-5xl">{emoji}</span>
              )}
            </div>
            <p className="text-gray-400 text-lg mb-2">
              {isFileOver ? "Отпустите файлы для загрузки" : "Папка пуста"}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              {isFileOver ? "" : "Перетащите файлы сюда или создайте новый"}
            </p>
            {!isFileOver && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-lg transition-colors text-sm border border-white/10"
                >
                  <FolderIcon size={16} />
                  Создать папку
                </button>
                <button
                  onClick={handleCreateFile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} />
                  Создать первый файл
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <FileContextMenu
        isOpen={fileContextMenu.isOpen}
        onClose={() => setFileContextMenu({ ...fileContextMenu, isOpen: false })}
        onEdit={handleEditFile}
        onDelete={handleDeleteFile}
        position={fileContextMenu.position}
      />
      <FolderContextMenu
        isOpen={folderContextMenu.isOpen}
        onClose={() => setFolderContextMenu({ ...folderContextMenu, isOpen: false })}
        onEdit={handleEditFolder}
        onDelete={handleDeleteFolder}
        position={folderContextMenu.position}
      />
      <EditFileModal
        isOpen={editFileModal.isOpen}
        onClose={() => setEditFileModal({ isOpen: false, file: null })}
        fileName={editFileModal.file?.name || ""}
        currentPrompt={editFileModal.file?.prompt || ""}
        onSave={handleSaveFileEdit}
      />
      <EditFolderModal
        isOpen={editFolderModal.isOpen}
        onClose={() => setEditFolderModal({ isOpen: false, folder: null })}
        folderName={editFolderModal.folder?.name || ""}
        folderEmoji={editFolderModal.folder?.emoji || ""}
        currentPrompt={editFolderModal.folder?.prompt || ""}
        onSave={handleSaveFolderEdit}
      />
      <CreateFileModal
        isOpen={isCreateFileModalOpen}
        onClose={() => setIsCreateFileModalOpen(false)}
        onCreate={handleCreateFileFromModal}
      />
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolderFromModal}
      />
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelect={(selectedEmoji) => {
          setEmoji(selectedEmoji);
          onUpdateFolder({ emoji: selectedEmoji });
          setIsEmojiPickerOpen(false);
        }}
        onRemove={() => {
          setEmoji("");
          onUpdateFolder({ emoji: "" });
          setIsEmojiPickerOpen(false);
        }}
        hasEmoji={!!emoji}
        anchorEl={emojiTriggerRef.current}
      />
    </div>
  );
}
