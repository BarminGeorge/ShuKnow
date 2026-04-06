import { http, HttpResponse } from 'msw';
import { MOCK_USER, MOCK_TOKEN } from '../data/auth';

const API_BASE = '/api';

export const authHandlers = [
  // POST /api/auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    // В mock режиме принимаем любой логин/пароль
    return HttpResponse.text(MOCK_TOKEN);
  }),

  // POST /api/auth/register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as any;
    // В mock режиме регистрация всегда успешна
    return new HttpResponse(null, { status: 201 });
  }),

  // GET /api/auth/me
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json(MOCK_USER);
  }),
];
