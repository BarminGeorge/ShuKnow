import { useState, useRef, useEffect } from "react";
import { Paperclip, ArrowUp } from "lucide-react";

export function InputConsole() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      console.log("Sending:", input);
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

  return (
    <div className="bg-[#121212] px-4 md:px-6 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end bg-[#2f2f2f] rounded-[24px] border border-white/5 focus-within:border-white/10 transition-colors shadow-lg pl-3 pr-2 py-2">
          {/* Left Button - Attachment */}
          <button
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
            onClick={handleSend}
            disabled={!input.trim()}
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