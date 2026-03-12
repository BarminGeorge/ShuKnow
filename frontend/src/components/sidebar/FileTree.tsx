import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { generateFolderId } from '@/utils/fileHelpers';
import { FolderNode } from './FolderNode';
import type { Folder, FolderId } from '@/types';

function makeFolderObject(name: string, parentId: FolderId | null): Folder {
  const now = new Date().toISOString();
  return {
    id: generateFolderId(),
    name,
    description: '',
    parentId,
    iconEmoji: '📁',
    order: Date.now(),
    subfolders: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Root file tree — renders top-level folders recursively via FolderNode.
 */
export function FileTree() {
  const folders = useFileSystemStore((s) => s.folders);
  const addFolder = useFileSystemStore((s) => s.addFolder);
  const toggleFolder = useUiStore((s) => s.toggleFolder);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  const handleCreateSubfolder = (parentId: FolderId) => {
    addFolder(makeFolderObject('Новая папка', parentId));
    toggleFolder(parentId);
  };

  const handleCreateRoot = () => {
    addFolder(makeFolderObject(newName.trim() || 'Новая папка', null));
    setIsCreating(false);
    setNewName('');
  };

  return (
    <div className="py-2 px-1 flex flex-col gap-0.5">
      {sortedFolders.length === 0 && !isCreating && (
        <div className="px-3 py-6 text-center">
          <p className="text-xs text-gray-600">Папок нет</p>
          <p className="text-[10px] text-gray-700 mt-1">Нажмите «+» чтобы создать</p>
        </div>
      )}

      {sortedFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          depth={0}
          onCreateSubfolder={handleCreateSubfolder}
        />
      ))}

      {isCreating && (
        <div className="flex items-center gap-1.5 px-2 py-1">
          <span className="text-sm">📁</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreateRoot}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRoot(); if (e.key === 'Escape') setIsCreating(false); }}
            placeholder="Название папки..."
            className="flex-1 bg-white/10 rounded px-2 py-0.5 text-sm text-gray-100 outline-none placeholder:text-gray-600"
            autoFocus
          />
        </div>
      )}

      <button
        className="flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded-md text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors w-full"
        onClick={() => setIsCreating(true)}
        aria-label="Создать корневую папку"
      >
        <FolderPlus size={13} />
        Новая папка
      </button>
    </div>
  );
}
