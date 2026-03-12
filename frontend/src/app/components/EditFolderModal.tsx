import { useState, useEffect, useRef } from "react";
import { Smile } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  folderEmoji: string;
  currentPrompt: string;
  onSave: (name: string, emoji: string, prompt: string) => void;
}

export function EditFolderModal({
  isOpen,
  onClose,
  folderName,
  folderEmoji,
  currentPrompt,
  onSave,
}: EditFolderModalProps) {
  const [name, setName] = useState(folderName);
  const [emoji, setEmoji] = useState(folderEmoji);
  const [prompt, setPrompt] = useState(currentPrompt);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setName(folderName);
    setEmoji(folderEmoji);
    setPrompt(currentPrompt);
    setIsEmojiPickerOpen(false);
  }, [folderName, folderEmoji, currentPrompt, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, emoji, prompt);
    setIsEmojiPickerOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#161b22] border border-white/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-0 gap-0"
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with Editable Icon and Name */}
        <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b border-white/10 space-y-0">
          <DialogTitle className="sr-only">Редактировать папку</DialogTitle>
          {/* Emoji Trigger Button */}
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className="w-12 h-12 flex items-center justify-center bg-[#0d0d0d] border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors flex-shrink-0 group"
            title={emoji ? "Изменить иконку" : "Добавить иконку"}
          >
            {emoji ? (
              <span className="text-2xl leading-none">{emoji}</span>
            ) : (
              <Smile
                size={20}
                className="text-gray-500 group-hover:text-gray-300 transition-colors"
              />
            )}
          </button>

          <label htmlFor="edit-folder-name" className="sr-only">
            Название папки
          </label>
          <input
            id="edit-folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="Название папки"
            className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-blue-500/50 transition-colors"
          />
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5">
          <div>
            <label
              htmlFor="edit-folder-prompt"
              className="text-sm font-medium text-gray-300 mb-2 block"
            >
              Инструкция для ИИ
            </label>
            <textarea
              id="edit-folder-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-blue-500/50 transition-colors"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              ИИ будет использовать эту инструкцию для автоматической сортировки файлов
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

        {/* Emoji Picker */}
        <EmojiPicker
          isOpen={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          onSelect={(e) => {
            setEmoji(e);
            setIsEmojiPickerOpen(false);
          }}
          onRemove={() => {
            setEmoji("");
            setIsEmojiPickerOpen(false);
          }}
          hasEmoji={!!emoji}
          anchorEl={emojiTriggerRef.current}
        />
      </DialogContent>
    </Dialog>
  );
}
