import { http, HttpResponse } from 'msw';
import { MOCK_FILES } from '../data/files';
import type { FileItem } from '../../api/types';

const API_BASE = '/api';

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

  // PATCH /api/files/:id/reorder
  http.patch(`${API_BASE}/files/:id/reorder`, async ({ params, request }) => {
    const { id } = params;
    const file = MOCK_FILES.find(f => f.id === id);
    if (!file) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = await request.json() as any;
    if (body.position !== undefined) {
      file.sortOrder = body.position;
    }
    return HttpResponse.json(file);
  }),
];
