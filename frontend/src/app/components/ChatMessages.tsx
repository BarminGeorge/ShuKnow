import { useState } from "react";
import { Undo2, Paperclip, Loader2, Check, AlertCircle } from "lucide-react";
import type { AttachmentDto } from "../../api/chatService";
import { actionsService } from "../../api";

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
  const serverMap = new Map(serverAttachments.map((a) => [a.fileName, a.id]));
  
  return attachments.map((attachment) => ({
    ...attachment,
    serverId: serverMap.get(attachment.name),
  }));
}

/** Message role matching backend enum */
export type MessageRole = "User" | "Ai";

export interface Message {
  id: string;
  /** Role: User or Ai (matches backend ChatMessageDto) */
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  /** Action ID for undo (from AI completion via OnProcessingCompleted) */
  actionId?: string;
  /** Summary of what the AI did (for display) */
  actionSummary?: string;
  /** Whether this action can be rolled back */
  canRollback?: boolean;
}

/** Legacy type alias for backward compatibility */
export type LegacyMessageType = "user" | "system";

/** Convert legacy type to new role */
export function legacyTypeToRole(type: LegacyMessageType): MessageRole {
  return type === "user" ? "User" : "Ai";
}

/** Convert role to legacy type for existing code */
export function roleToLegacyType(role: MessageRole): LegacyMessageType {
  return role === "User" ? "user" : "system";
}

interface ChatMessagesProps {
  messages: Message[];
  /** Called when an action is successfully rolled back */
  onActionRolledBack?: (actionId: string) => void;
}

export function ChatMessages({ messages, onActionRolledBack }: ChatMessagesProps) {
  const [rollingBackActionId, setRollingBackActionId] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rolledBackActions, setRolledBackActions] = useState<Set<string>>(new Set());

  const handleUndo = async (actionId: string) => {
    if (!actionId || rollingBackActionId) return;
    
    setRollingBackActionId(actionId);
    setRollbackError(null);
    
    try {
      const result = await actionsService.rollbackAction(actionId);
      
      if (result.isFullyReverted) {
        setRolledBackActions((prev) => new Set(prev).add(actionId));
        onActionRolledBack?.(actionId);
      } else {
        setRollbackError("Частичный откат: некоторые изменения не удалось отменить");
      }
    } catch (error) {
      console.error("Rollback failed:", error);
      setRollbackError("Не удалось отменить действие");
    } finally {
      setRollingBackActionId(null);
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-4 pb-4">
        {messages.map((message) => {
          const isUser = message.role === "User";
          const hasAction = message.actionId && message.canRollback !== false;
          const isRolledBack = message.actionId && rolledBackActions.has(message.actionId);
          const isRollingBack = message.actionId === rollingBackActionId;
          
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              {isUser ? (
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
                <div className="max-w-[70%]">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Action summary if available */}
                    {message.actionSummary && (
                      <p className="text-xs text-gray-400 mt-2 italic">{message.actionSummary}</p>
                    )}
                    
                    {/* Undo button - only show for messages with actionId */}
                    {hasAction && !isRolledBack && (
                      <button
                        onClick={() => handleUndo(message.actionId!)}
                        disabled={isRollingBack}
                        className="flex items-center gap-2 px-3 py-1.5 mt-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-blue-400 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRollingBack ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Отмена...</span>
                          </>
                        ) : (
                          <>
                            <Undo2 size={14} />
                            <span>Отменить</span>
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* Rolled back indicator */}
                    {isRolledBack && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-green-400">
                        <Check size={14} />
                        <span>Отменено</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Rollback error toast */}
        {rollbackError && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{rollbackError}</span>
              <button
                onClick={() => setRollbackError(null)}
                className="ml-2 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}