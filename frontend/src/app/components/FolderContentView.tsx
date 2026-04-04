import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { ChevronRight, MoreVertical, FileText, ArrowLeft, Plus, Folder as FolderIcon, Image as ImageIcon, Smile, Upload, File as FileIcon, Paperclip } from "lucide-react";
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
import type { Folder, FileItem } from "../../api/types";
import { useWorkspaceView } from "../hooks/useWorkspaceView";
import { useFiles } from "../hooks/useFiles";
import { useFolders } from "../hooks/useFolders";
import { useTabs } from "../hooks/useTabs";
import { useAtomValue } from "jotai";
import { filesInCurrentFolderAtom } from "../store";
import type { GridItemType, GridItem, FolderContentViewProps, DropIntent, DraggableGridItemProps } from "./FolderContentView/types";
import { GRID_ITEM_TYPE } from "./FolderContentView/constants";
import {
  formatRelativeDate,
  formatFolderStats,
  formatFolderStatsHeader,
} from "./FolderContentView/helpers";
import { CustomDragLayer } from "./FolderContentView/components/CustomDragLayer";
import { DraggableGridItem } from "./FolderContentView/components/DraggableGridItem";

export function FolderContentView({
  onBack,
  onNavigateToSubfolder,
  onBreadcrumbClick,
}: FolderContentViewProps) {
  // Jotai hooks
  const { currentFolder, breadcrumbs, selectedFolderPath } = useWorkspaceView();
  const { updateFolder } = useFolders();
  const { createFile, updateFile, deleteFile } = useFiles();
  const { openTab } = useTabs();
  const files = useAtomValue(filesInCurrentFolderAtom);
  
  // Early return if no folder selected
  if (!currentFolder) {
    return null;
  }
  
  const folder = currentFolder;
  
  const [title, setTitle] = useState(folder.name);
  const [emoji, setEmoji] = useState(folder.emoji || "");
  const [aiPrompt, setAiPrompt] = useState(folder.prompt || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  
  const [editFileModal, setEditFileModal] = useState<{ isOpen: boolean; file: FileItem | null; }>({ isOpen: false, file: null });
  const [editFolderModal, setEditFolderModal] = useState<{ isOpen: boolean; folder: Folder | null; }>({ isOpen: false, folder: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ isOpen: boolean; fileId: string; position: { x: number; y: number }; }>({ isOpen: false, fileId: "", position: { x: 0, y: 0 } });
  const [folderContextMenu, setFolderContextMenu] = useState<{ isOpen: boolean; folderId: string; position: { x: number; y: number }; }>({ isOpen: false, folderId: "", position: { x: 0, y: 0 } });

  // Refs for state management without re-renders
  const orderRef = useRef<string[]>([]);
  const hasOrderChangedRef = useRef(false);

  // Handler for updating folder
  const handleUpdateFolder = useCallback((updates: Partial<Folder>) => {
    if (!selectedFolderPath || selectedFolderPath.length === 0) {
      console.warn('Cannot update folder: no folder path selected');
      return;
    }
    updateFolder(selectedFolderPath, updates);
  }, [updateFolder, selectedFolderPath]);

  // Global dragend cleanup to ensure pointer events are restored
  useEffect(() => {
    const handleDragEnd = () => {
      // Ensure cursor is restored after drag
      document.body.style.cursor = '';
      // Remove any lingering drag-related styles
      document.body.classList.remove('dragging');
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

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
  }, [folder]);

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
    setFileContextMenu({ isOpen: true, fileId, position: { x: event.clientX + 4, y: event.clientY + 4 } });
  };

  const handleFolderContextMenu = (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFolderContextMenu({ isOpen: true, folderId, position: { x: event.clientX + 4, y: event.clientY + 4 } });
  };

  const handleEditFile = () => {
    const file = files.find((f) => f.id === fileContextMenu.fileId);
    if (file) setEditFileModal({ isOpen: true, file });
    setFileContextMenu({ ...fileContextMenu, isOpen: false });
  };

  const handleSaveFileEdit = (name: string, prompt: string) => {
    if (!editFileModal.file) return;
    updateFile(editFileModal.file.id, { name, prompt });
    setEditFileModal({ isOpen: false, file: null });
  };

  const handleDeleteFile = () => {
    if (confirm("Вы уверены, что хотите удалить этот файл?")) {
      deleteFile(fileContextMenu.fileId);
    }
    setFileContextMenu({ ...fileContextMenu, isOpen: false });
  };

  const handleDownloadFile = () => {
    const file = files.find((f) => f.id === fileContextMenu.fileId);
    if (!file) return;

    if (file.type === "photo" && file.contentUrl) {
      // Download photo
      const link = document.createElement("a");
      link.href = file.contentUrl;
      link.download = file.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file.content) {
      // Download text file
      const blob = new Blob([file.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
    
    // Find the index of the subfolder being edited
    const subfolderIndex = folder.subfolders?.findIndex((f) => f.id === editFolderModal.folder!.id);
    
    if (subfolderIndex !== undefined && subfolderIndex !== -1 && selectedFolderPath) {
      // Build path to the subfolder: current path + subfolder index
      const subfolderPath = [...selectedFolderPath, subfolderIndex.toString()];
      
      // Update the subfolder directly by its path
      updateFolder(subfolderPath, { name, emoji, prompt });
    }
    
    setEditFolderModal({ isOpen: false, folder: null });
  };

  const handleDeleteFolder = () => {
    if (confirm("Вы уверены, что хотите удалить эту папку и все её содержимое?")) {
      const updatedSubfolders = folder.subfolders?.filter((f) => f.id !== folderContextMenu.folderId);
      handleUpdateFolder({ subfolders: updatedSubfolders });
      
      // Also delete all files in this subfolder
      const filesToDelete = files.filter((f) => f.folderId === folderContextMenu.folderId);
      filesToDelete.forEach((file) => deleteFile(file.id));
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
    createFile(newFile, true); // Open file after creation
  };

  // Handle dropped files from OS file explorer
  const handleDroppedFiles = useCallback((files: File[]) => {
    files.forEach((file, index) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      
      if (isImage) {
        // Create object URL for image preview
        const contentUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "photo",
          folderId: folder.id,
          contentUrl,
          createdAt: new Date().toISOString(),
        };
        createFile(newFile, false); // Don't open after drop
      } else if (isPdf) {
        // Create object URL for PDF viewing
        const pdfUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "pdf",
          folderId: folder.id,
          pdfUrl,
          createdAt: new Date().toISOString(),
        };
        createFile(newFile, false); // Don't open after drop
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
          createFile(newFile, false); // Don't open after drop
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
          createFile(newFile, false); // Don't open after drop
        };
        reader.readAsText(file);
      }
    });
  }, [folder.id, createFile]);

  const handleCreateFolderFromModal = (name: string, emoji: string, prompt: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      emoji,
      prompt,
      description: "",
      sortOrder: (folder.subfolders || []).length,
      fileCount: 0,
      subfolders: [],
    };
    handleUpdateFolder({
      subfolders: [...(folder.subfolders || []), newFolder]
    });
    setIsCreateFolderModalOpen(false);
  };

  const handleFileNameChange = (fileId: string, newName: string) => {
    updateFile(fileId, { name: newName });
  };

  // === FLIP animation logic ===
  const gridRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const isAnimatingRef = useRef(false);

  // Capture positions of all grid children before a state update
  const captureGridPositions = useCallback(() => {
    if (!gridRef.current) return;
    const rects = new Map<string, DOMRect>();
    Array.from(gridRef.current.children).forEach((child) => {
      const id = (child as HTMLElement).dataset.gridItemId;
      if (id) rects.set(id, child.getBoundingClientRect());
    });
    prevRectsRef.current = rects;
  }, []);

  // After DOM update, animate elements from old position to new position
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

    // Step 1 (Invert): instantly move elements to their old positions
    animations.forEach(({ el, dx, dy }) => {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.willChange = 'transform';
    });

    // Force a reflow so the browser registers the "old" position
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    gridRef.current.offsetHeight;

    // Step 2 (Play): animate to the new (natural) position
    animations.forEach(({ el }) => {
      el.style.transition = 'transform 250ms cubic-bezier(0.2, 0, 0.2, 1)';
      el.style.transform = '';
    });

    // Cleanup after animation finishes
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

  // Wrapper: capture positions, then update state
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
    // Save custom order only after drag operation
    if (hasOrderChangedRef.current && orderRef.current.length > 0) {
      handleUpdateFolder({ customOrder: orderRef.current });
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
    if (title !== folder.name) handleUpdateFolder({ name: title });
  };

  const handlePromptBlur = () => {
    if (aiPrompt !== folder.prompt) handleUpdateFolder({ prompt: aiPrompt });
  };

  const folderFiles = files.filter((f) => f.folderId === folder.id);
  const subfolderCount = folder.subfolders?.length || 0;
  const fileCount = folderFiles.filter(f => f.type !== "photo").length;
  const photoCount = folderFiles.filter(f => f.type === "photo").length;

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

  // Handler for files dragged from chat
  const handleChatFileDrop = (e: React.DragEvent) => {
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const chatFile = JSON.parse(jsonData);
        if (chatFile.type === 'chat-file') {
          console.log('Dropped chat file:', chatFile);
          // TODO: Handle chat file drop - move file to this folder
          // For now just show a toast
        }
      } catch {
        // Not a chat file, ignore
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Allow drop for chat files
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault();
    }
  };

  return (
    <div 
      ref={fileDropRef}
      onDragOver={handleDragOver}
      onDrop={handleChatFileDrop}
      className={`h-full flex flex-col bg-[#121212] transition-colors ${
                  isFileOver ? "bg-indigo-500/5" : ""      }`}
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
              className="text-3xl font-semibold bg-transparent text-white border-b-2 border-indigo-500 outline-none"
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
                {formatFolderStatsHeader(subfolderCount, fileCount, photoCount)}
              </p>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {gridItems.length > 0 && (
              <>
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
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm border border-indigo-500/20"
                  title="Создать файл"
                >
                  <Plus size={16} />
                  Создать файл
                </button>
              </>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-lg transition-colors text-sm border border-white/10"
              title="Прикрепить файл"
            >
              <Paperclip size={16} />
              Прикрепить файл
            </button>
          </div>
        </div>

        {/* Hidden file input for attaching files */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.html,.css"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              handleDroppedFiles(files);
            }
            // Reset input so the same file can be selected again
            e.target.value = "";
          }}
        />

        {/* AI Prompt Field */}
        <div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onBlur={handlePromptBlur}
            placeholder="Инструкция для ИИ: что должно попадать в эту папку..."
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-indigo-500/50 transition-colors"
            rows={2}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6 relative">
        {/* Drop overlay when dragging files */}
        {isFileOver && gridItems.length > 0 && (
          <div className="absolute inset-0 bg-indigo-500/5 border-2 border-dashed border-indigo-500/50 rounded-xl z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-[#141414] px-6 py-4 rounded-xl border border-indigo-500/30">
              <div className="flex items-center gap-3">
                <Upload size={24} className="text-indigo-400" />
                <span className="text-indigo-300 text-lg">Отпустите файлы для загрузки</span>
              </div>
            </div>
          </div>
        )}
        {/* 自定义拖拽预览层 */}
        <CustomDragLayer />
        <div ref={gridRef} className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
              onFileDoubleClick={openTab}
              onMoveItemToFolder={(itemId, destFolderId, itemType) => {
                if (itemType === "file") {
                  updateFile(itemId, { folderId: destFolderId });
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
                    handleUpdateFolder({ subfolders: newSubfolders });
                  }
                }
                setGridItems((prev) => prev.filter(i => i.id !== itemId));
              }}
              editingFileId={editingFileId}
              onFileNameChange={handleFileNameChange}
              onEditingComplete={() => setEditingFileId(null)}
              allFiles={files}
              openContextMenuId={
                fileContextMenu.isOpen ? fileContextMenu.fileId :
                folderContextMenu.isOpen ? folderContextMenu.folderId : null
              }
            />
          ))}
        </div>

        {/* Empty State */}
        {gridItems.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full text-center ${
            isFileOver ? "ring-2 ring-indigo-500/50 ring-inset rounded-xl" : ""
          }`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${
              isFileOver ? "bg-indigo-500/10" : "bg-white/5"
            }`}>
              {isFileOver ? (
                <Upload size={40} className="text-indigo-400" />
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
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm border border-indigo-500/20"
                >
                  <Plus size={16} />
                  Создать файл
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
        onDownload={handleDownloadFile}
        position={fileContextMenu.position}
        isPhoto={files.find(f => f.id === fileContextMenu.fileId)?.type === "photo"}
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
          handleUpdateFolder({ emoji: selectedEmoji });
          setIsEmojiPickerOpen(false);
        }}
        onRemove={() => {
          setEmoji("");
          handleUpdateFolder({ emoji: "" });
          setIsEmojiPickerOpen(false);
        }}
        hasEmoji={!!emoji}
        anchorEl={emojiTriggerRef.current}
      />
    </div>
  );
}
