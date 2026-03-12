import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import type { FileId, Folder, FolderId } from '@/types';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { getWordCount } from '@/utils/markdown';
import { useAutoSave } from '@/hooks/useAutoSave';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { SplitEditor } from './SplitEditor';
import { EditorToolbar } from './EditorToolbar';
import { EditorTopBar } from './EditorTopBar';

export interface FileEditorViewProps {
  fileId: FileId;
}

function findFolderInTree(list: Folder[], id: FolderId): Folder | null {
  for (const f of list) {
    if (f.id === id) return f;
    const found = findFolderInTree(f.subfolders, id);
    if (found) return found;
  }
  return null;
}

export function FileEditorView({ fileId }: FileEditorViewProps) {
  // ── Store selectors ──────────────────────────────────────────────────────
  const files = useFileSystemStore((s) => s.files);
  const folders = useFileSystemStore((s) => s.folders);
  const updateFile = useFileSystemStore((s) => s.updateFile);
  const editorMode = useEditorStore((s) => s.editorMode);
  const markSaving = useEditorStore((s) => s.markSaving);
  const markSaved = useEditorStore((s) => s.markSaved);
  const goBack = useUiStore((s) => s.goBack);

  const file = files.find((f) => f.id === fileId);
  const folder = file ? findFolderInTree(folders, file.folderId) : null;

  // ── Local content state ──────────────────────────────────────────────────
  const [content, setContent] = useState(
    () =>
      useFileSystemStore.getState().files.find((f) => f.id === fileId)
        ?.content ?? '',
  );

  // Reset content when switching to a different file
  useEffect(() => {
    const fresh = useFileSystemStore
      .getState()
      .files.find((f) => f.id === fileId);
    setContent(fresh?.content ?? '');
  }, [fileId]);

  // ── Auto-save ────────────────────────────────────────────────────────────
  useAutoSave(fileId, content);

  // ── Manual save (Ctrl+S) ─────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    markSaving(fileId);
    updateFile(fileId, { content });
    markSaved(fileId);
  }, [fileId, content, updateFile, markSaving, markSaved]);

  // ── EditorView ref (for toolbar) ─────────────────────────────────────────
  const editorViewRef: React.MutableRefObject<EditorView | null> =
    useRef<EditorView | null>(null);

  // ── Close handler ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => goBack(), [goBack]);

  // ── File not found ───────────────────────────────────────────────────────
  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#1e1e1e] gap-2">
        <p className="text-gray-400 text-sm">Файл не найден</p>
        <button
          onClick={handleClose}
          className="text-xs text-gray-600 hover:text-gray-400 underline"
        >
          Назад
        </button>
      </div>
    );
  }

  const wordCount = getWordCount(content);
  const showToolbar = editorMode !== 'preview';

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      {/* Top bar */}
      <EditorTopBar
        file={file}
        folderName={folder?.name}
        wordCount={wordCount}
        onClose={handleClose}
      />

      {/* Formatting toolbar (edit / split modes) */}
      {showToolbar && <EditorToolbar editorViewRef={editorViewRef} />}

      {/* Editor body */}
      <div className="flex-1 overflow-hidden">
        {editorMode === 'edit' && (
          <MarkdownEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
            viewRef={editorViewRef}
          />
        )}

        {editorMode === 'preview' && <MarkdownPreview content={content} />}

        {editorMode === 'split' && (
          <SplitEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
            editorViewRef={editorViewRef}
          />
        )}
      </div>
    </div>
  );
}
