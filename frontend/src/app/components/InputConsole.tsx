import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X } from "lucide-react";
import type { Attachment } from "./ChatMessages";

interface InputConsoleProps {
  onSend?: (text: string, attachments?: Attachment[]) => void;
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

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 mb-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 max-w-[80%] group"
              >
                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                  title="Удалить"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input container with drag-and-drop */}
        <div
          className={`flex items-end bg-[#1a1a1a] rounded-2xl border transition-colors shadow-lg pl-3 pr-2 py-2 ${
            isDragging
              ? "border-indigo-500/50 bg-indigo-500/5"
              : "border-white/10 focus-within:border-white/20"
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
            disabled={!input.trim() && attachments.length === 0}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 mb-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
            title="Отправить"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        <p className="text-xs text-center mt-3 text-gray-500">
          Enter — отправить, Shift + Enter — новая строка. ИИ отсортирует всё сам.
        </p>
      </div>
    </div>
  );
}