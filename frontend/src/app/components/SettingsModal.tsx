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

const modalButtonClass = "rounded-lg border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-colors hover:border-white/14 hover:bg-white/[0.065]";
const primaryButtonClass = "rounded-lg border border-violet-300/12 bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))] text-violet-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)] transition-all hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)]";
const fieldClass = "w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors placeholder:text-gray-600 focus:border-violet-300/28 focus:bg-[#121212] disabled:opacity-50";
const labelClass = "mb-2 block text-sm font-medium text-gray-400";

type SettingVisualKind = "provider" | "baseUrl" | "model" | "apiKey";

const SETTING_VISUALS: Record<SettingVisualKind, {
  icon: React.ReactNode;
  shell: string;
  line: string;
}> = {
  provider: {
    icon: <Sparkles size={16} className="text-violet-300/70" />,
    shell: "border-violet-200/9 bg-[linear-gradient(135deg,rgba(76,29,149,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))]",
    line: "via-violet-200/20",
  },
  baseUrl: {
    icon: <Link size={16} className="text-sky-300/70" />,
    shell: "border-sky-200/9 bg-[linear-gradient(135deg,rgba(3,105,161,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))]",
    line: "via-sky-200/20",
  },
  model: {
    icon: <Cpu size={16} className="text-indigo-300/70" />,
    shell: "border-indigo-200/9 bg-[linear-gradient(135deg,rgba(67,56,202,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))]",
    line: "via-indigo-200/22",
  },
  apiKey: {
    icon: <Key size={16} className="text-rose-300/70" />,
    shell: "border-rose-200/9 bg-[linear-gradient(135deg,rgba(157,23,77,0.10),rgba(14,14,18,0.96)_58%,rgba(9,10,13,0.98))]",
    line: "via-rose-200/20",
  },
};

