import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import type { Attachment } from "./ChatMessages";
import { createAttachmentFromFile, applyServerIds } from "./ChatMessages";
import { chatService } from "../../api";

interface InputConsoleProps {
  onSend?: (text: string, attachments?: Attachment[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

export function InputConsole({ onSend }: InputConsoleProps) {
  const [input, setInput] = useState("");
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
    <div className="bg-transparent px-4 pb-6 pt-4">
      <div className="max-w-7xl mx-auto px-9">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Attachments preview - horizontal scrollable strip */}
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {attachments.map((attachment) => (
              <div
                key={attachment.localId}
                className="flex-shrink-0 w-[220px] flex items-center gap-3 px-3 py-2.5 rounded-xl
                           bg-[linear-gradient(135deg,rgb(31,31,33),rgb(24,24,24)_52%,rgb(18,18,20))]
                           border border-white/[0.07] shadow-[0_10px_28px_rgba(0,0,0,0.22)]
                           group transition-all hover:border-violet-200/18 hover:shadow-[0_12px_32px_rgba(0,0,0,0.26),0_0_20px_rgba(167,139,250,0.05)]"
              >
                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-black/30 border border-white/[0.06] flex items-center justify-center">
                  {isImageFile(attachment.name) && attachment.url ? (
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{attachment.name}</p>
                  {attachment.sizeBytes && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.sizeBytes)}</p>
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(attachment.localId)}
                  disabled={isUploading}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-500
                             hover:bg-violet-500/10 hover:text-violet-100 transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input container */}
        <div
          className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl overflow-hidden border
            shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_36px_rgba(0,0,0,0.18),0_18px_46px_rgba(0,0,0,0.34)]
            transition-all duration-150
            before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-violet-200/34 before:to-transparent
            after:absolute after:inset-x-8 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-black/70 after:to-transparent
            hover:-translate-y-px hover:border-violet-200/24 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-18px_36px_rgba(0,0,0,0.16),0_20px_52px_rgba(0,0,0,0.38),0_0_30px_rgba(167,139,250,0.08)]
            focus-within:-translate-y-px focus-within:border-violet-200/36 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-18px_36px_rgba(0,0,0,0.16),0_20px_52px_rgba(0,0,0,0.38),0_0_36px_rgba(167,139,250,0.14)] ${
            isDragging 
              ? "bg-[linear-gradient(135deg,rgb(50,30,78),rgb(25,20,34)_45%,rgb(45,34,70))] border-violet-200/40 ring-2 ring-violet-300/24" 
              : "bg-[linear-gradient(135deg,rgb(31,31,33),rgb(27,27,28)_34%,rgb(17,17,18)_62%,rgb(20,20,22))] border-white/[0.10]"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative z-10 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400
                       hover:text-violet-100 hover:bg-violet-500/10 transition-colors"
            title="Прикрепить файлы"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDragging ? "Отпустите файлы здесь..." : "Спросите ShuKnow..."}
            className="relative z-10 flex-1 max-h-[200px] min-h-[24px] bg-transparent text-gray-100 placeholder:text-gray-500
                       focus:placeholder:text-gray-400 resize-none outline-none text-[15px] leading-relaxed overflow-y-auto"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={isUploading || (!input.trim() && attachments.length === 0)}
            className="relative z-10 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-violet-100
                       bg-[linear-gradient(135deg,rgb(48,34,76),rgb(19,23,36)_58%,rgb(39,31,58))]
                       border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] transition-all duration-150
                       hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)]
                       disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-violet-200/18 disabled:hover:text-violet-100 disabled:hover:shadow-[0_0_18px_rgba(167,139,250,0.06)]"
            title={isUploading ? "Загрузка файлов..." : "Отправить"}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
