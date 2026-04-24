import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { Eye, FileText, ImageIcon, Pencil } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import {
  EditorView,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorSelection, type Extension } from "@codemirror/state";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { flushSync } from "react-dom";
import type { FileItem } from "../../Workspace";
import { getFileExtension, isCodeFileName } from "../../utils/fileValidation";
import { fileService } from "../../../api";
import { PdfViewer } from "./PdfViewer";

interface EditorPaneProps {
  file: FileItem;
  onUpdateContent: (fileId: string, content: string) => void;
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

export function EditorPane({ file, onUpdateContent }: EditorPaneProps) {
  const isMarkdownFile = file.name.endsWith(".md");
  const isCodeFile = isCodeFileName(file.name);
  const isTextLikeFile = file.type === "text" || isMarkdownFile || isCodeFile;
  const hasContent = Boolean(file.content?.trim());

  const [localContent, setLocalContent] = useState(file.content || "");
  const [isRemoteContentLoading, setIsRemoteContentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!isMarkdownFile || !hasContent);
  const [isMarkdownScrollRestoring, setIsMarkdownScrollRestoring] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const localContentRef = useRef(localContent);
  const hasUserEditedRef = useRef(false);
  const fileIdRef = useRef(file.id);
  const onUpdateRef = useRef(onUpdateContent);
  const editorViewRef = useRef<EditorView | null>(null);
  const editorSelectionRef = useRef<{ anchor: number; head: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const markdownScrollContainerRef = useRef<HTMLDivElement>(null);
  const markdownScrollRatioRef = useRef(0);
  const shouldRestoreMarkdownScrollRef = useRef(false);

  // Keep refs fresh
  localContentRef.current = localContent;
  fileIdRef.current = file.id;
  onUpdateRef.current = onUpdateContent;

  // Sync content when file changes (e.g. external update)
  useEffect(() => {
    setLocalContent(file.content || "");
    hasUserEditedRef.current = false;
  }, [file.id, file.content]);

  useEffect(() => {
    editorViewRef.current = null;
    editorSelectionRef.current = null;
    textareaSelectionRef.current = null;
    markdownScrollRatioRef.current = 0;
    shouldRestoreMarkdownScrollRef.current = false;
  }, [file.id]);

  useEffect(() => {
    if (!isTextLikeFile || file.content !== undefined) {
      setIsRemoteContentLoading(false);
      return;
    }

    let isCancelled = false;
    setIsRemoteContentLoading(true);

    void fileService.fetchFileContentAsText(file.id)
      .then((textContent) => {
        if (isCancelled) {
          return;
        }

        setLocalContent(textContent);
        localContentRef.current = textContent;
      })
      .catch((error) => {
        console.error("Failed to load text content:", error);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsRemoteContentLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [file.id, file.content, isTextLikeFile]);

  useLayoutEffect(() => {
    if (!isEditing || isCodeFile || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const containerScrollTop = markdownScrollContainerRef.current?.scrollTop ?? 0;
    const textareaScrollTop = textarea.scrollTop;

    textarea.focus({ preventScroll: true });

    const savedSelection = textareaSelectionRef.current;
    if (!savedSelection) {
      if (markdownScrollContainerRef.current) {
        markdownScrollContainerRef.current.scrollTop = containerScrollTop;
      }
      textarea.scrollTop = textareaScrollTop;
      return;
    }

    const maxPosition = textarea.value.length;
    const start = Math.min(savedSelection.start, maxPosition);
    const end = Math.min(savedSelection.end, maxPosition);

    textarea.setSelectionRange(start, end);
    if (markdownScrollContainerRef.current) {
      markdownScrollContainerRef.current.scrollTop = containerScrollTop;
    }
    textarea.scrollTop = textareaScrollTop;
  }, [isCodeFile, isEditing]);

  // Cleanup on unmount: flush pending debounce and save
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (hasUserEditedRef.current) {
        onUpdateRef.current(fileIdRef.current, localContentRef.current);
      }
    };
  }, []);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hasUserEditedRef.current) {
        onUpdateRef.current(fileIdRef.current, localContentRef.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleChange = (newValue: string) => {
    setLocalContent(newValue);
    hasUserEditedRef.current = true;
    // 800ms debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateContent(file.id, newValue);
      hasUserEditedRef.current = false;
    }, 800);
  };

  const handleBlur = useCallback(() => {
    if (!hasUserEditedRef.current) return;
    // Immediate save on focus loss
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateContent(file.id, localContent);
    hasUserEditedRef.current = false;
  }, [file.id, localContent, onUpdateContent]);

  const getScrollRatio = (element: HTMLElement | null) => {
    if (!element) return null;

    const maxScrollTop = element.scrollHeight - element.clientHeight;
    if (maxScrollTop <= 0) return null;

    return element.scrollTop / maxScrollTop;
  };

  const restoreScrollRatio = (element: HTMLElement | null, ratio: number) => {
    if (!element) return;

    const maxScrollTop = element.scrollHeight - element.clientHeight;
    if (maxScrollTop <= 0) return;

    element.scrollTop = ratio * maxScrollTop;
  };

  const restoreMarkdownScrollPosition = (ratio = markdownScrollRatioRef.current) => {
    restoreScrollRatio(markdownScrollContainerRef.current, ratio);
    restoreScrollRatio(textareaRef.current, ratio);
  };

  const captureMarkdownScrollPosition = useCallback(() => {
    if (!isMarkdownFile) return;

    const textareaRatio = getScrollRatio(textareaRef.current);
    const containerRatio = getScrollRatio(markdownScrollContainerRef.current);
    markdownScrollRatioRef.current = textareaRatio ?? containerRatio ?? 0;
    shouldRestoreMarkdownScrollRef.current = true;
  }, [isMarkdownFile]);

  useLayoutEffect(() => {
    if (!isMarkdownFile || !shouldRestoreMarkdownScrollRef.current) return;

    let secondAnimationFrameId = 0;
    const ratio = markdownScrollRatioRef.current;
    const applyRestore = () => restoreMarkdownScrollPosition(ratio);

    applyRestore();

    const firstAnimationFrameId = requestAnimationFrame(() => {
      applyRestore();
      flushSync(() => {
        setIsMarkdownScrollRestoring(false);
      });
      secondAnimationFrameId = requestAnimationFrame(() => {
        applyRestore();
      });
      shouldRestoreMarkdownScrollRef.current = false;
    });

    return () => {
      cancelAnimationFrame(firstAnimationFrameId);
      cancelAnimationFrame(secondAnimationFrameId);
    };
  }, [isEditing, isMarkdownFile, localContent]);

  const captureEditorSelection = useCallback(() => {
    if (textareaRef.current) {
      textareaSelectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }

    const selection = editorViewRef.current?.state.selection.main;
    if (!selection) return;

    editorSelectionRef.current = {
      anchor: selection.anchor,
      head: selection.head,
    };
  }, []);

  const restoreEditorSelection = useCallback((view: EditorView) => {
    const savedSelection = editorSelectionRef.current;
    if (!savedSelection) return;

    const maxPosition = view.state.doc.length;
    const anchor = Math.min(savedSelection.anchor, maxPosition);
    const head = Math.min(savedSelection.head, maxPosition);

    requestAnimationFrame(() => {
      view.dispatch({
        selection: EditorSelection.single(anchor, head),
        scrollIntoView: true,
      });
      view.focus();
    });
  }, []);

  const handleEditorUpdate = useCallback((viewUpdate: ViewUpdate) => {
    editorViewRef.current = viewUpdate.view;

    if (viewUpdate.selectionSet) {
      const selection = viewUpdate.state.selection.main;
      editorSelectionRef.current = {
        anchor: selection.anchor,
        head: selection.head,
      };
    }
  }, []);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    restoreEditorSelection(view);
  }, [restoreEditorSelection]);

