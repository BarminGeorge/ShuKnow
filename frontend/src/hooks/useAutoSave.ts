import { useEffect, useRef } from 'react';
import type { FileId } from '@/types';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useEditorStore } from '@/stores/editorStore';

/**
 * Debounce-saves file content to the store (800 ms).
 * Marks the file as unsaved on change, saving/saved after flush.
 * Skips the initial mount and file-switch events to avoid spurious saves.
 */
export function useAutoSave(fileId: FileId, content: string): void {
  const updateFile = useFileSystemStore((s) => s.updateFile);
  const markUnsaved = useEditorStore((s) => s.markUnsaved);
  const markSaving = useEditorStore((s) => s.markSaving);
  const markSaved = useEditorStore((s) => s.markSaved);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the last { fileId, content } that represents a "clean" state
  const lastSavedRef = useRef<{ fileId: string; content: string }>({
    fileId,
    content,
  });

  useEffect(() => {
    const last = lastSavedRef.current;

    // Switching to a different file: update the baseline to the stored content
    if (fileId !== last.fileId) {
      const stored =
        useFileSystemStore.getState().files.find((f) => f.id === fileId)
          ?.content ?? '';
      lastSavedRef.current = { fileId, content: stored };
      return;
    }

    // Same file, content hasn't changed from baseline
    if (content === last.content) return;

    // Content changed — mark unsaved and schedule debounced save
    markUnsaved(fileId);

    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      markSaving(fileId);
      updateFile(fileId, { content });
      lastSavedRef.current = { fileId, content };
      markSaved(fileId);
      timerRef.current = null;
    }, 800);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [fileId, content, updateFile, markUnsaved, markSaving, markSaved]);
}
