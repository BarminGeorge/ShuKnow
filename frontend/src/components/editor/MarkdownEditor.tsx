import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { search, searchKeymap } from '@codemirror/search';
import { autocompletion } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';

export interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  /** Optional ref populated with the underlying CodeMirror EditorView */
  viewRef?: React.MutableRefObject<EditorView | null>;
}

const obsidianTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: '#e0e0e0',
      fontSize: '15px',
      fontFamily:
        "'ui-monospace', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    },
    '.cm-content': {
      padding: '24px 48px',
      caretColor: '#7c5cbf',
      lineHeight: '1.8',
      maxWidth: '900px',
      margin: '0 auto',
    },
    '.cm-gutters': {
      backgroundColor: '#1e1e1e',
      borderRight: '1px solid #2d2d2d',
      color: '#555',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(124, 92, 191, 0.06)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(124, 92, 191, 0.06)' },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#7c5cbf',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#7c5cbf' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#264f78',
    },
    '.cm-scroller': { overflow: 'auto', height: '100%' },
    '.cm-panels': { backgroundColor: '#252525', color: '#d4d4d4' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid #333' },
    '.cm-button': {
      backgroundImage: 'none',
      backgroundColor: '#7c5cbf',
      border: 'none',
      borderRadius: '4px',
      color: '#fff',
      padding: '2px 10px',
      cursor: 'pointer',
    },
    '.cm-textfield': {
      backgroundColor: '#333',
      border: '1px solid #555',
      borderRadius: '4px',
      color: '#e0e0e0',
      padding: '2px 6px',
    },
  },
  { dark: true },
);

export function MarkdownEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
  viewRef,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalViewRef = useRef<EditorView | null>(null);

  // Keep latest callbacks in refs so editor doesn't need to be recreated
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // Create the CodeMirror editor exactly once on mount
  useEffect(
    () => {
      if (!containerRef.current) return;

      const saveKeymap = keymap.of([
        {
          key: 'Ctrl-s',
          mac: 'Cmd-s',
          run: () => {
            onSaveRef.current?.();
            return true;
          },
        },
      ]);

      const state = EditorState.create({
        doc: content,
        extensions: [
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          history(),
          search({ top: true }),
          autocompletion(),
          oneDark,
          obsidianTheme,
          saveKeymap,
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.editable.of(!readOnly),
        ],
      });

      const view = new EditorView({ state, parent: containerRef.current });
      internalViewRef.current = view;
      if (viewRef) viewRef.current = view;

      return () => {
        view.destroy();
        internalViewRef.current = null;
        if (viewRef) viewRef.current = null;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Sync externally-changed content without recreating the editor
  useEffect(() => {
    const view = internalViewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
