import { http, HttpResponse } from 'msw';
import { MOCK_FOLDERS } from '../data/folders';
import type { Folder, FolderTreeNodeDto } from '../../api/types';

const API_BASE = '/api';

const findFolderById = (folders: Folder[], folderId: string): Folder | null => {
  for (const folder of folders) {
    if (folder.id === folderId) return folder;
    const found = findFolderById(folder.subfolders || [], folderId);
    if (found) return found;
  }

  return null;
};

const containsFolderId = (folder: Folder, folderId: string): boolean => {
  return (folder.subfolders || []).some(subfolder => (
    subfolder.id === folderId || containsFolderId(subfolder, folderId)
  ));
};

const removeFolderById = (folders: Folder[], folderId: string): Folder | null => {
  const folderIndex = folders.findIndex(folder => folder.id === folderId);
  if (folderIndex >= 0) {
    return folders.splice(folderIndex, 1)[0];
  }

  for (const folder of folders) {
    const removed = removeFolderById(folder.subfolders || [], folderId);
    if (removed) return removed;
  }

  return null;
};

const insertFolderIntoParent = (folders: Folder[], folder: Folder, parentId: string | null): boolean => {
  if (!parentId) {
    folder.sortOrder = folders.length;
    folders.push(folder);
    return true;
  }

  const parentFolder = findFolderById(folders, parentId);
  if (!parentFolder) return false;

  parentFolder.subfolders = parentFolder.subfolders || [];
  folder.sortOrder = parentFolder.subfolders.length;
  parentFolder.subfolders.push(folder);
  return true;
};

const findFolderSiblingList = (folders: Folder[], folderId: string): Folder[] | null => {
  if (folders.some(folder => folder.id === folderId)) {
    return folders;
  }

  for (const folder of folders) {
    const found = findFolderSiblingList(folder.subfolders || [], folderId);
    if (found) return found;
  }

  return null;
};

const normalizeFolderSortOrder = (folders: Folder[]) => {
  folders.forEach((folder, index) => {
    folder.sortOrder = index;
  });
};

// Helper: Convert Folder to FolderTreeNodeDto
function folderToTreeNode(folder: Folder): FolderTreeNodeDto {
  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    sortOrder: folder.sortOrder,
    fileCount: folder.fileCount,
    children: (folder.subfolders || []).map(folderToTreeNode),
  };
}

export const folderHandlers = [
  // GET /api/folders/tree
  http.get(`${API_BASE}/folders/tree`, () => {
    const treeNodes = MOCK_FOLDERS.map(folderToTreeNode);
    return HttpResponse.json(treeNodes);
  }),

  // GET /api/folders/:id
  http.get(`${API_BASE}/folders/:id`, ({ params }) => {
    const { id } = params;
    const findFolder = (folders: Folder[]): Folder | null => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.subfolders) {
          const found = findFolder(folder.subfolders);
          if (found) return found;
        }
      }
      return null;
    };
    const folder = findFolder(MOCK_FOLDERS);
    if (!folder) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(folder);
  }),

  // POST /api/folders
  http.post(`${API_BASE}/folders`, async ({ request }) => {
    const body = await request.json() as any;
    const parentFolderId = body.parentFolderId ?? null;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: body.name,
      description: body.description,
      sortOrder: 0,
      fileCount: 0,
      subfolders: [],
      emoji: body.emoji,
      prompt: body.prompt,
    };

    if (!insertFolderIntoParent(MOCK_FOLDERS, newFolder, parentFolderId)) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(newFolder, { status: 201 });
  }),

  // PUT /api/folders/:id
  http.put(`${API_BASE}/folders/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const findAndUpdate = (folders: Folder[]): boolean => {
      for (const folder of folders) {
        if (folder.id === id) {
          Object.assign(folder, body);
          return true;
        }
        if (folder.subfolders && findAndUpdate(folder.subfolders)) {
          return true;
        }
      }
      return false;
    };
    const updated = findAndUpdate(MOCK_FOLDERS);
    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // DELETE /api/folders/:id
  http.delete(`${API_BASE}/folders/:id`, ({ params }) => {
    const { id } = params;
    const removeFolder = (folders: Folder[]): boolean => {
      const index = folders.findIndex(f => f.id === id);
      if (index !== -1) {
        folders.splice(index, 1);
        return true;
      }
      for (const folder of folders) {
        if (folder.subfolders && removeFolder(folder.subfolders)) {
          return true;
        }
      }
      return false;
    };
    const removed = removeFolder(MOCK_FOLDERS);
    if (!removed) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /api/folders/:id/move
  http.patch(`${API_BASE}/folders/:id/move`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const folderId = id as string;
    const newParentFolderId = body.newParentFolderId ?? null;
    const folderToMove = findFolderById(MOCK_FOLDERS, folderId);

    if (!folderToMove) {
      return HttpResponse.json({ id: folderId, parentFolderId: newParentFolderId });
    }

    if (newParentFolderId === folderId || containsFolderId(folderToMove, newParentFolderId)) {
      return new HttpResponse(null, { status: 409 });
    }

    const movedFolder = removeFolderById(MOCK_FOLDERS, folderId);
    if (!movedFolder) {
      return HttpResponse.json({ id: folderId, parentFolderId: newParentFolderId });
    }

    if (!insertFolderIntoParent(MOCK_FOLDERS, movedFolder, newParentFolderId)) {
      MOCK_FOLDERS.push(movedFolder);
    }

    return HttpResponse.json(movedFolder);
  }),

  // PATCH /api/folders/:id/reorder
  http.patch(`${API_BASE}/folders/:id/reorder`, async ({ params, request }) => {
    const { id } = params;
    const folderId = id as string;
    const siblings = findFolderSiblingList(MOCK_FOLDERS, folderId);

    if (!siblings) {
      return new HttpResponse(null, { status: 404 });
    }

    const body = await request.json() as any;
    const currentIndex = siblings.findIndex(folder => folder.id === folderId);
    const targetIndex = Math.min(Math.max(body.position ?? currentIndex, 0), siblings.length - 1);

    if (currentIndex !== targetIndex) {
      const [movedFolder] = siblings.splice(currentIndex, 1);
      siblings.splice(targetIndex, 0, movedFolder);
    }

    normalizeFolderSortOrder(siblings);
    return new HttpResponse(null, { status: 204 });
  }),
];
