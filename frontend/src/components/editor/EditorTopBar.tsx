import { useEffect, useRef, useState } from 'react';
import { X, Check, Loader2, Circle } from 'lucide-react';
import type { FileItem } from '@/types';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import type { EditorMode } from '@/types';

export interface EditorTopBarProps {
  file: FileItem;
  folderName?: string;
  wordCount: number;
  onClose: () => void;
}

const MODE_LABELS: Record<EditorMode, string> = {
  edit: 'Изменить',
  preview: 'Просмотр',
  split: 'Разделить',
};

export function EditorTopBar({
  file,
  folderName,
  wordCount,
  onClose,
}: EditorTopBarProps) {
  const updateFile = useFileSystemStore((s) => s.updateFile);
  const editorMode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const saveStatus = useEditorStore((s) => s.getSaveStatus(file.id));
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(file.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync if file.name changes externally
  useEffect(() => {
    if (!editingName) setNameValue(file.name);
  }, [file.name, editingName]);

  // Auto-focus and select input when editing starts
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== file.name) {
      updateFile(file.id, { name: trimmed });
    } else {
      setNameValue(file.name);
    }
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitName();
    }
    if (e.key === 'Escape') {
      setNameValue(file.name);
      setEditingName(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 h-11 bg-[#171717] border-b border-white/[0.07] text-sm shrink-0 overflow-hidden">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-500 shrink-0 min-w-0">
        <button
          onClick={() => setRightPanel({ type: 'chat' })}
          className="hover:text-gray-300 transition-colors truncate max-w-[60px]"
          title="Chat"
        >
          Chat
        </button>
        {folderName && (
          <>
            <span className="text-gray-600">/</span>
            <button
              onClick={() =>
                setRightPanel({ type: 'folder', folderId: file.folderId })
              }
              className="hover:text-gray-300 transition-colors truncate max-w-[100px]"
              title={folderName}
            >
              {folderName}
            </button>
          </>
        )}
        <span className="text-gray-600">/</span>
      </nav>

      {/* File name — inline editable */}
      <div className="flex-1 min-w-0 flex items-center">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            className="bg-[#2a2a2a] text-gray-100 text-sm px-2 py-0.5 rounded border border-[#7c5cbf]/60 outline-none w-full max-w-xs"
            spellCheck={false}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            title="Click to rename"
            className="text-gray-200 font-medium hover:text-white truncate max-w-xs text-left"
          >
            {file.name}
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-0.5 bg-white/5 rounded-md p-0.5 shrink-0">
        {(Object.keys(MODE_LABELS) as EditorMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setEditorMode(mode)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              editorMode === mode
                ? 'bg-[#7c5cbf] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* Word count */}
      <span className="text-xs text-gray-500 tabular-nums shrink-0">
        {wordCount} сл.
      </span>

      {/* Save status */}
      <div className="flex items-center gap-1 text-xs shrink-0 min-w-[90px]">
        {saveStatus === 'saved' && (
          <>
            <Check size={12} className="text-emerald-400" />
            <span className="text-emerald-400">Сохранено</span>
          </>
        )}
        {saveStatus === 'unsaved' && (
          <>
            <Circle size={10} className="fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400">Не сохранено</span>
          </>
        )}
        {saveStatus === 'saving' && (
          <>
            <Loader2 size={12} className="animate-spin text-blue-400" />
            <span className="text-blue-400">Сохранение…</span>
          </>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        title="Close editor"
        className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}
