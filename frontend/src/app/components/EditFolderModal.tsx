import { useState, useEffect, useRef } from "react";
import { X, Smile } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  folderEmoji: string;
  currentDescription: string;
  onSave: (name: string, emoji: string, description: string) => void;
}

export function EditFolderModal({
  isOpen,
  onClose,
  folderName,
  folderEmoji,
  currentDescription,
  onSave,
}: EditFolderModalProps) {
  const [name, setName] = useState(folderName);
  const [emoji, setEmoji] = useState(folderEmoji);
  const [description, setDescription] = useState(currentDescription);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setName(folderName);
    setEmoji(folderEmoji);
    setDescription(currentDescription);
    setIsEmojiPickerOpen(false);
  }, [folderName, folderEmoji, currentDescription, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, emoji, description);
    setIsEmojiPickerOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header with Editable Icon and Name */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          {/* Emoji Trigger Button */}
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className="w-12 h-12 flex items-center justify-center bg-[#1a1a1a] border border-white/10 rounded-xl hover:border-indigo-500/50 transition-colors flex-shrink-0 group"
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

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="Название папки"
            maxLength={50}
            className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors"
          />
          <span className="text-xs text-gray-500 flex-shrink-0">{name.length}/50</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Description for AI */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Описание папки
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-indigo-500/50 transition-colors"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              ИИ будет использовать это описание для автоматической сортировки файлов
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
            disabled={!name.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            Сохранить
          </button>
        </div>
      </div>

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
    </div>
  );
}
