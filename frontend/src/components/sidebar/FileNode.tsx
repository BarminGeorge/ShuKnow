import { useState, useRef } from 'react';
import { FileText, Image as ImageIcon, File } from 'lucide-react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import type { FileItem, FileId } from '@/types';

interface FileNodeProps {
  file: FileItem;
  depth?: number;
}

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  'text/markdown': <FileText size={13} className="text-blue-400" />,
  'image/jpeg': <ImageIcon size={13} className="text-green-400" />,
  'image/png': <ImageIcon size={13} className="text-green-400" />,
  'image/webp': <ImageIcon size={13} className="text-green-400" />,
  'image/gif': <ImageIcon size={13} className="text-green-400" />,
};

function getFileIcon(mimeType: string): React.ReactNode {
  return FILE_ICON_MAP[mimeType] ?? <File size={13} className="text-gray-500" />;
}

export function FileNode({ file, depth = 0 }: FileNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFile = useFileSystemStore((s) => s.updateFile);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const openFile = useEditorStore((s) => s.openFile);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const isActive = activeFileId === file.id;
  const paddingLeft = depth * 16 + 8 + 20; // extra indent past chevron

  const handleClick = () => {
    openFile(file.id as FileId);
    setRightPanel({ type: 'file', fileId: file.id });
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(file.name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleSave = () => {
    const t = editName.trim();
    if (t && t !== file.name) updateFile(file.id as FileId, { name: t });
    setIsEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-1.5 py-0.5 pr-2 rounded-md cursor-pointer select-none transition-colors ${isActive ? 'bg-[#7c5cbf]/15 text-white' : 'hover:bg-white/5 text-gray-400'}`}
      style={{ paddingLeft }}
      onClick={handleClick}
    >
      <span className="flex-shrink-0">{getFileIcon(file.mimeType)}</span>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
          className="flex-1 bg-white/10 rounded px-1 text-xs text-gray-100 outline-none min-w-0"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-xs truncate min-w-0"
          onDoubleClick={handleRename}
        >
          {file.name}
        </span>
      )}
    </div>
  );
}
