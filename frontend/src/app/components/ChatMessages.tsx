import { memo, useMemo, useState } from "react";
import { Undo2, Sparkles, Loader2, CheckCircle2, XCircle, FolderOpen, FileText, Image as ImageIcon, GripVertical, Copy, RefreshCw, Check } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import type { AttachmentDto } from "../../api/chatService";
import ChatMarkdown from "./ChatMarkdown";

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
  const getAttachmentKey = (name: string, sizeBytes?: number, contentType?: string) =>
    `${name}\u0000${sizeBytes ?? ""}\u0000${contentType ?? ""}`;

  const serverIdsByExactKey = new Map<string, string[]>();
  const serverIdsByName = new Map<string, string[]>();

  for (const serverAttachment of serverAttachments) {
    const exactKey = getAttachmentKey(
      serverAttachment.fileName,
      serverAttachment.sizeBytes,
      serverAttachment.contentType
    );
    serverIdsByExactKey.set(exactKey, [
      ...(serverIdsByExactKey.get(exactKey) ?? []),
      serverAttachment.id,
    ]);
    serverIdsByName.set(serverAttachment.fileName, [
      ...(serverIdsByName.get(serverAttachment.fileName) ?? []),
      serverAttachment.id,
    ]);
  }

  const usedServerIds = new Set<string>();
  const takeUnusedServerId = (ids?: string[]) => {
    while (ids && ids.length > 0) {
      const id = ids.shift();
      if (id && !usedServerIds.has(id)) {
        usedServerIds.add(id);
        return id;
      }
    }
    return undefined;
  };
  
  return attachments.map((attachment) => {
    if (attachment.serverId) {
      usedServerIds.add(attachment.serverId);
      return attachment;
    }

    const exactKey = getAttachmentKey(
      attachment.name,
      attachment.sizeBytes,
      attachment.contentType
    );
    const exactMatches = serverIdsByExactKey.get(exactKey);
    const nameMatches = serverIdsByName.get(attachment.name);
    const serverId = takeUnusedServerId(exactMatches) ?? takeUnusedServerId(nameMatches);

    return {
      ...attachment,
      serverId,
    };
  });
}

export interface FileResult {
  name: string;
  folder: string;
  folderId?: string;
  action: "created" | "sorted";
}

export interface Message {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: Date;
  status?: "sending" | "processing" | "success" | "error";
  cancelled?: boolean;
  attachments?: Attachment[];
  replyTo?: string;
  result?: FileResult[];
  errorMessage?: string;
}

