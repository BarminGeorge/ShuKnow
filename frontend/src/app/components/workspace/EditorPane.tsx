import { useState, useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";
import type { FileItem } from "../../App";

interface EditorPaneProps {
  file: FileItem;
  onUpdateContent: (fileId: string, content: string) => void;
}

export function EditorPane({ file, onUpdateContent }: EditorPaneProps) {
  const [localContent, setLocalContent] = useState(file.content || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const localContentRef = useRef(localContent);
  const fileIdRef = useRef(file.id);
  const onUpdateRef = useRef(onUpdateContent);

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

  const handleChange = (newValue: string) => {
    setLocalContent(newValue);
    // 800ms debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateContent(file.id, newValue);
    }, 800);
  };

  const handleBlur = () => {
    // Immediate save on focus loss
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateContent(file.id, localContent);
  };

  // ── Image viewer ──────────────────────────────────────────────────
  if (file.type === "photo") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 bg-[#0e0e0e]">
        {file.imageUrl ? (
          <>
            <img
              src={file.imageUrl}
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

  // ── Text / Markdown editor ─────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-[#111111]">
      <div className="max-w-3xl mx-auto px-10 py-12">
        <textarea
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
      </div>
    </div>
  );
}
