import { ArrowLeft, Folder as FolderIcon, FileText, Plus, Trash2 } from 'lucide-react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { generateFileId, generateFolderId } from '@/utils/fileHelpers';
import { getExcerpt } from '@/utils/markdown';
import type { FolderId, FileId, Folder, FileItem } from '@/types';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/app/components/DeleteConfirmDialog';

interface FolderDetailViewProps {
  folderId: FolderId;
}

function findFolderById(folders: Folder[], id: FolderId): Folder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findFolderById(f.subfolders, id);
    if (found) return found;
  }
  return null;
}

export function FolderDetailView({ folderId }: FolderDetailViewProps) {
  const folders = useFileSystemStore((s) => s.folders);
  const files = useFileSystemStore((s) => s.files);
  const addFile = useFileSystemStore((s) => s.addFile);
  const addFolder = useFileSystemStore((s) => s.addFolder);
  const deleteFile = useFileSystemStore((s) => s.deleteFile);
  const setRightPanel = useUiStore((s) => s.setRightPanel);
  const goBack = useUiStore((s) => s.goBack);
  const openFile = useEditorStore((s) => s.openFile);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  const folder = findFolderById(folders, folderId);
  if (!folder) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Папка не найдена
      </div>
    );
  }

  const folderFiles = files.filter((f) => f.folderId === folderId);

  const handleOpenFile = (file: FileItem) => {
    openFile(file.id);
    setRightPanel({ type: 'file', fileId: file.id });
  };

  const handleNewFile = () => {
    const now = new Date().toISOString();
    const file: FileItem = {
      id: generateFileId(),
      name: 'Новый файл.md',
      description: '',
      folderId,
      content: '',
      type: 'markdown',
      mimeType: 'text/markdown',
      size: 0,
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    };
    addFile(file);
    openFile(file.id);
    setRightPanel({ type: 'file', fileId: file.id });
  };

  const handleNewSubfolder = () => {
    const now = new Date().toISOString();
    addFolder({
      id: generateFolderId(),
      name: 'Новая папка',
      description: '',
      parentId: folderId,
      iconEmoji: '📁',
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/8 px-6 py-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3"
        >
          <ArrowLeft size={13} /> Назад
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{folder.iconEmoji ?? '📁'}</span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-100 truncate">{folder.name}</h1>
            {folder.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{folder.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-white/8">
        <button
          onClick={handleNewFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c5cbf]/20 hover:bg-[#7c5cbf]/30 text-purple-300 text-xs transition-colors"
        >
          <Plus size={13} /> Новый файл
        </button>
        <button
          onClick={handleNewSubfolder}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-gray-400 text-xs transition-colors"
        >
          <Plus size={13} /> Подпапка
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Subfolders */}
        {folder.subfolders.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Папки</p>
            <div className="grid grid-cols-2 gap-2">
              {folder.subfolders.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setRightPanel({ type: 'folder', folderId: sub.id })}
                  className="flex items-center gap-2 p-3 bg-[#111] border border-white/8 rounded-lg hover:border-white/20 text-left transition-colors group"
                >
                  <span className="text-xl">{sub.iconEmoji ?? '📁'}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-300 truncate">{sub.name}</p>
                    {sub.description && (
                      <p className="text-[10px] text-gray-600 truncate">{sub.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {folderFiles.length > 0 ? (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Файлы</p>
            <div className="grid grid-cols-2 gap-2">
              {folderFiles.map((file) => (
                <div key={file.id} className="group relative">
                  <button
                    onClick={() => handleOpenFile(file)}
                    className="w-full flex items-start gap-2 p-3 bg-[#111] border border-white/8 rounded-lg hover:border-white/20 text-left transition-colors"
                  >
                    <FileText size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-300 truncate">{file.name}</p>
                      {file.content && (
                        <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{getExcerpt(file.content, 80)}</p>
                      )}
                    </div>
                  </button>
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: file.id, name: file.name, type: 'file' }); }}
                    aria-label="Удалить файл"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          folder.subfolders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderIcon size={32} className="text-gray-700 mb-3" />
              <p className="text-sm text-gray-600">Папка пуста</p>
              <p className="text-xs text-gray-700 mt-1">Создайте файл или отправьте сообщение в чат</p>
            </div>
          )
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        title={`Удалить «${deleteTarget?.name}»?`}
        description="Файл будет удалён навсегда."
        onConfirm={() => {
          if (deleteTarget?.type === 'file') deleteFile(deleteTarget.id as FileId);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
