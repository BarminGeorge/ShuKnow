import { useState, useRef } from "react";
import { Smile } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, emoji: string, prompt: string) => void;
}

export function CreateFolderModal({ isOpen, onClose, onCreateFolder }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [folderEmoji, setFolderEmoji] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);

  const handleCreate = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName, folderEmoji, aiPrompt);
      setFolderName("");
      setFolderEmoji("");
      setAiPrompt("");
      setIsEmojiPickerOpen(false);
      onClose();
    }
  };

  const handleClose = () => {
    setFolderName("");
    setFolderEmoji("");
    setAiPrompt("");
    setIsEmojiPickerOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="bg-[#161b22] border border-white/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-0 gap-0"
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with Icon and Name */}
        <DialogHeader className="flex-row items-center gap-3 px-6 py-4 border-b border-white/10 space-y-0">
          <DialogTitle className="sr-only">Создать папку</DialogTitle>
          {/* Emoji Trigger Button */}
          <button
            ref={emojiTriggerRef}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            className="w-12 h-12 flex items-center justify-center bg-[#0d0d0d] border border-white/10 rounded-lg hover:border-blue-500/50 transition-colors flex-shrink-0 group"
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

          <label htmlFor="create-folder-name" className="sr-only">
            Название папки
          </label>
          <input
            id="create-folder-name"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            placeholder="Название папки"
            className="flex-1 text-lg font-semibold px-3 py-2 bg-transparent text-white placeholder:text-gray-500 outline-none border-b border-transparent focus:border-blue-500/50 transition-colors"
            autoFocus
          />
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5">
          <div>
            <label
              htmlFor="create-folder-prompt"
              className="text-sm font-medium text-gray-300 mb-2 block"
            >
              Инструкция для ИИ
            </label>
            <textarea
              id="create-folder-prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Опишите, какие файлы и заметки должны попадать в эту папку..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-blue-500/50 transition-colors"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-white/10 flex-row justify-end gap-3 sm:justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            Создать
          </button>
        </DialogFooter>

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
      </DialogContent>
    </Dialog>
  );
}
