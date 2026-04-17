import { useState } from "react";
import { X, FileText } from "lucide-react";
import { isSupportedTextFileName } from "../utils/fileValidation";

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export function CreateFileModal({
  isOpen,
  onClose,
  onCreate,
}: CreateFileModalProps) {
  const [name, setName] = useState("Новая заметка.md");
  const [description, setDescription] = useState("");
  const isNameValid = isSupportedTextFileName(name);

  const handleCreate = () => {
    if (!name.trim() || !isNameValid) return;
    onCreate(name.trim(), description.trim());
    setName("Новая заметка.md");
    setDescription("");
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
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <FileText size={16} className="text-indigo-400" />
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
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:border-indigo-500/50 transition-colors pr-14"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{name.length}/50</span>
            </div>
            {name.trim() && !isNameValid && (
              <p className="mt-2 text-xs text-red-400">
                Неподдерживаемый формат файла
              </p>
            )}
          </div>

          {/* Description (AI Instruction) */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Описание / Инструкция для ИИ
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим файлом..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-indigo-500/50 transition-colors"
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
            disabled={!name.trim() || !isNameValid}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                       bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                       border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
