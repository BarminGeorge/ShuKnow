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

  // Keep refs fresh
  localContentRef.current = localContent;
  fileIdRef.current = file.id;
  onUpdateRef.current = onUpdateContent;

  // Sync content when file changes (e.g. external update)
  useEffect(() => {
    setLocalContent(file.content || "");
  }, [file.id, file.content]);

  // Cleanup on unmount: flush pending debounce and save
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Always save on unmount to prevent data loss on tab switch
      onUpdateRef.current(fileIdRef.current, localContentRef.current);
    };
  }, []);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onUpdateRef.current(fileIdRef.current, localContentRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Auto-focus textarea when entering edit mode
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
    // Immediate save on focus loss
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateContent(file.id, localContent);
  }, [file.id, localContent, onUpdateContent]);

  const toggleMode = () => {
    if (isEditing) {
      // Save before switching to preview
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onUpdateContent(file.id, localContent);
    }
    setIsEditing(!isEditing);
  };

  // ── Image viewer with zoom (no pan) ───────────────────────────────────────────────────────────
  // Refs as source of truth for real-time input (avoids stale closures)
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const animatingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Force re-render when refs change
  const [, forceUpdate] = useState(0);
  const triggerRender = useCallback(() => forceUpdate((n) => n + 1), []);

  // Helper: enable animation with auto-reset after 150ms
  const enableAnimation = useCallback(() => {
    animatingRef.current = true;
    triggerRender();
    setTimeout(() => {
      animatingRef.current = false;
      triggerRender();
    }, 150);
  }, [triggerRender]);

  // Reset on file change
  useEffect(() => {
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    animatingRef.current = false;
    triggerRender();
  }, [file.id, triggerRender]);

  // WHEEL ZOOM - Telegram style: linear, no clamping
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const image = imageRef.current;
      const container = containerRef.current;
      if (!image || !container) return;

      const imageRect = image.getBoundingClientRect();
      const isOverImage =
        e.clientX >= imageRect.left &&
        e.clientX <= imageRect.right &&
        e.clientY >= imageRect.top &&
        e.clientY <= imageRect.bottom;

      if (!isOverImage) return;

      e.preventDefault();
      e.stopPropagation();

      const containerRect = container.getBoundingClientRect();

      // Mouse position relative to image's transform origin (top-left of untransformed image)
      // The flex container centers the image, so calculate the image's base position
      const imgBaseLeft = containerRect.left + (containerRect.width - image.offsetWidth) / 2;
      const imgBaseTop = containerRect.top + (containerRect.height - image.offsetHeight) / 2;

      const mouseX = e.clientX - imgBaseLeft;
      const mouseY = e.clientY - imgBaseTop;

      const currentScale = scaleRef.current;
      const currentPos = posRef.current;

      // LINEAR zoom - Telegram style
      // deltaY is usually ~100 per wheel tick, so 0.0015 gives ~0.15 scale change per tick
      const delta = e.ctrlKey ? -e.deltaY * 0.001 : -e.deltaY * 0.0015;
      const newScale = Math.min(10, Math.max(1, currentScale + delta));

      if (newScale === currentScale) return;

      // Disable animation during wheel zoom
      animatingRef.current = false;

      // If zooming to 1x, reset position with animation
      if (newScale === 1) {
        scaleRef.current = 1;
        posRef.current = { x: 0, y: 0 };
        enableAnimation();
        return;
      }

      // Zoom-to-cursor: keep point under mouse stationary
      // This formula works correctly with transform-origin: 0 0
      const scaleRatio = newScale / currentScale;
      const newX = mouseX - (mouseX - currentPos.x) * scaleRatio;
      const newY = mouseY - (mouseY - currentPos.y) * scaleRatio;

      // NO CLAMPING during wheel zoom - let user zoom into corners
      scaleRef.current = newScale;
      posRef.current = { x: newX, y: newY };
      triggerRender();
    },
    [enableAnimation, triggerRender]
  );

  // DOUBLE CLICK - toggle between 1x (fit) and fill-container
  const onDoubleClick = useCallback(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) return;

    const currentScale = scaleRef.current;

    if (currentScale > 1) {
      // Already zoomed — reset to 1x centered
      scaleRef.current = 1;
      posRef.current = { x: 0, y: 0 };
      enableAnimation();
      return;
    }

    // Calculate scale needed to fit the image inside the container
    const containerRect = container.getBoundingClientRect();

    // Account for padding (p-10 = 40px)
    const padding = 40;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    // Current displayed size of the image at scale=1 (constrained by max-w-full max-h-[75vh])
    const imgDisplayWidth = image.offsetWidth;
    const imgDisplayHeight = image.offsetHeight;

    // Scale needed so the image fits inside the container width and height
    const scaleX = availableWidth / imgDisplayWidth;
    const scaleY = availableHeight / imgDisplayHeight;

    // Use the SMALLER scale so the image fits entirely inside (like CSS "contain")
    const fitScale = Math.min(scaleX, scaleY);

    // If image already fits at scale 1, don't zoom
    if (fitScale <= 1) {
      return;
    }

    // Clamp to max zoom
    const newScale = Math.min(10, fitScale);

    // Center the scaled image in the container
    // With transformOrigin "0 0", the image top-left is positioned by flexbox at:
    //   baseX = (containerW - imgDisplayW) / 2
    //   baseY = (containerH - imgDisplayH) / 2
    // After scaling, we want the image center to align with container center:
    //   newX = (containerW - imgDisplayW * newScale) / 2
    //   newY = (containerH - imgDisplayH * newScale) / 2
    // But since the base position already centers at scale=1, the offset is:
    const newX = (containerRect.width - imgDisplayWidth * newScale) / 2 - (containerRect.width - imgDisplayWidth) / 2;
    const newY = (containerRect.height - imgDisplayHeight * newScale) / 2 - (containerRect.height - imgDisplayHeight) / 2;

    scaleRef.current = newScale;
    posRef.current = { x: newX, y: newY };
    enableAnimation();
  }, [enableAnimation]);

  // Zoom controls with animation
  const zoomIn = useCallback(() => {
    const currentScale = scaleRef.current;
    const newScale = Math.min(10, currentScale * 1.5);
    scaleRef.current = newScale;
    enableAnimation();
  }, [enableAnimation]);

  const zoomOut = useCallback(() => {
    const currentScale = scaleRef.current;
    const newScale = Math.max(1, currentScale / 1.5);

    if (newScale === 1) {
      posRef.current = { x: 0, y: 0 };
    }
    scaleRef.current = newScale;
    enableAnimation();
  }, [enableAnimation]);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    enableAnimation();
  }, [enableAnimation]);

  if (file.type === "photo") {
    const scale = scaleRef.current;
    const pos = posRef.current;
    const animating = animatingRef.current;

    return (
      <div
        ref={containerRef}
        className="h-full flex flex-col items-center justify-center p-10 bg-[#0e0e0e] relative overflow-hidden"
        onWheel={onWheel}
        style={{ cursor: "default" }}
      >
        {file.imageUrl ? (
          <>
            <img
              ref={imageRef}
              src={file.imageUrl}
              alt={file.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10 select-none"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                transition: animating ? "transform 0.1s ease-out" : "none",
              }}
              draggable={false}
              onDoubleClick={onDoubleClick}
            />
            <p className="mt-5 text-sm text-gray-500">{file.name}</p>

            {/* Zoom controls */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2 opacity-0 hover:opacity-100 transition-opacity group">
              <button
                onClick={zoomOut}
                disabled={scale <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
                title="Уменьшить"
              >
                <span className="text-lg font-medium">−</span>
              </button>
              <span className="text-xs text-gray-300 min-w-[50px] text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 10}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
                title="Увеличить"
              >
                <span className="text-lg font-medium">+</span>
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button
                onClick={resetZoom}
                className="px-2 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-medium"
                title="Сбросить"
              >
                1:1
              </button>
            </div>

            {/* Zoom hint */}
            {scale === 1 && (
              <p className="absolute bottom-6 left-6 text-xs text-gray-600">
                Прокрутка для масштабирования • Двойной клик для заполнения
              </p>
            )}
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
        {file.pdfUrl ? (
          <iframe
            src={file.pdfUrl}
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
                                 prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                                 prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded                       prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5
                       prose-blockquote:border-indigo-500/50 prose-blockquote:text-gray-400
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
            className="w-full bg-transparent text-gray-200 resize-none outline-none placeholder:text-gray-700 caret-indigo-400"
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
