import type { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List,
  ListOrdered,
  ListChecks,
  Link,
  Image,
  Minus,
} from 'lucide-react';

export interface EditorToolbarProps {
  editorViewRef: React.RefObject<EditorView | null>;
}

// ── CodeMirror transaction helpers ──────────────────────────────────────────

function wrapSelection(
  view: EditorView,
  before: string,
  after: string = before,
): void {
  view.dispatch(
    view.state.changeByRange((range) => {
      const selected = view.state.sliceDoc(range.from, range.to);
      return {
        changes: [
          {
            from: range.from,
            to: range.to,
            insert: `${before}${selected}${after}`,
          },
        ],
        range: EditorSelection.range(
          range.from + before.length,
          range.from + before.length + selected.length,
        ),
      };
    }),
  );
  view.focus();
}

function insertLinePrefix(view: EditorView, prefix: string): void {
  view.dispatch(
    view.state.changeByRange((range) => {
      const line = view.state.doc.lineAt(range.from);
      return {
        changes: [{ from: line.from, insert: prefix }],
        range: EditorSelection.range(
          range.from + prefix.length,
          range.to + prefix.length,
        ),
      };
    }),
  );
  view.focus();
}

function insertAtCursor(view: EditorView, text: string): void {
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: { from, to, insert: text } });
  view.focus();
}

function toggleCode(view: EditorView): void {
  const range = view.state.selection.main;
  const selected = view.state.sliceDoc(range.from, range.to);
  if (selected.includes('\n')) {
    view.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: `\`\`\`\n${selected}\n\`\`\``,
      },
    });
  } else {
    wrapSelection(view, '`');
  }
  view.focus();
}

function insertLink(view: EditorView): void {
  const range = view.state.selection.main;
  const selected = view.state.sliceDoc(range.from, range.to) || 'text';
  const insert = `[${selected}](url)`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    // Select the placeholder 'url' so the user can type the URL immediately
    selection: EditorSelection.range(
      range.from + selected.length + 3,
      range.from + selected.length + 6,
    ),
  });
  view.focus();
}

function insertImage(view: EditorView): void {
  const range = view.state.selection.main;
  const selected = view.state.sliceDoc(range.from, range.to) || 'alt';
  const insert = `![${selected}](url)`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(
      range.from + selected.length + 4,
      range.from + selected.length + 7,
    ),
  });
  view.focus();
}

// ── Toolbar definition ───────────────────────────────────────────────────────

interface ToolbarItem {
  icon: React.ReactNode;
  label: string;
  action: (view: EditorView) => void;
}

type ToolbarGroup = ToolbarItem[];

const toolbarGroups: ToolbarGroup[] = [
  // Text formatting
  [
    {
      icon: <Bold size={15} />,
      label: 'Bold (Ctrl+B)',
      action: (v) => wrapSelection(v, '**'),
    },
    {
      icon: <Italic size={15} />,
      label: 'Italic (Ctrl+I)',
      action: (v) => wrapSelection(v, '_'),
    },
    {
      icon: <Strikethrough size={15} />,
      label: 'Strikethrough',
      action: (v) => wrapSelection(v, '~~'),
    },
  ],
  // Headings
  [
    {
      icon: <Heading1 size={15} />,
      label: 'Heading 1',
      action: (v) => insertLinePrefix(v, '# '),
    },
    {
      icon: <Heading2 size={15} />,
      label: 'Heading 2',
      action: (v) => insertLinePrefix(v, '## '),
    },
    {
      icon: <Heading3 size={15} />,
      label: 'Heading 3',
      action: (v) => insertLinePrefix(v, '### '),
    },
  ],
  // Block elements
  [
    {
      icon: <Code size={15} />,
      label: 'Code',
      action: (v) => toggleCode(v),
    },
    {
      icon: <Quote size={15} />,
      label: 'Blockquote',
      action: (v) => insertLinePrefix(v, '> '),
    },
  ],
  // Lists
  [
    {
      icon: <List size={15} />,
      label: 'Unordered list',
      action: (v) => insertLinePrefix(v, '- '),
    },
    {
      icon: <ListOrdered size={15} />,
      label: 'Ordered list',
      action: (v) => insertLinePrefix(v, '1. '),
    },
    {
      icon: <ListChecks size={15} />,
      label: 'Task list',
      action: (v) => insertLinePrefix(v, '- [ ] '),
    },
  ],
  // Insert
  [
    {
      icon: <Link size={15} />,
      label: 'Link',
      action: (v) => insertLink(v),
    },
    {
      icon: <Image size={15} />,
      label: 'Image',
      action: (v) => insertImage(v),
    },
    {
      icon: <Minus size={15} />,
      label: 'Horizontal rule',
      action: (v) => insertAtCursor(v, '\n\n---\n\n'),
    },
  ],
];

// ── Component ────────────────────────────────────────────────────────────────

export function EditorToolbar({ editorViewRef }: EditorToolbarProps) {
  const handleAction = (action: (view: EditorView) => void) => {
    const view = editorViewRef.current;
    if (!view) return;
    action(view);
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-[#1a1a1a] border-b border-white/[0.07] flex-wrap">
      {toolbarGroups.map((group, gi) => (
        <div key={gi} className="flex items-center">
          {gi > 0 && (
            <div className="w-px h-4 bg-white/10 mx-1.5" aria-hidden="true" />
          )}
          {group.map((item) => (
            <button
              key={item.label}
              title={item.label}
              aria-label={item.label}
              onMouseDown={(e) => {
                // Prevent editor focus loss on click
                e.preventDefault();
                handleAction(item.action);
              }}
              className="p-1.5 rounded text-gray-400 hover:text-gray-100 hover:bg-white/10 transition-colors"
            >
              {item.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
