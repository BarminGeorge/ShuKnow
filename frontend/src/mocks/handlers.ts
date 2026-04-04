import { http, HttpResponse } from 'msw';
import { MOCK_FOLDERS, MOCK_FILES } from './data';
import type { Folder, FileItem, FolderTreeNodeDto } from '../api/types';

const API_BASE = '/api';

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

export const handlers = [
  // GET /api/folders/tree
  http.get(`${API_BASE}/folders/tree`, () => {
    // Return full Folder objects with emoji instead of FolderTreeNodeDto
    return HttpResponse.json(MOCK_FOLDERS);
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

  // GET /api/folders/:id/files
  http.get(`${API_BASE}/folders/:id/files`, ({ params }) => {
    const { id } = params;
    const files = MOCK_FILES.filter(f => f.folderId === id);
    return HttpResponse.json({
      items: files,
      totalCount: files.length,
      page: 1,
      pageSize: 100,
      hasNextPage: false,
    });
  }),

  // POST /api/folders
  http.post(`${API_BASE}/folders`, async ({ request }) => {
    const body = await request.json() as any;
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: body.name,
      description: body.description,
      sortOrder: 0,
      fileCount: 0,
      subfolders: [],
      emoji: undefined,
      prompt: undefined,
    };
    MOCK_FOLDERS.push(newFolder);
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

  // POST /api/files
  http.post(`${API_BASE}/files`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const description = formData.get('description') as string;

    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: file.name,
      folderId,
      description,
      contentType: file.type,
      sizeBytes: file.size,
      type: file.type.startsWith('image/') ? 'photo' : 'text',
      createdAt: new Date().toISOString(),
    };
    MOCK_FILES.push(newFile);
    return HttpResponse.json(newFile, { status: 201 });
  }),

  // DELETE /api/files/:id
  http.delete(`${API_BASE}/files/:id`, ({ params }) => {
    const { id } = params;
    const index = MOCK_FILES.findIndex(f => f.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    MOCK_FILES.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
