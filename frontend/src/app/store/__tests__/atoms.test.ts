import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  viewModeAtom,
  isSidebarCollapsedAtom,
  foldersAtom,
  isLoadingFoldersAtom,
  selectedFolderPathAtom,
  filesAtom,
  openTabIdsAtom,
  activeTabIdAtom,
  messagesAtom,
  currentTitleAtom,
} from '../atoms';

describe('Store Atoms', () => {
  describe('viewModeAtom', () => {
    it('should have initial value "chat"', () => {
      const store = createStore();
      expect(store.get(viewModeAtom)).toBe('chat');
    });

    it('should allow setting view mode', () => {
      const store = createStore();
      store.set(viewModeAtom, 'folder');
      expect(store.get(viewModeAtom)).toBe('folder');
    });
  });

  describe('isSidebarCollapsedAtom', () => {
    it('should have initial value false', () => {
      const store = createStore();
      expect(store.get(isSidebarCollapsedAtom)).toBe(false);
    });

    it('should allow toggling sidebar state', () => {
      const store = createStore();
      store.set(isSidebarCollapsedAtom, true);
      expect(store.get(isSidebarCollapsedAtom)).toBe(true);
    });
  });

  describe('foldersAtom', () => {
    it('should have initial value as empty array', () => {
      const store = createStore();
      expect(store.get(foldersAtom)).toEqual([]);
    });

    it('should allow setting folders', () => {
      const store = createStore();
      const folders = [
        { id: '1', name: 'Test', description: '', sortOrder: 0, fileCount: 0, subfolders: [] },
      ];
      store.set(foldersAtom, folders);
      expect(store.get(foldersAtom)).toEqual(folders);
    });
  });

  describe('isLoadingFoldersAtom', () => {
    it('should have initial value false', () => {
      const store = createStore();
      expect(store.get(isLoadingFoldersAtom)).toBe(false);
    });
  });

  describe('selectedFolderPathAtom', () => {
    it('should have initial value null', () => {
      const store = createStore();
      expect(store.get(selectedFolderPathAtom)).toBe(null);
    });

    it('should allow setting folder path', () => {
      const store = createStore();
      store.set(selectedFolderPathAtom, ['0', '1']);
      expect(store.get(selectedFolderPathAtom)).toEqual(['0', '1']);
    });
  });

  describe('filesAtom', () => {
    it('should have initial value as empty array', () => {
      const store = createStore();
      expect(store.get(filesAtom)).toEqual([]);
    });
  });

  describe('openTabIdsAtom', () => {
    it('should have initial value as empty array', () => {
      const store = createStore();
      expect(store.get(openTabIdsAtom)).toEqual([]);
    });

    it('should allow adding tab IDs', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['file-1', 'file-2']);
      expect(store.get(openTabIdsAtom)).toEqual(['file-1', 'file-2']);
    });
  });

  describe('activeTabIdAtom', () => {
    it('should have initial value null', () => {
      const store = createStore();
      expect(store.get(activeTabIdAtom)).toBe(null);
    });

    it('should allow setting active tab', () => {
      const store = createStore();
      store.set(activeTabIdAtom, 'file-1');
      expect(store.get(activeTabIdAtom)).toBe('file-1');
    });
  });

  describe('messagesAtom', () => {
    it('should have initial value as empty array', () => {
      const store = createStore();
      expect(store.get(messagesAtom)).toEqual([]);
    });
  });

  describe('currentTitleAtom', () => {
    it('should have initial value', () => {
      const store = createStore();
      expect(store.get(currentTitleAtom)).toBe('Привет! Чем могу помочь?');
    });
  });
});
