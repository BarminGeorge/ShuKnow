import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import type { Attachment } from "./ChatMessages";
import { createAttachmentFromFile, applyServerIds } from "./ChatMessages";
import { chatService } from "../../api";

interface InputConsoleProps {
  onSend?: (text: string, attachments?: Attachment[]) => void;
}

const CHAT_DRAFT_STORAGE_KEY = "shuknow-chat-draft";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

function extensionFromMimeType(mimeType: string): string {
  if (!mimeType) return "";

  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };

  return map[mimeType.toLowerCase()] ?? "";
}

export function InputConsole({ onSend }: InputConsoleProps) {
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(CHAT_DRAFT_STORAGE_KEY) ?? "";
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = fileArray.map(createAttachmentFromFile);
    
    setAttachments((prev) => {
      const existing = new Set(prev.map((a) => `${a.name}-${a.sizeBytes}`));
      const unique = newAttachments.filter(
        (a) => !existing.has(`${a.name}-${a.sizeBytes}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.localId === localId);
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.localId !== localId);
    });
  }, []);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    let finalAttachments = attachments;
    if (attachments.length > 0) {
      const filesToUpload = attachments
        .filter((a) => a.file && !a.serverId)
        .map((a) => a.file!);
      
      if (filesToUpload.length > 0) {
        setIsUploading(true);
        try {
          const serverAttachments = await chatService.uploadChatAttachments(filesToUpload);
          finalAttachments = applyServerIds(attachments, serverAttachments);
        } catch (error) {
          console.error("Failed to upload attachments:", error);
        } finally {
          setIsUploading(false);
        }
      }
    }
    
    onSend?.(input.trim(), finalAttachments.length > 0 ? finalAttachments : undefined);
    
    for (const attachment of attachments) {
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
    }
    
    setInput("");
    setAttachments([]);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CHAT_DRAFT_STORAGE_KEY);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const chatFileData = JSON.parse(jsonData);
        if (chatFileData.type === 'chat-file') {
          const newAttachment: Attachment = {
            localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: chatFileData.name || chatFileData.file?.name || 'unknown',
            url: chatFileData.url,
            sizeBytes: chatFileData.file?.size,
            contentType: chatFileData.fileType || chatFileData.file?.type,
          };
          
          setAttachments((prev) => {
            const existing = new Set(prev.map((a) => `${a.name}-${a.sizeBytes}`));
            if (!existing.has(`${newAttachment.name}-${newAttachment.sizeBytes}`)) {
              return [...prev, newAttachment];
            }
            return prev;
          });
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    e.target.value = "";
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = Array.from(e.clipboardData?.items ?? []);
    if (clipboardItems.length === 0) return;

    const clipboardFiles = clipboardItems
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (clipboardFiles.length === 0) return;

    e.preventDefault();

    const now = Date.now();
    const normalizedFiles = clipboardFiles.map((file, index) => {
      if (file.name) return file;

      const extension = extensionFromMimeType(file.type);
      const fallbackName = `pasted-file-${now}-${index + 1}${extension}`;

      return new File([file], fallbackName, {
        type: file.type || "application/octet-stream",
        lastModified: now,
      });
    });

    addFiles(normalizedFiles);
  }, [addFiles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (input.trim().length === 0) {
      window.sessionStorage.removeItem(CHAT_DRAFT_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(CHAT_DRAFT_STORAGE_KEY, input);
  }, [input]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (input === "") {
        textarea.style.height = "";
      } else {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-transparent px-3 pb-2 pt-1.5 lg:px-4 lg:pb-6 lg:pt-4">
      <div className="max-w-7xl mx-auto px-0 lg:px-9">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Attachments preview - horizontal scrollable strip */}
        {attachments.length > 0 && (
          <div className="mb-1.5 flex max-w-full gap-2 overflow-x-auto pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:mb-2 lg:pb-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.localId}
                className="flex w-[min(160px,52vw)] flex-shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 lg:w-[min(200px,64vw)] lg:gap-2.5 lg:rounded-xl lg:px-2.5 lg:py-2
                           bg-[linear-gradient(135deg,rgb(31,31,33),rgb(24,24,24)_52%,rgb(18,18,20))]
                           border border-white/[0.07] shadow-[0_10px_28px_rgba(0,0,0,0.22)]
                           group transition-all hover:border-violet-200/18 hover:shadow-[0_12px_32px_rgba(0,0,0,0.26),0_0_20px_rgba(167,139,250,0.05)]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.06] bg-black/30 lg:h-9 lg:w-9 lg:rounded-lg">
                  {isImageFile(attachment.name) && attachment.url ? (
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={15} className="text-muted-foreground lg:h-[18px] lg:w-[18px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[11px] text-foreground lg:text-xs">{attachment.name}</p>
                  {attachment.sizeBytes && (
                    <p className="text-[10px] text-muted-foreground lg:text-[11px]">{formatFileSize(attachment.sizeBytes)}</p>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(attachment.localId)}
                  disabled={isUploading}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-gray-500 lg:h-6 lg:w-6 lg:rounded-lg
                             hover:bg-violet-500/10 hover:text-violet-100 transition-colors disabled:opacity-50"
                >
                  <X size={12} className="lg:h-[13px] lg:w-[13px]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input container */}
        <div
          className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-1.5 lg:rounded-2xl lg:px-4 lg:py-3
            shadow-[inset_0_1px_0_rgba(255,255,255,0.055),inset_0_-18px_36px_rgba(0,0,0,0.22),0_18px_46px_rgba(0,0,0,0.34)]
            transition-all duration-150
            before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
            after:absolute after:inset-x-8 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/70 after:to-transparent
            hover:-translate-y-px hover:border-white/[0.13] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.065),inset_0_-18px_36px_rgba(0,0,0,0.20),0_20px_52px_rgba(0,0,0,0.38),0_0_16px_rgba(167,139,250,0.025)]
            focus-within:-translate-y-px focus-within:border-violet-200/18 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.075),inset_0_-18px_36px_rgba(0,0,0,0.20),0_20px_52px_rgba(0,0,0,0.38),0_0_18px_rgba(167,139,250,0.04)] ${
            isDragging 
              ? "bg-[linear-gradient(135deg,rgb(39,30,56),rgb(24,22,29)_45%,rgb(34,30,48))] border-violet-200/26 ring-2 ring-violet-300/14" 
              : "bg-[linear-gradient(135deg,rgb(25,25,26),rgb(22,22,23)_34%,rgb(17,17,18)_62%,rgb(18,18,19))] border-white/[0.085]"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 lg:h-8 lg:w-8
                       hover:text-violet-100 hover:bg-violet-500/10 transition-colors"
            title="Прикрепить файлы"
          >
            <Paperclip size={16} className="lg:h-[18px] lg:w-[18px]" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isDragging ? "Отпустите файлы здесь..." : "Спросите ShuKnow..."}
            className="relative z-10 flex-1 max-h-[112px] min-h-[20px] bg-transparent pt-[1px] text-sm leading-5 text-gray-100 placeholder:text-gray-500 lg:max-h-[200px] lg:min-h-[24px] lg:pt-0 lg:text-[15px] lg:leading-relaxed
                       focus:placeholder:text-gray-400 resize-none outline-none overflow-y-auto"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={isUploading || (!input.trim() && attachments.length === 0)}
            className="relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-violet-100 lg:h-8 lg:w-8
                       bg-[linear-gradient(135deg,rgb(36,31,48),rgb(20,22,31)_58%,rgb(28,26,39))]
                       border border-violet-200/14 shadow-[0_0_14px_rgba(167,139,250,0.035)] transition-all duration-150
                       hover:border-violet-200/22 hover:text-white hover:shadow-[0_0_18px_rgba(167,139,250,0.07)]
                       disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-violet-200/14 disabled:hover:text-violet-100 disabled:hover:shadow-[0_0_14px_rgba(167,139,250,0.035)]"
            title={isUploading ? "Загрузка файлов..." : "Отправить"}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin lg:h-[18px] lg:w-[18px]" /> : <ArrowUp size={16} className="lg:h-[18px] lg:w-[18px]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
