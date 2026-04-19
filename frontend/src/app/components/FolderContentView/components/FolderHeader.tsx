import { useRef } from "react";
import { ChevronRight, FolderIcon, Plus, Paperclip } from "lucide-react";
import { EmojiPicker } from "../../EmojiPicker";
import { formatFolderStatsHeader } from "../helpers";
import { ACCEPTED_UPLOAD_FILE_TYPES } from "../../../utils/fileValidation";

const secondaryActionClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065] transition-colors";
const promptFieldClass = "w-full px-4 py-3 bg-[#101010] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] focus:border-violet-300/28 focus:bg-[#121212] transition-colors";

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

  return (
    <div className="border-b border-white/[0.07] px-8 py-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
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
      <div className="flex items-center gap-3 mb-4">
        {/* Emoji picker trigger */}
        <button
          ref={emojiTriggerRef}
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
          className={`flex-shrink-0 flex items-center justify-center rounded-xl transition-colors group ${
            emoji ? "w-14 h-14 text-4xl" : "w-14 h-14"
          }`}
          title={emoji ? "Изменить иконку" : "Добавить иконку"}
        >
          {emoji ? (
            <span className="leading-none">{emoji}</span>
          ) : (
            <span className="flex h-12 w-12 items-center justify-center text-gray-600/80 transition-colors group-hover:text-gray-400">
              <FolderIcon size={30} strokeWidth={1.45} />
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
            className="text-3xl font-semibold bg-transparent text-white border-b-2 border-indigo-500 outline-none"
            autoFocus
          />
        ) : (
          <div className="flex-1">
            <h1
              className="text-3xl font-semibold text-white cursor-pointer hover:text-gray-300 transition-colors"
              onClick={() => setIsEditingTitle(true)}
              title="Кликните чтобы изменить название"
            >
              {title}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {formatFolderStatsHeader(subfolderCount, fileCount, photoCount)}
            </p>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasGridItems && (
            <>
              <button
                onClick={onCreateFolder}
                className={secondaryActionClass}
                title="Создать папку"
              >
                <FolderIcon size={16} />
                Создать папку
              </button>
              <button
                onClick={onCreateFile}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                           bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                           border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)]"
                title="Создать файл"
              >
                <Plus size={16} />
                Создать файл
              </button>
            </>
          )}
          <button
            onClick={onAttachFile}
            className={secondaryActionClass}
            title="Прикрепить файл"
          >
            <Paperclip size={16} />
            Прикрепить файл
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
      <div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onBlur={onPromptBlur}
          placeholder="Инструкция для ИИ: что должно попадать в эту папку..."
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
