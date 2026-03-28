/**
 * AI Settings Service
 * Handles LLM provider configuration (base URL + API key)
 */

import { apiRequest } from "./client";
import type { AiSettingsDto, UpdateAiSettingsRequest, AiConnectionTestDto } from "./types";

/**
 * Get current AI provider configuration
 * Returns baseUrl and masked API key
 */
export async function getAiSettings(): Promise<AiSettingsDto> {
  return apiRequest<AiSettingsDto>("/api/settings/ai");
}

/**
 * Update AI provider configuration
 * Sets the base URL and API key for LLM provider
 */
export async function updateAiSettings(request: UpdateAiSettingsRequest): Promise<AiSettingsDto> {
  return apiRequest<AiSettingsDto>("/api/settings/ai", {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Test AI provider connection
 * Sends a minimal probe request to validate configuration
 */
export async function testAiConnection(): Promise<AiConnectionTestDto> {
  return apiRequest<AiConnectionTestDto>("/api/settings/ai/test", {
    method: "POST",
  });
}

export const settingsService = {
  getAiSettings,
  updateAiSettings,
  testAiConnection,
};
