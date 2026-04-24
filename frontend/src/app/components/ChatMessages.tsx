import { memo, useMemo, useState, forwardRef } from "react";
import type { HTMLAttributes } from "react";
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

const ChatScroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`chat-scrollbar ${className ?? ""}`.trim()}
      {...props}
    />
  )
);
ChatScroller.displayName = "ChatScroller";

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

const userMarkdownClassName = "text-[13px] text-foreground break-words leading-5 prose prose-invert prose-sm max-w-full overflow-wrap-anywhere lg:text-base lg:leading-7 lg:prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words prose-p:text-gray-200 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300 prose-li:text-gray-200 prose-li:marker:text-gray-500 prose-li:break-words prose-ul:my-1.5 prose-ol:my-1.5 lg:prose-ul:my-2 lg:prose-ol:my-2 prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400 prose-hr:border-white/10";
const agentMarkdownClassName = "text-[13px] text-foreground break-words leading-5 prose prose-invert prose-sm max-w-none overflow-wrap-anywhere lg:text-base lg:leading-7 lg:prose-base prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words prose-p:text-gray-300 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300 prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:break-words prose-ul:my-1.5 prose-ol:my-1.5 lg:prose-ul:my-2 lg:prose-ol:my-2 prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400 prose-hr:border-white/10";

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
      className={`flex w-[min(160px,52vw)] flex-shrink-0 cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 active:cursor-grabbing lg:w-[min(200px,64vw)] lg:gap-2.5 lg:rounded-xl lg:px-2.5 lg:py-2
                  bg-[linear-gradient(135deg,rgba(255,255,255,0.052),rgba(27,27,28,0.96)_52%,rgba(18,18,19,0.98))]
                  border border-white/[0.07] shadow-[0_10px_28px_rgba(0,0,0,0.22)]
                  transition-all hover:border-violet-200/18 hover:shadow-[0_12px_32px_rgba(0,0,0,0.26),0_0_20px_rgba(167,139,250,0.05)] ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.06] bg-black/30 lg:h-9 lg:w-9 lg:rounded-lg">
        {isImageFile(attachment.name) && attachment.url ? (
          <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
        ) : (
          <FileText size={15} className="text-muted-foreground lg:h-[18px] lg:w-[18px]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[11px] text-foreground lg:text-xs">{attachment.name}</p>
        {attachment.sizeBytes && (
          <p className="text-[10px] text-muted-foreground lg:text-[11px]">{formatFileSize(attachment.sizeBytes)}</p>
        )}
      </div>
      <GripVertical size={12} className="text-muted-foreground flex-shrink-0 opacity-40 lg:h-3.5 lg:w-3.5" />
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
      <div className="relative max-w-full">
        <div className={`max-w-full overflow-hidden rounded-xl border border-white/[0.07] lg:rounded-2xl
                        bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(23,23,24,0.97)_54%,rgba(16,16,17,0.98))]
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_rgba(0,0,0,0.24)]
                        ${hasAttachments && !hasText ? "p-2" : "px-3 py-2 lg:px-4 lg:py-3"}`}>
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

        {/* Actions are pinned to this message bubble, not to the reserved gap below it. */}
        {(hasText || onResend) && (
          <div className="absolute right-2 top-full z-20 flex translate-y-0.5 gap-1 transition-all duration-150 opacity-100 pointer-events-auto lg:right-3 lg:gap-1.5 lg:translate-y-[-25%] lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:translate-y-[-25%] lg:group-hover:pointer-events-auto">
            {hasText && (
              <button
                onClick={handleCopy}
                className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 lg:h-8 lg:w-8 lg:rounded-lg
                           bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(28,28,30,0.96)_52%,rgba(18,18,20,0.98))]
                           border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.28)]
                           hover:text-violet-100 hover:border-violet-200/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.30),0_0_18px_rgba(167,139,250,0.08)]
                           transition-all"
                title="Копировать"
              >
                {copied ? <Check size={12} className="text-violet-100 lg:h-4 lg:w-4" /> : <Copy size={12} className="lg:h-4 lg:w-4" />}
              </button>
            )}
            {onResend && (
              <button
                onClick={handleResend}
                className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 lg:h-8 lg:w-8 lg:rounded-lg
                           bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(28,28,30,0.96)_52%,rgba(18,18,20,0.98))]
                           border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.28)]
                           hover:text-violet-100 hover:border-violet-200/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.30),0_0_18px_rgba(167,139,250,0.08)]
                           transition-all"
                title="Отправить повторно"
              >
                <RefreshCw size={12} className={`${isResendAnimating ? "animate-[spin_450ms_ease-out_1]" : ""} lg:h-4 lg:w-4`} />
              </button>
            )}
          </div>
        )}
      </div>

      {(hasText || onResend) && <div className="h-5 lg:h-0" aria-hidden="true" />}
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
        <div key={folder} className="border-l-2 border-violet-200/22 pl-4 lg:pl-5">
          {folder.trim().length > 0 && (
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground lg:mb-2 lg:text-sm">
              <FolderOpen size={13} className="lg:h-3.5 lg:w-3.5" />
              <span>{folder}</span>
            </div>
          )}
          <div className="space-y-1">
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-xs text-foreground lg:text-sm">
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
  const hasPersistedChanges = (message.result?.length ?? 0) > 0;

  return (
    <div className={`px-0 py-1 lg:px-4 lg:py-5 ${index === 0 ? "pt-2 lg:pt-8" : ""}`}>
      <div className={`flex gap-2.5 lg:gap-4 ${message.type === "user" ? "justify-end" : ""}`}>
        {message.type === "user" ? (
          <div className="max-w-[82%] lg:max-w-[85%]">
            <UserMessage message={message} onResend={onResend} />
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <div className="relative flex gap-3 rounded-xl overflow-hidden border border-white/[0.055] lg:rounded-2xl lg:gap-4
                            bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(18,18,19,0.97)_52%,rgba(12,12,13,0.98))]
                            px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.24)] lg:px-5 lg:py-5
                            before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-violet-200/22 before:to-transparent">
              <div className="relative z-10 hidden w-8 h-8 rounded-full items-center justify-center flex-shrink-0 text-violet-100 sm:flex
                              bg-[linear-gradient(135deg,rgba(124,58,237,0.78),rgba(15,23,42,0.56)_58%,rgba(167,139,250,0.38))]
                              border border-violet-200/20 shadow-[0_0_22px_rgba(167,139,250,0.14)]">
                <Sparkles size={16} />
              </div>

              <div className="relative z-10 flex-1 min-w-0">
              {message.status === "processing" && (
                <div className="space-y-3 lg:space-y-4">
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
                <div className="space-y-3 lg:space-y-4">
                  <AgentMessageContent content={message.content} />
                  {hasPersistedChanges && message.result && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-violet-200 lg:h-[18px] lg:w-[18px]" />
                        <span className="text-xs font-medium lg:text-sm">Сохранено</span>
                      </div>
                      <FileResultGroups result={message.result} />
                    </div>
                  )}

                  {message.result && (
                    <>
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
        followOutput={() => "smooth"}
        computeItemKey={(_, message) => message.id}
        defaultItemHeight={360}
        overscan={{ main: 16800, reverse: 16800 }}
        increaseViewportBy={{ top: 16800, bottom: 16800 }}
        itemContent={(index, message) => (
          <div className="mx-auto max-w-7xl px-3 lg:px-9">
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
          Scroller: ChatScroller,
          Footer: () => <div style={{ height: bottomPadding }} />,
        }}
      />
    </div>
  );
}