  const handleTextareaSelect = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    textareaSelectionRef.current = {
      start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd,
    };
  }, []);

  const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + 1;

    handleChange(nextValue);
    textareaSelectionRef.current = {
      start: nextCursorPosition,
      end: nextCursorPosition,
    };

    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }, []);

  const codeMirrorExtensions = useMemo<Extension[]>(() => {
    const extension = getFileExtension(file.name);
    const languageExtension = (() => {
      switch (extension) {
        case "js":
          return javascript({ jsx: false, typescript: false });
        case "jsx":
          return javascript({ jsx: true, typescript: false });
        case "ts":
          return javascript({ jsx: false, typescript: true });
        case "tsx":
          return javascript({ jsx: true, typescript: true });
        case "json":
          return json();
        case "html":
          return html();
        case "css":
          return css();
        case "py":
          return python();
        case "cs":
          return cpp();
        default:
          return [];
      }
    })();

    return [
      languageExtension,
      syntaxHighlighting(oneDarkHighlightStyle),
      keymap.of([{
        key: "Tab",
        run: (view) => {
          view.dispatch(view.state.changeByRange((range) => ({
            changes: { from: range.from, to: range.to, insert: "\t" },
            range: EditorSelection.cursor(range.from + 1),
          })));
          return true;
        },
      }]),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          background: "transparent !important",
          backgroundColor: "transparent !important",
          border: "0 !important",
          boxShadow: "none !important",
          color: "#d4d4d4",
          fontSize: "15px",
          outline: "none !important",
        },
        ".cm-editor, .cm-editor.cm-focused": {
          background: "transparent !important",
          backgroundColor: "transparent !important",
          border: "0 !important",
          boxShadow: "none !important",
          outline: "none !important",
        },
        ".cm-scroller": {
          background: "transparent !important",
          backgroundColor: "transparent !important",
          border: "0 !important",
          boxShadow: "none !important",
          fontFamily: "'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas',monospace",
          lineHeight: "1.85",
          outline: "none !important",
        },
        ".cm-content": {
          background: "transparent !important",
          backgroundColor: "transparent !important",
          border: "0 !important",
          boxShadow: "none !important",
          outline: "none !important",
          padding: "0",
          caretColor: "#818cf8",
          minHeight: "calc(100vh - 160px)",
        },
        ".cm-line": {
          backgroundColor: "transparent !important",
        },
        ".cm-focused": {
          outline: "none",
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: "rgba(99,102,241,0.28)",
        },
        ".cm-activeLine, .cm-activeLine.cm-line": {
          background: "transparent !important",
          backgroundColor: "transparent !important",
        },
        ".cm-gutters, .cm-activeLineGutter": {
          display: "none",
        },
      }, { dark: true }),
    ];
  }, [file.name]);

  const toggleMode = () => {
    captureMarkdownScrollPosition();
    const ratio = markdownScrollRatioRef.current;

    if (isEditing) {
      captureEditorSelection();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hasUserEditedRef.current) {
        onUpdateContent(file.id, localContent);
        hasUserEditedRef.current = false;
      }
    }

    flushSync(() => {
      setIsMarkdownScrollRestoring(true);
      setIsEditing(!isEditing);
    });
    restoreMarkdownScrollPosition(ratio);
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
        {file.contentUrl ? (
          <>
            <img
              ref={imageRef}
              src={file.contentUrl}
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
      <PdfViewer fileId={file.id} fileName={file.name} />
    );
  }

  // ── Text / Markdown editor ─────────────────────────────────────────
  if (isRemoteContentLoading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-500">
        Загружаем содержимое файла...
      </div>
    );
  }

  return (
    <div className="relative h-full bg-[#111111]">
      {/* Floating toggle button for markdown files */}
      {isMarkdownFile && (
        <div className="pointer-events-none absolute right-8 top-6 z-30">
          <div className="flex justify-end">
            <button
              onClick={toggleMode}
              className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-md
                         border border-white/8 bg-[#141414]/75 px-3 text-xs font-medium
                         text-gray-500 shadow-[0_6px_16px_rgba(0,0,0,0.22)] backdrop-blur-sm
                         transition-colors duration-150 hover:border-white/12 hover:bg-[#1b1b1b]/85 hover:text-gray-300"
              title={isEditing ? "Просмотр" : "Редактировать"}
            >
              {isEditing ? (
                <>
                  <Eye size={13} />
                  <span>Просмотр</span>
                </>
              ) : (
                <>
                  <Pencil size={13} />
                  <span>Редактировать</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div
        ref={markdownScrollContainerRef}
        className={`h-full overflow-y-auto ${isMarkdownScrollRestoring ? "invisible" : ""}`}
      >
        <div className="max-w-3xl mx-auto px-10 py-12">
          {isMarkdownFile && !isEditing ? (
            /* ── Markdown Preview ────────────────────────────────────── */
            <div
              className="prose prose-invert max-w-none
                       break-words
                       prose-headings:font-semibold prose-headings:tracking-tight
                       prose-headings:break-words
                       prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
                       prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8
                       prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
                       prose-p:text-gray-300 prose-p:leading-relaxed prose-p:break-words prose-p:whitespace-pre-wrap
                       prose-strong:text-white prose-strong:font-semibold
                       prose-em:text-gray-300
                       prose-li:text-gray-300 prose-li:marker:text-gray-500 prose-li:break-words
                       prose-ul:my-2 prose-ol:my-2
                                 prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                                 prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
                       prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5 prose-pre:whitespace-pre-wrap prose-pre:break-words
                       prose-blockquote:border-indigo-500/50 prose-blockquote:text-gray-400
                       prose-hr:border-white/10
                       min-h-[calc(100vh-200px)]"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: MarkdownCode,
                }}
              >
                {localContent}
              </ReactMarkdown>
            </div>
          ) : isCodeFile ? (
            /* ── Code Editor ─────────────────────────────────────────── */
            <CodeMirror
              value={localContent}
              onChange={handleChange}
              onBlur={handleBlur}
              onCreateEditor={handleCreateEditor}
              onUpdate={handleEditorUpdate}
              autoFocus
              theme="none"
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLineGutter: false,
                highlightActiveLine: false,
                highlightSelectionMatches: true,
              }}
              extensions={isCodeFile ? codeMirrorExtensions : codeMirrorExtensions.slice(2)}
              placeholder="Начните вводить текст..."
              className="min-h-[calc(100vh-160px)] font-mono text-[15px] leading-[1.85] tracking-[0.01em] w-full !bg-transparent text-gray-200 !border-0 !shadow-none !outline-none [&_*]:!shadow-none [&_.cm-editor]:!bg-transparent [&_.cm-editor]:!border-0 [&_.cm-editor]:!outline-none [&_.cm-scroller]:!bg-transparent [&_.cm-scroller]:!border-0 [&_.cm-content]:!bg-transparent [&_.cm-content]:!border-0"
              height="auto"
              style={{
                backgroundColor: "transparent",
                border: 0,
                boxShadow: "none",
                minHeight: "calc(100vh - 160px)",
                outline: "none",
              }}
            />
          ) : (
            /* ── Plain Textarea Editor ───────────────────────────────── */
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleTextareaKeyDown}
                onSelect={handleTextareaSelect}
                onClick={handleTextareaSelect}
                onKeyUp={handleTextareaSelect}
                placeholder="Начните вводить текст..."
                autoFocus
                spellCheck={false}
                className="w-full bg-transparent text-gray-200 resize-none outline-none placeholder:text-gray-700 caret-indigo-400"
                style={{
                  fontFamily: isMarkdownFile
                    ? "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                    : "'ui-monospace','SFMono-Regular','Menlo','Monaco','Consolas',monospace",
                  fontSize: isMarkdownFile ? "16px" : "15px",
                  lineHeight: isMarkdownFile ? "1.35" : "1.55",
                  letterSpacing: "0",
                  minHeight: "calc(100vh - 160px)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
