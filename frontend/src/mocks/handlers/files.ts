import { http, HttpResponse } from 'msw';
import { MOCK_FILES } from '../data/files';
import { MOCK_FOLDERS } from '../data/folders';
import type { FileItem, Folder } from '../../api/types';

const API_BASE = '/api';

const findFolderById = (folders: Folder[], folderId: string): Folder | null => {
  for (const folder of folders) {
    if (folder.id === folderId) return folder;

    const found = findFolderById(folder.subfolders || [], folderId);
    if (found) return found;
  }

  return null;
};

const getChildFolders = (folderId: string | null): Folder[] => {
  if (!folderId) return MOCK_FOLDERS;

  return findFolderById(MOCK_FOLDERS, folderId)?.subfolders || [];
};

const getMixedSiblingItems = (folderId: string | null) => (
  [
    ...MOCK_FILES
      .filter(file => (file.folderId || null) === folderId)
      .map(file => ({ type: 'file' as const, item: file, sortOrder: file.sortOrder ?? Number.MAX_SAFE_INTEGER })),
    ...getChildFolders(folderId)
      .map(folder => ({ type: 'folder' as const, item: folder, sortOrder: folder.sortOrder })),
  ].sort((a, b) => a.sortOrder - b.sortOrder)
);

const normalizeMixedSortOrder = (items: ReturnType<typeof getMixedSiblingItems>) => {
  items.forEach(({ item }, index) => {
    item.sortOrder = index;
  });
};

export const fileHandlers = [
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

  // POST /api/folders/:folderId/files
  http.post(`${API_BASE}/folders/:folderId/files`, async ({ params, request }) => {
    const { folderId } = params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: file.name,
      folderId: folderId as string,
      description,
      contentType: file.type,
      sizeBytes: file.size,
      type: file.type.startsWith('image/') ? 'photo' : 'text',
      createdAt: new Date().toISOString(),
      sortOrder: getMixedSiblingItems(folderId as string).length,
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

  // GET /api/files/:id/content
  http.get(`${API_BASE}/files/:id/content`, ({ params }) => {
    const { id } = params;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    if (file.content) {
      return HttpResponse.text(file.content);
    }
    return HttpResponse.text('Mock file content');
  }),

  // PUT /api/files/:id/content
  http.put(`${API_BASE}/files/:id/content`, async ({ params, request }) => {
    const { id } = params;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    const formData = await request.formData();
    const uploadedFile = formData.get('file') as File;
    const content = await uploadedFile.text();
    file.content = content;
    return HttpResponse.json(file);
  }),

  // PUT /api/files/:id
  http.put(`${API_BASE}/files/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    Object.assign(file, body);
    return HttpResponse.json(file);
  }),

  // PATCH /api/files/:id/content (lightweight text update)
  http.patch(`${API_BASE}/files/:id/content`, async ({ params, request }) => {
    const { id } = params;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = await request.json() as any;
    if (body.content !== undefined) {
      file.content = body.content;
    }
    return HttpResponse.json(file);
  }),

  // PATCH /api/files/:id/move
  http.patch(`${API_BASE}/files/:id/move`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return HttpResponse.json({
        id,
        folderId: body.targetFolderId ?? null,
      });
    }

    file.folderId = body.targetFolderId ?? null;
    return HttpResponse.json(file);
  }),

  // PATCH /api/files/:id/reorder
  http.patch(`${API_BASE}/files/:id/reorder`, async ({ params, request }) => {
    const { id } = params;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = await request.json() as any;
    if (body.position !== undefined) {
      const siblings = getMixedSiblingItems(file.folderId || null);
      const currentIndex = siblings.findIndex(sibling => sibling.type === 'file' && sibling.item.id === id);
      const targetIndex = Math.min(Math.max(body.position, 0), siblings.length - 1);

      if (currentIndex !== -1) {
        const [movedFile] = siblings.splice(currentIndex, 1);
        siblings.splice(targetIndex, 0, movedFile);
        normalizeMixedSortOrder(siblings);
      }
    }
    return HttpResponse.json(file);
  }),
];