function SettingIcon({ kind }: { kind: SettingVisualKind }) {
  const visual = SETTING_VISUALS[kind];

  return (
    <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${visual.shell}`}>
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${visual.line} to-transparent`} />
      {visual.icon}
    </div>
  );
}

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

  const handleProviderChange = (nextProvider: string) => {
    setProvider(nextProvider);
    setBaseUrl(PROVIDER_URLS[nextProvider] || "");
    setModelId(PROVIDER_MODELS[nextProvider] || "");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="w-full max-w-lg mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
          <button
            onClick={isEditingKey ? () => setIsEditingKey(false) : handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.055] hover:text-gray-200"
          >
            {isEditingKey ? <ArrowLeft size={18} /> : <X size={18} />}
          </button>
          <h2 className="text-lg font-semibold text-white">
            {isEditingKey ? "Настройки API ключа" : "Настройки"}
          </h2>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {!isEditingKey ? (
            <div className="space-y-6">
              {/* Account Section */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">Аккаунт</h3>
                <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <User size={18} className="text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Логин</div>
                      <div className="text-sm font-medium text-gray-200">{user?.login || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.07]" />

              {/* API Settings Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">API настройки</h3>
                  <div className="flex items-center gap-2">
                    {/* Refresh button - only show if configured */}
                    {isConfigured && (
                      <button
                        onClick={handleQuickTest}
                        disabled={isTesting}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed
                          ${isTesting ? 'text-gray-500' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        <RefreshCw size={14} className={isTesting ? "animate-spin" : ""} />
                      </button>
                    )}

                    {/* Status badge */}
                    {isTesting ? (
                      <Badge className="flex w-[120px] items-center gap-1 border-gray-500/20 bg-gray-500/10 text-gray-400">
                        <AlertCircle size={12} />
                        Проверка
                      </Badge>
                    ) : (
                      <>
                        {isConfigured && testResult?.success && (
                          <Badge className="flex w-[120px] items-center gap-1 border-emerald-400/18 bg-emerald-400/10 text-emerald-300">
                            <CheckCircle2 size={12} />
                            Подключено
                          </Badge>
                        )}
                        {isConfigured && testResult && !testResult.success && (
                          <Badge className="flex w-[120px] items-center gap-1 border-rose-400/18 bg-rose-400/10 text-rose-300">
                            <AlertCircle size={12} />
                            Ошибка
                          </Badge>
                        )}
                        {!isConfigured && (
                          <Badge className="w-[120px] border-white/[0.08] bg-white/[0.035] text-gray-400">
                            Не настроено
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#111111] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  {/* Provider */}
                  <div className="flex items-center gap-3">
                    <SettingIcon kind="provider" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Провайдер</div>
                      {renderSettingValue(normalizeProviderName(provider))}
                    </div>
                  </div>

                  {/* Base URL */}
                  <div className="flex items-center gap-3">
                    <SettingIcon kind="baseUrl" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Base URL</div>
                      {renderSettingValue(baseUrl)}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="flex items-center gap-3">
                    <SettingIcon kind="model" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">Модель</div>
                      {renderSettingValue(modelId)}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="flex items-center gap-3">
                    <SettingIcon kind="apiKey" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">API ключ</div>
                      {renderSettingValue(apiKeyMasked, "text-sm font-mono")}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/[0.07] pt-3">
                    <button
                      onClick={() => setIsEditingKey(true)}
                      className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${modalButtonClass} text-gray-300 hover:text-gray-100`}
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
                <label className={labelClass}>Провайдер</label>
                <Select
                  value={provider}
                  onValueChange={handleProviderChange}
                  disabled={isLoading || isTesting}
                >
                  <SelectTrigger
                    className="h-[46px] w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none focus:border-violet-300/28 focus:ring-0 focus-visible:border-violet-300/28 focus-visible:ring-0 disabled:opacity-50"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    sideOffset={6}
                    className="z-[70] rounded-lg border border-white/[0.08] bg-[#101010] p-1 text-gray-200 shadow-[0_18px_42px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    {PROVIDERS.map((providerName) => (
                      <SelectItem
                        key={providerName}
                        value={providerName}
                        className="rounded-md py-2 pl-3 pr-8 text-sm text-gray-200 outline-none focus:bg-white/[0.06] focus:text-white data-[state=checked]:bg-violet-500/12 data-[state=checked]:text-violet-100"
                      >
                        {providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={isLoading || isTesting}
                  placeholder="https://api.openai.com/v1"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>ID модели</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  disabled={isLoading || isTesting}
                  placeholder="Например: gpt-4o"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>API ключ</label>
                <div className="relative">
                  {!showKey && apiKey && (
                    <div className="pointer-events-none absolute left-4 right-14 top-0 z-10 flex h-[46px] items-center overflow-hidden whitespace-nowrap font-mono text-sm leading-5 text-gray-200">
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
                    className={`block h-[46px] w-full resize-none overflow-hidden rounded-lg border border-white/10 bg-[#101010] py-3 pl-4 pr-14 font-mono text-sm leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors placeholder:text-gray-600 focus:border-violet-300/28 focus:bg-[#121212] disabled:opacity-50 ${showKey ? "text-gray-200" : "text-transparent caret-gray-200"}`}
                  />
                  <div className="pointer-events-none absolute right-px top-px z-10 h-[44px] w-14 rounded-r-lg bg-[#101010]" />
                  {apiKey && (
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      disabled={isLoading || isTesting}
                      className="absolute right-3 top-0 z-20 flex h-[46px] w-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-50"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {saveError && (
                <div className="rounded-lg border border-rose-400/18 bg-rose-400/10 p-3 text-sm text-rose-300">
                  {saveError}
                </div>
              )}

              {testResult && !testResult.success && (
                <div className="rounded-lg border border-rose-400/18 bg-rose-400/10 p-3 text-sm text-rose-300">
                  ✗ {testResult.errorMessage}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || isTesting}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${primaryButtonClass}`}
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
