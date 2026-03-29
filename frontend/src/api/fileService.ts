/**
 * File API service
 */

import { apiRequest, getAuthToken } from "./client";
import {
  FileDto,
  PagedFileResult,
  UpdateFileRequest,
  MoveFileRequest,
  FileItem,
  mapFileDto,
} from "./types";

/**
 * List files in a folder (paginated)
 */
export async function listFolderFiles(
  folderId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<PagedFileResult> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return apiRequest<PagedFileResult>(`/api/folders/${folderId}/files?${params}`);
}

/**
 * List files and map to frontend FileItem type
 */
export async function listFolderFilesAsMapped(
  folderId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ items: FileItem[]; totalCount: number; page: number; pageSize: number; hasNextPage: boolean }> {
  const result = await listFolderFiles(folderId, page, pageSize);
  return {
    ...result,
    items: result.items.map(mapFileDto),
  };
}

/**
 * Get file metadata
 */
export async function getFile(fileId: string): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}`);
}

/**
 * Upload a file to a folder
 */
export async function uploadFile(
  folderId: string,
  file: File,
  name?: string,
  description?: string
): Promise<FileDto> {
  const formData = new FormData();
  formData.append("file", file);
  if (name) {
    formData.append("name", name);
  }
  if (description) {
    formData.append("description", description);
  }

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/folders/${folderId}/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update file metadata (name, description)
 */
export async function updateFile(
  fileId: string,
  request: UpdateFileRequest
): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  return apiRequest<void>(`/api/files/${fileId}`, {
    method: "DELETE",
  });
}

/**
 * Move a file to a different folder
 */
export async function moveFile(
  fileId: string,
  request: MoveFileRequest
): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}/move`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

/**
 * Get file content URL (for images, PDFs, etc.)
 */
export function getFileContentUrl(fileId: string): string {
  return `/api/files/${fileId}/content`;
}

/**
 * Fetch file content as text (for markdown/text files)
 */
export async function getFileContentAsText(fileId: string): Promise<string> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/files/${fileId}/content`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status}`);
  }
  return response.text();
}

/**
 * Update file content (for text files)
 * Converts text to a Blob and uploads as multipart/form-data
 */
export async function updateFileContent(
  fileId: string,
  content: string,
  contentType: string = "text/plain",
  fileName?: string
): Promise<FileDto> {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Convert text content to a Blob and wrap in FormData
  // Backend expects IFormFile via multipart/form-data
  const blob = new Blob([content], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, fileName || "content.txt");

  const response = await fetch(`/api/files/${fileId}/content`, {
    method: "PUT",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to update content: ${response.status}`);
  }

  return response.json();
}
