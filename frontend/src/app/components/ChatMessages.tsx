import { useState, type ReactNode } from "react";
import { Undo2, Sparkles, Loader2, CheckCircle2, XCircle, FolderOpen, FileText, Image as ImageIcon, GripVertical, Copy, RefreshCw, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
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
  const serverMap = new Map(serverAttachments.map((a) => [a.fileName, a.id]));
  
  return attachments.map((attachment) => ({
    ...attachment,
    serverId: serverMap.get(attachment.name),
  }));
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

const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
  "with", "yield",
]);

const PYTHON_BUILTINS = new Set([
  "abs", "bool", "dict", "enumerate", "float", "int", "len", "list", "max", "min",
  "print", "range", "round", "set", "str", "sum", "tuple", "zip",
]);

const PYTHON_CONSTANTS = new Set(["False", "None", "True"]);

const JAVASCRIPT_KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default",
  "delete", "do", "else", "export", "extends", "finally", "for", "from", "function", "if",
  "import", "in", "instanceof", "interface", "let", "new", "of", "return", "switch", "throw",
  "try", "type", "typeof", "var", "void", "while", "yield",
]);

const JAVASCRIPT_BUILTINS = new Set([
  "Array", "Boolean", "Date", "Error", "JSON", "Map", "Math", "Number", "Object", "Promise",
  "React", "Set", "String", "console", "document", "navigator", "window",
]);

const JAVASCRIPT_CONSTANTS = new Set(["false", "null", "true", "undefined"]);

const CSHARP_KEYWORDS = new Set([
  "abstract", "as", "async", "await", "base", "break", "case", "catch", "class", "const",
  "continue", "default", "delegate", "do", "else", "enum", "event", "explicit", "extern",
  "finally", "fixed", "for", "foreach", "get", "if", "implicit", "in", "interface", "internal",
  "is", "lock", "namespace", "new", "operator", "out", "override", "params", "private",
  "protected", "public", "readonly", "record", "ref", "return", "sealed", "set", "sizeof",
  "stackalloc", "static", "struct", "switch", "this", "throw", "try", "typeof", "unchecked",
  "unsafe", "using", "virtual", "void", "volatile", "while", "yield",
]);

const CSHARP_TYPES = new Set([
  "bool", "byte", "char", "DateTime", "decimal", "double", "dynamic", "float", "Guid", "int",
  "IEnumerable", "List", "long", "object", "short", "string", "String", "Task", "uint", "ulong",
  "var",
]);

const CSHARP_CONSTANTS = new Set(["false", "null", "true"]);

function getLanguageLabel(language: string) {
  const normalizedLanguage = language.toLowerCase();

  return normalizedLanguage || "code";
}

function highlightPythonLine(line: string) {
  const tokens: ReactNode[] = [];
  const tokenPattern = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|\s+|./g;

  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    let className = "";

    if (token.startsWith("#")) {
      className = "text-[#6a737d]";
    } else if (token.startsWith("\"") || token.startsWith("'")) {
      className = "text-[#a5d6ff]";
    } else if (/^\d/.test(token)) {
      className = "text-[#b392f0]";
    } else if (PYTHON_KEYWORDS.has(token)) {
      className = "text-[#ff7b72]";
    } else if (PYTHON_BUILTINS.has(token)) {
      className = "text-[#d2a8ff]";
    } else if (PYTHON_CONSTANTS.has(token)) {
      className = "text-[#79c0ff]";
    } else if (/^[A-Za-z_]\w*$/.test(token) && line.slice(index + token.length).trimStart().startsWith("(")) {
      className = "text-[#7ee787]";
    } else if (/^[A-Za-z_]\w*$/.test(token)) {
      className = "text-[#79c0ff]";
    }

    tokens.push(className ? <span key={`${index}-${token}`} className={className}>{token}</span> : token);
  }

  return tokens;
}

