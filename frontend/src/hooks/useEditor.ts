import { useEditorStore } from '@/stores/editorStore';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import type { FileId } from '@/types';

/**
 * Combines editor store state with file content for a given file.
 */
export function useEditor(fileId: FileId | null) {
  const openFileIds = useEditorStore((s) => s.openFileIds);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const saveStatus = useEditorStore((s) => (fileId ? s.saveStatus[fileId] ?? 'saved' : 'saved'));
  const editorMode = useEditorStore((s) => s.editorMode);
  const openFile = useEditorStore((s) => s.openFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const markSaved = useEditorStore((s) => s.markSaved);
  const markSaving = useEditorStore((s) => s.markSaving);
  const markUnsaved = useEditorStore((s) => s.markUnsaved);

  const file = useFileSystemStore((s) => (fileId ? s.files.find((f) => f.id === fileId) ?? null : null));

  return {
    file,
    openFileIds,
    activeFileId,
    saveStatus,
    editorMode,
    openFile,
    closeFile,
    setActiveFile,
    setEditorMode,
    markSaved,
    markSaving,
    markUnsaved,
  };
}
