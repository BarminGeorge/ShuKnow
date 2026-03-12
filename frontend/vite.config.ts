import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Scaffold: creates required directories and source files on first dev/build run.
// After running `npm run dev` or `npm run build` once, all files exist on disk and
// can be edited freely. The scaffold never overwrites existing files.
const SCAFFOLD: Record<string, string> = {
  'src/types/index.ts': String.raw`
export type { Folder, FileItem, FileType, ViewMode, FolderPath, DropZone } from '@/features/workspace/model/types';

export type RightPanelView =
  | { type: 'chat' }
  | { type: 'folder'; folderId: string }
  | { type: 'file'; fileId: string }
  | { type: 'settings' };
`.trim(),

  'src/stores/uiStore.ts': String.raw`
import { useSyncExternalStore } from 'react';
import type { RightPanelView } from '@/types';

interface UIState {
  rightPanel: RightPanelView;
}

type Listener = () => void;
type SetState = (
  partial: Partial<UIState> | ((prev: UIState) => Partial<UIState>)
) => void;

let state: UIState = {
  rightPanel: { type: 'chat' },
};

const listeners = new Set<Listener>();

const setState: SetState = (partial) => {
  const update = typeof partial === 'function' ? partial(state) : partial;
  state = { ...state, ...update };
  listeners.forEach((l) => l());
};

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUIStore<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export const uiStore = {
  getState: (): UIState => state,
  setState,
};
`.trim(),

  'src/utils/debounce.ts': String.raw`
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
`.trim(),

  'src/utils/fileHelpers.ts': String.raw`
import type { FileType } from '@/types';

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff',
]);

const MIME_MAP: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  jsx: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

export function getFileExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex + 1) : '';
}

export function getFileType(name: string, mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return 'photo';
  const ext = getFileExtension(name).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'photo';
  return 'text';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1_048_576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1_073_741_824) return (bytes / 1_048_576).toFixed(1) + ' MB';
  return (bytes / 1_073_741_824).toFixed(1) + ' GB';
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function isImageMimeType(mime: string): boolean {
  return mime.startsWith('image/');
}

export function inferMimeType(name: string): string {
  const ext = getFileExtension(name).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}
`.trim(),

  'src/utils/markdown.ts': String.raw`
export function stripMarkdown(content: string): string {
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*{1,2}|_{1,2})([^*_]+)\1/g, '$2')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getWordCount(content: string): number {
  const stripped = stripMarkdown(content);
  const words = stripped.match(/\S+/g);
  return words ? words.length : 0;
}

export function extractTitle(content: string): string | null {
  const match = /^#\s+(.+)$/m.exec(content);
  return match ? match[1].trim() : null;
}

export function getExcerpt(content: string, maxLength = 150): string {
  const stripped = stripMarkdown(content);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trimEnd() + '\u2026';
}
`.trim(),

  'src/components/common/Button.tsx': String.raw`
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/components/ui/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cbf] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#7c5cbf] text-white hover:bg-[#6b4eab]',
        secondary: 'bg-[#252525] text-gray-200 hover:bg-[#2e2e2e] border border-white/10',
        ghost: 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
        danger: 'bg-red-600/80 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-7 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-11 px-6 text-base rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
`.trim(),

  'src/components/common/IconButton.tsx': String.raw`
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/components/ui/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cbf] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        ghost: 'text-gray-400 hover:text-gray-200 hover:bg-white/8',
        default: 'bg-[#252525] text-gray-200 hover:bg-[#2e2e2e] border border-white/10',
      },
      size: {
        sm: 'size-7',
        md: 'size-8',
        lg: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
);

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
export type { IconButtonProps };
`.trim(),

  'src/components/common/Tooltip.tsx': String.raw`
import type { ReactNode, ReactElement } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/app/components/ui/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  className?: string;
}

function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 rounded-md bg-[#1e1e1e] border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 shadow-lg',
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[#1e1e1e]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
export type { TooltipProps };
`.trim(),

  'src/components/common/Badge.tsx': String.raw`
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/components/ui/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-gray-300',
        blue: 'bg-blue-500/20 text-blue-300',
        green: 'bg-green-500/20 text-green-300',
        red: 'bg-red-500/20 text-red-300',
        yellow: 'bg-yellow-500/20 text-yellow-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeProps };
`.trim(),

  'src/components/common/index.ts': String.raw`
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';
export { IconButton, iconButtonVariants } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';
export { Badge, badgeVariants } from './Badge';
export type { BadgeProps } from './Badge';
`.trim(),

  'src/components/layout/AppLayout.tsx': String.raw`
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SidebarContainer } from './SidebarContainer';
import { RightPanel } from './RightPanel';

export function AppLayout() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen flex bg-[#0d0d0d] overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={20} minSize={14} maxSize={28} className="h-full">
            <SidebarContainer />
          </Panel>
          <PanelResizeHandle className="w-px bg-white/8 hover:bg-[#7c5cbf]/50 transition-colors cursor-col-resize" />
          <Panel className="h-full">
            <RightPanel />
          </Panel>
        </PanelGroup>
      </div>
    </DndProvider>
  );
}
`.trim(),

  'src/components/layout/RightPanel.tsx': String.raw`
import { lazy, Suspense, type ReactElement } from 'react';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { useUIStore } from '@/stores/uiStore';
import type { RightPanelView } from '@/types';

const ChatView = lazy(() => import('@/features/chat/ChatView'));
const FolderDetailView = lazy(() => import('@/features/workspace/FolderDetailView'));
const FileEditorView = lazy(() => import('@/features/editor/FileEditorView'));
const SettingsView = lazy(() => import('@/features/settings/SettingsView'));

function ViewSkeleton() {
  return (
    <div className="h-full flex flex-col gap-3 p-6 animate-pulse">
      <div className="h-6 bg-white/5 rounded-md w-48" />
      <div className="h-4 bg-white/5 rounded-md w-full" />
      <div className="h-4 bg-white/5 rounded-md w-3/4" />
      <div className="flex-1 bg-white/5 rounded-lg mt-4" />
    </div>
  );
}

function PanelContent({ view }: { view: RightPanelView }): ReactElement {
  switch (view.type) {
    case 'chat':
      return <ChatView />;
    case 'folder':
      return <FolderDetailView folderId={view.folderId} />;
    case 'file':
      return <FileEditorView fileId={view.fileId} />;
    case 'settings':
      return <SettingsView />;
  }
}

export function RightPanel() {
  const rightPanel = useUIStore((state) => state.rightPanel);
  return (
    <div className="h-full w-full bg-[#0d0d0d] overflow-hidden">
      <ErrorBoundary>
        <Suspense fallback={<ViewSkeleton />}>
          <PanelContent view={rightPanel} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
`.trim(),

  'src/components/layout/SidebarContainer.tsx': String.raw`
import { lazy, Suspense } from 'react';
import { Settings, FolderPlus, Sun } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@/components/common';

const FileTree = lazy(() => import('@/features/workspace/FileTree'));

function FileTreeSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-7 bg-white/5 rounded-md"
          style={{ width: (70 + (i % 3) * 10) + '%' }}
        />
      ))}
    </div>
  );
}

export function SidebarContainer() {
  return (
    <div className="bg-[#111111] border-r border-white/8 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-[#e0e0e0] font-semibold text-base tracking-tight">
          ShuKnow
        </span>
        <Tooltip content="Settings">
          <IconButton aria-label="Open settings" size="sm">
            <Settings className="size-4" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <Suspense fallback={<FileTreeSkeleton />}>
          <FileTree />
        </Suspense>
      </div>

      <div className="flex items-center justify-between px-3 py-3 border-t border-white/8">
        <Button variant="ghost" size="sm" className="gap-1.5 text-gray-400">
          <FolderPlus className="size-4" />
          New Folder
        </Button>
        <Tooltip content="Toggle theme">
          <IconButton aria-label="Toggle theme" size="sm">
            <Sun className="size-4" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
`.trim(),

  'src/features/chat/ChatView.tsx': String.raw`
export default function ChatView() {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      Chat View
    </div>
  );
}
`.trim(),

  'src/features/workspace/FolderDetailView.tsx': String.raw`
export default function FolderDetailView({ folderId }: { folderId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      Folder: {folderId}
    </div>
  );
}
`.trim(),

  'src/features/editor/FileEditorView.tsx': String.raw`
export default function FileEditorView({ fileId }: { fileId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      File: {fileId}
    </div>
  );
}
`.trim(),

  'src/features/settings/SettingsView.tsx': String.raw`
export default function SettingsView() {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      Settings View
    </div>
  );
}
`.trim(),

  'src/features/workspace/FileTree.tsx': String.raw`
export default function FileTree() {
  return (
    <div className="p-2 text-gray-500 text-sm">
      File Tree
    </div>
  );
}
`.trim(),

  // Stubs to ensure directories are created
  'src/components/chat/.gitkeep': '',
  'src/components/folder/.gitkeep': '',
  'src/components/editor/.gitkeep': '',
  'src/components/settings/.gitkeep': '',
  'src/hooks/.gitkeep': '',

  // ── Sidebar tree components ──────────────────────────────────────────────

  'src/components/sidebar/FolderNode.tsx': String.raw`
import { useRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  ChevronRight,
  Folder as FolderIcon,
  Pencil,
  FolderPlus,
  Trash2,
  AlignLeft,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/app/components/ui/popover';
import { DeleteConfirmDialog } from '@/app/components/DeleteConfirmDialog';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/app/components/ui/utils';
import type { Folder, FolderId, DragItem, DropZone } from '@/types';

export interface FolderNodeProps {
  folder: Folder;
  depth?: number;
  onCreateSubfolder: (parentId: FolderId) => void;
}

const FOLDER_DND_TYPE = 'FOLDER';
const HOVER_EXPAND_DELAY_MS = 600;

export function FolderNode({ folder, depth = 0, onCreateSubfolder }: FolderNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isHovered, setIsHovered] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDescPopover, setShowDescPopover] = useState(false);
  const [descValue, setDescValue] = useState(folder.description);

  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFolder = useFileSystemStore((s) => s.updateFolder);
  const deleteFolder = useFileSystemStore((s) => s.deleteFolder);
  const moveFolder   = useFileSystemStore((s) => s.moveFolder);
  const fileCount    = useFileSystemStore(
    (s) => s.files.filter((f) => f.folderId === folder.id).length,
  );

  const isExpanded   = useUiStore((s) => s.expandedFolderIds.includes(folder.id as string));
  const isSelected   = useUiStore((s) => {
    const p = s.rightPanel;
    if (p.type !== 'folder') return false;
    return p.folderId === folder.id;
  });
  const toggleFolder  = useUiStore((s) => s.toggleFolder);
  const expandFolder  = useUiStore((s) => s.expandFolder);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const hasSubfolders = folder.subfolders.length > 0;
  const hasChildren   = hasSubfolders || fileCount > 0;

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: FOLDER_DND_TYPE,
    item: { type: 'FOLDER', id: folder.id, parentId: folder.parentId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: FOLDER_DND_TYPE,
    hover: (item, monitor) => {
      if (!ref.current || item.id === folder.id) {
        clearHoverTimeout();
        setDropZone(null);
        return;
      }
      const rect   = ref.current.getBoundingClientRect();
      const offset = monitor.getClientOffset();
      if (!offset) { setDropZone(null); return; }
      const relY   = offset.y - rect.top;
      const height = rect.height;
      let zone: DropZone;
      if (relY < height * 0.25) {
        zone = 'before';
        clearHoverTimeout();
      } else if (relY > height * 0.75) {
        zone = 'after';
        clearHoverTimeout();
      } else {
        zone = 'inside';
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            expandFolder(folder.id);
          }, HOVER_EXPAND_DELAY_MS);
        }
      }
      setDropZone(zone);
    },
    drop: (item) => {
      clearHoverTimeout();
      if (item.id !== folder.id) {
        moveFolder(item.id as FolderId, folder.id, dropZone);
        setDropZone(null);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  drag(drop(ref));

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (showDescPopover) setDescValue(folder.description);
  }, [showDescPopover, folder.description]);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      updateFolder(folder.id, { name: trimmed });
    } else {
      setEditName(folder.name);
    }
    setIsEditing(false);
  };

  const handleSaveDesc = () => {
    updateFolder(folder.id, { description: descValue });
    setShowDescPopover(false);
  };

  const handleRowClick = () => {
    if (!isEditing) setRightPanel({ type: 'folder', folderId: folder.id });
  };

  return (
    <div>
      <div className="relative">
        {isOver && dropZone === 'before' && (
          <div
            aria-hidden
            className="absolute top-0 left-3 right-3 h-0.5 bg-[#7c5cbf] rounded-full z-10 pointer-events-none"
          />
        )}

        <Popover open={showDescPopover} onOpenChange={setShowDescPopover}>
          <PopoverAnchor className="absolute inset-0 pointer-events-none" />
          <PopoverContent
            side="right"
            sideOffset={8}
            className="w-64 bg-[#1a1a2e] border border-white/10 text-gray-200 p-3 shadow-xl z-50"
          >
            <p className="text-xs text-gray-400 mb-2 font-medium">Описание папки</p>
            <textarea
              className="w-full bg-white/5 text-sm text-gray-200 border border-white/10 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#7c5cbf] focus:border-[#7c5cbf] placeholder:text-gray-600"
              rows={4}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowDescPopover(false); }}
              placeholder="Опишите, что хранится в этой папке..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="text-xs px-2 py-1 text-gray-400 hover:text-gray-200 rounded transition-colors"
                onClick={() => setShowDescPopover(false)}
              >
                Отмена
              </button>
              <button
                className="text-xs px-2 py-1 bg-[#7c5cbf] hover:bg-[#6b4daf] text-white rounded transition-colors"
                onClick={handleSaveDesc}
              >
                Сохранить
              </button>
            </div>
          </PopoverContent>

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                ref={ref}
                role="treeitem"
                aria-selected={isSelected}
                aria-expanded={hasChildren ? isExpanded : undefined}
                className={cn(
                  'flex items-center gap-1.5 py-[5px] pr-1.5 rounded-lg cursor-pointer transition-colors select-none',
                  isSelected && !isOver ? 'bg-[#7c5cbf]/15 text-gray-100' : 'text-gray-300 hover:bg-white/5',
                  isOver && dropZone === 'inside' ? 'bg-[#7c5cbf]/20 ring-1 ring-[#7c5cbf]/40' : '',
                  isDragging ? 'opacity-40' : '',
                )}
                style={{ paddingLeft: (depth * 16 + 12) + 'px' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                  setIsHovered(false);
                  clearHoverTimeout();
                  if (!isOver) setDropZone(null);
                }}
                onClick={handleRowClick}
                onDoubleClick={(e) => { e.preventDefault(); setIsEditing(true); }}
              >
                <button
                  aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                  tabIndex={-1}
                  className={cn(
                    'w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors',
                    !hasChildren && 'invisible',
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                >
                  <ChevronRight
                    size={13}
                    aria-hidden
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>

                {folder.iconEmoji ? (
                  <span aria-hidden className="text-sm select-none leading-none flex-shrink-0">
                    {folder.iconEmoji}
                  </span>
                ) : (
                  <FolderIcon size={14} aria-hidden className="flex-shrink-0 text-[#7c5cbf]" />
                )}

                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 min-w-0 bg-white/10 text-sm text-gray-100 rounded px-1.5 py-0.5 outline-none border border-[#7c5cbf]/50 focus:border-[#7c5cbf]"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveName(); }
                      if (e.key === 'Escape') { setEditName(folder.name); setIsEditing(false); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-sm truncate">{folder.name}</span>
                )}

                {fileCount > 0 && !isEditing && (
                  <span
                    aria-label={fileCount + ' файлов'}
                    className="flex-shrink-0 text-[10px] leading-none bg-[#7c5cbf]/20 text-[#7c5cbf] px-1.5 py-[3px] rounded-full"
                  >
                    {fileCount}
                  </span>
                )}

                {isHovered && !isDragging && !isEditing && (
                  <div className="flex-shrink-0 flex items-center gap-0.5">
                    <button
                      aria-label="Переименовать"
                      tabIndex={-1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setTimeout(() => setIsEditing(true), 0); }}
                    >
                      <Pencil size={11} aria-hidden />
                    </button>
                    <button
                      aria-label="Создать подпапку"
                      tabIndex={-1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-600 hover:text-gray-300 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onCreateSubfolder(folder.id); }}
                    >
                      <FolderPlus size={11} aria-hidden />
                    </button>
                    <button
                      aria-label="Удалить"
                      tabIndex={-1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-600 hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                    >
                      <Trash2 size={11} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="bg-[#1a1a2e] border border-white/10 text-gray-200 min-w-[182px] p-1 shadow-xl">
              <ContextMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-white/8 focus:bg-white/8 outline-none"
                onSelect={() => onCreateSubfolder(folder.id)}
              >
                <FolderPlus size={13} aria-hidden className="text-gray-400" />
                Создать подпапку
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-white/8 focus:bg-white/8 outline-none"
                onSelect={() => setTimeout(() => setIsEditing(true), 30)}
              >
                <Pencil size={13} aria-hidden className="text-gray-400" />
                Переименовать
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-white/10 my-1 -mx-1" />
              <ContextMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-white/8 focus:bg-white/8 outline-none"
                onSelect={() => setTimeout(() => setShowDescPopover(true), 30)}
              >
                <AlignLeft size={13} aria-hidden className="text-gray-400" />
                Изменить описание
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-white/10 my-1 -mx-1" />
              <ContextMenuItem
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-red-500/15 focus:bg-red-500/15 text-red-400 outline-none"
                onSelect={() => setShowDeleteDialog(true)}
              >
                <Trash2 size={13} aria-hidden />
                Удалить
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </Popover>

        {isOver && dropZone === 'after' && (
          <div
            aria-hidden
            className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#7c5cbf] rounded-full z-10 pointer-events-none"
          />
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        title="Удалить папку?"
        description={'Папка «' + folder.name + '» и всё её содержимое будут удалены безвозвратно.'}
        onConfirm={() => { deleteFolder(folder.id); setShowDeleteDialog(false); }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
`.trim(),

  'src/components/sidebar/FileNode.tsx': String.raw`
import { useRef, useState, useEffect } from 'react';
import { FileText, Image, File } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import { DeleteConfirmDialog } from '@/app/components/DeleteConfirmDialog';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/app/components/ui/utils';
import type { FileItem, FileType } from '@/types';

export interface FileNodeProps {
  file: FileItem;
  depth?: number;
}

function FileTypeIcon({ type }: { type: FileType }) {
  switch (type) {
    case 'markdown':
      return <FileText size={13} aria-hidden className="text-blue-400 flex-shrink-0" />;
    case 'text':
      return <FileText size={13} aria-hidden className="text-gray-400 flex-shrink-0" />;
    case 'image':
      return <Image size={13} aria-hidden className="text-green-400 flex-shrink-0" />;
    default:
      return <File size={13} aria-hidden className="text-gray-500 flex-shrink-0" />;
  }
}

export function FileNode({ file, depth = 0 }: FileNodeProps) {
  const [isEditing, setIsEditing]         = useState(false);
  const [editName, setEditName]           = useState(file.name);
  const [showDeleteDialog, setShowDelete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const updateFile = useFileSystemStore((s) => s.updateFile);
  const deleteFile = useFileSystemStore((s) => s.deleteFile);

  const isSelected = useUiStore((s) => {
    const p = s.rightPanel;
    if (p.type !== 'file') return false;
    return p.fileId === file.id;
  });
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== file.name) {
      updateFile(file.id, { name: trimmed });
    } else {
      setEditName(file.name);
    }
    setIsEditing(false);
  };

  const handleOpen = () => setRightPanel({ type: 'file', fileId: file.id });

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="treeitem"
            aria-selected={isSelected}
            className={cn(
              'flex items-center gap-2 py-[5px] pr-1.5 rounded-lg cursor-pointer transition-colors select-none',
              isSelected
                ? 'bg-[#7c5cbf]/10 text-gray-100'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
            )}
            style={{ paddingLeft: (depth * 16 + 12) + 'px' }}
            onClick={() => { if (!isEditing) handleOpen(); }}
            onDoubleClick={(e) => { e.preventDefault(); setIsEditing(true); }}
          >
            <span className="w-4 flex-shrink-0" aria-hidden />

            <FileTypeIcon type={file.type} />

            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className="flex-1 min-w-0 bg-white/10 text-sm text-gray-100 rounded px-1.5 py-0.5 outline-none border border-[#7c5cbf]/50 focus:border-[#7c5cbf]"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleSaveName(); }
                  if (e.key === 'Escape') { setEditName(file.name); setIsEditing(false); }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 min-w-0 text-sm truncate">{file.name}</span>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="bg-[#1a1a2e] border border-white/10 text-gray-200 min-w-[160px] p-1 shadow-xl">
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-white/8 focus:bg-white/8 outline-none"
            onSelect={handleOpen}
          >
            Открыть
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-white/8 focus:bg-white/8 outline-none"
            onSelect={() => setTimeout(() => setIsEditing(true), 30)}
          >
            Переименовать
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10 my-1 -mx-1" />
          <ContextMenuItem
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-red-500/15 focus:bg-red-500/15 text-red-400 outline-none"
            onSelect={() => setShowDelete(true)}
          >
            Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        title="Удалить файл?"
        description={'Файл «' + file.name + '» будет удалён безвозвратно.'}
        onConfirm={() => { deleteFile(file.id); setShowDelete(false); }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
`.trim(),

  'src/components/sidebar/FileTree.tsx': String.raw`
import { useCallback } from 'react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { useUiStore } from '@/stores/uiStore';
import { generateFolderId } from '@/utils/fileHelpers';
import type { Folder, FolderId } from '@/types';
import { FolderNode } from './FolderNode';
import { FileNode } from './FileNode';

interface FolderSubtreeProps {
  folder: Folder;
  depth: number;
  onCreateSubfolder: (parentId: FolderId) => void;
}

function FolderSubtree({ folder, depth, onCreateSubfolder }: FolderSubtreeProps) {
  const isExpanded  = useUiStore((s) => s.expandedFolderIds.includes(folder.id as string));
  const folderFiles = useFileSystemStore(
    (s) => s.files
      .filter((f) => f.folderId === folder.id)
      .slice()
      .sort((a, b) => a.order - b.order),
  );
  const subfolders = folder.subfolders.slice().sort((a, b) => a.order - b.order);

  return (
    <>
      <FolderNode folder={folder} depth={depth} onCreateSubfolder={onCreateSubfolder} />
      {isExpanded && (
        <div role="group">
          {folderFiles.map((file) => (
            <FileNode key={file.id} file={file} depth={depth + 1} />
          ))}
          {subfolders.map((sub) => (
            <FolderSubtree
              key={sub.id}
              folder={sub}
              depth={depth + 1}
              onCreateSubfolder={onCreateSubfolder}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function FileTree() {
  const folders      = useFileSystemStore((s) => s.folders);
  const addFolder    = useFileSystemStore((s) => s.addFolder);
  const expandFolder = useUiStore((s) => s.expandFolder);

  const handleCreateSubfolder = useCallback((parentId: FolderId) => {
    const now = new Date().toISOString();
    const newFolder: Folder = {
      id: generateFolderId(),
      name: 'Новая папка',
      description: '',
      parentId,
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    };
    addFolder(newFolder);
    expandFolder(parentId);
  }, [addFolder, expandFolder]);

  const rootFolders = folders.slice().sort((a, b) => a.order - b.order);

  return (
    <div role="tree" aria-label="Файловое дерево">
      {rootFolders.map((folder) => (
        <FolderSubtree
          key={folder.id}
          folder={folder}
          depth={0}
          onCreateSubfolder={handleCreateSubfolder}
        />
      ))}
    </div>
  );
}
`.trim(),

  'src/components/sidebar/NewFolderButton.tsx': String.raw`
import { FolderPlus } from 'lucide-react';
import { useFileSystemStore } from '@/stores/fileSystemStore';
import { generateFolderId } from '@/utils/fileHelpers';
import type { Folder } from '@/types';

export function NewFolderButton() {
  const addFolder = useFileSystemStore((s) => s.addFolder);

  const handleClick = () => {
    const now = new Date().toISOString();
    const newFolder: Folder = {
      id: generateFolderId(),
      name: 'Новая папка',
      description: '',
      parentId: null,
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    };
    addFolder(newFolder);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors border-t border-white/8"
    >
      <FolderPlus size={15} aria-hidden />
      <span>Новая папка</span>
    </button>
  );
}
`.trim(),
}

function ensureScaffold(): import('vite').Plugin {
  return {
    name: 'ensure-scaffold',
    buildStart() {
      for (const [rel, content] of Object.entries(SCAFFOLD)) {
        const full = path.resolve(__dirname, rel)
        fs.mkdirSync(path.dirname(full), { recursive: true })
        if (!fs.existsSync(full)) {
          fs.writeFileSync(full, content, 'utf-8')
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    ensureScaffold(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