function highlightJavascriptLine(line: string) {
  const tokens: ReactNode[] = [];
  const tokenPattern = /\/\/[^\n]*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][\w.-]*|[A-Za-z_][$\w-]*=|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|\s+|./g;

  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    let className = "";

    if (token.startsWith("//") || token.startsWith("/*")) {
      className = "text-[#6a737d]";
    } else if (token.startsWith("\"") || token.startsWith("'") || token.startsWith("`")) {
      className = "text-[#a5d6ff]";
    } else if (/^<\/?[A-Za-z]/.test(token)) {
      className = "text-[#7ee787]";
    } else if (/^[A-Za-z_][$\w-]*=$/.test(token)) {
      className = "text-[#d2a8ff]";
    } else if (/^\d/.test(token)) {
      className = "text-[#b392f0]";
    } else if (JAVASCRIPT_KEYWORDS.has(token)) {
      className = "text-[#ff7b72]";
    } else if (JAVASCRIPT_BUILTINS.has(token)) {
      className = "text-[#d2a8ff]";
    } else if (JAVASCRIPT_CONSTANTS.has(token)) {
      className = "text-[#79c0ff]";
    } else if (/^[A-Za-z_$][\w$]*$/.test(token) && line.slice(index + token.length).trimStart().startsWith("(")) {
      className = "text-[#7ee787]";
    } else if (/^[A-Za-z_$][\w$]*$/.test(token)) {
      className = "text-[#c9d1d9]";
    }

    tokens.push(className ? <span key={`${index}-${token}`} className={className}>{token}</span> : token);
  }

  return tokens;
}

function highlightCSharpLine(line: string) {
  const tokens: ReactNode[] = [];
  const tokenPattern = /\/\/[^\n]*|\/\*.*?\*\/|@"(?:[^"]|"")*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|\s+|./g;

  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    let className = "";

    if (token.startsWith("//") || token.startsWith("/*")) {
      className = "text-[#6a737d]";
    } else if (token.startsWith("\"") || token.startsWith("'") || token.startsWith("@\"")) {
      className = "text-[#a5d6ff]";
    } else if (/^\d/.test(token)) {
      className = "text-[#b392f0]";
    } else if (CSHARP_KEYWORDS.has(token)) {
      className = "text-[#ff7b72]";
    } else if (CSHARP_TYPES.has(token)) {
      className = "text-[#79c0ff]";
    } else if (CSHARP_CONSTANTS.has(token)) {
      className = "text-[#79c0ff]";
    } else if (/^[A-Z]\w*$/.test(token)) {
      className = "text-[#d2a8ff]";
    } else if (/^[A-Za-z_]\w*$/.test(token) && line.slice(index + token.length).trimStart().startsWith("(")) {
      className = "text-[#7ee787]";
    }

    tokens.push(className ? <span key={`${index}-${token}`} className={className}>{token}</span> : token);
  }

  return tokens;
}

function highlightCode(code: string, language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage === "python" || normalizedLanguage === "py") {
    return code.split("\n").map((line, index, lines) => (
      <span key={index}>
        {highlightPythonLine(line)}
        {index < lines.length - 1 ? "\n" : null}
      </span>
    ));
  }

  if (["javascript", "js", "jsx", "typescript", "ts", "tsx"].includes(normalizedLanguage)) {
    return code.split("\n").map((line, index, lines) => (
      <span key={index}>
        {highlightJavascriptLine(line)}
        {index < lines.length - 1 ? "\n" : null}
      </span>
    ));
  }

  if (["csharp", "cs"].includes(normalizedLanguage)) {
    return code.split("\n").map((line, index, lines) => (
      <span key={index}>
        {highlightCSharpLine(line)}
        {index < lines.length - 1 ? "\n" : null}
      </span>
    ));
  }

  return code.split("\n").map((line, index, lines) => (
    <span key={index}>
      {highlightPythonLine(line)}
      {index < lines.length - 1 ? "\n" : null}
    </span>
  ));
}

