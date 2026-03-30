import { useState } from "react";
import { Undo2, Sparkles, Loader2, CheckCircle2, XCircle, FolderOpen, FileText, Image as ImageIcon, GripVertical, Copy, RefreshCw, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface Attachment {
  id: string;
  name: string;
  file?: File;
  url?: string;
  size?: number;
  type?: string;
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
  onUndo?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onSelectFolder?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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

// Draggable attachment component - horizontal strip style
function DraggableAttachment({ attachment }: { attachment: Attachment }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    e.dataTransfer.setData('text/plain', attachment.name);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'chat-file',
      id: attachment.id,
      name: attachment.name,
      fileType: attachment.type,
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
      className={`flex-shrink-0 w-[220px] flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary cursor-grab active:cursor-grabbing transition-all hover:bg-secondary/80 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {isImageFile(attachment.name) && attachment.url ? (
          <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
        ) : (
          <FileText size={20} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{attachment.name}</p>
        {attachment.size && (
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
        )}
      </div>
      <GripVertical size={14} className="text-muted-foreground flex-shrink-0 opacity-40" />
    </div>
  );
}

// User message component with hover actions
function UserMessage({ 
  message, 
  onResend 
}: { 
  message: Message;
  onResend?: (messageId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="group relative inline-block max-w-full overflow-hidden">
      {/* Attachments - horizontal scrollable strip */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {message.attachments.map((attachment) => (
            <DraggableAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
      
      {/* Message text with Markdown rendering */}
      {message.content && (
        <div className="text-base text-foreground break-words leading-7 prose prose-invert prose-base max-w-full overflow-wrap-anywhere">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Action buttons - bottom right, invisible by default, reserved space */}
      <div className="flex justify-end gap-2 min-h-[28px] mt-1">
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.content && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-secondary hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-colors"
              title="Копировать"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          )}
          {onResend && (
            <button
              onClick={() => onResend(message.id)}
              className="p-1.5 rounded-lg bg-secondary hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-colors"
              title="Отправить повторно"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, onOpenFolder, onUndo, onRetry, onSelectFolder, onResend }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto px-9">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`px-4 py-6 ${message.type === "agent" ? "bg-muted/30" : ""} ${index === 0 ? "pt-8" : ""}`}
          >
            <div className={`flex gap-4 ${message.type === "user" ? "justify-end" : ""}`}>
              {message.type === "user" ? (
                // User message - with markdown and hover actions
                <div className="max-w-[85%]">
                  <UserMessage message={message} onResend={onResend} />
                </div>
              ) : (
                // Agent message - ChatGPT style with avatar
                <>
                  {/* Agent avatar */}
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Processing state */}
                    {message.status === "processing" && (
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Обрабатываю...</span>
                      </div>
                    )}
                    
                    {/* Success state */}
                    {message.status === "success" && message.result && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-indigo-400" />
                          <span className="text-sm font-medium">Сохранено</span>
                        </div>
                        
                        {/* File results grouped by folder */}
                        {Object.entries(
                          message.result.reduce((acc, file) => {
                            if (!acc[file.folder]) acc[file.folder] = [];
                            acc[file.folder].push(file);
                            return acc;
                          }, {} as Record<string, typeof message.result>)
                        ).map(([folder, files]) => (
                          <div key={folder} className="pl-5 border-l-2 border-indigo-500/30">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <FolderOpen size={14} />
                              <span>{folder}</span>
                            </div>
                            <div className="space-y-1">
                              {files.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                                  {getFileIcon(file.name)}
                                  <span className="truncate">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Action buttons or Cancelled state */}
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
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors text-sm"
                              >
                                <FolderOpen size={14} />
                                <span>Открыть папку</span>
                              </button>
                            )}
                            {onUndo && (
                              <button 
                                onClick={() => onUndo(message.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                              >
                                <Undo2 size={14} />
                                <span>Отменить</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error state */}
                    {message.status === "error" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <XCircle size={18} className="text-rose-500" />
                          <span className="text-sm text-foreground">{message.errorMessage || "Ошибка обработки"}</span>
                        </div>
                        
                        {/* Show files that failed */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-1 pl-5 border-l-2 border-rose-500/30">
                            {message.attachments.map((file) => (
                              <div key={file.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                {getFileIcon(file.name)}
                                <span className="truncate">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {onSelectFolder && (
                            <button 
                              onClick={() => onSelectFolder(message.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors text-sm"
                            >
                              <FolderOpen size={14} />
                              <span>Выбрать папку</span>
                            </button>
                          )}
                          {onRetry && (
                            <button 
                              onClick={() => onRetry(message.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-colors text-sm"
                            >
                              <Undo2 size={14} />
                              <span>Повторить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Default/simple message (no status or legacy) */}
                    {!message.status && (
                      <div>
                        <div className="text-base text-foreground break-all leading-7 prose prose-invert prose-base max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        {onUndo && (
                          <button 
                            onClick={() => onUndo(message.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm mt-3"
                          >
                            <Undo2 size={14} />
                            <span>Отменить</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
