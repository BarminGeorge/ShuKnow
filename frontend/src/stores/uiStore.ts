/**
 * uiStore — manages all UI state: active panel, expanded folders, editor mode.
 * Persists sidebar width and expanded folders.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RightPanelView, EditorMode, FolderId } from '@/types';

interface UiState {
  rightPanel: RightPanelView;
  sidebarWidth: number;
  expandedFolderIds: string[];
  editorMode: EditorMode;
  previousPanel: RightPanelView | null;

  setRightPanel: (view: RightPanelView) => void;
  goBack: () => void;
  toggleFolder: (id: FolderId) => void;
  expandFolder: (id: FolderId) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSidebarWidth: (w: number) => void;
  isFolderExpanded: (id: FolderId) => boolean;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      rightPanel: { type: 'chat' },
      previousPanel: null,
      sidebarWidth: 280,
      expandedFolderIds: [],
      editorMode: 'edit',

      setRightPanel: (view) =>
        set((state) => ({
          previousPanel: state.rightPanel,
          rightPanel: view,
        })),

      goBack: () =>
        set((state) => ({
          rightPanel: state.previousPanel ?? { type: 'chat' },
          previousPanel: null,
        })),

      toggleFolder: (id) =>
        set((state) => ({
          expandedFolderIds: state.expandedFolderIds.includes(id)
            ? state.expandedFolderIds.filter((x) => x !== id)
            : [...state.expandedFolderIds, id],
        })),

      expandFolder: (id) =>
        set((state) => ({
          expandedFolderIds: state.expandedFolderIds.includes(id)
            ? state.expandedFolderIds
            : [...state.expandedFolderIds, id],
        })),

      isFolderExpanded: (id) => get().expandedFolderIds.includes(id),

      setEditorMode: (mode) => set({ editorMode: mode }),

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
    }),
    {
      name: 'shuknow-ui',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        expandedFolderIds: state.expandedFolderIds,
        editorMode: state.editorMode,
      }),
    }
  )
);
