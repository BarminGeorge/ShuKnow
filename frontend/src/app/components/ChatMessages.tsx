import { Undo2, Paperclip, Sparkles, Loader2, CheckCircle2, XCircle, FolderOpen, FileText, Image as ImageIcon, GripVertical } from "lucide-react";
import { useState } from "react";

export interface Attachment {
  id: string;
  name: string;
  file: File;
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
    return <ImageIcon size={14} className="text-gray-400" />;
  }
  return <FileText size={14} className="text-gray-400" />;
}

// Draggable attachment component
function DraggableAttachment({ attachment }: { attachment: Attachment }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    // Set drag data
    e.dataTransfer.setData('text/plain', attachment.name);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'chat-file',
      id: attachment.id,
      name: attachment.name,
      fileType: attachment.type,
      url: attachment.url,
    }));
    
    // Set drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'scale(1.02)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    
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
      className={`flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 max-w-full cursor-grab active:cursor-grabbing transition-all hover:bg-indigo-500/15 hover:border-indigo-500/30 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <GripVertical size={12} className="text-gray-500 flex-shrink-0" />
      {isImageFile(attachment.name) && attachment.url ? (
        <img 
          src={attachment.url} 
          alt={attachment.name}
          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        getFileIcon(attachment.name)
      )}
      <span className="text-sm text-gray-200 truncate">{attachment.name}</span>
      {attachment.size && (
        <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
      )}
    </div>
  );
}

export function ChatMessages({ messages, onOpenFolder, onUndo, onRetry, onSelectFolder }: ChatMessagesProps) {
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
              // User message (right side) - Indigo accent
              <div className="max-w-[70%]">
                {/* Attachments displayed above message */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-col items-end gap-1.5 mb-2">
                    {message.attachments.map((attachment) => (
                      <DraggableAttachment key={attachment.id} attachment={attachment} />
                    ))}
                  </div>
                )}
                {message.content && (
                  <div className="bg-indigo-500/15 border border-indigo-500/20 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            ) : (
              // Agent message (left side)
              <div className="max-w-[70%]">
                <div className="flex items-start gap-2">
                  {/* Agent avatar */}
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles size={14} className="text-indigo-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Processing state */}
                    {message.status === "processing" && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Обрабатываю...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Success state */}
                    {message.status === "success" && message.result && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 size={16} className="text-green-400" />
                          <span className="text-sm text-gray-200">Сохранено</span>
                        </div>
                        
                        {/* File results grouped by folder */}
                        {Object.entries(
                          message.result.reduce((acc, file) => {
                            if (!acc[file.folder]) acc[file.folder] = [];
                            acc[file.folder].push(file);
                            return acc;
                          }, {} as Record<string, typeof message.result>)
                        ).map(([folder, files]) => (
                          <div key={folder} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
                              <FolderOpen size={14} />
                              <span>{folder}</span>
                            </div>
                            <div className="space-y-1">
                              {files.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-300 pl-5">
                                  {getFileIcon(file.name)}
                                  <span className="truncate">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Action buttons or Cancelled state */}
                        {message.cancelled ? (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 text-gray-500 text-xs">
                            <XCircle size={12} />
                            <span>Отменено</span>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                            {message.result[0]?.folderId && onOpenFolder && (
                              <button 
                                onClick={() => onOpenFolder(message.result![0].folderId!)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors text-xs"
                              >
                                <FolderOpen size={12} />
                                <span>Открыть папку</span>
                              </button>
                            )}
                            {onUndo && (
                              <button 
                                onClick={() => onUndo(message.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-xs"
                              >
                                <Undo2 size={12} />
                                <span>Отменить</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Error state */}
                    {message.status === "error" && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle size={16} className="text-red-400" />
                          <span className="text-sm text-gray-200">{message.errorMessage || "Ошибка обработки"}</span>
                        </div>
                        
                        {/* Show files that failed */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {message.attachments.map((file) => (
                              <div key={file.id} className="flex items-center gap-2 text-sm text-gray-400 pl-5">
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors text-xs"
                            >
                              <FolderOpen size={12} />
                              <span>Выбрать папку</span>
                            </button>
                          )}
                          {onRetry && (
                            <button 
                              onClick={() => onRetry(message.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-xs"
                            >
                              <Undo2 size={12} />
                              <span>Повторить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Default/simple message (no status or legacy) */}
                    {!message.status && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{message.content}</p>
                        {onUndo && (
                          <button 
                            onClick={() => onUndo(message.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors text-xs mt-3"
                          >
                            <Undo2 size={12} />
                            <span>Отменить</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-start mt-1">
                      <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}