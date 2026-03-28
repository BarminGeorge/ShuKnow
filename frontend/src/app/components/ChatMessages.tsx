import { Undo2, Paperclip } from "lucide-react";
import type { AttachmentDto } from "../../api/chatService";

export interface Attachment {
  /** Local ID for React keys (generated client-side) */
  localId: string;
  /** Server-assigned ID after upload (used when sending message) */
  serverId?: string;
  /** File name */
  name: string;
  /** Original File object (for upload) */
  file?: File;
  /** Blob URL for preview */
  url?: string;
  /** Content type */
  contentType?: string;
  /** Size in bytes */
  sizeBytes?: number;
}

/**
 * Creates an Attachment from a local File
 */
export function createAttachmentFromFile(file: File): Attachment {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    file,
    url: URL.createObjectURL(file),
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

/**
 * Updates attachments with server IDs after upload
 */
export function applyServerIds(
  attachments: Attachment[],
  serverAttachments: AttachmentDto[]
): Attachment[] {
  // Match by fileName since that's the only correlation we have
  const serverMap = new Map(serverAttachments.map((a) => [a.fileName, a.id]));
  
  return attachments.map((attachment) => ({
    ...attachment,
    serverId: serverMap.get(attachment.name),
  }));
}

export interface Message {
  id: string;
  type: "user" | "system";
  content: string;
  attachments?: Attachment[];
  /** Action ID for undo (from AI completion) */
  actionId?: string;
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
              {/* Attachments displayed above message */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-col items-end gap-1 mb-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.localId}
                      className="flex items-center gap-2 bg-[#D1D5DB] rounded-lg px-3 py-1.5 max-w-full"
                    >
                      <Paperclip size={14} className="text-gray-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
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