import { useState, useEffect } from "react";
import { X, Eye, EyeOff, ArrowLeft, Loader2, User, Sparkles, Cpu, Key, Settings, CheckCircle2, AlertCircle, RefreshCw, Link } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { settingsService } from "../../api";
import type { AiProvider, AiConnectionTestResult } from "../../api/types";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

const PROVIDERS = ["OpenAI", "OpenRouter", "Gemini", "Anthropic"];
const EMPTY_SETTING_VALUE = "Не задано";

// Provider icons
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  OpenAI: <Sparkles size={16} className="text-green-400" />,
  OpenRouter: <Cpu size={16} className="text-blue-400" />,
  Gemini: <Sparkles size={16} className="text-purple-400" />,
  Anthropic: <Sparkles size={16} className="text-orange-400" />,
};

const normalizeProviderName = (value?: string | null) => {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized === "unknown") return "";
  return PROVIDERS.find((providerName) => providerName.toLowerCase() === normalized) || value;
};

const maskApiKey = (key: string, emptyValue = EMPTY_SETTING_VALUE, maskChar = "*") => {
  const trimmedKey = key.trim();
  const length = trimmedKey.length;

  if (!length) return emptyValue;
  if (length <= 4) return maskChar.repeat(length);

  const visibleStart = length <= 10 ? 2 : Math.min(4, Math.ceil(length * 0.15));
  const visibleEnd = length <= 10 ? 2 : Math.min(4, Math.ceil(length * 0.12));
  const hiddenCount = Math.max(3, Math.min(24, length - visibleStart - visibleEnd));

  return `${trimmedKey.slice(0, visibleStart)}${maskChar.repeat(hiddenCount)}${trimmedKey.slice(-visibleEnd)}`;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [provider, setProvider] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelId, setModelId] = useState("");
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
    if (!provider) return;

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
        setProvider("");
        setBaseUrl("");
        setModelId("");
      }
      // Always clear API key when opening edit form
      setApiKey("");
    }
  }, [isEditingKey, isConfigured]);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.fetchAiSettings();
      
      setBaseUrl(settings.isConfigured ? settings.baseUrl || "" : "");
      setIsConfigured(settings.isConfigured);
      setApiKeyMasked(settings.apiKeyMasked || "");
      
      // Convert provider from lowercase to PascalCase for UI
      const providerKey = settings.isConfigured ? normalizeProviderName(settings.provider) : "";
      setProvider(providerKey);
      
      setModelId(settings.isConfigured ? settings.modelId || "" : "");
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
    if (!provider || !baseUrl.trim() || !modelId.trim() || !apiKey.trim()) {
      setSaveError("Заполните провайдера, Base URL, модель и API ключ");
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
        provider: provider ? provider.toLowerCase() as AiProvider : undefined,
        modelId: modelId || undefined,
      });
      
      // Automatically run connection test
      setIsTesting(true);
      try {
        const result = await settingsService.testAiConnection();
        setTestResult(result);
        
        if (result.success) {
          setIsConfigured(true);
          setApiKeyMasked(maskApiKey(apiKey));
          // Close editing form immediately on successful test
          setIsEditingKey(false);
          setApiKey("");
        } else {
          setTestResult({
            ...result,
            errorMessage: result.errorMessage || "Не удалось подключиться",
          });
        }
      } catch (testError) {
        console.error("Test failed:", testError);
        const errorMsg = testError instanceof Error ? testError.message : "Не удалось выполнить тест";
        setTestResult({
          success: false,
          latencyMs: null,
          errorMessage: errorMsg,
        });
      } finally {
        setIsTesting(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      const errorMsg = error instanceof Error ? error.message : "Не удалось сохранить настройки";
      setSaveError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSettingValue = (value?: string | null, className = "text-sm font-medium") => {
    const displayValue = value?.trim() || EMPTY_SETTING_VALUE;
    const isEmpty = displayValue === EMPTY_SETTING_VALUE;

    return (
      <div className={`${className} ${isEmpty ? "text-gray-500 italic" : "text-gray-200"}`}>
        {displayValue}
      </div>
    );
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
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

                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3">
                  {/* Provider */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      {PROVIDER_ICONS[provider] || <Sparkles size={16} className="text-indigo-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Провайдер</div>
                      {renderSettingValue(normalizeProviderName(provider))}
                    </div>
                  </div>

                  {/* Base URL */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Link size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Base URL</div>
                      {renderSettingValue(baseUrl)}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Cpu size={16} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Модель</div>
                      {renderSettingValue(modelId)}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Key size={16} className="text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">API ключ</div>
                      {renderSettingValue(apiKeyMasked, "text-sm font-mono")}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/10 pt-3">
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings size={14} />
                      {isConfigured ? "Изменить настройки" : "Настроить API ключ"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Провайдер</label>
                <Select
                  value={provider}
                  onValueChange={setProvider}
                  disabled={isLoading || isTesting}
                >
                  <SelectTrigger
                    className="h-[38px] w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-gray-200 shadow-none outline-none focus:border-indigo-500/50 focus:ring-0 focus-visible:border-indigo-500/50 focus-visible:ring-0 disabled:opacity-50"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    sideOffset={6}
                    className="z-[70] rounded-xl border border-white/10 bg-[#1f1f1f] p-1 text-gray-200 shadow-2xl"
                  >
                    {PROVIDERS.map((providerName) => (
                      <SelectItem
                        key={providerName}
                        value={providerName}
                        className="rounded-lg py-2 pl-3 pr-8 text-sm text-gray-200 outline-none focus:bg-white/10 focus:text-white data-[state=checked]:bg-indigo-500/15 data-[state=checked]:text-white"
                      >
                        {providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {!showKey && apiKey && (
                    <div className="pointer-events-none absolute left-3 right-14 top-0 z-10 flex h-[38px] items-center overflow-hidden whitespace-nowrap font-mono text-sm leading-5 text-gray-200">
                      {"•".repeat(apiKey.length)}
                    </div>
                  )}
                  <textarea
                    rows={1}
                    wrap="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value.replace(/[\r\n]/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    onCopy={(e) => {
                      if (!showKey && apiKey) {
                        e.preventDefault();
                        e.clipboardData.setData("text/plain", apiKey);
                      }
                    }}
                    disabled={isLoading || isTesting}
                    placeholder="Введите ваш API ключ"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-form-type="other"
                    data-lpignore="true"
                    className={`block w-full h-[38px] pl-3 pr-14 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 resize-none overflow-hidden leading-5 ${showKey ? "text-gray-200" : "text-transparent caret-gray-200"}`}
                  />
                  <div className="pointer-events-none absolute right-px top-px z-10 h-[36px] w-14 rounded-r-xl bg-[#1a1a1a]" />
                  {apiKey && (
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      disabled={isLoading || isTesting}
                      className="absolute right-3 top-0 z-20 flex h-[38px] w-8 items-center justify-center text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                             bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                             border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
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
