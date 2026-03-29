import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  folderEmoji: string;
  currentPrompt: string;
  onSave: (prompt: string) => void;
}

// This component is deprecated - redirecting to EditFolderModal functionality
export function EditPromptModal({
  isOpen,
  onClose,
  folderName,
  folderEmoji,
  currentPrompt,
  onSave,
}: EditPromptModalProps) {
  const [name, setName] = useState(folderName);
  const [emoji, setEmoji] = useState(folderEmoji);
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    setName(folderName);
    setEmoji(folderEmoji);
    setPrompt(currentPrompt);
  }, [folderName, folderEmoji, currentPrompt, isOpen]);

  const handleSave = () => {
    onSave(prompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header with Icon and Name */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
                          className="w-12 h-12 text-center text-2xl bg-[#0d0d0d] border border-white/10 rounded-lg outline-none focus:border-indigo-500/50 transition-colors flex-shrink-0"            maxLength={2}
            disabled
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название папки"
                          className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors"            disabled
          />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* AI Prompt */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Инструкция для ИИ
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-indigo-500/50 transition-colors"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              ИИ будет использовать эту инструкцию для автоматической сортировки файлов
            </p>
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
            onClick={handleSave}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
