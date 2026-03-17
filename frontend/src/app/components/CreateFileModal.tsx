import { useState } from "react";
import { X, FileText } from "lucide-react";

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, prompt: string) => void;
}

export function CreateFileModal({
  isOpen,
  onClose,
  onCreate,
}: CreateFileModalProps) {
  const [name, setName] = useState("Новая заметка.md");
  const [prompt, setPrompt] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), prompt.trim());
    // Reset for next time
    setName("Новая заметка.md");
    setPrompt("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#161b22] border border-white/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FileText size={16} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white flex-1">Новый файл</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* File Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Название файла
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                onKeyDown={handleKeyDown}
                placeholder="Название файла"
                maxLength={50}
                className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:border-blue-500/50 transition-colors pr-14"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{name.length}/50</span>
            </div>
          </div>

          {/* AI Prompt */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Инструкция для ИИ
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим файлом..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-blue-500/50 transition-colors"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
