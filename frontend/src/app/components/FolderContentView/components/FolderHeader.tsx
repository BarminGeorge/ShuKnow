import { useRef, useState } from "react";
import { ChevronRight, FolderIcon, Plus, Paperclip, Sparkles } from "lucide-react";
import { EmojiPicker } from "../../EmojiPicker";
import { formatFolderStatsHeader } from "../helpers";
import { ACCEPTED_UPLOAD_FILE_TYPES } from "../../../utils/fileValidation";

const secondaryActionClass = "flex h-8 w-8 shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium text-gray-300 bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065] transition-colors lg:h-10 lg:w-auto lg:px-4";
const primaryActionClass = "flex h-8 w-8 shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))] border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)] lg:h-10 lg:w-auto lg:px-4";
const promptToggleClass = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-gray-300 bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065] transition-colors lg:h-10 lg:w-10";
const promptFieldClass = "w-full px-3 py-2.5 bg-[#101010] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] focus:border-violet-300/28 focus:bg-[#121212] transition-colors lg:px-4 lg:py-3";
const FOLDER_PROMPT_MAX_LENGTH = 2000;

interface FolderHeaderProps {
  breadcrumbs: string[];
  onBreadcrumbClick: (index: number) => void;
  emoji: string;
  isEmojiPickerOpen: boolean;
  setIsEmojiPickerOpen: (open: boolean) => void;
  onEmojiSelect: (emoji: string) => void;
  onEmojiRemove: () => void;
  title: string;
  setTitle: (title: string) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  onTitleBlur: () => void;
  subfolderCount: number;
  fileCount: number;
  photoCount: number;
  hasGridItems: boolean;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onAttachFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  onPromptBlur: () => void;
}

export function FolderHeader({
  breadcrumbs,
  onBreadcrumbClick,
  emoji,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  onEmojiSelect,
  onEmojiRemove,
  title,
  setTitle,
  isEditingTitle,
  setIsEditingTitle,
  onTitleBlur,
  subfolderCount,
  fileCount,
  photoCount,
  hasGridItems,
  onCreateFolder,
  onCreateFile,
  onAttachFile,
  fileInputRef,
  onFileInputChange,
  aiPrompt,
  setAiPrompt,
  onPromptBlur,
}: FolderHeaderProps) {
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });

  return (
    <div className="border-b border-white/[0.07] px-3 py-2.5 lg:px-8 lg:pt-6 lg:pb-3">
      {/* Breadcrumbs */}
      <div className="mb-4 hidden items-center gap-2 overflow-x-auto text-sm text-gray-400 scrollbar-none lg:flex" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`transition-colors block max-w-[150px] truncate ${
                  index < breadcrumbs.length - 1 ? "hover:text-gray-200 hover:underline cursor-pointer" : "text-gray-200"
                }`}
                onClick={() => {
                  if (index < breadcrumbs.length - 1) onBreadcrumbClick(index);
                }}
              >
                {crumb}
              </span>
              {index < breadcrumbs.length - 1 && <ChevronRight size={14} className="flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Title & Emoji */}
      <div className={`flex items-center gap-2.5 lg:gap-3 ${isPromptOpen ? "lg:mb-4" : ""}`}>
        {/* Emoji picker trigger */}
        <button
          ref={emojiTriggerRef}
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className={`flex-shrink-0 flex items-center justify-center rounded-xl transition-colors group ${
            emoji ? "h-8 w-8 text-2xl lg:h-14 lg:w-14 lg:text-4xl" : "h-8 w-8 lg:h-14 lg:w-14"
          }`}
          title={emoji ? "Изменить иконку" : "Добавить иконку"}
        >
          {emoji ? (
            <span className="leading-none">{emoji}</span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center text-gray-600/80 transition-colors group-hover:text-gray-400 lg:h-12 lg:w-12">
              <FolderIcon size={22} strokeWidth={1.45} />
            </span>
          )}
        </button>

        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            onBlur={onTitleBlur}
            onKeyDown={(e) => { if (e.key === "Enter") onTitleBlur(); }}
            maxLength={50}
            className="min-w-0 flex-1 text-lg font-semibold bg-transparent text-white border-b-2 border-indigo-500 outline-none lg:text-3xl"
            autoFocus
          />
        ) : (
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-lg font-semibold leading-tight text-white cursor-pointer hover:text-gray-300 transition-colors lg:text-3xl"
              onClick={() => setIsEditingTitle(true)}
              title="Кликните чтобы изменить название"
            >
              {title}
            </h1>
            <p className="mt-1 hidden text-sm text-gray-400 lg:block">
              {formatFolderStatsHeader(subfolderCount, fileCount, photoCount)}
            </p>
          </div>
        )}

        <div className="flex flex-shrink-0 items-center gap-1.5 lg:ml-auto lg:gap-2">
          <button
            onClick={() => setIsPromptOpen((open) => !open)}
            className={`${promptToggleClass} ${isPromptOpen ? "border-violet-200/20 text-violet-100 bg-violet-500/10" : ""}`}
            title="Инструкция"
            aria-expanded={isPromptOpen}
          >
            <Sparkles size={15} />
          </button>
          {hasGridItems && (
            <>
              <button
                onClick={onCreateFolder}
                className={secondaryActionClass}
                title="Создать папку"
              >
                <FolderIcon size={16} />
                <span className="hidden lg:inline">Создать папку</span>
              </button>
              <button
                onClick={onCreateFile}
                className={primaryActionClass}
                title="Создать файл"
              >
                <Plus size={16} />
                <span className="hidden lg:inline">Создать файл</span>
              </button>
            </>
          )}
          <button
            onClick={onAttachFile}
            className={secondaryActionClass}
            title="Прикрепить файл"
          >
            <Paperclip size={16} />
            <span className="hidden lg:inline">Прикрепить файл</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for attaching files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_UPLOAD_FILE_TYPES}
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* AI Prompt Field */}
      <div className={`${isPromptOpen ? "mt-2 block lg:mt-4" : "hidden"}`}>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value.slice(0, FOLDER_PROMPT_MAX_LENGTH))}
          onBlur={onPromptBlur}
          placeholder="Инструкция для ИИ: что должно попадать в эту папку..."
          maxLength={FOLDER_PROMPT_MAX_LENGTH}
          className={promptFieldClass}
          rows={2}
        />
      </div>

      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelect={(selectedEmoji) => {
          onEmojiSelect(selectedEmoji);
          setIsEmojiPickerOpen(false);
        }}
        onRemove={() => {
          onEmojiRemove();
          setIsEmojiPickerOpen(false);
        }}
        hasEmoji={!!emoji}
        anchorEl={emojiTriggerRef.current}
      />
    </div>
  );
}
