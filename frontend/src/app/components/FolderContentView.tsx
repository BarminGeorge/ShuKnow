import { useState, useEffect, useRef } from "react";
import { ChevronRight, MoreVertical, FileText, ArrowLeft, Plus, Folder as FolderIcon, Image as ImageIcon, Smile } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { FileContextMenu } from "./FileContextMenu";
import { FolderContextMenu } from "./FolderContextMenu";
import { EditFileModal } from "./EditFileModal";
import { EditFolderModal } from "./EditFolderModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EmojiPicker } from "./EmojiPicker";
import type { Folder, FileItem } from "@/features/workspace/model/types";

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
  onNavigateToSubfolder: (subfolder: Folder) => void;
  onBreadcrumbClick: (index: number) => void;
  files: FileItem[];
  onOpenFile: (fileId: string) => void;
  onCreateFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateFile: (fileId: string, updates: Partial<FileItem>) => void;
}

const GRID_ITEM_TYPE = "GRID_ITEM";

interface DraggableGridItemProps {
  item: GridItem;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onFileContextMenu: (fileId: string, event: React.MouseEvent) => void;
  onFolderContextMenu: (folderId: string, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder) => void;
  onFileDoubleClick: (fileId: string) => void;
  editingFileId: string | null;
  onFileNameChange: (fileId: string, newName: string) => void;
  onEditingComplete: () => void;
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
  editingFileId,
  onFileNameChange,
  onEditingComplete,
}: DraggableGridItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  const [{ isDragging }, drag] = useDrag({
    type: GRID_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: onDragEnd,
  });

  const [{ isOver }, drop] = useDrop({
    accept: GRID_ITEM_TYPE,
    hover: (draggedItem: { index: number }, monitor) => {
      if (!ref.current) return;
      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) return;

      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  // Handle click/double-click for files
  const handleFileClick = (fileId: string) => {
    // Ignore clicks if item was being dragged
    if (isDragging) return;

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        // Single click - do nothing (reserved for selection/drag)
      }, 300);
    } else if (clickCountRef.current === 2) {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      clickCountRef.current = 0;
      // Double click - open file
      onFileDoubleClick(fileId);
    }
  };

  if (item.type === "folder") {
    const folder = item.data as Folder;
    return (
      <div
        ref={ref}
        className={`group relative bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden hover:border-blue-400/50 transition-all cursor-pointer ${
          isDragging ? "opacity-50" : ""
        } ${isOver ? "border-blue-500" : ""}`}
        onClick={() => onFolderClick(folder)}
      >
        <div className="aspect-[4/3] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
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
        <button
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
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

    return (
      <div
        ref={ref}
        className={`group relative bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all cursor-pointer ${
          isDragging ? "opacity-50" : ""
        } ${isOver ? "border-blue-500" : ""}`}
        onClick={() => handleFileClick(file.id)}
        title="Дважды кликните для открытия"
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
  const [emoji, setEmoji] = useState(folder.emoji ?? "");
  const [aiPrompt, setAiPrompt] = useState(folder.prompt ?? "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  const [editFileModal, setEditFileModal] = useState<{
    isOpen: boolean;
    file: FileItem | null;
  }>({ isOpen: false, file: null });
  const [editFolderModal, setEditFolderModal] = useState<{
    isOpen: boolean;
    folder: Folder | null;
  }>({ isOpen: false, folder: null });
  const [fileContextMenu, setFileContextMenu] = useState<{
    isOpen: boolean;
    fileId: string;
    position: { x: number; y: number };
  }>({ isOpen: false, fileId: "", position: { x: 0, y: 0 } });
  const [folderContextMenu, setFolderContextMenu] = useState<{
    isOpen: boolean;
    folderId: string;
    position: { x: number; y: number };
  }>({ isOpen: false, folderId: "", position: { x: 0, y: 0 } });

  // Pending delete targets for accessible confirmation dialogs
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<{
    isOpen: boolean;
    fileId: string | null;
  }>({ isOpen: false, fileId: null });
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{
    isOpen: boolean;
    folderId: string | null;
  }>({ isOpen: false, folderId: null });

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
    setDeleteFileConfirm({ isOpen: true, fileId: fileContextMenu.fileId });
    setFileContextMenu({ ...fileContextMenu, isOpen: false });
  };

  const handleConfirmDeleteFile = () => {
    if (deleteFileConfirm.fileId) onDeleteFile(deleteFileConfirm.fileId);
    setDeleteFileConfirm({ isOpen: false, fileId: null });
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
    setDeleteFolderConfirm({ isOpen: true, folderId: folderContextMenu.folderId });
    setFolderContextMenu({ ...folderContextMenu, isOpen: false });
  };

  const handleConfirmDeleteFolder = () => {
    if (!deleteFolderConfirm.folderId) return;
    const updatedSubfolders = folder.subfolders?.filter(
      (f) => f.id !== deleteFolderConfirm.folderId
    );
    onUpdateFolder({ subfolders: updatedSubfolders });
    const filesToDelete = files.filter((f) => f.folderId === deleteFolderConfirm.folderId);
    filesToDelete.forEach((file) => onDeleteFile(file.id));
    setDeleteFolderConfirm({ isOpen: false, folderId: null });
  };

  const handleCreateFile = () => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: "Новая заметка.txt",
      type: "text",
      folderId: folder.id,
      content: "",
      createdAt: new Date().toISOString(),
    };
    onCreateFile(newFile);
    setEditingFileId(newFile.id);
  };

  const handleFileNameChange = (fileId: string, newName: string) => {
    onUpdateFile(fileId, { name: newName });
  };

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
    onNavigateToSubfolder(subfolder);
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

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      {/* Header Section */}
      <div className="border-b border-white/10 px-8 py-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-4 -ml-1 px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          <span>Назад к чату</span>
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Навигация по папкам" className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index < breadcrumbs.length - 1 ? (
                <button
                  className="transition-colors hover:text-gray-200 hover:underline"
                  onClick={() => onBreadcrumbClick(index)}
                >
                  {crumb}
                </button>
              ) : (
                <span className="text-gray-200" aria-current="page">{crumb}</span>
              )}
              {index < breadcrumbs.length - 1 && <ChevronRight size={14} aria-hidden />}
            </div>
          ))}
        </nav>

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
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); }}
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

          <button
            onClick={handleCreateFile}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            title="Создать файл"
          >
            <Plus size={16} />
            Создать файл
          </button>
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
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridItems.map((item, index) => (
            <DraggableGridItem
              key={item.id}
              item={item}
              index={index}
              moveItem={moveGridItem}
              onDragEnd={handleDragEnd}
              onFileContextMenu={handleFileContextMenu}
              onFolderContextMenu={handleFolderContextMenu}
              onFolderClick={handleFolderClick}
              onFileDoubleClick={onOpenFile}
              editingFileId={editingFileId}
              onFileNameChange={handleFileNameChange}
              onEditingComplete={() => setEditingFileId(null)}
            />
          ))}
        </div>

        {/* Empty State */}
        {gridItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="text-5xl">{emoji}</span>
            </div>
            <p className="text-gray-400 text-lg mb-2">Папка пуста</p>
            <p className="text-gray-500 text-sm mb-4">Файлы появятся здесь автоматически после сортировки</p>
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
      <DeleteConfirmDialog
        isOpen={deleteFileConfirm.isOpen}
        title="Удалить файл?"
        description="Это действие нельзя отменить. Файл будет удалён навсегда."
        onConfirm={handleConfirmDeleteFile}
        onCancel={() => setDeleteFileConfirm({ isOpen: false, fileId: null })}
      />
      <DeleteConfirmDialog
        isOpen={deleteFolderConfirm.isOpen}
        title="Удалить папку?"
        description="Это действие нельзя отменить. Папка и всё её содержимое будут удалены навсегда."
        onConfirm={handleConfirmDeleteFolder}
        onCancel={() => setDeleteFolderConfirm({ isOpen: false, folderId: null })}
      />
    </div>
  );
}