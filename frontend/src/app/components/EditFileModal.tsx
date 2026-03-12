import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

interface EditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  currentPrompt: string;
  onSave: (name: string, prompt: string) => void;
}

export function EditFileModal({
  isOpen,
  onClose,
  fileName,
  currentPrompt,
  onSave,
}: EditFileModalProps) {
  const [name, setName] = useState(fileName);
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    setName(fileName);
    setPrompt(currentPrompt);
  }, [fileName, currentPrompt, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, prompt);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#161b22] border border-white/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-0 gap-0">
        {/* Header with Editable Name */}
        <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b border-white/10 space-y-0">
          <DialogTitle className="sr-only">Редактировать файл</DialogTitle>
          <label htmlFor="edit-file-name" className="sr-only">
            Название файла
          </label>
          <input
            id="edit-file-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название файла"
            className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-blue-500/50 transition-colors"
          />
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5">
          <div>
            <label
              htmlFor="edit-file-prompt"
              className="text-sm font-medium text-gray-300 mb-2 block"
            >
              Инструкция для ИИ
            </label>
            <textarea
              id="edit-file-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим файлом..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-blue-500/50 transition-colors"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              ИИ будет использовать эту инструкцию при обработке файла
            </p>
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
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
