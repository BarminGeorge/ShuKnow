import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X, FileText, Image as ImageIcon } from "lucide-react";
import type { Attachment } from "./ChatMessages";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));
    
    setAttachments((prev) => {
      // Avoid duplicates by checking file name and size
      const existing = new Set(prev.map((a) => `${a.name}-${a.file.size}`));
      const unique = newAttachments.filter(
        (a) => !existing.has(`${a.name}-${a.file.size}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleSend = () => {
    if (input.trim() || attachments.length > 0) {
      console.log("Sending:", input, attachments);
      onSend?.(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput("");
      setAttachments([]);
    }
  };

  // Drag and drop handlers - using counter for stable detection
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
    // Ensure we stay highlighted while dragging over
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    
    // Check for files dragged from chat (JSON data)
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const chatFileData = JSON.parse(jsonData);
        if (chatFileData.type === 'chat-file') {
          // Create attachment from chat file data (no real File object available)
          const newAttachment: Attachment = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: chatFileData.name || chatFileData.file?.name || 'unknown',
            url: chatFileData.url,
            size: chatFileData.file?.size,
            type: chatFileData.fileType || chatFileData.file?.type,
          };
          
          setAttachments((prev) => {
            const existing = new Set(prev.map((a) => `${a.name}-${a.size}`));
            if (!existing.has(`${newAttachment.name}-${newAttachment.size}`)) {
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
    
    // Check for external files (from file system)
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
    <div className="bg-[#0a0a0a] px-4 md:px-6 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Combined input container with drag-and-drop and attachments */}
        <div
          className={`bg-[#1a1a1a] rounded-2xl border transition-colors shadow-lg ${
            isDragging
              ? "border-indigo-500/50 bg-indigo-500/5"
              : "border-white/10 focus-within:border-white/20"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Attachments preview - horizontal scrollable list */}
          {attachments.length > 0 && (
            <div className="flex gap-2 p-3 pb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex-shrink-0 w-[180px] flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-xl px-2 py-1.5 group hover:border-white/20 transition-colors"
                >
                  {/* Preview - image or file icon */}
                  <div className="w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                    {isImageFile(attachment.name) && attachment.url ? (
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText size={16} className="text-gray-500" />
                    )}
                  </div>
                  
                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{attachment.name}</p>
                    {attachment.size && (
                      <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                    )}
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    title="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end pl-3 pr-2 py-2">
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
              disabled={!input.trim() && attachments.length === 0}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 mb-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
              title="Отправить"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>

        <p className="text-xs text-center mt-3 text-gray-500">
          Enter — отправить, Shift + Enter — новая строка. ИИ отсортирует всё сам.
        </p>
      </div>
    </div>
  );
}