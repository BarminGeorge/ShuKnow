import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settingsStore";

export function ApiKeyInput() {
  const apiKey = useSettingsStore((s) => s.apiKey);
  const isConnected = useSettingsStore((s) => s.isConnected);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setConnected = useSettingsStore((s) => s.setConnected);

  const [keyValue, setKeyValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    const trimmed = keyValue.trim();
    setApiKey(trimmed);
    toast.success("API ключ сохранён");
  };

  const handleTest = async () => {
    const key = keyValue.trim() || apiKey;
    if (!key) {
      toast.error("Сначала введите API ключ");
      return;
    }
    setIsTesting(true);
    try {
      // Simulate connection test (replace with real API call)
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      setConnected(true);
      toast.success("Соединение установлено");
    } catch {
      setConnected(false);
      toast.error("Ошибка соединения");
    } finally {
      setIsTesting(false);
    }
  };

  const statusColor = isConnected ? "bg-green-400" : "bg-gray-500";
  const statusLabel = isConnected ? "Подключено" : "Не подключено";
  const statusTextColor = isConnected ? "text-green-400" : "text-gray-500";

  return (
    <div className="space-y-3">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
        <span className={`text-xs ${statusTextColor}`}>{statusLabel}</span>
      </div>

      {/* Input row */}
      <div className="relative">
        <input
          type={showKey ? "text" : "password"}
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          placeholder="sk-..."
          className="w-full pr-10 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg
            text-sm text-gray-200 placeholder:text-gray-600 outline-none
            focus:border-blue-500/50 transition-colors"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
            hover:text-gray-300 transition-colors"
          aria-label={showKey ? "Скрыть ключ" : "Показать ключ"}
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
            rounded-lg transition-colors font-medium"
        >
          Сохранить
        </button>

        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={isTesting}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10
            hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Проверка…
            </>
          ) : (
            "Проверить соединение"
          )}
        </button>
      </div>

      <p className="text-xs text-gray-600">
        Ключ хранится локально в браузере
      </p>
    </div>
  );
}
