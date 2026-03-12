import { Settings, FolderPlus, Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { FileTree } from '@/components/sidebar/FileTree';
import { generateFolderId } from '@/utils/fileHelpers';
import type { Folder } from '@/types';

export function SidebarContainer() {
  const setRightPanel = useUiStore((s) => s.setRightPanel);
  const { theme, setTheme } = useSettingsStore();
  const addFolder = useFileSystemStore((s) => s.addFolder);

  const handleNewFolder = () => {
    const now = new Date().toISOString();
    const folder: Folder = {
      id: generateFolderId(),
      name: 'Новая папка',
      description: '',
      parentId: null,
      iconEmoji: '📁',
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    };
    addFolder(folder);
  };

  return (
    <div className="h-full bg-[#111111] border-r border-white/8 flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-200 tracking-wide">
          ShuKnow
        </span>
        <button
          onClick={() => setRightPanel({ type: 'settings' })}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-colors"
          aria-label="Настройки"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* ── Tree (scrollable) ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <FileTree />
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t border-white/8 p-2 flex items-center gap-1">
        <button
          onClick={handleNewFolder}
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors text-xs"
        >
          <FolderPlus size={15} />
          <span>Новая папка</span>
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Переключить тему"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
