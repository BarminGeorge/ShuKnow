import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { createStore } from 'jotai';
import { server } from '../../../mocks/server';
import {
  foldersAtom,
  filesAtom,
  openTabIdsAtom,
  activeTabIdAtom,
  viewModeAtom,
} from '../atoms';
import {
  loadFoldersAtom,
  updateFolderAtom,
  createFileAtom,
  updateFileAtom,
  deleteFileAtom,
  openTabAtom,
  closeTabAtom,
  switchTabAtom,
} from '../actions';
import type { Folder, FileItem } from '../../../api/types';

// Setup MSW server for API mocking
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Store Actions', () => {
  describe('loadFoldersAtom', () => {
    it('should load folders from API', async () => {
      const store = createStore();
      await store.set(loadFoldersAtom);
      const folders = store.get(foldersAtom);
      expect(folders.length).toBeGreaterThan(0);
      expect(folders[0]).toHaveProperty('id');
      expect(folders[0]).toHaveProperty('name');
    });
  });

  describe('updateFolderAtom', () => {
    it('should update folder by path', () => {
      const store = createStore();
      const mockFolders: Folder[] = [
        {
          id: '1',
          name: 'Old Name',
          description: '',
          sortOrder: 0,
          fileCount: 0,
          subfolders: [],
        },
      ];
      store.set(foldersAtom, mockFolders);
      store.set(updateFolderAtom, ['0'], { name: 'New Name' });
      const folders = store.get(foldersAtom);
      expect(folders[0].name).toBe('New Name');
    });

    it('should update nested folder', () => {
      const store = createStore();
      const mockFolders: Folder[] = [
        {
          id: '1',
          name: 'Parent',
          description: '',
          sortOrder: 0,
          fileCount: 0,
          subfolders: [
            {
              id: '1-1',
              name: 'Old Child',
              description: '',
              sortOrder: 0,
              fileCount: 0,
              subfolders: [],
            },
          ],
        },
      ];
      store.set(foldersAtom, mockFolders);
      store.set(updateFolderAtom, ['0', '0'], { name: 'New Child' });
      const folders = store.get(foldersAtom);
      expect(folders[0].subfolders[0].name).toBe('New Child');
    });
  });

  describe('createFileAtom', () => {
    it('should add file to files array', () => {
      const store = createStore();
      const newFile: FileItem = {
        id: 'f1',
        name: 'Test File',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 100,
        type: 'text',
      };
      store.set(createFileAtom, newFile, false);
      const files = store.get(filesAtom);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('f1');
    });

    it('should open file in tab when openAfterCreate is true', () => {
      const store = createStore();
      const newFile: FileItem = {
        id: 'f1',
        name: 'Test File',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 100,
        type: 'text',
      };
      store.set(createFileAtom, newFile, true);
      expect(store.get(openTabIdsAtom)).toContain('f1');
      expect(store.get(activeTabIdAtom)).toBe('f1');
      expect(store.get(viewModeAtom)).toBe('editor');
    });
  });

  describe('updateFileAtom', () => {
    it('should update file properties', () => {
      const store = createStore();
      const mockFiles: FileItem[] = [
        {
          id: 'f1',
          name: 'Old Name',
          folderId: '1',
          contentType: 'text/plain',
          sizeBytes: 100,
          type: 'text',
        },
      ];
      store.set(filesAtom, mockFiles);
      store.set(updateFileAtom, 'f1', { name: 'New Name' });
      const files = store.get(filesAtom);
      expect(files[0].name).toBe('New Name');
    });
  });

  describe('deleteFileAtom', () => {
    it('should remove file from files array', () => {
      const store = createStore();
      const mockFiles: FileItem[] = [
        {
          id: 'f1',
          name: 'File 1',
          folderId: '1',
          contentType: 'text/plain',
          sizeBytes: 100,
          type: 'text',
        },
        {
          id: 'f2',
          name: 'File 2',
          folderId: '1',
          contentType: 'text/plain',
          sizeBytes: 200,
          type: 'text',
        },
      ];
      store.set(filesAtom, mockFiles);
      store.set(deleteFileAtom, 'f1');
      const files = store.get(filesAtom);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('f2');
    });

    it('should close tab if file is open', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['f1', 'f2']);
      store.set(activeTabIdAtom, 'f1');
      store.set(deleteFileAtom, 'f1');
      expect(store.get(openTabIdsAtom)).not.toContain('f1');
    });
  });

  describe('openTabAtom', () => {
    it('should add tab to open tabs', () => {
      const store = createStore();
      store.set(openTabAtom, 'f1');
      expect(store.get(openTabIdsAtom)).toContain('f1');
      expect(store.get(activeTabIdAtom)).toBe('f1');
      expect(store.get(viewModeAtom)).toBe('editor');
    });

    it('should not duplicate tab if already open', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['f1']);
      store.set(openTabAtom, 'f1');
      expect(store.get(openTabIdsAtom)).toHaveLength(1);
    });
  });

  describe('closeTabAtom', () => {
    it('should remove tab from open tabs', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['f1', 'f2']);
      store.set(closeTabAtom, 'f1');
      expect(store.get(openTabIdsAtom)).not.toContain('f1');
    });

    it('should switch to next tab when closing active tab', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['f1', 'f2']);
      store.set(activeTabIdAtom, 'f1');
      store.set(closeTabAtom, 'f1');
      expect(store.get(activeTabIdAtom)).toBe('f2');
    });
  });

  describe('switchTabAtom', () => {
    it('should change active tab', () => {
      const store = createStore();
      store.set(openTabIdsAtom, ['f1', 'f2']);
      store.set(switchTabAtom, 'f2');
      expect(store.get(activeTabIdAtom)).toBe('f2');
      expect(store.get(viewModeAtom)).toBe('editor');
    });
  });
});
