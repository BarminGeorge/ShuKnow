import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const markdownPlugins = [remarkGfm, remarkMath];
const markdownRehypePlugins = [rehypeKatex];

function getLanguageLabel(language: string) {
  const normalizedLanguage = language.toLowerCase();

  return normalizedLanguage || "code";
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
        <code className="font-mono text-[#c9d1d9]" style={{ backgroundColor: "transparent", borderRadius: 0, fontSize: "inherit", padding: 0 }}>{code}</code>
      </pre>
    </div>
  );
}

const markdownComponents = {
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  code: MarkdownCode,
};

interface ChatMarkdownProps {
  className: string;
  content: string;
}

export default function ChatMarkdown({ className, content }: ChatMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={markdownPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
