import { useState } from 'react';
import { Key, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

export function SettingsView() {
  const { apiKey, isConnected, setApiKey, setConnected } = useSettingsStore();
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    setApiKey(inputValue.trim());
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Simulate API test
    await new Promise((r) => setTimeout(r, 1500));
    const ok = inputValue.trim().startsWith('sk-');
    setConnected(ok);
    setIsTesting(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] overflow-y-auto">
      <div className="max-w-xl mx-auto w-full px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-100 mb-1">Настройки</h1>
        <p className="text-sm text-gray-500 mb-8">Управление ИИ-ключами и конфигурацией</p>

        {/* API Key Section */}
        <div className="bg-[#111] border border-white/8 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-[#7c5cbf]" />
            <h2 className="text-sm font-medium text-gray-200">API Ключ</h2>
            {apiKey && (
              <span className={`ml-auto flex items-center gap-1 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected
                  ? <><CheckCircle size={12} /> Подключён</>
                  : <><XCircle size={12} /> Не подключён</>}
              </span>
            )}
          </div>

          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-[#7c5cbf]/60 transition-colors"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              aria-label={showKey ? 'Скрыть ключ' : 'Показать ключ'}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-4">
            Ключ хранится в вашем браузере и никогда не передаётся третьим лицам.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={inputValue === apiKey}
              className="px-4 py-2 bg-[#7c5cbf] hover:bg-[#6b4eab] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={handleTest}
              disabled={isTesting || !inputValue.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-sm rounded-lg transition-colors"
            >
              {isTesting ? <Loader2 size={13} className="animate-spin" /> : null}
              Проверить
            </button>
          </div>
        </div>

        {/* Placeholder sections */}
        <div className="bg-[#111] border border-white/8 rounded-xl p-5 opacity-50 cursor-not-allowed select-none">
          <h2 className="text-sm font-medium text-gray-400 mb-1">Тема оформления</h2>
          <p className="text-xs text-gray-600">Скоро</p>
        </div>
      </div>
    </div>
  );
}
