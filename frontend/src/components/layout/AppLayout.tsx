import { Suspense, lazy } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { SidebarContainer } from './SidebarContainer';
import { RightPanel } from './RightPanel';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

const SIDEBAR_MIN_PCT = 15;
const SIDEBAR_MAX_PCT = 35;
const SIDEBAR_DEFAULT_PCT = 22;

export function AppLayout() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen overflow-hidden bg-[#0d0d0d] text-gray-200 flex flex-col">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* ── Left: Sidebar ── */}
          <Panel
            defaultSize={SIDEBAR_DEFAULT_PCT}
            minSize={SIDEBAR_MIN_PCT}
            maxSize={SIDEBAR_MAX_PCT}
            className="flex flex-col"
          >
            <ErrorBoundary>
              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarContainer />
              </Suspense>
            </ErrorBoundary>
          </Panel>

          {/* ── Resize handle ── */}
          <PanelResizeHandle className="w-px bg-white/8 hover:bg-[#7c5cbf]/60 transition-colors data-[resize-handle-active]:bg-[#7c5cbf] cursor-col-resize" />

          {/* ── Right: Dynamic panel ── */}
          <Panel className="flex flex-col">
            <ErrorBoundary>
              <RightPanel />
            </ErrorBoundary>
          </Panel>
        </PanelGroup>
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{ className: 'bg-[#1e1e1e] border border-white/10 text-gray-200' }}
      />
    </DndProvider>
  );
}

function SidebarSkeleton() {
  return (
    <div className="h-full bg-[#111111] animate-pulse p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-7 bg-white/5 rounded-lg" />
      ))}
    </div>
  );
}
