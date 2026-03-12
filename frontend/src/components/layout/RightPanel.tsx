import { lazy, Suspense } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

const ChatView        = lazy(() => import('@/components/chat/ChatView').then(m => ({ default: m.ChatView })));
const FolderDetailView = lazy(() => import('@/components/folder/FolderDetailView').then(m => ({ default: m.FolderDetailView })));
const FileEditorView  = lazy(() => import('@/components/editor/FileEditorView').then(m => ({ default: m.FileEditorView })));
const SettingsView    = lazy(() => import('@/components/settings/SettingsView').then(m => ({ default: m.SettingsView })));

export function RightPanel() {
  const rightPanel = useUiStore((s) => s.rightPanel);

  return (
    <div className="h-full overflow-hidden bg-[#0d0d0d]">
      <Suspense fallback={<PanelSkeleton />}>
        <ErrorBoundary>
          {rightPanel.type === 'chat' && <ChatView />}
          {rightPanel.type === 'folder' && (
            <FolderDetailView folderId={rightPanel.folderId} />
          )}
          {rightPanel.type === 'file' && (
            <FileEditorView fileId={rightPanel.fileId} />
          )}
          {rightPanel.type === 'settings' && <SettingsView />}
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="h-full bg-[#0d0d0d] animate-pulse p-8 space-y-4">
      <div className="h-8 bg-white/5 rounded-lg w-1/3" />
      <div className="h-4 bg-white/5 rounded w-2/3" />
      <div className="h-4 bg-white/5 rounded w-1/2" />
    </div>
  );
}
