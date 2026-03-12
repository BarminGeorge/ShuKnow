import { useState, useRef, useEffect } from "react";
import { Paperclip, Send } from "lucide-react";

export function InputConsole() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      setInput("");
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-white/10 bg-[#0d0d0d] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a1a] border border-white/20 rounded-xl overflow-hidden shadow-2xl">
          {/* Input Area */}
          <div className="flex items-end gap-3 p-4">
            {/* Paperclip Icon - Bottom Left */}
            <button
              aria-label="Прикрепить файл"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
              title="Прикрепить файлы"
            >
              <Paperclip size={18} />
            </button>

            {/* Text Input - Single line that expands */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Введите текст, скиньте изображения или файлы... ИИ отсортирует всё сам"
              className="flex-1 bg-transparent text-gray-200 placeholder:text-gray-500 resize-none outline-none text-sm overflow-y-auto"
              style={{ 
                minHeight: "32px",
                maxHeight: "200px",
                height: "32px"
              }}
              rows={1}
            />

            {/* Send Button - Bottom Right */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Отправить сообщение"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 transition-all flex-shrink-0"
              title="Отправить"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center mt-3">
          Enter — отправить, Shift + Enter — новая строка
        </p>
      </div>
    </div>
  );
}