import { useState, useRef } from 'react';
import { ChevronRight, ChevronDown, Edit3, Plus, Trash2 } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { DeleteConfirmDialog } from '@/app/components/DeleteConfirmDialog';
import { FileNode } from './FileNode';
import type { Folder as FolderType, FolderId } from '@/types';

interface FolderNodeProps {
  folder: FolderType;
  depth?: number;
  onCreateSubfolder: (parentId: FolderId) => void;
}

export function FolderNode({ folder, depth = 0, onCreateSubfolder }: FolderNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isDescEditing, setIsDescEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(folder.description);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFolder = useFileSystemStore((s) => s.updateFolder);
  const deleteFolder = useFileSystemStore((s) => s.deleteFolder);
  const files = useFileSystemStore((s) => s.files);
  const rightPanel = useUiStore((s) => s.rightPanel);
  const setRightPanel = useUiStore((s) => s.setRightPanel);
  const isFolderExpanded = useUiStore((s) => s.isFolderExpanded);
  const toggleFolder = useUiStore((s) => s.toggleFolder);

  const isSelected = rightPanel.type === 'folder' && rightPanel.folderId === folder.id;
  const isExpanded = isFolderExpanded(folder.id);
  const fileCount = files.filter((f) => f.folderId === folder.id).length;
  const subfolders = [...folder.subfolders].sort((a, b) => a.order - b.order);
  const folderFiles = files.filter((f) => f.folderId === folder.id).sort((a, b) => a.order - b.order);
  const hasChildren = subfolders.length > 0 || folderFiles.length > 0;
  const paddingLeft = depth * 16 + 8;

  const handleRename = () => {
    setIsEditing(true);
    setEditName(folder.name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleNameSave = () => {
    const t = editName.trim();
    if (t && t !== folder.name) updateFolder(folder.id, { name: t });
    setIsEditing(false);
  };

  const handleDescSave = () => {
    if (editDesc !== folder.description) updateFolder(folder.id, { description: editDesc });
    setIsDescEditing(false);
  };

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div>
            <div
              className={`group flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer select-none transition-colors ${isSelected ? 'bg-[#7c5cbf]/20 text-white' : 'hover:bg-white/5 text-gray-300'}`}
              style={{ paddingLeft }}
              onClick={() => setRightPanel({ type: 'folder', folderId: folder.id })}
            >
              <button
                className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-300"
                onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
              >
                {hasChildren
                  ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
                  : <span className="w-3" />}
              </button>

              <span className="flex-shrink-0 text-sm leading-none w-4 text-center">
                {folder.iconEmoji ?? '📁'}
              </span>

              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setIsEditing(false); }}
                  className="flex-1 bg-white/10 rounded px-1 text-sm text-gray-100 outline-none min-w-0"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 text-sm truncate min-w-0"
                  onDoubleClick={(e) => { e.stopPropagation(); handleRename(); }}
                >
                  {folder.name}
                </span>
              )}

              {fileCount > 0 && (
                <span className="text-[10px] text-gray-600 flex-shrink-0 tabular-nums">{fileCount}</span>
              )}

              {!isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/15 text-gray-500 hover:text-blue-400"
                    onClick={(e) => { e.stopPropagation(); handleRename(); }}
                    aria-label="Переименовать"
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/15 text-gray-500 hover:text-green-400"
                    onClick={(e) => { e.stopPropagation(); onCreateSubfolder(folder.id); }}
                    aria-label="Создать подпапку"
                  >
                    <Plus size={11} />
                  </button>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/15 text-gray-500 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                    aria-label="Удалить"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="z-50 min-w-48 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl p-1 text-sm text-gray-200">
            <ContextMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer outline-none" onSelect={handleRename}>
              <Edit3 size={13} className="text-gray-400" /> Переименовать
            </ContextMenu.Item>
            <ContextMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer outline-none" onSelect={() => setIsDescEditing(true)}>
              Изменить описание
            </ContextMenu.Item>
            <ContextMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer outline-none" onSelect={() => onCreateSubfolder(folder.id)}>
              <Plus size={13} className="text-gray-400" /> Создать подпапку
            </ContextMenu.Item>
            <ContextMenu.Separator className="my-1 h-px bg-white/10" />
            <ContextMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 cursor-pointer outline-none" onSelect={() => setDeleteOpen(true)}>
              <Trash2 size={13} /> Удалить
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {isDescEditing && (
        <div className="mx-2 mb-1 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg" style={{ marginLeft: paddingLeft + 20 }}>
          <p className="text-[10px] text-gray-500 mb-1">Описание / инструкция для ИИ</p>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onBlur={handleDescSave}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsDescEditing(false); }}
            placeholder="Что должно храниться в этой папке..."
            className="w-full bg-transparent text-xs text-gray-300 placeholder:text-gray-600 resize-none outline-none"
            rows={3}
            autoFocus
          />
          <button onClick={handleDescSave} className="text-xs text-[#7c5cbf] hover:text-purple-400 mt-1">
            Сохранить
          </button>
        </div>
      )}

      {isExpanded && (
        <div>
          {subfolders.map((sub) => (
            <FolderNode key={sub.id} folder={sub} depth={depth + 1} onCreateSubfolder={onCreateSubfolder} />
          ))}
          {folderFiles.map((file) => (
            <FileNode key={file.id} file={file} depth={depth + 1} />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={deleteOpen}
        title={`Удалить «${folder.name}»?`}
        description="Папка и все её файлы будут удалены навсегда."
        onConfirm={() => { deleteFolder(folder.id); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
