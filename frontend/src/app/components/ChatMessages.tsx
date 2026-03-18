import { Undo2, Paperclip, Image as ImageIcon, FileText } from "lucide-react";

export interface MessageAttachment {
  id: string;
  name: string;
  type: "text" | "photo" | "pdf" | "other";
  imageUrl?: string;
}

export interface Message {
  id: string;
  type: "user" | "system";
  content: string;
  attachments?: MessageAttachment[];
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
            <div className="max-w-[70%] flex flex-col items-end gap-2">
              {/* Attached files - displayed above the message */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-col gap-2 items-end self-end w-fit max-w-full">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm self-end w-fit max-w-full"
                    >
                      {attachment.type === "photo" ? (
                        attachment.imageUrl ? (
                          <img
                            src={attachment.imageUrl}
                            alt={attachment.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        ) : (
                          <ImageIcon size={14} className="text-purple-400" />
                        )
                      ) : (
                        <FileText size={14} className="text-blue-400" />
                      )}
                      <span className="text-blue-300 truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Message text */}
              {message.content && (
                <div className="bg-[#E5E7EB] rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">{message.content}</p>
                </div>
              )}
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
