import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Folder as FolderIcon, Upload, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import type { Folder } from "@/types";

interface FolderHeaderProps {
  folder: Folder;
  onUpdate: (patch: Partial<Omit<Folder, "id">>) => void;
}

const QUICK_EMOJIS = [
  "📁", "📂", "📝", "💼", "🎯", "📊", "📚", "🗂️",
  "🏠", "⭐", "🔬", "🎨", "💡", "🔗", "🚀", "📌",
  "🔒", "💎", "🌟", "🎉",
];

export function FolderHeader({ folder, onUpdate }: FolderHeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const [descValue, setDescValue] = useState(folder.description);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset local state when navigating to a different folder
  useEffect(() => {
    setNameValue(folder.name);
    setDescValue(folder.description);
    setEditingName(false);
  }, [folder.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNameSave = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onUpdate({ name: trimmed });
    } else if (!trimmed) {
      setNameValue(folder.name);
    }
    setEditingName(false);
  };

  const handleDescBlur = () => {
    if (descValue !== folder.description) {
      onUpdate({ description: descValue });
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdate({ iconImage: reader.result, iconEmoji: undefined });
        setIconPickerOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleEmojiPick = (emoji: string) => {
    onUpdate({ iconEmoji: emoji, iconImage: undefined });
    setIconPickerOpen(false);
  };

  const handleRemoveIcon = () => {
    onUpdate({ iconEmoji: undefined, iconImage: undefined });
    setIconPickerOpen(false);
  };

  const iconDisplay = folder.iconImage ? (
    <img
      src={folder.iconImage}
      alt={folder.name}
      className="w-14 h-14 rounded-xl object-cover"
    />
  ) : folder.iconEmoji ? (
    <span className="text-4xl leading-none">{folder.iconEmoji}</span>
  ) : (
    <FolderIcon
      size={36}
      className="text-gray-400 group-hover:text-gray-300 transition-colors"
    />
  );

  const hasIcon = !!(folder.iconEmoji || folder.iconImage);

  return (
    <div className="px-6 py-5 border-b border-white/8">
      <div className="flex items-start gap-5">
        {/* ── Icon / picker ── */}
        <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-[72px] h-[72px] flex items-center justify-center rounded-2xl
                bg-white/5 border border-white/10 hover:border-blue-500/40 transition-colors
                flex-shrink-0 group"
              title="Изменить иконку"
              type="button"
            >
              {iconDisplay}
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="bg-[#1a1a1a] border-white/20 w-72 p-3 shadow-2xl"
            align="start"
          >
            {/* Quick emoji grid */}
            <div className="grid grid-cols-5 gap-1 mb-3">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiPick(emoji)}
                  className={`aspect-square flex items-center justify-center text-2xl rounded-lg
                    hover:bg-white/10 transition-colors leading-none
                    ${folder.iconEmoji === emoji ? "bg-white/15 ring-1 ring-white/30" : ""}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 pt-2 space-y-1">
              {/* Upload image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400
                  hover:text-gray-200 hover:bg-white/8 rounded-lg transition-colors"
              >
                <Upload size={14} />
                <span>Загрузить изображение</span>
              </button>

              {/* Remove icon */}
              {hasIcon && (
                <button
                  type="button"
                  onClick={handleRemoveIcon}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400
                    hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <X size={14} />
                  <span>Убрать иконку</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </PopoverContent>
        </Popover>

        {/* ── Name + description ── */}
        <div className="flex-1 min-w-0 pt-0.5">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") {
                  setNameValue(folder.name);
                  setEditingName(false);
                }
              }}
              className="w-full text-2xl font-bold bg-transparent text-white outline-none
                border-b border-blue-500/50 pb-0.5 mb-3"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => {
                setEditingName(true);
                // Focus after render
                setTimeout(() => nameInputRef.current?.focus(), 0);
              }}
              className="text-2xl font-bold text-white cursor-text
                hover:text-gray-100 transition-colors mb-3 truncate"
              title="Нажмите для редактирования"
            >
              {folder.name}
            </h1>
          )}

          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="Описание / инструкция для ИИ..."
            rows={2}
            className="w-full bg-transparent text-sm text-gray-400 placeholder:text-gray-600
              outline-none resize-none border-b border-transparent focus:border-white/15
              transition-colors pb-0.5 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
