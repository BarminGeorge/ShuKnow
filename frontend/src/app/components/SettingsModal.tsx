import { useState, useEffect } from "react";
import { X, Eye, EyeOff, ArrowLeft, ChevronDown, Loader2, User, Sparkles, Cpu, Key, Settings, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { settingsService } from "../../api";
import type { AiProvider, AiConnectionTestResult } from "../../api/types";
import { Badge } from "./ui/badge";

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

// Provider icons
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  OpenAI: <Sparkles size={16} className="text-green-400" />,
  OpenRouter: <Cpu size={16} className="text-blue-400" />,
  Gemini: <Sparkles size={16} className="text-purple-400" />,
  Anthropic: <Sparkles size={16} className="text-orange-400" />,
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_URLS["OpenAI"]);
  const [modelId, setModelId] = useState("gpt-4o");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const { user } = useAuth();

  // Update base URL and model when provider changes
  useEffect(() => {
    setBaseUrl(PROVIDER_URLS[provider] || "");
    setModelId(PROVIDER_MODELS[provider] || "");
  }, [provider]);

  // Load settings when modal opens (only on initial open)
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Set default OpenAI values when opening edit form for unconfigured API
  useEffect(() => {
    if (isEditingKey) {
      if (!isConfigured) {
        // First time setup - set OpenAI defaults
        setProvider("OpenAI");
        setBaseUrl(PROVIDER_URLS["OpenAI"]);
        setModelId(PROVIDER_MODELS["OpenAI"]);
      }
      // Always clear API key when opening edit form
      setApiKey("");
    }
  }, [isEditingKey, isConfigured]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.fetchAiSettings();
      
      setBaseUrl(settings.baseUrl || PROVIDER_URLS["OpenAI"]);
      setIsConfigured(settings.isConfigured);
      setApiKeyMasked(settings.apiKeyMasked || "");
      
      // Convert provider from lowercase to PascalCase for UI
      const providerKey = settings.provider 
        ? settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)
        : "OpenAI";
      setProvider(providerKey);
      
      setModelId(settings.modelId || PROVIDER_MODELS[providerKey]);
      setApiKey(""); // Don't load key for security
      
      // Auto-test connection if configured
      if (settings.isConfigured) {
        setIsTesting(true);
        try {
          const result = await settingsService.testAiConnection();
          setTestResult(result);
        } catch (error) {
          console.error("Auto-test failed:", error);
        } finally {
          setIsTesting(false);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Не удалось загрузить настройки");
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
      
      // Automatically run connection test
      setIsTesting(true);
      try {
        const result = await settingsService.testAiConnection();
        setTestResult(result);
        
        if (result.success) {
          setIsConfigured(true);
          // Update masked key for display
          const masked = apiKey.length > 6
            ? apiKey.substring(0, 3) + '***' + apiKey.substring(apiKey.length - 3)
            : '***';
          setApiKeyMasked(masked);
          // Close editing form immediately on successful test
          setIsEditingKey(false);
          setApiKey("");
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

  const handleQuickTest = async () => {
    if (!isConfigured) return;
    
    try {
      setIsTesting(true);
      const result = await settingsService.testAiConnection();
      setTestResult(result);
      
      if (!result.success) {
        toast.error(result.errorMessage || "Не удалось подключиться");
      }
    } catch (error) {
      console.error("Test failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Не удалось выполнить тест";
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
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
            <div className="space-y-6">
              {/* Account Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Аккаунт</h3>
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <User size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Логин</div>
                      <div className="text-sm font-medium text-gray-200">{user?.login || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* API Settings Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">API Настройки</h3>
                  <div className="flex items-center gap-2">
                    {/* Refresh button - only show if configured */}
                    {isConfigured && (
                      <button
                        onClick={handleQuickTest}
                        disabled={isTesting}
                        className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors disabled:cursor-not-allowed
                          ${isTesting ? 'text-gray-500' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        <RefreshCw size={14} className={isTesting ? "animate-spin" : ""} />
                      </button>
                    )}

                    {/* Status badge */}
                    {isTesting ? (
                      <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 flex items-center gap-1 w-[120px]">
                        <AlertCircle size={12} />
                        Проверка
                      </Badge>
                    ) : (
                      <>
                        {isConfigured && testResult?.success && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1 w-[120px]">
                            <CheckCircle2 size={12} />
                            Подключено
                          </Badge>
                        )}
                        {isConfigured && testResult && !testResult.success && (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1 w-[120px]">
                            <AlertCircle size={12} />
                            Ошибка
                          </Badge>
                        )}
                        {!isConfigured && (
                          <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 w-[120px]">
                            Не настроено
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!isConfigured ? (
                  // Empty state
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                      <Key size={20} className="text-indigo-400" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-200 mb-1">
                      API ключ не настроен
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Настройте подключение к AI провайдеру для начала работы
                    </p>
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Настроить API ключ
                    </button>
                  </div>
                ) : (
                  // Configured state
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3">
                    {/* Provider */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        {PROVIDER_ICONS[provider] || <Sparkles size={16} className="text-indigo-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Провайдер</div>
                        <div className="text-sm font-medium text-gray-200">{provider}</div>
                      </div>
                    </div>

                    {/* Model */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Cpu size={16} className="text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">Модель</div>
                        <div className="text-sm font-medium text-gray-200">{modelId}</div>
                      </div>
                    </div>

                    {/* API Key */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Key size={16} className="text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500">API ключ</div>
                        <div className="text-sm font-mono text-gray-400">{apiKeyMasked || "Не задан"}</div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10 pt-3">
                      <button
                        onClick={() => setIsEditingKey(true)}
                        className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings size={14} />
                        Изменить настройки
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                <div className="p-3 rounded-lg text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {saveError}
                </div>
              )}

              {testResult && !testResult.success && (
                <div className="p-3 rounded-lg text-sm bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  ✗ {testResult.errorMessage}
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