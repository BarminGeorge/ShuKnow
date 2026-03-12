// ── Branded ID types ─────────────────────────────────────────────────────────
export type FolderId  = string & { __brand: 'FolderId' };
export type FileId    = string & { __brand: 'FileId' };
export type MsgId     = string & { __brand: 'MsgId' };
export type SessionId = string & { __brand: 'SessionId' };

// ── File system ───────────────────────────────────────────────────────────────
export interface Folder {
  id: FolderId;
  name: string;
  description: string;   // AI prompt — what belongs in this folder
  parentId: FolderId | null;
  iconEmoji?: string;    // e.g. "📁"
  iconImage?: string;    // base64 or blob URL for uploaded image
  order: number;
  subfolders: Folder[];  // nested tree
  createdAt: string;     // ISO string
  updatedAt: string;
}

export type FileType = 'markdown' | 'text' | 'image' | 'other';

export interface FileItem {
  id: FileId;
  name: string;
  description: string;   // AI prompt for this specific file
  folderId: FolderId;
  content: string;
  type: FileType;
  mimeType: string;
  size: number;
  imageUrl?: string;     // blob URL for image files
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileSnapshot {
  id: string;
  fileId: FileId;
  content: string;
  messageId: MsgId;
  createdAt: string;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export type AttachmentType = 'image' | 'document' | 'other';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  type: AttachmentType;
}

export type FileChangeAction = 'created' | 'updated' | 'deleted';

export interface FileChange {
  fileId: FileId;
  fileName: string;
  folderPath: string;
  action: FileChangeAction;
  previousSnapshotId?: string;
}

export interface ChatMessage {
  id: MsgId;
  role: 'user' | 'assistant';
  content: string;
  attachments: Attachment[];
  context?: string;
  fileChanges?: FileChange[];
  undone: boolean;
  sessionId: SessionId;
  createdAt: string;
}

// ── UI ────────────────────────────────────────────────────────────────────────
export type RightPanelView =
  | { type: 'chat' }
  | { type: 'folder'; folderId: FolderId }
  | { type: 'file';   fileId: FileId }
  | { type: 'settings' };

export type EditorMode = 'edit' | 'preview' | 'split';

export type SortField = 'name' | 'date' | 'type';
export type SortDir   = 'asc' | 'desc';

// ── Drag-and-drop ─────────────────────────────────────────────────────────────
export type DropZone = 'before' | 'after' | 'inside' | null;

export interface DragItem {
  type: 'FOLDER' | 'FILE';
  id: string;
  parentId: FolderId | null;
}
