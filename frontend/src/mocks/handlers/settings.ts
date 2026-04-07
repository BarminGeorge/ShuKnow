import { http, HttpResponse } from 'msw';
import { MOCK_AI_SETTINGS } from '../data/settings';
import type { AiSettingsDto, UpdateAiSettingsRequest, AiConnectionTestResult } from '../../api/types';

const API_BASE = '/api';

// Mutable mock settings state
let currentSettings: AiSettingsDto = { ...MOCK_AI_SETTINGS };

export const settingsHandlers = [
  // GET /api/settings/ai
  http.get(`${API_BASE}/settings/ai`, () => {
    return HttpResponse.json(currentSettings);
  }),

  // PUT /api/settings/ai
  http.put(`${API_BASE}/settings/ai`, async ({ request }) => {
    const body = await request.json() as UpdateAiSettingsRequest;
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update mock settings
    currentSettings = {
      baseUrl: body.baseUrl,
      apiKeyMasked: body.apiKey.length > 4
        ? body.apiKey.substring(0, 3) + '***' + body.apiKey.substring(body.apiKey.length - 3)
        : '***',
      isConfigured: true,
      provider: body.provider,
      modelId: body.modelId,
    };
    
    return HttpResponse.json(currentSettings);
  }),

  // POST /api/settings/ai/test
  http.post(`${API_BASE}/settings/ai/test`, async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate 80% success rate
    const isSuccess = Math.random() > 0.2;
    
    const result: AiConnectionTestResult = isSuccess
      ? {
          success: true,
          latencyMs: Math.floor(Math.random() * 500) + 200, // 200-700ms
          errorMessage: null,
        }
      : {
          success: false,
          latencyMs: null,
          errorMessage: 'Не удалось подключиться к API провайдера. Проверьте API ключ и URL.',
        };
    
    return HttpResponse.json(result);
  }),
];
