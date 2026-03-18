import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp, X } from "lucide-react";

interface InputConsoleProps {
  onSend?: (text: string, files?: File[]) => void;
  onAttachFiles?: (files: File[]) => void;
}

export function InputConsole({ onSend, onAttachFiles }: InputConsoleProps) {
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleSend = () => {
    if (input.trim() || attachedFiles.length > 0) {
      console.log("Sending:", input, attachedFiles);
      onSend?.(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
      setInput("");
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = (newFiles: File[]) => {
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    onAttachFiles?.(newFiles);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items?.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  return (
    <div 
      className="bg-[#121212] px-4 md:px-6 pb-6 pt-2 transition-colors"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        {/* Attached Files Preview - Above input, vertical stack */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300"
              >
                <Paperclip size={14} />
                <span className="truncate flex-1">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 text-blue-400 hover:text-blue-200 transition-colors"
                  title="Удалить"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={`flex items-end bg-[#2f2f2f] rounded-[24px] border transition-all shadow-lg pl-3 pr-2 py-2 ${
          isDragging 
            ? "border-blue-500/50 bg-blue-500/5" 
            : "border-white/5 focus-within:border-white/10"
        }`}>
          {/* Left Button - Attachment */}
          <button
            onClick={handleAttachmentClick}
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
            placeholder="Введите текст, скиньте изображения или файлы..."
            className="flex-1 max-h-[200px] min-h-[44px] bg-transparent text-gray-200 placeholder:text-gray-400 resize-none outline-none px-3 py-2.5 text-[15px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            rows={1}
          />

          {/* Right Button - Send */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() && attachedFiles.length === 0}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 mb-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
            title="Отправить"
          >
            <ArrowUp size={18} />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-center mt-3 text-gray-500">
          Enter — отправить, Shift + Enter — новая строка. Перетащите файлы или нажмите <Paperclip size={12} className="inline" /> для загрузки.
        </p>
      </div>
    </div>
  );
}
