import { useState, useEffect, useCallback } from "react";
import { Settings, Plus, PanelLeftClose, PanelLeftOpen, MessageSquare, LogOut } from "lucide-react";
import { FolderItem, SidebarFolderDragLayer } from "./FolderItem";
import { SettingsModal } from "./SettingsModal";
import { CreateFolderModal } from "./CreateFolderModal";
import { EditFolderModal } from "./EditFolderModal";
import { DeleteFolderModal } from "./DeleteFolderModal";
import { SidebarFolderContextMenu } from "./SidebarFolderContextMenu";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { folderService, fileService, ApiError } from "../../api";
import { toast } from "sonner";
import type { Folder } from "../../api/types";
import { useFolders } from "../hooks/useFolders";
import { useFiles } from "../hooks/useFiles";
import { useWorkspaceView } from "../hooks/useWorkspaceView";
import type { GridItemType } from "./FolderContentView/types";

interface SidebarProps {
  onLogoClick: () => void;
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

export function Sidebar({ onLogoClick, onToggleSidebar, isCollapsed }: SidebarProps) {
  // Jotai hooks
  const { folders, setFolders, updateFolder, createFolder, moveFolderAtom } = useFolders();
  const { files, setFiles } = useFiles();
  const { setSelectedFolderPath, setViewMode } = useWorkspaceView();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createFolderParentPath, setCreateFolderParentPath] = useState<string[] | null>(null);
  const [editFolderState, setEditFolderState] = useState<{
    isOpen: boolean;
    folder: Folder | null;
    path: string[];
  }>({ isOpen: false, folder: null, path: [] });
  const [deleteFolderState, setDeleteFolderState] = useState<{
    isOpen: boolean;
    folder: Folder | null;
    path: string[];
  }>({ isOpen: false, folder: null, path: [] });
  const [folderContextMenuState, setFolderContextMenuState] = useState<{
    isOpen: boolean;
    folder: Folder | null;
    path: string[];
    position: { x: number; y: number };
  }>({
    isOpen: false,
    folder: null,
    path: [],
    position: { x: 0, y: 0 },
  });

