import { Undo2 } from "lucide-react";

export interface Message {
  id: string;
  type: "user" | "system";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-4 pb-4">
        {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
        >
          {message.type === "user" ? (
            // User message (right side) - Light gray background with dark text
            <div className="max-w-[70%]">
              <div className="bg-[#E5E7EB] rounded-xl px-4 py-3">
                <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ) : (
            // System message (left side) with Undo button inside - Dark theme
            <div className="max-w-[70%]">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-200 mb-3 break-words whitespace-pre-wrap">{message.content}</p>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-blue-400 transition-all text-xs">
                  <Undo2 size={14} />
                  <span>Отменить</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}