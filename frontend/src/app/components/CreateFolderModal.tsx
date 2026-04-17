import { useState, useRef } from "react";
import { X, Smile } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, emoji: string, prompt: string) => void;
}

export function CreateFolderModal({ isOpen, onClose, onCreateFolder }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [folderEmoji, setFolderEmoji] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);

  const handleCreate = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName, folderEmoji, prompt);
      setFolderName("");
      setFolderEmoji("");
      setPrompt("");
      setIsEmojiPickerOpen(false);
      onClose();
    }
  };

  const handleClose = () => {
    setFolderName("");
    setFolderEmoji("");
    setPrompt("");
    setIsEmojiPickerOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header with Icon and Name */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          {/* Emoji Trigger Button */}
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className="w-12 h-12 flex items-center justify-center bg-[#1a1a1a] border border-white/10 rounded-xl hover:border-indigo-500/50 transition-colors flex-shrink-0 group"
            title="Выбрать иконку"
          >
            {folderEmoji ? (
              <span className="text-2xl leading-none">{folderEmoji}</span>
            ) : (
              <Smile
                size={20}
                className="text-gray-500 group-hover:text-gray-300 transition-colors"
              />
            )}
          </button>

          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value.slice(0, 50))}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            placeholder="Название папки"
            maxLength={50}
            className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors"
            autoFocus
          />
          <span className="text-xs text-gray-500 flex-shrink-0">{folderName.length}/50</span>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Prompt for AI */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Инструкция для ИИ
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-indigo-500/50 transition-colors"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                       bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                       border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelect={(e) => {
          setFolderEmoji(e);
          setIsEmojiPickerOpen(false);
        }}
        onRemove={() => {
          setFolderEmoji("");
          setIsEmojiPickerOpen(false);
        }}
        hasEmoji={!!folderEmoji}
        anchorEl={emojiTriggerRef.current}
      />
    </div>
  );
}
