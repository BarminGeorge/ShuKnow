import { createContext, useContext, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import { Copy, Check } from 'lucide-react';

export interface MarkdownPreviewProps {
  content: string;
}

// Signals that a <code> block is inside a <pre> (block code, not inline)
const BlockCodeContext = createContext(false);

/** Recursively extract plain text from a React node tree */
function childrenToText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childrenToText).join('');
  if (node !== null && typeof node === 'object' && 'props' in node) {
    return childrenToText(
      (node as React.ReactElement<{ children?: React.ReactNode }>).props
        .children,
    );
  }
  return '';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-500 hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// Defined as named functions so React hooks rules are unambiguous

function PreComponent({ children }: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <BlockCodeContext.Provider value={true}>
      <div className="relative group my-4">
        <CopyButton text={childrenToText(children)} />
        <pre className="bg-[#0d0d0d] rounded-xl overflow-x-auto p-4 text-sm leading-relaxed border border-white/[0.06]">
          {children}
        </pre>
      </div>
    </BlockCodeContext.Provider>
  );
}

function CodeComponent({
  className,
  children,
}: React.HTMLAttributes<HTMLElement>) {
  const isBlock = useContext(BlockCodeContext);

  if (isBlock) {
    // Inside <pre>: keep the language class so rehype-highlight styles apply
    return <code className={className}>{children}</code>;
  }

  // Inline code
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono text-[#e06c75]">
      {children}
    </code>
  );
}

const markdownComponents: Components = {
  pre: PreComponent,
  code: CodeComponent,

  h1({ children }) {
    return (
      <h1 className="text-3xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">
        {children}
      </h1>
    );
  },

  h2({ children }) {
    return (
      <h2 className="text-2xl font-semibold text-white mt-8 mb-3 pb-1.5 border-b border-white/[0.07]">
        {children}
      </h2>
    );
  },

  h3({ children }) {
    return (
      <h3 className="text-xl font-semibold text-[#d4d4d4] mt-6 mb-2">
        {children}
      </h3>
    );
  },

  h4({ children }) {
    return (
      <h4 className="text-lg font-semibold text-[#c8c8c8] mt-4 mb-1.5">
        {children}
      </h4>
    );
  },

  p({ children }) {
    return <p className="text-[#c8c8c8] leading-7 my-3">{children}</p>;
  },

  a({ href, children }) {
    const isExternal =
      typeof href === 'string' &&
      (href.startsWith('http://') || href.startsWith('https://'));
    return (
      <a
        href={href}
        className="text-[#7c9fcf] hover:text-[#9cbde8] underline underline-offset-2 transition-colors"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },

  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className="max-w-full rounded-xl ring-1 ring-white/10 my-4 mx-auto block"
      />
    );
  },

  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-[#7c5cbf] bg-white/[0.03] pl-4 pr-3 py-2 my-4 italic text-[#a0a0c0] rounded-r-lg">
        {children}
      </blockquote>
    );
  },

  ul({ children, className }) {
    const isTaskList =
      typeof className === 'string' && className.includes('contains-task-list');
    return (
      <ul
        className={`my-2 space-y-1 text-[#c8c8c8] ${isTaskList ? 'list-none pl-0' : 'list-disc pl-6'}`}
      >
        {children}
      </ul>
    );
  },

  ol({ children }) {
    return (
      <ol className="list-decimal pl-6 my-2 space-y-1 text-[#c8c8c8]">
        {children}
      </ol>
    );
  },

  li({ children }) {
    return <li className="text-[#c8c8c8] leading-6">{children}</li>;
  },

  table({ children }) {
    return (
      <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },

  thead({ children }) {
    return <thead className="bg-white/[0.06]">{children}</thead>;
  },

  tbody({ children }) {
    return <tbody>{children}</tbody>;
  },

  tr({ children }) {
    return (
      <tr className="border-b border-white/10 last:border-0 hover:bg-white/[0.03] transition-colors">
        {children}
      </tr>
    );
  },

  th({ children }) {
    return (
      <th className="text-left px-4 py-2.5 font-semibold text-[#d4d4d4] border-b border-white/10">
        {children}
      </th>
    );
  },

  td({ children }) {
    return <td className="px-4 py-2.5 text-[#b0b0b0]">{children}</td>;
  },

  hr() {
    return <hr className="border-white/10 my-8" />;
  },

  input({ type, checked }) {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-2 accent-[#7c5cbf] cursor-default"
        />
      );
    }
    return <input type={type} />;
  },
};

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#1e1e1e]">
      <div className="px-12 py-8 max-w-3xl mx-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
