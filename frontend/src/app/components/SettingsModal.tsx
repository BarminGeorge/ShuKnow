import { useState } from "react";
import { X, Eye, EyeOff, ArrowLeft, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const [modelId, setModelId] = useState("gpt-4o");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleClose = () => {
    setIsEditingKey(false);
    setShowKey(false);
    onClose();
  };

  const maskKey = (key: string) => {
    if (!key) return "Не задан";
    if (key.length <= 6) return "••••••";
    return key.substring(0, 3) + "••••••••••••" + key.substring(key.length - 3);
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
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Текущий email</label>
                    <div className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-400">
                      {user?.email || "user@example.com"}
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
                <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4 flex justify-between items-center">
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
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors whitespace-nowrap ml-4"
                  >
                    Изменить API ключ
                  </button>
                </div>
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
                    className="w-full pl-3 pr-10 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    <option value="OpenAI">OpenAI</option>
                    <option value="OpenRouter">OpenRouter</option>
                    <option value="Gemini">Gemini</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">ID Модели</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="Например: gpt-4o"
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Ключ</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Введите ваш API ключ"
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
                  onClick={() => setIsEditingKey(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
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