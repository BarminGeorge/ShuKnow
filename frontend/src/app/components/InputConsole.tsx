import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X, Loader2 } from "lucide-react";
import type { Attachment } from "./ChatMessages";
import { createAttachmentFromFile, applyServerIds } from "./ChatMessages";
import { chatService } from "../../api";

interface InputConsoleProps {
  onSend?: (text: string, attachments?: Attachment[]) => void;
}

export function InputConsole({ onSend }: InputConsoleProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = fileArray.map(createAttachmentFromFile);
    
    setAttachments((prev) => {
      // Avoid duplicates by checking file name and size
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
    
    // If there are attachments, stage them first via REST API
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
          // Continue sending without server IDs - let the caller handle it
          // In production, this would show an error toast
        } finally {
          setIsUploading(false);
        }
      }
    }
    
    console.log("Sending:", input, finalAttachments);
    onSend?.(input.trim(), finalAttachments.length > 0 ? finalAttachments : undefined);
    
    // Clean up blob URLs
    for (const attachment of attachments) {
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
    }
    
    setInput("");
    setAttachments([]);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
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
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      if (input === "") {
        textarea.style.height = ""; // Reset to default CSS layout
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
    <div className="bg-[#121212] px-4 md:px-6 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 mb-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.localId}
                className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 max-w-[80%] group"
              >
                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.localId)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                  title="Удалить"
                  disabled={isUploading}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input container with drag-and-drop */}
        <div
          className={`flex items-end bg-[#2f2f2f] rounded-[24px] border transition-colors shadow-lg pl-3 pr-2 py-2 ${
            isDragging
              ? "border-blue-500/50 bg-blue-500/5"
              : "border-white/5 focus-within:border-white/10"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Left Button - Attachment */}
          <button
            onClick={handlePaperclipClick}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 mb-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Прикрепить файлы"
          >
            <Paperclip size={20} />
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDragging ? "Отпустите файлы здесь..." : "Введите текст, скиньте изображения или файлы..."}
            className="flex-1 max-h-[200px] min-h-[44px] bg-transparent text-gray-200 placeholder:text-gray-400 resize-none outline-none px-3 py-2.5 text-[15px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            rows={1}
          />

          {/* Right Button - Send */}
          <button
            onClick={handleSend}
            disabled={isUploading || (!input.trim() && attachments.length === 0)}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 mb-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
            title={isUploading ? "Загрузка файлов..." : "Отправить"}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>

        <p className="text-xs text-center mt-3 text-gray-500">
          Enter — отправить, Shift + Enter — новая строка. ИИ отсортирует всё сам.
        </p>
      </div>
    </div>
  );
}