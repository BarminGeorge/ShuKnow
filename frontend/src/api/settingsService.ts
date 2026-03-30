import { apiRequest } from "./client";
import type { AiSettingsDto, UpdateAiSettingsRequest, AiConnectionTestResult } from "./types";

export async function fetchAiSettings(): Promise<AiSettingsDto> {
  return apiRequest<AiSettingsDto>("/api/settings/ai");
}

export async function updateAiSettings(request: UpdateAiSettingsRequest): Promise<AiSettingsDto> {
  return apiRequest<AiSettingsDto>("/api/settings/ai", {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function testAiConnection(): Promise<AiConnectionTestResult> {
  return apiRequest<AiConnectionTestResult>("/api/settings/ai/test", {
    method: "POST",
  });
}

export const settingsService = {
  fetchAiSettings,
  updateAiSettings,
  testAiConnection,
};
