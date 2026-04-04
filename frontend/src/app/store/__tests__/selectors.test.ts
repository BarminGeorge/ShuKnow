import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  foldersAtom,
  filesAtom,
  selectedFolderPathAtom,
  openTabIdsAtom,
  activeTabIdAtom,
} from '../atoms';
import {
  currentFolderAtom,
  breadcrumbsAtom,
  filesInCurrentFolderAtom,
  openTabsAtom,
  activeTabFileAtom,
} from '../selectors';
import type { Folder, FileItem } from '../../../api/types';

describe('Store Selectors', () => {
  const mockFolders: Folder[] = [
    {
      id: '1',
      name: 'Folder 1',
      description: 'Test folder',
      sortOrder: 0,
      fileCount: 0,
      subfolders: [
        {
          id: '1-1',
          name: 'Subfolder 1-1',
          description: '',
          sortOrder: 0,
          fileCount: 0,
          subfolders: [],
        },
      ],
    },
    {
      id: '2',
      name: 'Folder 2',
      description: '',
      sortOrder: 1,
      fileCount: 0,
      subfolders: [],
    },
  ];

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
      folderId: '1-1',
      contentType: 'text/plain',
      sizeBytes: 200,
      type: 'text',
    },
  ];

  describe('currentFolderAtom', () => {
    it('should return null when no path is selected', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      expect(store.get(currentFolderAtom)).toBe(null);
    });

    it('should return root folder when path is ["0"]', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      store.set(selectedFolderPathAtom, ['0']);
      expect(store.get(currentFolderAtom)).toEqual(mockFolders[0]);
    });

    it('should return subfolder when path is ["0", "0"]', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      store.set(selectedFolderPathAtom, ['0', '0']);
      expect(store.get(currentFolderAtom)).toEqual(mockFolders[0].subfolders[0]);
    });

    it('should return null for invalid path', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      store.set(selectedFolderPathAtom, ['99']);
      expect(store.get(currentFolderAtom)).toBe(null);
    });
  });

  describe('breadcrumbsAtom', () => {
    it('should return empty array when no path is selected', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      expect(store.get(breadcrumbsAtom)).toEqual([]);
    });

    it('should return folder names for path', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      store.set(selectedFolderPathAtom, ['0', '0']);
      expect(store.get(breadcrumbsAtom)).toEqual(['Folder 1', 'Subfolder 1-1']);
    });
  });

  describe('filesInCurrentFolderAtom', () => {
    it('should return empty array when no folder is selected', () => {
      const store = createStore();
      store.set(filesAtom, mockFiles);
      expect(store.get(filesInCurrentFolderAtom)).toEqual([]);
    });

    it('should return files in current folder', () => {
      const store = createStore();
      store.set(foldersAtom, mockFolders);
      store.set(filesAtom, mockFiles);
      store.set(selectedFolderPathAtom, ['0']);
      const files = store.get(filesInCurrentFolderAtom);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe('f1');
    });
  });

  describe('openTabsAtom', () => {
    it('should return empty array when no tabs are open', () => {
      const store = createStore();
      expect(store.get(openTabsAtom)).toEqual([]);
    });

    it('should return file objects for open tab IDs', () => {
      const store = createStore();
      store.set(filesAtom, mockFiles);
      store.set(openTabIdsAtom, ['f1', 'f2']);
      const tabs = store.get(openTabsAtom);
      expect(tabs).toHaveLength(2);
      expect(tabs[0].id).toBe('f1');
      expect(tabs[1].id).toBe('f2');
    });

    it('should filter out non-existent file IDs', () => {
      const store = createStore();
      store.set(filesAtom, mockFiles);
      store.set(openTabIdsAtom, ['f1', 'non-existent', 'f2']);
      const tabs = store.get(openTabsAtom);
      expect(tabs).toHaveLength(2);
    });
  });

  describe('activeTabFileAtom', () => {
    it('should return null when no tab is active', () => {
      const store = createStore();
      expect(store.get(activeTabFileAtom)).toBe(null);
    });

    it('should return active file object', () => {
      const store = createStore();
      store.set(filesAtom, mockFiles);
      store.set(activeTabIdAtom, 'f1');
      const activeFile = store.get(activeTabFileAtom);
      expect(activeFile?.id).toBe('f1');
    });

    it('should return null for non-existent file ID', () => {
      const store = createStore();
      store.set(filesAtom, mockFiles);
      store.set(activeTabIdAtom, 'non-existent');
      expect(store.get(activeTabFileAtom)).toBe(null);
    });
  });
});
