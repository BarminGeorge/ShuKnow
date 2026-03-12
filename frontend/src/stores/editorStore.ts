/**
 * editorStore — tracks open file tabs, active file, and save status.
 * Does NOT persist (session-only).
 */
import { create } from 'zustand';
import type { FileId, EditorMode } from '@/types';

type SaveStatus = 'saved' | 'unsaved' | 'saving';

interface EditorState {
  activeFileId: FileId | null;
  openFileIds: FileId[];
  saveStatus: Record<string, SaveStatus>;
  editorMode: EditorMode;

  openFile: (id: FileId) => void;
  closeFile: (id: FileId) => void;
  setActiveFile: (id: FileId | null) => void;
  markUnsaved: (id: FileId) => void;
  markSaving: (id: FileId) => void;
  markSaved: (id: FileId) => void;
  setEditorMode: (mode: EditorMode) => void;
  getSaveStatus: (id: FileId) => SaveStatus;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  activeFileId: null,
  openFileIds: [],
  saveStatus: {},
  editorMode: 'edit',

  openFile: (id) =>
    set((state) => ({
      openFileIds: state.openFileIds.includes(id)
        ? state.openFileIds
        : [...state.openFileIds, id],
      activeFileId: id,
    })),

  closeFile: (id) =>
    set((state) => {
      const remaining = state.openFileIds.filter((x) => x !== id);
      return {
        openFileIds: remaining,
        activeFileId:
          state.activeFileId === id
            ? (remaining[remaining.length - 1] ?? null)
            : state.activeFileId,
      };
    }),

  setActiveFile: (id) => set({ activeFileId: id }),

  markUnsaved: (id) =>
    set((state) => ({ saveStatus: { ...state.saveStatus, [id]: 'unsaved' } })),

  markSaving: (id) =>
    set((state) => ({ saveStatus: { ...state.saveStatus, [id]: 'saving' } })),

  markSaved: (id) =>
    set((state) => ({ saveStatus: { ...state.saveStatus, [id]: 'saved' } })),

  setEditorMode: (mode) => set({ editorMode: mode }),

  getSaveStatus: (id) => get().saveStatus[id] ?? 'saved',
}));
