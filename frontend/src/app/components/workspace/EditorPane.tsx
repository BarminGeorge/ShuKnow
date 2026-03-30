import { useState, useEffect, useRef, useCallback } from "react";
import { ImageIcon, Pencil, Eye, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { FileItem } from "../../Workspace";

interface EditorPaneProps {
  file: FileItem;
  onUpdateContent: (fileId: string, content: string) => void;
}

export function EditorPane({ file, onUpdateContent }: EditorPaneProps) {
  const isMarkdownFile = file.name.endsWith(".md");
  const hasContent = Boolean(file.content?.trim());

  const [localContent, setLocalContent] = useState(file.content || "");
  const [isEditing, setIsEditing] = useState(!isMarkdownFile || !hasContent);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const localContentRef = useRef(localContent);
  const fileIdRef = useRef(file.id);
  const onUpdateRef = useRef(onUpdateContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  localContentRef.current = localContent;
  fileIdRef.current = file.id;
  onUpdateRef.current = onUpdateContent;
  useEffect(() => {
    setLocalContent(file.content || "");
  }, [file.id, file.content]);
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onUpdateRef.current(fileIdRef.current, localContentRef.current);
    };
  }, []);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onUpdateRef.current(fileIdRef.current, localContentRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = (newValue: string) => {
    setLocalContent(newValue);
    // 800ms debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateContent(file.id, newValue);
    }, 800);
  };

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateContent(file.id, localContent);
  }, [file.id, localContent, onUpdateContent]);

  const toggleMode = () => {
    if (isEditing) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onUpdateContent(file.id, localContent);
    }
    setIsEditing(!isEditing);
  };

  // ── Image viewer ──────────────────────────────────────────────────
  if (file.type === "photo") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 bg-[#0e0e0e]">
        {file.contentUrl ? (
          <>
            <img
              src={file.contentUrl}
              alt={file.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
            />
            <p className="mt-5 text-sm text-gray-500">{file.name}</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-700">
            <ImageIcon size={56} className="opacity-30" />
            <p className="text-sm italic">Изображение не загружено</p>
          </div>
        )}
      </div>
    );
  }

  // ── PDF viewer ──────────────────────────────────────────────────
  if (file.type === "pdf") {
    return (
      <div className="h-full flex flex-col bg-[#0e0e0e]">
        {file.contentUrl ? (
          <iframe
            src={file.contentUrl}
            title={file.name}
            className="w-full h-full border-0"
            style={{ minHeight: "100%" }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-700">
            <FileText size={56} className="opacity-30" />
            <p className="text-sm italic">PDF не загружен</p>
          </div>
        )}
      </div>
    );
  }

  // ── Text / Markdown editor ─────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-[#111111]">
      <div className="max-w-3xl mx-auto px-10 py-12">
        {/* Toggle button for markdown files */}
        {isMarkdownFile && (
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                         bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200
                         transition-all duration-200 border border-white/5 hover:border-white/10"
              title={isEditing ? "Просмотр" : "Редактировать"}
            >
              {isEditing ? (
                <>
                  <Eye size={14} />
                  <span>Просмотр</span>
                </>
              ) : (
                <>
                  <Pencil size={14} />
                  <span>Редактировать</span>
                </>
              )}
            </button>
          </div>
        )}

        {isMarkdownFile && !isEditing ? (
          /* ── Markdown Preview ────────────────────────────────────── */
          <div
            className="prose prose-invert max-w-none
                       prose-headings:font-semibold prose-headings:tracking-tight
                       prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
                       prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8
                       prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
                       prose-p:text-gray-300 prose-p:leading-relaxed
                       prose-strong:text-white prose-strong:font-semibold
                       prose-em:text-gray-300
                       prose-li:text-gray-300 prose-li:marker:text-gray-500
                       prose-ul:my-2 prose-ol:my-2
                       prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                       prose-code:text-blue-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                       prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5
                       prose-blockquote:border-blue-500/50 prose-blockquote:text-gray-400
                       prose-hr:border-white/10
                       min-h-[calc(100vh-200px)]"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {localContent}
            </ReactMarkdown>
          </div>
        ) : (
          /* ── Textarea Editor ──────────────────────────────────────── */
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Начните вводить текст…"
            autoFocus
            spellCheck={false}
            className="w-full bg-transparent text-gray-200 resize-none outline-none placeholder:text-gray-700 caret-blue-400"
            style={{
              fontFamily:
                "'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas',monospace",
              fontSize: "15px",
              lineHeight: "1.85",
              letterSpacing: "0.01em",
              minHeight: "calc(100vh - 160px)",
            }}
          />
        )}
      </div>
    </div>
  );
}
