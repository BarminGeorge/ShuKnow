import { apiRequest } from "./client";

export type ChatSessionStatus = "Active" | "Closed";

export interface ChatSessionDto {
  id: string;
  status: ChatSessionStatus;
  messageCount: number;
  canRollback: boolean;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ChatMessageDto {
  id: string;
  role: "User" | "Ai" | "System";
  content: string;
  createdAt: string;
  attachments?: AttachmentDto[] | null;
}

export interface CursorPagedChatMessageResult {
  items: ChatMessageDto[];
  nextCursor?: string | null;
  hasMore: boolean;
}

export async function createChatSession(): Promise<ChatSessionDto> {
  return apiRequest<ChatSessionDto>("/api/chat/session", { method: "POST" });
}

export async function fetchChatSession(sessionId: string): Promise<ChatSessionDto> {
  return apiRequest<ChatSessionDto>(`/api/chat/session/${sessionId}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`/api/chat/session/${sessionId}`, { method: "DELETE" });
}

export async function fetchChatMessages(
  sessionId: string,
  cursor?: string,
  limit: number = 50
): Promise<CursorPagedChatMessageResult> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", limit.toString());
  
  const query = params.toString();
  return apiRequest<CursorPagedChatMessageResult>(
    `/api/chat/session/${sessionId}/messages${query ? `?${query}` : ""}`
  );
}

export async function uploadChatAttachments(files: File[]): Promise<AttachmentDto[]> {
  const formData = new FormData();
  
  for (const file of files) {
    formData.append("files", file);
  }
  
  const response = await fetch("/api/chat/attachments", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload attachments: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

export type AttachmentUploadStatus = "pending" | "uploading" | "uploaded" | "error";

export interface StagedAttachment {
  localId: string;
  serverId?: string;
  fileName: string;
  file: File;
  previewUrl?: string;
  contentType: string;
  sizeBytes: number;
  status: AttachmentUploadStatus;
  errorMessage?: string;
}

export function createStagedAttachment(file: File): StagedAttachment {
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

export function cleanupAttachmentPreviews(attachments: StagedAttachment[]): void {
  for (const attachment of attachments) {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }
}
