import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { FileContextMenu } from "./FileContextMenu";
import { FolderContextMenu } from "./FolderContextMenu";
import { EditFileModal } from "./EditFileModal";
import { EditFolderModal } from "./EditFolderModal";
import { CreateFileModal } from "./CreateFileModal";
import { CreateFolderModal } from "./CreateFolderModal";
import type { Folder, FileItem } from "../../api/types";
import { useWorkspaceView } from "../hooks/useWorkspaceView";
import { useFiles } from "../hooks/useFiles";
import { useFolders } from "../hooks/useFolders";
import { useTabs } from "../hooks/useTabs";
import { useAtomValue } from "jotai";
import { filesInCurrentFolderAtom } from "../store";
import type { FolderContentViewProps } from "./FolderContentView/types";
import { FolderHeader } from "./FolderContentView/components/FolderHeader";
import { GridContainer } from "./FolderContentView/components/GridContainer";
import { UploadZone } from "./FolderContentView/components/UploadZone";
import { useGridItems } from "./FolderContentView/hooks/useGridItems";
import { useFolderActions } from "./FolderContentView/hooks/useFolderActions";
import { useFileUpload } from "./FolderContentView/hooks/useFileUpload";

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
  
  // Custom hooks
  const { handleUpdateFolder } = useFolderActions({ selectedFolderPath, updateFolder });
  const { gridItems, setGridItems, moveItem, handleDragEnd } = useGridItems({ 
    folder, 
    files, 
    onUpdateFolder: handleUpdateFolder 
  });
  const { handleDroppedFiles } = useFileUpload({ folderId: folder.id, createFile });
  
  const [title, setTitle] = useState(folder.name);
  const [emoji, setEmoji] = useState(folder.emoji || "");
  const [aiPrompt, setAiPrompt] = useState(folder.prompt || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  
  const [editFileModal, setEditFileModal] = useState<{ isOpen: boolean; file: FileItem | null; }>({ isOpen: false, file: null });
  const [editFolderModal, setEditFolderModal] = useState<{ isOpen: boolean; folder: Folder | null; }>({ isOpen: false, folder: null });
  const [fileContextMenu, setFileContextMenu] = useState<{ isOpen: boolean; fileId: string; position: { x: number; y: number }; }>({ isOpen: false, fileId: "", position: { x: 0, y: 0 } });
  const [folderContextMenu, setFolderContextMenu] = useState<{ isOpen: boolean; folderId: string; position: { x: number; y: number }; }>({ isOpen: false, folderId: "", position: { x: 0, y: 0 } });

  // Global dragend cleanup to ensure pointer events are restored
  useEffect(() => {
    const handleDragEndCleanup = () => {
      // Ensure cursor is restored after drag
      document.body.style.cursor = '';
      // Remove any lingering drag-related styles
      document.body.classList.remove('dragging');
    };

    document.addEventListener('dragend', handleDragEndCleanup);
    return () => document.removeEventListener('dragend', handleDragEndCleanup);
  }, []);

  // Sync metadata (if changed externally)
  useEffect(() => {
    setTitle(folder.name);
    setEmoji(folder.emoji || "");
    setAiPrompt(folder.prompt || "");
  }, [folder]);

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
    moveItem(dragIndex, hoverIndex);
  }, [captureGridPositions, moveItem]);

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
  const [{ isFileOver }] = useDrop({
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
    <UploadZone
      onDropFiles={handleDroppedFiles}
      onChatFileDrop={handleChatFileDrop}
      onDragOver={handleDragOver}
      isFileOver={isFileOver}
    >
      <FolderHeader
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={onBreadcrumbClick}
        emoji={emoji}
        isEmojiPickerOpen={isEmojiPickerOpen}
        setIsEmojiPickerOpen={setIsEmojiPickerOpen}
        onEmojiSelect={(selectedEmoji) => {
          setEmoji(selectedEmoji);
          handleUpdateFolder({ emoji: selectedEmoji });
        }}
        onEmojiRemove={() => {
          setEmoji("");
          handleUpdateFolder({ emoji: "" });
        }}
        title={title}
        setTitle={setTitle}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        onTitleBlur={handleTitleBlur}
        subfolderCount={subfolderCount}
        fileCount={fileCount}
        photoCount={photoCount}
        hasGridItems={gridItems.length > 0}
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onCreateFile={handleCreateFile}
        onAttachFile={() => fileInputRef.current?.click()}
        fileInputRef={fileInputRef}
        onFileInputChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleDroppedFiles(files);
          }
          e.target.value = "";
        }}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onPromptBlur={handlePromptBlur}
      />

      <GridContainer
        gridRef={gridRef}
        gridItems={gridItems}
        isFileOver={isFileOver}
        emoji={emoji}
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
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onCreateFile={handleCreateFile}
      />

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
    </UploadZone>
  );
}
