import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { ChevronRight, MoreVertical, FileText, ArrowLeft, Plus, Folder as FolderIcon, Image as ImageIcon, Smile, Upload, File as FileIcon, Loader2 } from "lucide-react";
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
import type { Folder, FileItem } from "../Workspace";

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
  onCreateFile: (file: FileItem, openAfterCreate?: boolean) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateFile: (fileId: string, updates: Partial<FileItem>) => void;
  isLoadingFiles?: boolean;
}

const GRID_ITEM_TYPE = "GRID_ITEM";
type DropIntent = "reorder" | "nest" | null;
function calculateDropIntent(
  hoverClientX: number,
  hoverClientY: number,
  width: number,
  height: number,
  targetType: GridItemType,
  draggedId: string,
  targetId: string
): DropIntent {
  if (draggedId === targetId) return null;
  if (targetType === "file") return "reorder";
  const centerXStart = width * 0.2;
  const centerXEnd = width * 0.8;
  const centerYStart = height * 0.2;
  const centerYEnd = height * 0.8;
  
  const isInCenterX = hoverClientX >= centerXStart && hoverClientX <= centerXEnd;
  const isInCenterY = hoverClientY >= centerYStart && hoverClientY <= centerYEnd;
  
  if (isInCenterX && isInCenterY) {
    return "nest"; 
  }
  
  return "reorder"; 
}
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
  const [justDropped, setJustDropped] = useState(false);
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  const lastIntentRef = useRef<DropIntent>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const itemName = item.type === "folder" 
    ? (item.data as Folder).name 
    : (item.data as FileItem).name;

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: GRID_ITEM_TYPE,
    item: () => ({ 
      index, 
      id: item.id, 
      origType: item.type,
      name: itemName, 
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, _monitor) => {
      setJustDropped(true);
      setDropIntent(null);
      lastIntentRef.current = null;
      onDragEnd();
      setTimeout(() => setJustDropped(false), 400);
    },
  });
  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);
  const isDescendantOf = (ancestorFolder: Folder, candidateId: string): boolean => {
    if (!ancestorFolder.subfolders) return false;
    for (const sub of ancestorFolder.subfolders) {
      if (sub.id === candidateId) return true;
      if (isDescendantOf(sub, candidateId)) return true;
    }
    return false;
  };
  const canNestIntoFolder = (draggedItem: { id: string; origType: GridItemType }): boolean => {
    if (item.type !== "folder") return false;
    if (draggedItem.id === item.id) return false;
    
    const targetFolder = item.data as Folder;
    if (draggedItem.origType === "folder") {
      if (isDescendantOf(targetFolder, draggedItem.id)) {
        return false; 
      }
      if (targetFolder.subfolders?.some(f => f.id === draggedItem.id)) {
        return false; 
      }
    }
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
      let intent = calculateDropIntent(
        hoverClientX,
        hoverClientY,
        width,
        height,
        item.type,
        draggedItem.id,
        item.id
      );
      if (intent === "nest") {
        const draggedItemForValidation = { id: draggedItem.id, origType: draggedItem.origType };
        if (!canNestIntoFolder(draggedItemForValidation)) {
          intent = item.type === "folder" ? "reorder" : null;
        }
      }
      if (intent !== lastIntentRef.current) {
        setDropIntent(intent);
        lastIntentRef.current = intent;
      }
      if (intent === "nest") {
        return;
      }
      if (intent === "reorder" && dragIndex !== hoverIndex) {
        const hoverMiddleX = width / 2;
        if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
        if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;
        const now = Date.now();
        if (now - lastMoveTimeRef.current < 150) return;
        lastMoveTimeRef.current = now;

        moveItem(dragIndex, hoverIndex);
        draggedItem.index = hoverIndex;
      }
    },
    drop: (draggedItem: { index: number; id: string; origType: GridItemType }, monitor) => {
      if (dropIntent === "nest" && canNestIntoFolder(draggedItem)) {
        onMoveItemToFolder(draggedItem.id, item.id, draggedItem.origType);
        return { movedIntoFolder: true };
      }
      setDropIntent(null);
      lastIntentRef.current = null;
    },
    canDrop: (draggedItem) => {
      return draggedItem.id !== item.id;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  useEffect(() => {
    if (!isOver) {
      setDropIntent(null);
      lastIntentRef.current = null;
    }
  }, [isOver]);

  drag(drop(ref));
  const handleFileClick = (fileId: string) => {
    if (isDragging) return;
    onFileDoubleClick(fileId);
  };

  if (item.type === "folder") {
    const folder = item.data as Folder;
    const getDropZoneStyles = () => {
      if (!isOver || !canDrop) return "border-white/10";
      
      if (dropIntent === "nest") {
        return "border-green-500 ring-2 ring-green-500/40 scale-[1.03] shadow-[0_0_20px_rgba(34,197,94,0.3)]";
      }
      
      if (dropIntent === "reorder") {
        return "border-blue-500 ring-1 ring-blue-500/30";
      }
      
      return "border-white/10";
    };
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; 
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
    const getFileDropStyles = () => {
      if (!isOver || !canDrop) return "border-white/10";
      if (dropIntent === "reorder") return "border-blue-500 ring-1 ring-blue-500/30";
      return "border-white/10";
    };
    const getItemAnimationClass = () => {
      if (isDragging) return "opacity-0 scale-95 transition-opacity duration-150";
      if (justDropped) return "animate-drop-land"; 
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
        {file.type === "photo" && file.contentUrl ? (
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={file.contentUrl}
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
              ) : file.type === "pdf" ? (
                <FileIcon size={32} className="text-red-400" />
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
  isLoadingFiles = false,
}: FolderContentViewProps) {
  const [title, setTitle] = useState(folder.name);
  const [emoji, setEmoji] = useState(folder.emoji || "");
  const [description, setDescription] = useState(folder.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  
  const [editFileModal, setEditFileModal] = useState<{ isOpen: boolean; file: FileItem | null; }>({ isOpen: false, file: null });
  const [editFolderModal, setEditFolderModal] = useState<{ isOpen: boolean; folder: Folder | null; }>({ isOpen: false, folder: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ isOpen: boolean; fileId: string; position: { x: number; y: number }; }>({ isOpen: false, fileId: "", position: { x: 0, y: 0 } });
  const [folderContextMenu, setFolderContextMenu] = useState<{ isOpen: boolean; folderId: string; position: { x: number; y: number }; }>({ isOpen: false, folderId: "", position: { x: 0, y: 0 } });
  const orderRef = useRef<string[]>([]);
  const updateRef = useRef(onUpdateFolder);
  const hasOrderChangedRef = useRef(false);
  useEffect(() => {
    updateRef.current = onUpdateFolder;
  }, [onUpdateFolder]);
  useEffect(() => {
    const newOrder = gridItems.map((item) => item.id);
    const hasChanged = JSON.stringify(newOrder) !== JSON.stringify(orderRef.current);
    orderRef.current = newOrder;
    if (hasChanged && newOrder.length > 0) {
      hasOrderChangedRef.current = true;
    }
  }, [gridItems]);
  useEffect(() => {
    setTitle(folder.name);
    setEmoji(folder.emoji || "");
    setDescription(folder.description || "");
  }, [folder.name, folder.emoji, folder.description]);
  useEffect(() => {
    const folderFiles = files.filter((f) => f.folderId === folder.id);
    const items: GridItem[] = [];
    let order = 0;
    if (folder.subfolders) {
      folder.subfolders.forEach((subfolder) => {
        items.push({ id: subfolder.id, type: "folder", data: subfolder, order: order++ });
      });
    }
    folderFiles.forEach((file) => {
      items.push({ id: file.id, type: "file", data: file, order: order++ });
    });
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

  const handleSaveFileEdit = (name: string, description: string) => {
    if (!editFileModal.file) return;
    onUpdateFile(editFileModal.file.id, { name, description });
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

  const handleSaveFolderEdit = (name: string, emoji: string, description: string) => {
    if (!editFolderModal.folder) return;
    const updatedSubfolders = folder.subfolders?.map((f) =>
      f.id === editFolderModal.folder!.id ? { ...f, name, emoji, description } : f
    );
    onUpdateFolder({ subfolders: updatedSubfolders });
    setEditFolderModal({ isOpen: false, folder: null });
  };

  const handleDeleteFolder = () => {
    if (confirm("Вы уверены, что хотите удалить эту папку и все её содержимое?")) {
      const updatedSubfolders = folder.subfolders?.filter((f) => f.id !== folderContextMenu.folderId);
      onUpdateFolder({ subfolders: updatedSubfolders });
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

  const handleCreateFileFromModal = (name: string, description: string) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      type: "text",
      folderId: folder.id,
      content: "",
      description: description || undefined,
      createdAt: new Date().toISOString(),
    };
    onCreateFile(newFile);
  };
  const handleDroppedFiles = useCallback((files: File[]) => {
    files.forEach((file, index) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      
      if (isImage) {
        const contentUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "photo",
          folderId: folder.id,
          contentUrl,
          contentType: file.type,
          createdAt: new Date().toISOString(),
        };
        onCreateFile(newFile, false);
      } else if (isPdf) {
        const contentUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "pdf",
          folderId: folder.id,
          contentUrl,
          contentType: "application/pdf",
          createdAt: new Date().toISOString(),
        };
        onCreateFile(newFile, false);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string || "";
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folder.id,
            content,
            contentType: file.type || "text/plain",
            createdAt: new Date().toISOString(),
          };
          onCreateFile(newFile, false);
        };
        reader.onerror = () => {
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folder.id,
            content: "",
            contentType: "text/plain",
            createdAt: new Date().toISOString(),
          };
          onCreateFile(newFile, false);
        };
        reader.readAsText(file);
      }
    });
  }, [folder.id, onCreateFile]);

  const handleCreateFolderFromModal = (name: string, emoji: string, description: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      emoji,
      description,
    };
    onUpdateFolder({
      subfolders: [...(folder.subfolders || []), newFolder]
    });
  };

  const handleFileNameChange = (fileId: string, newName: string) => {
    onUpdateFile(fileId, { name: newName });
  };

  // === FLIP animation logic ===
  const gridRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const isAnimatingRef = useRef(false);
  const captureGridPositions = useCallback(() => {
    if (!gridRef.current) return;
    const rects = new Map<string, DOMRect>();
    Array.from(gridRef.current.children).forEach((child) => {
      const id = (child as HTMLElement).dataset.gridItemId;
      if (id) rects.set(id, child.getBoundingClientRect());
    });
    prevRectsRef.current = rects;
  }, []);
  useLayoutEffect(() => {
    if (!gridRef.current || prevRectsRef.current.size === 0 || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const children = Array.from(gridRef.current.children) as HTMLElement[];
    const animations: { el: HTMLElement; dx: number; dy: number }[] = [];

    children.forEach((el) => {
      const id = el.dataset.gridItemId;
      if (!id) return;

      const prevRect = prevRectsRef.current.get(id);
      if (!prevRect) return;

      const currRect = el.getBoundingClientRect();
      const dx = prevRect.left - currRect.left;
      const dy = prevRect.top - currRect.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      animations.push({ el, dx, dy });
    });

    if (animations.length === 0) {
      prevRectsRef.current.clear();
      isAnimatingRef.current = false;
      return;
    }
    animations.forEach(({ el, dx, dy }) => {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.willChange = 'transform';
    });
    gridRef.current.offsetHeight;
    animations.forEach(({ el }) => {
      el.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0.2, 1)';
      el.style.transform = '';
    });
    const timeout = setTimeout(() => {
      animations.forEach(({ el }) => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
      });
      isAnimatingRef.current = false;
    }, 260);

    prevRectsRef.current.clear();

    return () => {
      clearTimeout(timeout);
      isAnimatingRef.current = false;
    };
  }, [gridItems]);
  const moveGridItemWithFlip = useCallback((dragIndex: number, hoverIndex: number) => {
    captureGridPositions();
    setGridItems((prev) => {
      const newItems = [...prev];
      const [draggedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems;
    });
  }, [captureGridPositions]);

  const handleDragEnd = () => {
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

  const handleDescriptionBlur = () => {
    if (description !== folder.description) onUpdateFolder({ description });
  };

  const folderFiles = files.filter((f) => f.folderId === folder.id);
  const subfolderCount = folder.subfolders?.length || 0;
  const fileCount = folderFiles.length;
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

        {/* Description Field */}
        <div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Описание папки: что должно попадать в эту папку..."
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

        {/* Loading State */}
        {isLoadingFiles && gridItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
            <p className="text-gray-400 text-lg">Загрузка файлов...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingFiles && gridItems.length === 0 && (
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
        currentDescription={editFileModal.file?.description || ""}
        onSave={handleSaveFileEdit}
      />
      <EditFolderModal
        isOpen={editFolderModal.isOpen}
        onClose={() => setEditFolderModal({ isOpen: false, folder: null })}
        folderName={editFolderModal.folder?.name || ""}
        folderEmoji={editFolderModal.folder?.emoji || ""}
        currentDescription={editFolderModal.folder?.description || ""}
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
