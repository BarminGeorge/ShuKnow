import { useState, useEffect } from "react";
import { X, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { settingsService } from "../../api";
import type { AiSettingsDto, AiProvider } from "../../api/types";

// Available providers - ready for backend enum support
const AI_PROVIDERS: { value: AiProvider; label: string; baseUrlHint: string }[] = [
  { value: "openai", label: "OpenAI", baseUrlHint: "https://api.openai.com/v1" },
  { value: "openrouter", label: "OpenRouter", baseUrlHint: "https://openrouter.ai/api/v1" },
  { value: "anthropic", label: "Anthropic", baseUrlHint: "https://api.anthropic.com/v1" },
  { value: "custom", label: "Custom", baseUrlHint: "" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AiSettingsDto | null>(null);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number | null; errorMessage?: string | null } | null>(null);
  const { user } = useAuth();

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getAiSettings();
      setSettings(data);
      setBaseUrl(data.baseUrl || "");
      setProvider(data.provider || "openai");
      setModelId(data.modelId || "");
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setIsEditingKey(false);
    setShowKey(false);
    setTestResult(null);
    setApiKey("");
    setModelId("");
    onClose();
  };

  const handleSave = async () => {
    if (!baseUrl || !apiKey) return;
    
    setIsSaving(true);
    try {
      const updated = await settingsService.updateAiSettings({ 
        baseUrl, 
        apiKey,
        provider,
        modelId: modelId || undefined,
      });
      setSettings(updated);
      setApiKey("");
      setIsEditingKey(false);
      setTestResult(null);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    // Auto-fill base URL hint when switching providers
    const providerInfo = AI_PROVIDERS.find(p => p.value === newProvider);
    if (providerInfo?.baseUrlHint && !baseUrl) {
      setBaseUrl(providerInfo.baseUrlHint);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await settingsService.testAiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, errorMessage: "Не удалось проверить подключение" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div 
        className="bg-[#1a1a1a] border border-white/20 rounded-xl w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <button
            onClick={isEditingKey ? () => { setIsEditingKey(false); setTestResult(null); } : handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isEditingKey ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
          <h2 className="text-lg font-semibold text-white">
            {isEditingKey ? "Настройки AI провайдера" : "Настройки"}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !isEditingKey ? (
            <div className="space-y-6">
              {/* Account Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Аккаунт</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Логин</label>
                    <div className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-400">
                      {user?.login || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Settings Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">AI Настройки</h3>
                <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      {settings?.provider && (
                        <div>
                          <span className="text-xs text-gray-500">Провайдер</span>
                          <p className="text-sm text-gray-200">
                            {AI_PROVIDERS.find(p => p.value === settings.provider)?.label || settings.provider}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">Base URL</span>
                        <p className="text-sm text-gray-200 truncate">
                          {settings?.baseUrl || "Не настроен"}
                        </p>
                      </div>
                      {settings?.modelId && (
                        <div>
                          <span className="text-xs text-gray-500">Модель</span>
                          <p className="text-sm text-gray-200">
                            {settings.modelId}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">API Ключ</span>
                        <p className="text-sm text-gray-400 font-mono">
                          {settings?.apiKeyMasked || "Не задан"}
                        </p>
                      </div>
                      {settings?.isConfigured && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span className="text-xs text-green-500">Настроено</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap ml-4"
                    >
                      Изменить
                    </button>
                  </div>
                </div>
                
                {/* Test Connection Button */}
                {settings?.isConfigured && (
                  <div className="mt-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      Проверить подключение
                    </button>
                    {testResult && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${testResult.success ? "text-green-500" : "text-red-400"}`}>
                        {testResult.success ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Подключение успешно{testResult.latencyMs ? ` (${testResult.latencyMs} мс)` : ""}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} />
                            <span>{testResult.errorMessage || "Ошибка подключения"}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Провайдер</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handleProviderChange(p.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                        provider === p.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-[#0d0d0d] border-white/10 text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={AI_PROVIDERS.find(p => p.value === provider)?.baseUrlHint || "https://api.openai.com/v1"}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL провайдера API
                </p>
              </div>

              {/* Model ID */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Модель (опционально)</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-3-5-sonnet-20241022" : ""}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID модели для использования
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Ключ</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full pl-3 pr-10 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                  {apiKey && (
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSave}
                  disabled={!baseUrl || !apiKey || isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}