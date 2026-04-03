import { atom } from 'jotai';
import { 
  foldersAtom, 
  filesAtom, 
  selectedFolderPathAtom,
  openTabIdsAtom,
  activeTabIdAtom 
} from './atoms';
import type { Folder, FileItem } from '../../api/types';

// ── Folder selectors ────────────────────────────────────────────────────────

// Get current folder by selected path
export const currentFolderAtom = atom((get) => {
  const folders = get(foldersAtom);
  const path = get(selectedFolderPathAtom);
  
  if (!path || path.length === 0) return null;
  
  let currentFolderList: Folder[] = folders;
  let currentFolder: Folder | null = null;
  
  for (let i = 0; i < path.length; i++) {
    const folderIndex = parseInt(path[i]);
    if (!currentFolderList[folderIndex]) return null;
    currentFolder = currentFolderList[folderIndex];
    if (i < path.length - 1) {
      currentFolderList = currentFolder.subfolders || [];
    }
  }
  
  return currentFolder;
});

// Get breadcrumbs for current folder
export const breadcrumbsAtom = atom((get) => {
  const folders = get(foldersAtom);
  const path = get(selectedFolderPathAtom);
  
  if (!path || path.length === 0) return [];
  
  const breadcrumbs: string[] = [];
  let currentFolderList: Folder[] = folders;
  
  for (const pathSegment of path) {
    const folderIndex = parseInt(pathSegment);
    if (!currentFolderList[folderIndex]) break;
    const folder = currentFolderList[folderIndex];
    breadcrumbs.push(folder.name);
    currentFolderList = folder.subfolders || [];
  }
  
  return breadcrumbs;
});

// Get files in current folder
export const filesInCurrentFolderAtom = atom((get) => {
  const files = get(filesAtom);
  const currentFolder = get(currentFolderAtom);
  
  if (!currentFolder) return [];
  
  return files.filter(f => f.folderId === currentFolder.id);
});

// ── Tab selectors ───────────────────────────────────────────────────────────

// Get open tabs with file data
export const openTabsAtom = atom((get) => {
  const openTabIds = get(openTabIdsAtom);
  const files = get(filesAtom);
  
  return openTabIds
    .map(id => files.find(f => f.id === id))
    .filter((f): f is FileItem => f !== undefined);
});

// Get active tab file
export const activeTabFileAtom = atom((get) => {
  const activeTabId = get(activeTabIdAtom);
  const files = get(filesAtom);
  
  if (!activeTabId) return null;
  
  return files.find(f => f.id === activeTabId) || null;
});
