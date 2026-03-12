import { useState } from "react";
import { Settings, Plus } from "lucide-react";

import { FolderItem } from "./FolderItem";
import { SettingsModal } from "./SettingsModal";
import { CreateFolderModal } from "./CreateFolderModal";
import { EditFolderModal } from "./EditFolderModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { Folder, DropZone } from "@/features/workspace/model/types";

interface SidebarProps {
  folders: Folder[];
  onFolderClick: (idPath: string[]) => void;
  onCreateFolder: (
    parentId: string | null,
    name: string,
    emoji: string,
    prompt: string,
  ) => void;
  onUpdateFolder: (folderId: string, updates: Partial<Folder>) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (dragId: string, targetId: string, zone: DropZone) => void;
}

interface EditFolderState {
  isOpen: boolean;
  folder: Folder | null;
}

interface DeleteFolderState {
  isOpen: boolean;
  folderId: string | null;
}

export function Sidebar({
  folders,
  onFolderClick,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveFolder,
}: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<
    string | null
  >(null);
  const [editFolderState, setEditFolderState] = useState<EditFolderState>({
    isOpen: false,
    folder: null,
  });
  const [deleteState, setDeleteState] = useState<DeleteFolderState>({
    isOpen: false,
    folderId: null,
  });

  const handleOpenCreateRoot = () => {
    setCreateFolderParentId(null);
    setIsCreateFolderOpen(true);
  };

  const handleAddSubfolder = (parentId: string) => {
    setCreateFolderParentId(parentId);
    setIsCreateFolderOpen(true);
  };

  const handleCreateFolderClose = () => {
    setIsCreateFolderOpen(false);
    setCreateFolderParentId(null);
  };

  const handleCreateFolder = (
    name: string,
    emoji: string,
    prompt: string,
  ) => {
    onCreateFolder(createFolderParentId, name, emoji, prompt);
    handleCreateFolderClose();
  };

  const handleEditFolder = (folder: Folder) => {
    setEditFolderState({ isOpen: true, folder });
  };

  const handleSaveFolderEdit = (
    name: string,
    emoji: string,
    prompt: string,
  ) => {
    if (!editFolderState.folder) return;
    onUpdateFolder(editFolderState.folder.id, { name, emoji, prompt });
    setEditFolderState({ isOpen: false, folder: null });
  };

  const handleDeleteFolderRequest = (folderId: string) => {
    setDeleteState({ isOpen: true, folderId });
  };

  const handleDeleteFolderConfirm = () => {
    if (deleteState.folderId) onDeleteFolder(deleteState.folderId);
    setDeleteState({ isOpen: false, folderId: null });
  };

  const handleDeleteFolderCancel = () => {
    setDeleteState({ isOpen: false, folderId: null });
  };

  return (
    <div className="w-full h-full bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-white select-none">
            ShuKnow
          </h1>
          <button
            onClick={handleOpenCreateRoot}
            aria-label="Создать папку"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Настройки"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Settings size={18} aria-hidden />
        </button>
      </div>

      {/* File System */}
      <nav aria-label="Папки" className="flex-1 overflow-y-auto py-4">
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            idPath={[folder.id]}
            onMoveFolder={onMoveFolder}
            onFolderClick={onFolderClick}
            onEditFolder={handleEditFolder}
            onAddSubfolder={handleAddSubfolder}
            onDeleteFolder={handleDeleteFolderRequest}
          />
        ))}
      </nav>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={handleCreateFolderClose}
        onCreateFolder={handleCreateFolder}
      />
      <EditFolderModal
        isOpen={editFolderState.isOpen}
        onClose={() => setEditFolderState({ isOpen: false, folder: null })}
        folderName={editFolderState.folder?.name ?? ""}
        folderEmoji={editFolderState.folder?.emoji ?? ""}
        currentPrompt={editFolderState.folder?.prompt ?? ""}
        onSave={handleSaveFolderEdit}
      />
      <DeleteConfirmDialog
        isOpen={deleteState.isOpen}
        title="Удалить папку?"
        description="Это действие нельзя отменить. Папка и всё её содержимое будут удалены."
        onConfirm={handleDeleteFolderConfirm}
        onCancel={handleDeleteFolderCancel}
      />
    </div>
  );
}

