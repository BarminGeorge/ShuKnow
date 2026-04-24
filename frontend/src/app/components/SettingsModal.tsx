import { useState, useEffect } from "react";
import { X, Eye, EyeOff, ArrowLeft, Loader2, User, Sparkles, Cpu, Key, Settings, CheckCircle2, AlertCircle, RefreshCw, Link, HelpCircle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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

const PROVIDER_MODELS: Record<string, string> = {
  OpenAI: "gpt-5.4",
  OpenRouter: "openrouter/free",
  Gemini: "gemma-4-31b-it",
  Anthropic: "claude-4-6-sonnet",
};

const PROVIDERS = ["OpenAI", "OpenRouter", "Gemini", "Anthropic"];
const EMPTY_SETTING_VALUE = "Не задано";

const modalButtonClass = "rounded-lg border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-colors hover:border-white/14 hover:bg-white/[0.065]";
const primaryButtonClass = "rounded-lg border border-violet-300/12 bg-[linear-gradient(135deg,rgba(76,29,149,0.26),rgba(17,16,24,0.58)_60%,rgba(109,40,217,0.08))] text-violet-200/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_14px_rgba(91,33,182,0.045)] transition-all hover:border-violet-300/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(91,33,182,0.075)]";
const fieldClass = "w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none transition-colors placeholder:text-gray-600 focus:border-violet-300/28 focus:bg-[#121212] disabled:opacity-50";
const labelClass = "mb-2 block text-sm font-medium text-gray-400";
const guideImageClass = "h-[340px] w-full rounded-2xl border border-white/[0.08] bg-[#080808] object-contain shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]";

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

type ProviderGuideSlide = {
  title: string;
  description: string;
  image?: string;
  linkLabel?: string;
  linkUrl?: string;
};

const PROVIDER_GUIDES: Record<string, ProviderGuideSlide[]> = {
  OpenRouter: [
    {
      title: "Откройте OpenRouter",
      description: "Зарегистрируйтесь или войдите на странице API Keys. OpenRouter дает один ключ для множества моделей, включая бесплатные.",
      image: "/provider-guide/OpenRouter2.png",
      linkLabel: "openrouter.ai/keys",
      linkUrl: "https://openrouter.ai/keys",
    },
    {
      title: "Создайте новый ключ",
      description: "В разделе API Keys нажмите Create API Key. Название можно выбрать любое, например ShuKnow.",
      image: "/provider-guide/OpenRouter1.png",
    },
    {
      title: "Заполните форму",
      description: "Credit limit можно оставить пустым, Expiration — No expiration. После создания сразу скопируйте ключ вида sk-or-v1-...",
      image: "/provider-guide/OpenRouter3.png",
    },
    {
      title: "Найдите ID модели",
      description: "Откройте каталог моделей OpenRouter, выберите модель и скопируйте её ID. Для бесплатных моделей ищите суффикс :free, например openai/gpt-oss-120b:free.",
      image: "/provider-guide/OpenRouterModels.png",
      linkLabel: "openrouter.ai/models",
      linkUrl: "https://openrouter.ai/models",
    },
    {
      title: "Вставьте в ShuKnow",
      description: "Выберите OpenRouter, вставьте API ключ и укажите точный ID модели из каталога. Название модели должно совпадать с ID у провайдера.",
      image: "/provider-guide/ShuKnowOpenRouter.png",
    },
  ],
  Gemini: [
    {
      title: "Откройте Google AI Studio",
      description: "Перейдите в раздел API keys и войдите в Google аккаунт. У Gemini есть бесплатный доступ с ограничениями.",
      image: "/provider-guide/GemeniKey1.png",
      linkLabel: "aistudio.google.com/app/apikey",
      linkUrl: "https://aistudio.google.com/app/apikey",
    },
    {
      title: "Нажмите Create API key",
      description: "Создайте ключ в новом проекте или выберите существующий проект, если он уже есть.",
      image: "/provider-guide/GemeniKey2.png",
    },
    {
      title: "Скопируйте ключ",
      description: "Скопируйте строку, которая начинается с AIza. Этот ключ понадобится для поля API ключ в ShuKnow.",
    },
    {
      title: "Найдите ID модели",
      description: "В Google AI Studio откройте список моделей или документацию Gemini API и скопируйте точное имя модели. Примеры: gemini-2.5-flash, gemini-2.5-pro.",
      image: "/provider-guide/GeminiModelId.png",
      linkLabel: "ai.google.dev/gemini-api/docs/models",
      linkUrl: "https://ai.google.dev/gemini-api/docs/models",
    },
    {
      title: "Вставьте в ShuKnow",
      description: "Выберите Gemini, вставьте API ключ и укажите точный ID модели из документации или AI Studio.",
      image: "/provider-guide/ShuKnowGemini.png",
    },
  ],
  OpenAI: [
    {
      title: "OpenAI Compatible",
      description: "Этот режим подходит для OpenAI, DeepSeek, Qwen, локальных моделей и сервисов с OpenAI-compatible API. Нужны API Key и при необходимости Base URL.",
      image: "/provider-guide/OpenAICompatible.png",
    },
    {
      title: "Пример: DeepSeek",
      description: "Откройте DeepSeek Platform, войдите через Google или зарегистрируйтесь, затем перейдите в API Keys и создайте ключ.",
      image: "/provider-guide/DeepseekKey.png",
      linkLabel: "platform.deepseek.com/api_keys",
      linkUrl: "https://platform.deepseek.com/api_keys",
    },
    {
      title: "Укажите Base URL",
      description: "Для DeepSeek используйте https://api.deepseek.com. Для официального OpenAI обычно подходит https://api.openai.com/v1.",
      image: "/provider-guide/DeepSeekBaseUrl.png",
      linkLabel: "api-docs.deepseek.com",
      linkUrl: "https://api-docs.deepseek.com",
    },
    {
      title: "Найдите ID модели",
      description: "Берите ID модели из документации выбранного OpenAI-compatible сервиса. Для OpenAI это может быть gpt-5.4, для DeepSeek — deepseek-chat или deepseek-reasoner.",
      image: "/provider-guide/DeepSeekModelId.png",
    },
    {
      title: "Сохраните настройки",
      description: "В ShuKnow выберите OpenAI, вставьте API ключ, заполните точный ID модели и Base URL, если он отличается от стандартного.",
      image: "/provider-guide/ShuKnowOpenAI.png",
    },
  ],
  Anthropic: [
    {
      title: "Anthropic",
      description: "Ой, бесплатных ключей у этого провайдера нет. Если у вас уже есть платный ключ Anthropic, выберите Anthropic в настройках и вставьте его вручную.",
      image: "/provider-guide/ShuKnowAnthropic.png",
    },
  ],
};

function ProviderGuideModal({
  initialProvider,
  onClose,
}: {
  initialProvider: string;
  onClose: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState(
    PROVIDER_GUIDES[initialProvider] ? initialProvider : "OpenRouter"
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = PROVIDER_GUIDES[selectedProvider] ?? PROVIDER_GUIDES.OpenRouter;
  const slide = slides[slideIndex] ?? slides[0];

  const handleProviderChange = (nextProvider: string) => {
    setSelectedProvider(nextProvider);
    setSlideIndex(0);
  };

  const goToPrevious = () => {
    setSlideIndex((currentIndex) => (currentIndex === 0 ? slides.length - 1 : currentIndex - 1));
  };

  const goToNext = () => {
    setSlideIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto relative max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0d0d0d] shadow-[0_28px_90px_rgba(0,0,0,0.66),inset_0_1px_0_rgba(255,255,255,0.045)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Как получить API ключ</h3>
            <p className="text-sm text-gray-500">Выберите провайдера и пройдите короткий гайд</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.045] text-gray-400 transition-colors hover:bg-white/[0.075] hover:text-gray-200"
            aria-label="Закрыть гайд"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-81px)] space-y-5 overflow-y-auto px-6 py-5">
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-[46px] w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none focus:border-violet-300/28 focus:ring-0 focus-visible:border-violet-300/28 focus-visible:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              sideOffset={6}
              className="z-[90] rounded-lg border border-white/[0.08] bg-[#101010] p-1 text-gray-200 shadow-[0_18px_42px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]"
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

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(18,18,19,0.98)_54%,rgba(10,10,11,0.99))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.28)]">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/22 to-transparent" />
            <div className="space-y-4">
              {slide.image ? (
                <img src={slide.image} alt={slide.title} className={guideImageClass} />
              ) : (
                <div className="flex h-[340px] items-center justify-center rounded-2xl border border-violet-200/12 bg-[linear-gradient(135deg,rgba(76,29,149,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  <Sparkles size={42} className="text-violet-200/80" />
                </div>
              )}

              <div className="min-h-[116px]">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full border border-violet-200/14 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200">
                    {slideIndex + 1}/{slides.length}
                  </span>
                  <span className="text-xs text-gray-500">{selectedProvider}</span>
                </div>
                <h4 className="text-xl font-semibold text-white">{slide.title}</h4>
                <p className="mt-2 text-sm leading-6 text-gray-400">{slide.description}</p>
                {slide.linkUrl && (
                  <a
                    href={slide.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-violet-300/85 transition-colors hover:text-violet-200"
                  >
                    {slide.linkLabel}
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goToPrevious}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-colors hover:border-violet-200/18 hover:bg-white/[0.07] hover:text-violet-100"
              aria-label="Предыдущий слайд"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              {slides.map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  type="button"
                  onClick={() => setSlideIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    index === slideIndex
                      ? "w-7 bg-violet-300"
                      : "bg-white/20 hover:bg-white/35"
                  }`}
                  aria-label={`Открыть слайд ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goToNext}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition-colors hover:border-violet-200/18 hover:bg-white/[0.07] hover:text-violet-100"
              aria-label="Следующий слайд"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const normalizeProviderName = (value?: string | null) => {
  if (!value) return "";
  const normalized = value.toLowerCase();
  if (normalized === "unknown") return "";
  return PROVIDERS.find((providerName) => providerName.toLowerCase() === normalized) || value;
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const [isProviderGuideOpen, setIsProviderGuideOpen] = useState(false);
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

      const providerKey = normalizeProviderName(settings.provider);
      const hasRequiredSettings =
        !!settings.apiKeyMasked?.trim() &&
        !!providerKey &&
        !!settings.modelId?.trim();

      setBaseUrl(settings.baseUrl || "");
      setIsConfigured(settings.isConfigured || hasRequiredSettings);
      setApiKeyMasked(settings.apiKeyMasked || "");
      setProvider(providerKey);
      setModelId(settings.modelId || "");
      setApiKey(""); // Don't load key for security
      
      // Disable automatic connectivity checks to avoid extra background requests.
      setTestResult(null);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Не удалось загрузить настройки");
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setIsEditingKey(false);
    setShowKey(false);
    setSaveError(null);
    setApiKey("");
    onClose();
  };

  const handleSave = async () => {
    const trimmedBaseUrl = baseUrl.trim();

    if (!provider || !modelId.trim() || !apiKey.trim()) {
      setSaveError("Заполните провайдера, модель и API ключ");
      return;
    }

    if (trimmedBaseUrl && !isValidHttpUrl(trimmedBaseUrl)) {
      setSaveError("Base URL должен быть корректным HTTP(S) URL");
      return;
    }
    
    try {
      setIsLoading(true);
      setSaveError(null);
      setTestResult(null);
      
      // Save settings without auto-testing connectivity
      await settingsService.updateAiSettings({
        baseUrl: trimmedBaseUrl,
        apiKey,
        provider: provider ? provider.toLowerCase() as AiProvider : undefined,
        modelId: modelId || undefined,
      });

      setIsConfigured(true);
      setApiKeyMasked(maskApiKey(apiKey));
      setTestResult(null);
      setIsEditingKey(false);
      setApiKey("");
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
          {isEditingKey && (
            <button
              type="button"
              onClick={() => setIsProviderGuideOpen(true)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-violet-500/10 hover:text-violet-100"
              title="Как получить API ключ"
              aria-label="Открыть гайд по получению API ключа"
            >
              <HelpCircle size={18} />
            </button>
          )}
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
                        {isConfigured && !testResult && (
                          <Badge className="w-[120px] border-white/[0.08] bg-white/[0.035] text-gray-300">
                            Настроено
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
                  disabled={isLoading}
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
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-400">Base URL</label>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    необязательно
                  </span>
                </div>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
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
                      disabled={isLoading}
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
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${primaryButtonClass}`}
                >
                  {isLoading && <Loader2 size={14} className="animate-spin" />}
                  {isLoading ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      {isProviderGuideOpen && (
        <ProviderGuideModal
          initialProvider={provider || "OpenRouter"}
          onClose={() => setIsProviderGuideOpen(false)}
        />
      )}
    </div>
  );
}
