import type { AiSettingsDto } from "../../api/types";

export const MOCK_AI_SETTINGS: AiSettingsDto = {
  baseUrl: "https://api.openai.com/v1",
  apiKeyMasked: "sk-***abc1",
  isConfigured: true,
  provider: "openai",
  modelId: "gpt-4o",
};