function MarkdownCode({ className, children, ...props }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
  const code = String(children ?? "").replace(/^\s*\n/, "").replace(/\n$/, "");
  const isCodeBlock = Boolean(language) || String(children ?? "").includes("\n");

  if (!isCodeBlock) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="not-prose relative my-6 bg-[#0d0d0d] ring-1 ring-[#1f1f1f]">
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-100"
        >
          {copied ? "Скопировано" : getLanguageLabel(language)}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto border-0 bg-[#0d0d0d] p-5 pr-20 text-[14px] leading-7">
        <code className="font-mono text-[#c9d1d9]" style={{ backgroundColor: "transparent", borderRadius: 0, fontSize: "inherit", padding: 0 }}>{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

// Draggable attachment component - horizontal strip style
function DraggableAttachment({ attachment }: { attachment: Attachment }) {
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
      window.setTimeout(() => setIsResendAnimating(false), 450);
    });
    onResend?.(message.id);
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
          <div className="text-base text-foreground break-words leading-7 prose prose-invert prose-base max-w-full overflow-wrap-anywhere
                          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words
                          prose-p:text-gray-200 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap
                          prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300
                          prose-li:text-gray-200 prose-li:marker:text-gray-500 prose-li:break-words
                          prose-ul:my-2 prose-ol:my-2
                          prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline
                          prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
                          prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400
                          prose-hr:border-white/10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: ({ children }) => <>{children}</>,
                code: MarkdownCode,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
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
}

export function ChatMessages({ messages, onOpenFolder, onRetry, onResend, bottomPadding = 176 }: ChatMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_58%_0%,rgba(124,58,237,0.025),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.01),transparent_18%)]">
      <div className="max-w-7xl mx-auto px-9" style={{ paddingBottom: bottomPadding }}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`px-4 py-5 ${index === 0 ? "pt-8" : ""}`}
          >
            <div className={`flex gap-4 ${message.type === "user" ? "justify-end" : ""}`}>
              {message.type === "user" ? (
                // User message - with markdown and hover actions
                <div className="max-w-[85%]">
                  <UserMessage message={message} onResend={onResend} />
                </div>
              ) : (
                <div className="w-full max-w-5xl">
                  <div className="relative flex gap-4 rounded-2xl overflow-hidden border border-white/[0.055]
                                  bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(18,18,19,0.97)_52%,rgba(12,12,13,0.98))]
                                  px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_44px_rgba(0,0,0,0.24)]
                                  before:absolute before:inset-y-5 before:left-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-violet-200/22 before:to-transparent">
                    {/* Agent avatar */}
                    <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-violet-100
                                    bg-[linear-gradient(135deg,rgba(124,58,237,0.78),rgba(15,23,42,0.56)_58%,rgba(167,139,250,0.38))]
                                    border border-violet-200/20 shadow-[0_0_22px_rgba(167,139,250,0.14)]">
                      <Sparkles size={16} />
                    </div>

                    <div className="relative z-10 flex-1 min-w-0">
                    {/* Processing state */}
                    {message.status === "processing" && (
                      <div className="flex items-center gap-2 text-violet-200">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Обрабатываю...</span>
                      </div>
                    )}
                    
                    {/* Success state */}
                    {message.status === "success" && message.result && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-violet-200" />
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
                          <div key={folder} className="pl-5 border-l-2 border-violet-200/22">
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
                    
                    {/* Default/simple message (no status or legacy) */}
                    {!message.status && (
                      <div>
                        <div className="text-base text-foreground break-words leading-7 prose prose-invert prose-base max-w-none overflow-wrap-anywhere
                                        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:break-words
                                        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap
                                        prose-strong:text-white prose-strong:font-semibold prose-em:text-gray-300
                                        prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:break-words
                                        prose-ul:my-2 prose-ol:my-2
                                        prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline
                                        prose-code:text-violet-200 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
                                        prose-blockquote:border-violet-400/45 prose-blockquote:text-gray-400
                                        prose-hr:border-white/10">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              pre: ({ children }) => <>{children}</>,
                              code: MarkdownCode,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
