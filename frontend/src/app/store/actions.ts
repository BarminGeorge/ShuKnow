import { atom } from 'jotai';
import { toast } from 'sonner';
import { 
  foldersAtom, 
  filesAtom, 
  selectedFolderPathAtom,
  openTabIdsAtom,
  activeTabIdAtom,
  viewModeAtom,
  messagesAtom,
  isLoadingFoldersAtom
} from './atoms';
import { folderService, fileService } from '../../api';
import type { Folder, FileItem } from '../../api/types';
import { getFileDisplayType, mapFileDtoToFileItem } from '../../api/types';
import type { Message } from '../components/ChatMessages';

// ── Folder actions ──────────────────────────────────────────────────────────

export const loadFoldersAtom = atom(
  null,
  async (get, set) => {
    const mapFolder = (apiFolder: any): Folder => {
      // If it's already a Folder with subfolders, return as is
      if (apiFolder.subfolders !== undefined) {
        return {
          ...apiFolder,
          subfolders: apiFolder.subfolders.map(mapFolder),
        };
      }
      // Otherwise map from FolderTreeNodeDto
      return {
        id: apiFolder.id,
        name: apiFolder.name,
        description: apiFolder.description,
        sortOrder: apiFolder.sortOrder,
        fileCount: apiFolder.fileCount ?? 0,
        subfolders: apiFolder.children?.map(mapFolder) || [],
        emoji: apiFolder.emoji,
        prompt: apiFolder.prompt,
        customOrder: apiFolder.customOrder,
      };
    };

    const collectFolders = (folderList: Folder[]): Folder[] => (
      folderList.flatMap((folder) => [folder, ...collectFolders(folder.subfolders || [])])
    );

    const fetchAllFolderFiles = async (folderId: string): Promise<FileItem[]> => {
      const loadedFiles: FileItem[] = [];
      let page = 1;
      const pageSize = 100;
      let hasNextPage = true;

      while (hasNextPage) {
        const pageResult = await fileService.fetchFolderFiles(folderId, page, pageSize);
        const mappedPageFiles = pageResult.items.map((fileDto) => ({
          ...mapFileDtoToFileItem(fileDto),
          type: getFileDisplayType(fileDto.contentType),
        }));
        loadedFiles.push(...mappedPageFiles);
        hasNextPage = pageResult.hasNextPage;
        page += 1;
      }

      return loadedFiles;
    };

    set(isLoadingFoldersAtom, true);
    try {
      const apiTree = await folderService.fetchFolderTree();
      const folders = apiTree.map(mapFolder);
      const foldersWithFiles = collectFolders(folders);
      const allFiles = (
        await Promise.all(foldersWithFiles.map((folder) => fetchAllFolderFiles(folder.id)))
      ).flat();

      set(filesAtom, allFiles);
      set(foldersAtom, folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error('Не удалось загрузить папки. Попробуйте перезагрузить страницу.');
      // Don't throw - handle error gracefully
    } finally {
      set(isLoadingFoldersAtom, false);
    }
  }
);

export const updateFolderAtom = atom(
  null,
  (get, set, path: string[], updates: Partial<Folder>) => {
    const folders = get(foldersAtom);
    const newFolders = JSON.parse(JSON.stringify(folders)) as Folder[];
    
    let currentFolderList: Folder[] = newFolders;
    for (let i = 0; i < path.length - 1; i++) {
      const folderIndex = parseInt(path[i]);
      if (!currentFolderList[folderIndex]) return;
      currentFolderList = currentFolderList[folderIndex].subfolders || [];
    }
    
    const folderIndex = parseInt(path[path.length - 1]);
    if (currentFolderList[folderIndex]) {
      Object.assign(currentFolderList[folderIndex], updates);
    }
    
    set(foldersAtom, newFolders);
  }
);

export const setFoldersAtom = atom(
  null,
  (get, set, folders: Folder[]) => {
    set(foldersAtom, folders);
  }
);

export const createFolderAtom = atom(
  null,
  (get, set, folder: Folder, parentPath: string[] | null) => {
    const folders = get(foldersAtom);
    
    if (parentPath === null) {
      // Add to root
      set(foldersAtom, [...folders, folder]);
    } else {
      // Add to subfolder
      const newFolders = JSON.parse(JSON.stringify(folders)) as Folder[];
      let currentFolderList: Folder[] = newFolders;
      
      for (let i = 0; i < parentPath.length; i++) {
        const folderIndex = parseInt(parentPath[i]);
        if (i === parentPath.length - 1) {
          if (!currentFolderList[folderIndex].subfolders) {
            currentFolderList[folderIndex].subfolders = [];
          }
          currentFolderList[folderIndex].subfolders!.push(folder);
        } else {
          if (!currentFolderList[folderIndex].subfolders) return;
          currentFolderList = currentFolderList[folderIndex].subfolders!;
        }
      }
      
      set(foldersAtom, newFolders);
    }
  }
);

export const moveFolderAtom = atom(
  null,
  (get, set, updater: (folders: Folder[]) => Folder[]) => {
    const folders = get(foldersAtom);
    const newFolders = updater(folders);
    set(foldersAtom, newFolders);
  }
);

// ── File actions ────────────────────────────────────────────────────────────

export const createFileAtom = atom(
  null,
  (get, set, file: FileItem, openAfterCreate?: boolean) => {
    const files = get(filesAtom);
    set(filesAtom, [...files, file]);
    
    if (openAfterCreate) {
      const openTabIds = get(openTabIdsAtom);
      if (!openTabIds.includes(file.id)) {
        set(openTabIdsAtom, [...openTabIds, file.id]);
      }
      set(activeTabIdAtom, file.id);
      set(viewModeAtom, 'editor');
    }
  }
);

export const updateFileAtom = atom(
  null,
  (get, set, fileId: string, updates: Partial<FileItem>) => {
    const files = get(filesAtom);
    set(filesAtom, files.map(f => f.id === fileId ? { ...f, ...updates } : f));
  }
);

export const deleteFileAtom = atom(
  null,
  (get, set, fileId: string) => {
    const files = get(filesAtom);
    set(filesAtom, files.filter(f => f.id !== fileId));
    
    // Close tab if open
    const openTabIds = get(openTabIdsAtom);
    if (openTabIds.includes(fileId)) {
      const newTabIds = openTabIds.filter(id => id !== fileId);
      set(openTabIdsAtom, newTabIds);
      
      const activeTabId = get(activeTabIdAtom);
      if (activeTabId === fileId) {
        const idx = openTabIds.indexOf(fileId);
        const newActive = newTabIds[idx] ?? newTabIds[idx - 1] ?? null;
        set(activeTabIdAtom, newActive);
        
        if (newActive === null) {
          const selectedPath = get(selectedFolderPathAtom);
          set(viewModeAtom, selectedPath ? 'folder' : 'chat');
        }
      }
    }
  }
);

// ── Tab actions ─────────────────────────────────────────────────────────────

export const openTabAtom = atom(
  null,
  (get, set, fileId: string) => {
    const openTabIds = get(openTabIdsAtom);
    if (!openTabIds.includes(fileId)) {
      set(openTabIdsAtom, [...openTabIds, fileId]);
    }
    set(activeTabIdAtom, fileId);
    set(viewModeAtom, 'editor');
  }
);

export const closeTabAtom = atom(
  null,
  (get, set, fileId: string) => {
    const openTabIds = get(openTabIdsAtom);
    const newTabIds = openTabIds.filter(id => id !== fileId);
    set(openTabIdsAtom, newTabIds);
    
    const activeTabId = get(activeTabIdAtom);
    if (activeTabId === fileId) {
      const idx = openTabIds.indexOf(fileId);
      const newActive = newTabIds[idx] ?? newTabIds[idx - 1] ?? null;
      set(activeTabIdAtom, newActive);
      
      if (newActive === null) {
        const selectedPath = get(selectedFolderPathAtom);
        set(viewModeAtom, selectedPath ? 'folder' : 'chat');
      }
    }
  }
);

export const switchTabAtom = atom(
  null,
  (get, set, fileId: string) => {
    set(activeTabIdAtom, fileId);
    set(viewModeAtom, 'editor');
  }
);

// ── Chat actions ────────────────────────────────────────────────────────────

export const sendMessageAtom = atom(
  null,
  (get, set, content: string, attachments?: any[]) => {
    const messages = get(messagesAtom);
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(),
      attachments,
      timestamp: new Date(),
      status: "sending",
    };
    set(messagesAtom, [...messages, userMessage]);
  }
);
