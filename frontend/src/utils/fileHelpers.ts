import type { AttachmentType, FileType, MsgId, SessionId, FolderId, FileId } from '@/types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateMsgId(): MsgId {
  return generateId() as MsgId;
}

export function generateFolderId(): FolderId {
  return generateId() as FolderId;
}

export function generateFileId(): FileId {
  return generateId() as FileId;
}

export function getDefaultSessionId(): SessionId {
  return 'default-session' as SessionId;
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getFileType(name: string, mimeType: string): FileType {
  if (isImageMimeType(mimeType)) return 'image';
  const ext = getFileExtension(name);
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'txt' || mimeType === 'text/plain') return 'text';
  return 'other';
}

export function inferMimeType(name: string): string {
  const ext = getFileExtension(name);
  const map: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function getAttachmentType(mimeType: string): AttachmentType {
  if (isImageMimeType(mimeType)) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/x-markdown' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'document';
  return 'other';
}
