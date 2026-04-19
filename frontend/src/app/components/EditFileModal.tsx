import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface EditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  currentDescription: string;
  onSave: (name: string, description: string) => void;
}

export function EditFileModal({
  isOpen,
  onClose,
  fileName,
  currentDescription,
  onSave,
}: EditFileModalProps) {
  const [name, setName] = useState(fileName);
  const [description, setDescription] = useState(currentDescription);

  useEffect(() => {
    setName(fileName);
    setDescription(currentDescription);
  }, [fileName, currentDescription, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, description);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            placeholder="Название файла"
            maxLength={50}
            className="flex-1 min-w-0 bg-transparent px-2 py-2 text-lg font-semibold text-gray-100 placeholder:text-gray-600 outline-none border-b border-transparent focus:border-violet-200/22 transition-colors"
          />
          <span className="text-xs text-gray-500 flex-shrink-0">{name.length}/50</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Описание / Инструкция для ИИ
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим файлом..."
              className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              ИИ будет использовать это описание при обработке файла
            </p>
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
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.42)_58%,rgba(167,139,250,0.07))] border border-violet-200/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/26 hover:text-white hover:bg-violet-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
