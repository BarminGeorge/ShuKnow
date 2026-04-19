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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className="w-12 h-12 flex items-center justify-center bg-white/[0.035] border border-white/[0.08] rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/18 hover:bg-white/[0.055] transition-colors flex-shrink-0 group"
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
            className="flex-1 min-w-0 bg-transparent px-2 py-2 text-lg font-semibold text-gray-100 placeholder:text-gray-600 outline-none border-b border-transparent focus:border-violet-200/22 transition-colors"
            autoFocus
          />
          <span className="text-xs text-gray-500 flex-shrink-0">{folderName.length}/50</span>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Инструкция для ИИ
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors"
              rows={4}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 bg-white/[0.01]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.055] hover:text-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.42)_58%,rgba(167,139,250,0.07))] border border-violet-200/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/26 hover:text-white hover:bg-violet-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать
          </button>
        </div>
      </div>

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
