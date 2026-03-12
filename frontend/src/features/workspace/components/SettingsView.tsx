import { ArrowLeft, Sun, Moon } from "lucide-react";
import { ApiKeyInput } from "./ApiKeyInput";
import { useUiStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function SettingsView() {
  const setRightPanel = useUiStore((s) => s.setRightPanel);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 flex-shrink-0">
        <button
          type="button"
          onClick={() => setRightPanel({ type: "chat" })}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200
            transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold text-white">Настройки</h1>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* API Key */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            API Ключ
          </h2>
          <ApiKeyInput />
        </section>

        {/* Theme */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Тема
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm
                transition-all font-medium ${
                  theme === "light"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-300"
                }`}
            >
              <Sun size={15} />
              Светлая
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm
                transition-all font-medium ${
                  theme === "dark"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-300"
                }`}
            >
              <Moon size={15} />
              Тёмная
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            О приложении
          </h2>
          <div className="bg-[#111111] border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧠</span>
              <div>
                <p className="font-semibold text-white text-sm">ShuKnow v1.0.0</p>
                <p className="text-xs text-gray-500">Умный AI-инструмент для заметок</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              ShuKnow помогает организовывать знания, файлы и заметки с
              помощью ИИ. Создавайте умные папки с инструкциями, и ИИ будет
              помогать с сортировкой и анализом контента.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
