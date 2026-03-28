/**
 * Chat API service
 * Handles chat session management and attachment staging
 */

import { apiRequest, getAuthToken } from "./client";

// ── Types ─────────────────────────────────────

export interface ChatSessionDto {
  id: string;
  createdAt: string;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ChatMessageDto {
  id: string;
  role: "User" | "Ai";
  content: string;
  attachments?: AttachmentDto[] | null;
}

export interface CursorPagedChatMessageResult {
  items: ChatMessageDto[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ── Session Management ────────────────────────

/**
 * Get or create the active chat session
 */
export async function getChatSession(): Promise<ChatSessionDto> {
  return apiRequest<ChatSessionDto>("/api/chat/session");
}

/**
 * Delete/close the current chat session
 */
export async function deleteChatSession(): Promise<void> {
  return apiRequest<void>("/api/chat/session", { method: "DELETE" });
}

/**
 * Get chat messages with cursor-based pagination
 */
export async function getChatMessages(
  cursor?: string,
  limit: number = 50
): Promise<CursorPagedChatMessageResult> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", limit.toString());
  
  const query = params.toString();
  return apiRequest<CursorPagedChatMessageResult>(
    `/api/chat/session/messages${query ? `?${query}` : ""}`
  );
}

// ── Attachment Staging ────────────────────────

/**
 * Upload attachments for a chat message.
 * Returns temporary attachment IDs that should be passed to SendMessage via SignalR.
 * 
 * Attachments are uploaded via REST because SignalR has a 32KB message size limit.
 * Unreferenced attachments are purged after 1 hour.
 */
export async function uploadChatAttachments(files: File[]): Promise<AttachmentDto[]> {
  const formData = new FormData();
  
  for (const file of files) {
    formData.append("files", file);
  }
  
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch("/api/chat/attachments", {
    method: "POST",
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload attachments: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

// ── Frontend Attachment type (for UI) ─────────

/**
 * Frontend attachment with both local file and server metadata
 */
export interface StagedAttachment {
  /** Local ID for React key */
  localId: string;
  /** Server-assigned ID after upload (used for SendMessage) */
  serverId?: string;
  /** Original file name */
  fileName: string;
  /** Local File object */
  file: File;
  /** Blob URL for preview */
  previewUrl?: string;
  /** Content type */
  contentType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Upload status */
  status: "pending" | "uploading" | "uploaded" | "error";
  /** Error message if upload failed */
  error?: string;
}

/**
 * Creates a local attachment object from a File
 */
export function createLocalAttachment(file: File): StagedAttachment {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    fileName: file.name,
    file,
    previewUrl: URL.createObjectURL(file),
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    status: "pending",
  };
}

/**
 * Cleans up blob URLs from attachments
 */
export function cleanupAttachmentPreviews(attachments: StagedAttachment[]): void {
  for (const attachment of attachments) {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }
}
