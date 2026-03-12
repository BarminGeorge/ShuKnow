import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { EditorView } from '@codemirror/view';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';

export interface SplitEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  /** Forwarded to the underlying MarkdownEditor's CodeMirror EditorView */
  editorViewRef?: React.MutableRefObject<EditorView | null>;
}

export function SplitEditor({
  content,
  onChange,
  onSave,
  editorViewRef,
}: SplitEditorProps) {
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={50} minSize={30}>
        <div className="h-full overflow-hidden border-r border-white/[0.07]">
          <MarkdownEditor
            content={content}
            onChange={onChange}
            onSave={onSave}
            viewRef={editorViewRef}
          />
        </div>
      </Panel>

      <PanelResizeHandle className="w-[3px] bg-white/5 hover:bg-[#7c5cbf]/50 transition-colors cursor-col-resize" />

      <Panel defaultSize={50} minSize={30}>
        <MarkdownPreview content={content} />
      </Panel>
    </PanelGroup>
  );
}
