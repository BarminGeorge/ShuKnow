import { FolderPlus } from 'lucide-react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { generateFolderId } from '@/utils/fileHelpers';
import type { Folder } from '@/types';

export function NewFolderButton() {
  const addFolder = useFileSystemStore((s) => s.addFolder);

  const handleClick = () => {
    const now = new Date().toISOString();
    const newFolder: Folder = {
      id: generateFolderId(),
      name: 'Новая папка',
      description: '',
      parentId: null,
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    };
    addFolder(newFolder);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors border-t border-white/8"
    >
      <FolderPlus size={15} aria-hidden />
      <span>Новая папка</span>
    </button>
  );
}