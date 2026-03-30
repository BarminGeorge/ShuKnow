import { apiRequest, getAuthToken } from "./client";
import {
  FileDto,
  PagedFileResult,
  UpdateFileRequest,
  MoveFileRequest,
  FileItem,
  mapFileDtoToFileItem,
} from "./types";

export async function fetchFolderFiles(
  folderId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<PagedFileResult> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return apiRequest<PagedFileResult>(`/api/folders/${folderId}/files?${params}`);
}

export interface MappedFileResult {
  items: FileItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export async function fetchFolderFilesAsMapped(
  folderId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<MappedFileResult> {
  const result = await fetchFolderFiles(folderId, page, pageSize);
  return {
    ...result,
    items: result.items.map(mapFileDtoToFileItem),
  };
}

export async function fetchFileById(fileId: string): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}`);
}

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

export async function updateFile(
  fileId: string,
  request: UpdateFileRequest
): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteFile(fileId: string): Promise<void> {
  return apiRequest<void>(`/api/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function moveFile(
  fileId: string,
  request: MoveFileRequest
): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}/move`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function buildFileContentUrl(fileId: string): string {
  return `/api/files/${fileId}/content`;
}

export async function fetchFileContentAsText(fileId: string): Promise<string> {
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
