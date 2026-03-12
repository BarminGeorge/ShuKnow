import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border border-white/20 rounded-xl w-full max-w-lg mx-4 shadow-2xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold text-white">
            Настройки
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Account Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Аккаунт</h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="settings-email"
                  className="text-xs text-gray-400 block mb-1"
                >
                  Текущий email
                </label>
                <div
                  id="settings-email"
                  className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-400"
                >
                  user@example.com
                </div>
              </div>
              <button className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-gray-200 transition-colors text-sm">
                Сменить пароль
              </button>
            </div>
          </div>

          {/* API Key Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">API Ключ</h3>
            <label htmlFor="settings-api-key" className="sr-only">
              API Ключ
            </label>
            <input
              id="settings-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Введите ваш API ключ"
              className="w-full px-4 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-white/10 flex-row justify-end gap-3 sm:justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}