interface ChatMessagesProps {
  messages: Message[];
  onOpenFolder?: (folderId: string) => void;
  onRetry?: (messageId: string) => void;
  onSelectFolder?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  bottomPadding?: number;
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

function getFileIcon(filename: string) {
  if (isImageFile(filename)) {
    return <ImageIcon size={14} className="text-muted-foreground" />;
  }
  return <FileText size={14} className="text-muted-foreground" />;
}

const userMarkdownClassName = "text-base text-foreground break-words leading-7 prose prose-invert prose-base max-w-full overflow-wrap-anywhere prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words prose-p:text-gray-200 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300 prose-li:text-gray-200 prose-li:marker:text-gray-500 prose-li:break-words prose-ul:my-2 prose-ol:my-2 prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400 prose-hr:border-white/10";
const agentMarkdownClassName = "text-base text-foreground break-words leading-7 prose prose-invert prose-base max-w-none overflow-wrap-anywhere prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words prose-p:text-gray-300 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300 prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:break-words prose-ul:my-2 prose-ol:my-2 prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400 prose-hr:border-white/10";

function MarkdownContent({ className, content }: { className: string; content: string }) {
  return <ChatMarkdown className={className} content={content} />;
}

// Draggable attachment component - horizontal strip style
const DraggableAttachment = memo(function DraggableAttachment({ attachment }: { attachment: Attachment }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    e.dataTransfer.setData('text/plain', attachment.name);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'chat-file',
      id: attachment.localId,
      name: attachment.name,
      fileType: attachment.contentType,
      url: attachment.url,
      file: attachment.file ? {
        name: attachment.file.name,
        size: attachment.file.size,
        type: attachment.file.type,
      } : null,
    }));
    
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`flex-shrink-0 w-[220px] flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing
                  bg-[linear-gradient(135deg,rgba(255,255,255,0.052),rgba(27,27,28,0.96)_52%,rgba(18,18,19,0.98))]
                  border border-white/[0.07] shadow-[0_10px_28px_rgba(0,0,0,0.22)]
                  transition-all hover:border-violet-200/18 hover:shadow-[0_12px_32px_rgba(0,0,0,0.26),0_0_20px_rgba(167,139,250,0.05)] ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-black/30 border border-white/[0.06] flex items-center justify-center">
        {isImageFile(attachment.name) && attachment.url ? (
          <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
        ) : (
          <FileText size={20} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{attachment.name}</p>
        {attachment.sizeBytes && (
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.sizeBytes)}</p>
        )}
      </div>
      <GripVertical size={14} className="text-muted-foreground flex-shrink-0 opacity-40" />
    </div>
  );
});

// User message component with hover actions
const UserMessage = memo(function UserMessage({ 
  message, 
  onResend 
}: { 
  message: Message;
  onResend?: (messageId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isResendAnimating, setIsResendAnimating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const hasAttachments = !!message.attachments?.length;
  const hasText = !!message.content;

  const handleResend = () => {
    setIsResendAnimating(false);
    requestAnimationFrame(() => {
      setIsResendAnimating(true);
      window.setTimeout(() => {
        setIsResendAnimating(false);
        onResend?.(message.id);
      }, 450);
    });
  };

  return (
    <div className="group relative inline-flex max-w-full flex-col items-end overflow-visible">
      {(hasText || onResend) && (
        <div className="absolute inset-x-0 top-full h-4" aria-hidden="true" />
      )}
      <div className={`max-w-full overflow-hidden rounded-2xl border border-white/[0.07]
                      bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(23,23,24,0.97)_54%,rgba(16,16,17,0.98))]
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_rgba(0,0,0,0.24)]
                      ${hasAttachments && !hasText ? "p-2" : "px-4 py-3"}`}>
        {/* Attachments - horizontal scrollable strip */}
        {hasAttachments && (
          <div className={`flex gap-2 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${hasText ? "pb-2 mb-2" : ""}`}>
            {message.attachments!.map((attachment) => (
              <DraggableAttachment key={attachment.localId} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Message text with Markdown rendering */}
        {hasText && (
          <MarkdownContent className={userMarkdownClassName} content={message.content} />
        )}
      </div>

      {/* Actions float outside the message surface, so they don't create an empty block inside it. */}
      {(hasText || onResend) && (
        <div className="absolute right-3 top-full z-20 flex gap-1.5 opacity-0 translate-y-[-25%] pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-[-25%] group-hover:pointer-events-auto">
          {hasText && (
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400
                         bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(28,28,30,0.96)_52%,rgba(18,18,20,0.98))]
                         border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.28)]
                         hover:text-violet-100 hover:border-violet-200/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.30),0_0_18px_rgba(167,139,250,0.08)]
                         transition-all"
              title="Копировать"
            >
              {copied ? <Check size={16} className="text-violet-100" /> : <Copy size={16} />}
            </button>
          )}
          {onResend && (
            <button
              onClick={handleResend}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400
                         bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(28,28,30,0.96)_52%,rgba(18,18,20,0.98))]
                         border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.28)]
                         hover:text-violet-100 hover:border-violet-200/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.30),0_0_18px_rgba(167,139,250,0.08)]
                         transition-all"
              title="Отправить повторно"
            >
              <RefreshCw size={16} className={isResendAnimating ? "animate-[spin_450ms_ease-out_1]" : ""} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

const AgentMessageContent = memo(function AgentMessageContent({ content }: { content: string }) {
  if (!content.trim()) return null;

  return <MarkdownContent className={agentMarkdownClassName} content={content} />;
});

const FileResultGroups = memo(function FileResultGroups({ result }: { result: FileResult[] }) {
  const groupedResults = useMemo(
    () => Object.entries(
      result.reduce((acc, file) => {
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push(file);
        return acc;
      }, {} as Record<string, FileResult[]>)
    ),
    [result]
  );

  return (
    <>
      {groupedResults.map(([folder, files]) => (
        <div key={folder} className="pl-5 border-l-2 border-violet-200/22">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FolderOpen size={14} />
            <span>{folder}</span>
          </div>
          <div className="space-y-1">
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm text-foreground">
                {getFileIcon(file.name)}
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
});

interface ChatMessageRowProps {
  message: Message;
  index: number;
  onOpenFolder?: (folderId: string) => void;
  onRetry?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
}

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  index,
  onOpenFolder,
  onRetry,
  onResend,
}: ChatMessageRowProps) {
  return (
    <div className={`px-4 py-5 ${index === 0 ? "pt-8" : ""}`}>
      <div className={`flex gap-4 ${message.type === "user" ? "justify-end" : ""}`}>
        {message.type === "user" ? (
          <div className="max-w-[85%]">
            <UserMessage message={message} onResend={onResend} />
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <div className="relative flex gap-4 rounded-2xl overflow-hidden border border-white/[0.055]
                            bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(18,18,19,0.97)_52%,rgba(12,12,13,0.98))]
                            px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.24)]
                            before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-violet-200/22 before:to-transparent">
              <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-violet-100
                              bg-[linear-gradient(135deg,rgba(124,58,237,0.78),rgba(15,23,42,0.56)_58%,rgba(167,139,250,0.38))]
                              border border-violet-200/20 shadow-[0_0_22px_rgba(167,139,250,0.14)]">
                <Sparkles size={16} />
              </div>

              <div className="relative z-10 flex-1 min-w-0">
              {message.status === "processing" && (
                <div className="space-y-4">
                  <AgentMessageContent content={message.content} />
                  <div className="flex items-center gap-2 text-violet-200">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">
                      {message.content.trim() ? "Продолжаю..." : "Обрабатываю..."}
                    </span>
                  </div>
                </div>
              )}
              
              {message.status === "success" && (
                <div className="space-y-4">
                  <AgentMessageContent content={message.content} />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-violet-200" />
                    <span className="text-sm font-medium">Сохранено</span>
                  </div>

                  {message.result && (
                    <>
                      <FileResultGroups result={message.result} />

                      {message.cancelled ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <XCircle size={14} />
                          <span>Отменено</span>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          {message.result[0]?.folderId && onOpenFolder && (
                            <button 
                              onClick={() => onOpenFolder(message.result![0].folderId!)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                                         bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                                         border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)]"
                            >
                              <FolderOpen size={14} />
                              <span>Открыть папку</span>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {message.status === "error" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className="text-rose-500" />
                    <span className="text-sm text-foreground">{message.errorMessage || "Ошибка обработки"}</span>
                  </div>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="space-y-1 pl-5 border-l-2 border-rose-500/30">
                      {message.attachments.map((file) => (
                        <div key={file.localId} className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getFileIcon(file.name)}
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {onRetry && (
                      <button 
                        onClick={() => onRetry(message.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                                   bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                                   border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)]"
                      >
                        <Undo2 size={14} />
                        <span>Повторить</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {!message.status && (
                <AgentMessageContent content={message.content} />
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export function ChatMessages({ messages, onOpenFolder, onRetry, onResend, bottomPadding = 176 }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 bg-[radial-gradient(circle_at_58%_0%,rgba(124,58,237,0.025),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.01),transparent_18%)]">
      <Virtuoso
        className="h-full"
        data={messages}
        computeItemKey={(_, message) => message.id}
        defaultItemHeight={360}
        overscan={{ main: 16800, reverse: 16800 }}
        increaseViewportBy={{ top: 16800, bottom: 16800 }}
        itemContent={(index, message) => (
          <div className="max-w-7xl mx-auto px-9">
            <ChatMessageRow
              message={message}
              index={index}
              onOpenFolder={onOpenFolder}
              onRetry={onRetry}
              onResend={onResend}
            />
          </div>
        )}
        components={{
          Footer: () => <div style={{ height: bottomPadding }} />,
        }}
      />
    </div>
  );
}
