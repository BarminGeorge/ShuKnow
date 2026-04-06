import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

// Mock chat session
const mockSession = {
  id: 'mock-session-id',
  status: 'Active' as const,
  messageCount: 0,
  canRollback: false,
};

// Mock uploaded attachments storage
const uploadedAttachments: Array<{
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}> = [];

export const chatHandlers = [
  // GET /api/chat/session
  http.get(`${API_BASE}/chat/session`, () => {
    return HttpResponse.json(mockSession);
  }),

  // DELETE /api/chat/session
  http.delete(`${API_BASE}/chat/session`, () => {
    mockSession.messageCount = 0;
    mockSession.canRollback = false;
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/chat/session/messages
  http.get(`${API_BASE}/chat/session/messages`, () => {
    return HttpResponse.json({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
  }),

  // POST /api/chat/attachments
  http.post(`${API_BASE}/chat/attachments`, async ({ request }) => {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    const results = files.map((file) => {
      const attachment = {
        id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      };
      uploadedAttachments.push(attachment);
      return attachment;
    });
    
    return HttpResponse.json(results);
  }),
];
