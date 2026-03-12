import { useState } from "react";
import { Settings, Plus } from "lucide-react";
import { FolderItem } from "./FolderItem";
import { SettingsModal } from "./SettingsModal";
import { CreateFolderModal } from "./CreateFolderModal";
import { EditFolderModal } from "./EditFolderModal";
import type { Folder } from "../App";

interface SidebarProps {
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  onFolderClick: (folder: Folder, path: string[]) => void;
  onUpdateFolder: (path: string[], updates: Partial<Folder>) => void;
  onLogoClick: () => void;
}

export function Sidebar({ folders, setFolders, onFolderClick, onUpdateFolder, onLogoClick }: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createFolderParentPath, setCreateFolderParentPath] = useState<string[] | null>(null);
  const [editFolderState, setEditFolderState] = useState<{
    isOpen: boolean;
    folder: Folder | null;
    path: string[];
  }>({ isOpen: false, folder: null, path: [] });

  const moveFolder = (dragPath: string[], hoverPath: string[], dropZone: "before" | "after" | "inside") => {
    setFolders((prevFolders) => {
      const newFolders = JSON.parse(JSON.stringify(prevFolders)) as Folder[];

      // Get the dragged folder
      const getDraggedFolder = (path: string[]): Folder | null => {
        if (path.length === 1) {
          return newFolders[parseInt(path[0])];
        }
        let current: Folder[] = newFolders;
        for (let i = 0; i < path.length - 1; i++) {
          const idx = parseInt(path[i]);
          if (!current[idx] || !current[idx].subfolders) return null;
          current = current[idx].subfolders!;
        }
        return current[parseInt(path[path.length - 1])];
      };

      // Remove folder from old position
      const removeFolderAtPath = (path: string[]) => {
        if (path.length === 1) {
          return newFolders.splice(parseInt(path[0]), 1)[0];
        }
        let current: Folder[] = newFolders;
        for (let i = 0; i < path.length - 1; i++) {
          const idx = parseInt(path[i]);
          if (!current[idx].subfolders) return null;
          current = current[idx].subfolders!;
        }
        return current.splice(parseInt(path[path.length - 1]), 1)[0];
      };

      // Insert folder based on drop zone
      const insertFolderAtPath = (folder: Folder, targetPath: string[], zone: "before" | "after" | "inside") => {
        if (zone === "inside") {
          // Nest: add as first subfolder to target
          if (targetPath.length === 1) {
            const targetIdx = parseInt(targetPath[0]);
            if (!newFolders[targetIdx].subfolders) {
              newFolders[targetIdx].subfolders = [];
            }
            newFolders[targetIdx].subfolders!.unshift(folder);
          } else {
            let current: Folder[] = newFolders;
            for (let i = 0; i < targetPath.length - 1; i++) {
              const idx = parseInt(targetPath[i]);
              if (!current[idx].subfolders) return;
              current = current[idx].subfolders!;
            }
            const targetIdx = parseInt(targetPath[targetPath.length - 1]);
            if (!current[targetIdx].subfolders) {
              current[targetIdx].subfolders = [];
            }
            current[targetIdx].subfolders!.unshift(folder);
          }
        } else {
          // Insert before or after
          const insertIndex = parseInt(targetPath[targetPath.length - 1]) + (zone === "after" ? 1 : 0);
          
          if (targetPath.length === 1) {
            newFolders.splice(insertIndex, 0, folder);
          } else {
            let current: Folder[] = newFolders;
            for (let i = 0; i < targetPath.length - 1; i++) {
              const idx = parseInt(targetPath[i]);
              if (!current[idx].subfolders) {
                current[idx].subfolders = [];
              }
              current = current[idx].subfolders!;
            }
            current.splice(insertIndex, 0, folder);
          }
        }
      };

      const draggedFolder = getDraggedFolder(dragPath);
      if (!draggedFolder) return prevFolders;

      const removed = removeFolderAtPath(dragPath);
      if (!removed) return prevFolders;

      insertFolderAtPath(removed, hoverPath, dropZone);

      return newFolders;
    });
  };

  const handleCreateFolder = (name: string, emoji: string, prompt: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      emoji,
      prompt,
    };

    if (createFolderParentPath === null) {
      // Root level folder
      setFolders([...folders, newFolder]);
    } else {
      // Subfolder
      setFolders((prevFolders) => {
        const newFolders = JSON.parse(JSON.stringify(prevFolders)) as Folder[];
        const path = createFolderParentPath;

        let current: Folder[] = newFolders;
        for (let i = 0; i < path.length; i++) {
          const idx = parseInt(path[i]);
          if (i === path.length - 1) {
            // Last element - add subfolder here
            if (!current[idx].subfolders) {
              current[idx].subfolders = [];
            }
            current[idx].subfolders!.push(newFolder);
          } else {
            if (!current[idx].subfolders) return prevFolders;
            current = current[idx].subfolders!;
          }
        }

        return newFolders;
      });
    }

    setCreateFolderParentPath(null);
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
    
    onUpdateFolder(editFolderState.path, { name, emoji, prompt });
    setEditFolderState({ isOpen: false, folder: null, path: [] });
  };

  const handleDeleteFolder = (path: string[]) => {
    if (!confirm("Вы уверены, что хотите удалить эту папку и все её содержимое?")) return;

    setFolders((prevFolders) => {
      const newFolders = JSON.parse(JSON.stringify(prevFolders)) as Folder[];

      if (path.length === 1) {
        // Root level folder
        newFolders.splice(parseInt(path[0]), 1);
      } else {
        // Subfolder
        let current: Folder[] = newFolders;
        for (let i = 0; i < path.length - 1; i++) {
          const idx = parseInt(path[i]);
          if (!current[idx].subfolders) return prevFolders;
          current = current[idx].subfolders!;
        }
        current.splice(parseInt(path[path.length - 1]), 1);
      }

      return newFolders;
    });
  };

  return (
    <div className="w-full h-full bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h1 
            className="text-xl font-semibold text-white select-none cursor-pointer hover:text-blue-400 transition-colors"
            onClick={onLogoClick}
          >
            ShuKnow
          </h1>
          <button
            onClick={() => {
              setCreateFolderParentPath(null);
              setIsCreateFolderOpen(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
            title="Создать папку"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          title="Настройки"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* File System */}
      <div className="flex-1 overflow-y-auto py-4">
        {folders.map((folder, index) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            path={[index.toString()]}
            moveFolder={moveFolder}
            onFolderClick={onFolderClick}
            onEditFolder={handleEditFolder}
            onAddSubfolder={handleAddSubfolder}
            onDeleteFolder={handleDeleteFolder}
          />
        ))}
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
    </div>
  );
}
