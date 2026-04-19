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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/12 border border-indigo-200/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <FileText size={16} className="text-indigo-300/70" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100 flex-1">Новый файл</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
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
                className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors pr-14"
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

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Описание / Инструкция для ИИ
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим файлом..."
              className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors"
              rows={3}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 bg-white/[0.01]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.055] hover:text-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !isNameValid}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.42)_58%,rgba(167,139,250,0.07))] border border-violet-200/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/26 hover:text-white hover:bg-violet-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