  const findFolderByPath = (path: string[]): Folder | null => {
    if (path.length === 0) return null;
    if (path.length === 1) {
      return folders[parseInt(path[0])] || null;
    }
    let currentFolderList: Folder[] = folders;
    for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
      const folderIndex = parseInt(path[pathIndex]);
      if (!currentFolderList[folderIndex] || !currentFolderList[folderIndex].subfolders) return null;
      currentFolderList = currentFolderList[folderIndex].subfolders!;
    }
    return currentFolderList[parseInt(path[path.length - 1])] || null;
  };

  const computeNewParentIdFromPath = (targetPath: string[], dropZone: "before" | "after" | "inside"): string | null => {
    if (dropZone === "inside") {
      const targetFolder = findFolderByPath(targetPath);
      return targetFolder?.id || null;
    } else {
      if (targetPath.length === 1) {
        return null;
      }
      const parentPath = targetPath.slice(0, -1);
      const parentFolder = findFolderByPath(parentPath);
      return parentFolder?.id || null;
    }
  };

  const containsFolderId = (folder: Folder, folderId: string): boolean => {
    return (folder.subfolders || []).some((subfolder) => (
      subfolder.id === folderId || containsFolderId(subfolder, folderId)
    ));
  };

  const moveFolderIntoFolderById = (foldersList: Folder[], folderId: string, targetFolderId: string): Folder[] => {
    const clonedFolders = JSON.parse(JSON.stringify(foldersList)) as Folder[];
    let removedFolder: Folder | null = null;

    const removeFolder = (items: Folder[]): boolean => {
      const folderIndex = items.findIndex((item) => item.id === folderId);

      if (folderIndex >= 0) {
        removedFolder = items.splice(folderIndex, 1)[0];
        return true;
      }

      return items.some((item) => removeFolder(item.subfolders || []));
    };

    const insertFolder = (items: Folder[]): boolean => {
      for (const item of items) {
        if (item.id === targetFolderId) {
          item.subfolders = item.subfolders || [];
          item.subfolders.push(removedFolder!);
          return true;
        }

        if (insertFolder(item.subfolders || [])) {
          return true;
        }
      }

      return false;
    };

    const draggedFolder = findFolderById(clonedFolders, folderId);
    if (!draggedFolder || folderId === targetFolderId || containsFolderId(draggedFolder, targetFolderId)) {
      return foldersList;
    }

    removeFolder(clonedFolders);
    if (!removedFolder || !insertFolder(clonedFolders)) {
      return foldersList;
    }

    return clonedFolders;
  };

  const findFolderById = (foldersList: Folder[], folderId: string): Folder | null => {
    for (const folder of foldersList) {
      if (folder.id === folderId) return folder;
      const subfolder = findFolderById(folder.subfolders || [], folderId);
      if (subfolder) return subfolder;
    }

    return null;
  };

  const handleMoveGridItemToSidebarFolder = useCallback(async (
    itemId: string,
    targetFolderId: string,
    itemType: GridItemType
  ) => {
    if (itemId === targetFolderId) return;

    if (itemType === "file") {
      const previousFiles = files;
      setFiles((currentFiles) => currentFiles.map((file) => (
        file.id === itemId ? { ...file, folderId: targetFolderId } : file
      )));

      try {
        await fileService.moveFile(itemId, { targetFolderId });
      } catch (error) {
        setFiles(previousFiles);
        toast.error("Не удалось переместить файл в папку");
      }

      return;
    }

    const draggedFolder = findFolderById(folders, itemId);
    if (!draggedFolder || containsFolderId(draggedFolder, targetFolderId)) {
      toast.error("Нельзя переместить папку внутрь самой себя");
      return;
    }

    const previousFolders = folders;
    setFolders(moveFolderIntoFolderById(folders, itemId, targetFolderId));

    try {
      await folderService.moveFolder(itemId, { newParentFolderId: targetFolderId });
    } catch (error) {
      setFolders(previousFolders);
      toast.error("Не удалось переместить папку");
    }
  }, [files, folders, setFiles, setFolders]);

  const moveFolder = useCallback(async (dragPath: string[], hoverPath: string[], dropZone: "before" | "after" | "inside") => {
    const draggedFolder = findFolderByPath(dragPath);
    if (!draggedFolder) return;

    const previousFolders = JSON.parse(JSON.stringify(folders)) as Folder[];

    const newParentFolderId = computeNewParentIdFromPath(hoverPath, dropZone);

    const applyMove = (foldersList: Folder[]): Folder[] => {
      const clonedFolders = JSON.parse(JSON.stringify(foldersList)) as Folder[];

      const findDraggedFolderInList = (path: string[]): Folder | null => {
        if (path.length === 1) {
          return clonedFolders[parseInt(path[0])];
        }
        let currentFolderList: Folder[] = clonedFolders;
        for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
          const folderIndex = parseInt(path[pathIndex]);
          if (!currentFolderList[folderIndex] || !currentFolderList[folderIndex].subfolders) return null;
          currentFolderList = currentFolderList[folderIndex].subfolders!;
        }
        return currentFolderList[parseInt(path[path.length - 1])];
      };

      const removeFolderAtPath = (path: string[]) => {
        if (path.length === 1) {
          return clonedFolders.splice(parseInt(path[0]), 1)[0];
        }
        let currentFolderList: Folder[] = clonedFolders;
        for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
          const folderIndex = parseInt(path[pathIndex]);
          if (!currentFolderList[folderIndex].subfolders) return null;
          currentFolderList = currentFolderList[folderIndex].subfolders!;
        }
        return currentFolderList.splice(parseInt(path[path.length - 1]), 1)[0];
      };

      const insertFolderAtPath = (folder: Folder, targetPath: string[], zone: "before" | "after" | "inside") => {
        if (zone === "inside") {
          if (targetPath.length === 1) {
            const targetFolderIndex = parseInt(targetPath[0]);
            if (!clonedFolders[targetFolderIndex].subfolders) {
              clonedFolders[targetFolderIndex].subfolders = [];
            }
            clonedFolders[targetFolderIndex].subfolders!.unshift(folder);
          } else {
            let currentFolderList: Folder[] = clonedFolders;
            for (let pathIndex = 0; pathIndex < targetPath.length - 1; pathIndex++) {
              const folderIndex = parseInt(targetPath[pathIndex]);
              if (!currentFolderList[folderIndex].subfolders) return;
              currentFolderList = currentFolderList[folderIndex].subfolders!;
            }
            const targetFolderIndex = parseInt(targetPath[targetPath.length - 1]);
            if (!currentFolderList[targetFolderIndex].subfolders) {
              currentFolderList[targetFolderIndex].subfolders = [];
            }
            currentFolderList[targetFolderIndex].subfolders!.unshift(folder);
          }
        } else {
          const insertIndex = parseInt(targetPath[targetPath.length - 1]) + (zone === "after" ? 1 : 0);
          
          if (targetPath.length === 1) {
            clonedFolders.splice(insertIndex, 0, folder);
          } else {
            let currentFolderList: Folder[] = clonedFolders;
            for (let pathIndex = 0; pathIndex < targetPath.length - 1; pathIndex++) {
              const folderIndex = parseInt(targetPath[pathIndex]);
              if (!currentFolderList[folderIndex].subfolders) {
                currentFolderList[folderIndex].subfolders = [];
              }
              currentFolderList = currentFolderList[folderIndex].subfolders!;
            }
            currentFolderList.splice(insertIndex, 0, folder);
          }
        }
      };

      const folderToMove = findDraggedFolderInList(dragPath);
      if (!folderToMove) return foldersList;

      const removedFolder = removeFolderAtPath(dragPath);
      if (!removedFolder) return foldersList;

      insertFolderAtPath(removedFolder, hoverPath, dropZone);

      return clonedFolders;
    };

    setFolders(applyMove);

    try {
      await folderService.moveFolder(draggedFolder.id, { newParentFolderId });
    } catch (apiError) {
      setFolders(previousFolders);

      if (apiError instanceof ApiError) {
        if (apiError.status === 409) {
          toast.error("Не удалось переместить папку: конфликт имён или циклическая зависимость");
        } else if (apiError.status === 404) {
          toast.error("Папка не найдена");
        } else {
          toast.error(`Ошибка при перемещении: ${apiError.message}`);
        }
      } else {
        toast.error("Не удалось переместить папку");
      }
    }
  }, [folders, setFolders]);

  const handleCreateFolder = async (name: string, emoji: string, prompt: string) => {
    const parentFolderId = createFolderParentPath
      ? findFolderByPath(createFolderParentPath)?.id ?? null
      : null;
    const parentPath = createFolderParentPath;

    setCreateFolderParentPath(null);

    try {
      const createdFolder = await folderService.createFolder({
        name,
        description: "",
        emoji,
        parentFolderId,
      });
      const newFolder: Folder = {
        id: createdFolder.id,
        name: createdFolder.name,
        emoji: createdFolder.emoji ?? emoji,
        prompt,
        description: createdFolder.description || "",
        sortOrder: createdFolder.sortOrder,
        fileCount: createdFolder.fileCount ?? 0,
        subfolders: [],
      };

      createFolder(newFolder, parentPath);
    } catch (error) {
      toast.error("Не удалось создать папку");
    }
  };

  const handleAddSubfolder = (parentPath: string[]) => {
    setCreateFolderParentPath(parentPath);
    setIsCreateFolderOpen(true);
  };

  const handleCreateFolderClose = () => {
    setIsCreateFolderOpen(false);
    setCreateFolderParentPath(null);
  };

  const handleEditFolder = (folder: Folder, path: string[]) => {
    setEditFolderState({ isOpen: true, folder, path });
  };

  const handleSaveFolderEdit = (name: string, emoji: string, prompt: string) => {
    if (!editFolderState.path.length) return;
    
    updateFolder(editFolderState.path, { name, emoji, prompt });
    setEditFolderState({ isOpen: false, folder: null, path: [] });
  };

  const handleDeleteFolder = (path: string[]) => {
    const folder = findFolderByPath(path);
    if (folder) {
      setDeleteFolderState({ isOpen: true, folder, path });
    }
  };

  const handleOpenFolderContextMenu = (
    folder: Folder,
    path: string[],
    position: { x: number; y: number }
  ) => {
    setFolderContextMenuState({ isOpen: true, folder, path, position });
  };

  const handleCloseFolderContextMenu = () => {
    setFolderContextMenuState((currentState) => ({
      ...currentState,
      isOpen: false,
    }));
  };

  const handleConfirmDelete = async (isRecursiveDelete: boolean) => {
    const { folder, path } = deleteFolderState;
    if (!folder) return;

    await folderService.deleteFolder(folder.id, isRecursiveDelete);

    setFolders((previousFolders) => {
      const clonedFolders = JSON.parse(JSON.stringify(previousFolders)) as Folder[];

      if (path.length === 1) {
        clonedFolders.splice(parseInt(path[0]), 1);
      } else {
        let currentFolderList: Folder[] = clonedFolders;
        for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
          const folderIndex = parseInt(path[pathIndex]);
          if (!currentFolderList[folderIndex].subfolders) return previousFolders;
          currentFolderList = currentFolderList[folderIndex].subfolders!;
        }
        currentFolderList.splice(parseInt(path[path.length - 1]), 1);
      }

      return clonedFolders;
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-full h-full bg-[#0d0d0d] flex flex-col items-center py-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 mb-4 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
            title="Показать панель"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        <button
          onClick={onLogoClick}
          className="w-10 h-10 mb-2 flex items-center justify-center rounded-lg text-violet-200/85
                     bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))]
                     border border-violet-300/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)]
                     hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)] flex-shrink-0"
          title="Чат"
        >
          <MessageSquare size={18} />
        </button>

        <button
          onClick={() => {
            setCreateFolderParentPath(null);
            setIsCreateFolderOpen(true);
          }}
          className="w-10 h-10 mb-4 flex items-center justify-center rounded-lg text-gray-300
                     bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]
                     hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065]
                     transition-colors flex-shrink-0"
          title="Новая папка"
        >
          <Plus size={18} />
        </button>

        <div className="flex-1 overflow-y-auto w-full flex flex-col gap-2 items-center" style={{ scrollbarWidth: "none" }}>
          {folders.map((folder, index) => (
            <div
              key={folder.id}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0"
              title={folder.name}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleOpenFolderContextMenu(folder, [index.toString()], {
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onClick={() => {
                setSelectedFolderPath([index.toString()]);
                setViewMode('folder');
              }}
            >
              <span className="text-xl select-none">{folder.emoji || "📁"}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 flex-shrink-0 flex flex-col gap-1 items-center">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
            title="Настройки"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 transition-all
                       hover:text-violet-300/85 hover:bg-[linear-gradient(135deg,rgba(76,29,149,0.18),rgba(20,18,28,0.48))]"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Modals */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <CreateFolderModal
          isOpen={isCreateFolderOpen}
          onClose={handleCreateFolderClose}
          onCreateFolder={handleCreateFolder}
        />
        <EditFolderModal
          isOpen={editFolderState.isOpen}
          onClose={() => setEditFolderState({ isOpen: false, folder: null, path: [] })}
          folderName={editFolderState.folder?.name || ""}
          folderEmoji={editFolderState.folder?.emoji || ""}
          currentPrompt={editFolderState.folder?.prompt || ""}
          onSave={handleSaveFolderEdit}
        />
        <DeleteFolderModal
          isOpen={deleteFolderState.isOpen}
          folder={deleteFolderState.folder}
          onClose={() => setDeleteFolderState({ isOpen: false, folder: null, path: [] })}
          onConfirm={handleConfirmDelete}
        />
        <SidebarFolderContextMenu
          isOpen={folderContextMenuState.isOpen}
          position={folderContextMenuState.position}
          onClose={handleCloseFolderContextMenu}
          onAddSubfolder={() => handleAddSubfolder(folderContextMenuState.path)}
          onEdit={() => {
            if (folderContextMenuState.folder) {
              handleEditFolder(folderContextMenuState.folder, folderContextMenuState.path);
            }
          }}
          onDelete={() => handleDeleteFolder(folderContextMenuState.path)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <h1 
          className="text-xl font-semibold text-white select-none cursor-pointer hover:text-white/80 transition-colors"
          onClick={onLogoClick}
        >
          ShuKnow
        </h1>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
            title="Скрыть панель"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <div className="px-4 mb-4 flex flex-col gap-2">
        <button
          onClick={onLogoClick}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-violet-200/85
                     bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))]
                     border border-violet-300/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)]
                     hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)]"
        >
          <MessageSquare size={16} />
          <span className="text-sm font-medium">Чат</span>
        </button>

        <button
          onClick={() => {
            setCreateFolderParentPath(null);
            setIsCreateFolderOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-gray-300
                     bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]
                     hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065]
                     transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Новая папка</span>
        </button>
      </div>

      {/* File System */}
      <div className="flex-1 overflow-y-auto overflow-x-auto py-4 scrollbar-hide-hover" style={{ scrollbarWidth: "thin" }}>
        <SidebarFolderDragLayer />
        <div className="inline-block min-w-full align-top">
          {folders.map((folder, index) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              path={[index.toString()]}
              moveFolder={moveFolder}
              onEditFolder={handleEditFolder}
              onAddSubfolder={handleAddSubfolder}
              onDeleteFolder={handleDeleteFolder}
              onOpenContextMenu={handleOpenFolderContextMenu}
              onMoveGridItemToFolder={handleMoveGridItemToSidebarFolder}
            />
          ))}
        </div>
      </div>

      {/* Footer Settings */}
      <div className="p-3 mt-auto space-y-1">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          title="Настройки"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Настройки</span>
        </button>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 transition-all
                     hover:text-violet-300/85 hover:bg-[linear-gradient(135deg,rgba(76,29,149,0.18),rgba(20,18,28,0.48))]"
          title="Выйти"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Выйти</span>
        </button>
      </div>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={handleCreateFolderClose}
        onCreateFolder={handleCreateFolder}
      />
      <EditFolderModal
        isOpen={editFolderState.isOpen}
        onClose={() => setEditFolderState({ isOpen: false, folder: null, path: [] })}
        folderName={editFolderState.folder?.name || ""}
        folderEmoji={editFolderState.folder?.emoji || ""}
        currentPrompt={editFolderState.folder?.prompt || ""}
        onSave={handleSaveFolderEdit}
      />
      <DeleteFolderModal
        isOpen={deleteFolderState.isOpen}
        folder={deleteFolderState.folder}
        onClose={() => setDeleteFolderState({ isOpen: false, folder: null, path: [] })}
        onConfirm={handleConfirmDelete}
      />
      <SidebarFolderContextMenu
        isOpen={folderContextMenuState.isOpen}
        position={folderContextMenuState.position}
        onClose={handleCloseFolderContextMenu}
        onAddSubfolder={() => handleAddSubfolder(folderContextMenuState.path)}
        onEdit={() => {
          if (folderContextMenuState.folder) {
            handleEditFolder(folderContextMenuState.folder, folderContextMenuState.path);
          }
        }}
        onDelete={() => handleDeleteFolder(folderContextMenuState.path)}
      />
    </div>
  );
}
