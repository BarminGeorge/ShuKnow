import { useState, useEffect } from "react";
import { X, Eye, EyeOff, ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { settingsService } from "../../api";
import type { AiProvider, AiConnectionTestResult } from "../../api/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Default base URLs for each provider
const PROVIDER_URLS: Record<string, string> = {
  OpenAI: "https://api.openai.com/v1",
  OpenRouter: "https://openrouter.ai/api/v1",
  Gemini: "https://generativelanguage.googleapis.com/v1beta",
  Anthropic: "https://api.anthropic.com/v1",
};

const PROVIDER_MODELS: Record<string, string> = {
  OpenAI: "gpt-4o",
  OpenRouter: "openai/gpt-4o",
  Gemini: "gemini-pro",
  Anthropic: "claude-3-5-sonnet-20241022",
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_URLS["OpenAI"]);
  const [modelId, setModelId] = useState("gpt-4o");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { user } = useAuth();

  // Update base URL and model when provider changes
  useEffect(() => {
    setBaseUrl(PROVIDER_URLS[provider] || "");
    setModelId(PROVIDER_MODELS[provider] || "");
  }, [provider]);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && !isEditingKey) {
      loadSettings();
    }
  }, [isOpen, isEditingKey]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsService.fetchAiSettings();
      
      setBaseUrl(settings.baseUrl || PROVIDER_URLS["OpenAI"]);
      
      // Convert provider from lowercase to PascalCase for UI
      const providerKey = settings.provider 
        ? settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)
        : "OpenAI";
      setProvider(providerKey);
      
      setModelId(settings.modelId || PROVIDER_MODELS[providerKey]);
      setApiKey(""); // Don't load key for security
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Не удалось загрузить настройки");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading || isTesting) return;
    setIsEditingKey(false);
    setShowKey(false);
    setSaveError(null);
    setTestResult(null);
    setApiKey("");
    onClose();
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setSaveError("API ключ не может быть пустым");
      return;
    }
    
    try {
      setIsLoading(true);
      setSaveError(null);
      setTestResult(null);
      
      // Save settings
      await settingsService.updateAiSettings({
        baseUrl,
        apiKey,
        provider: provider.toLowerCase() as AiProvider,
        modelId: modelId || undefined,
      });
      
      toast.success("Настройки сохранены");
      
      // Automatically run connection test
      setIsTesting(true);
      try {
        const result = await settingsService.testAiConnection();
        setTestResult(result);
        
        if (result.success) {
          toast.success(`Подключение успешно (${result.latencyMs}ms)`);
          // Close editing form only on successful test
          setTimeout(() => {
            setIsEditingKey(false);
            setApiKey("");
          }, 1500);
        } else {
          toast.error(result.errorMessage || "Не удалось подключиться");
        }
      } catch (testError) {
        console.error("Test failed:", testError);
        const errorMsg = testError instanceof Error ? testError.message : "Не удалось выполнить тест";
        setTestResult({
          success: false,
          latencyMs: null,
          errorMessage: errorMsg,
        });
        toast.error(errorMsg);
      } finally {
        setIsTesting(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      const errorMsg = error instanceof Error ? error.message : "Не удалось сохранить настройки";
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const maskKey = (key: string) => {
    if (!key) return "Не задан";
    if (key.length <= 6) return "••••••";
    return key.substring(0, 3) + "••••••••••••" + key.substring(key.length - 3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div 
        className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <button
            onClick={isEditingKey ? () => setIsEditingKey(false) : handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isEditingKey ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
          <h2 className="text-lg font-semibold text-white">
            {isEditingKey ? "Настройки API ключа" : "Настройки"}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {!isEditingKey ? (
            isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Account Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Аккаунт</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Логин</label>
                      <div className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-400">
                        {user?.login || "—"}
                      </div>
                    </div>
                    <button className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-gray-200 transition-colors text-sm">
                      Сменить пароль
                    </button>
                  </div>
                </div>

                {/* API Key Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">API Настройки</h3>
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-gray-200">{provider} — {modelId}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 font-mono tracking-wider">
                          {maskKey(apiKey)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 transition-colors whitespace-nowrap ml-4"
                    >
                      Изменить API ключ
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Провайдер</label>
                <div className="relative">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    disabled={isLoading || isTesting}
                    className="w-full pl-3 pr-10 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-50"
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="OpenRouter">OpenRouter</option>
                    <option value="Gemini">Gemini</option>
                    <option value="Anthropic">Anthropic</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={isLoading || isTesting}
                  placeholder="https://api.openai.com/v1"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ID Модели</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={isLoading || isTesting}
                  placeholder="Например: gpt-4o"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Ключ</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isLoading || isTesting}
                    placeholder="Введите ваш API ключ"
                    autoComplete="new-password"
                    data-form-type="other"
                    data-lpignore="true"
                    className="w-full pl-3 pr-10 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                  />
                  {apiKey && (
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      disabled={isLoading || isTesting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {saveError && (
                <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  {saveError}
                </div>
              )}

              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResult.success 
                    ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {testResult.success 
                    ? `✓ Подключение успешно (${testResult.latencyMs}ms)`
                    : `✗ ${testResult.errorMessage}`
                  }
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || isTesting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(isLoading || isTesting) && <Loader2 size={14} className="animate-spin" />}
                  {isLoading ? "Сохранение..." : isTesting ? "Тестирование..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}