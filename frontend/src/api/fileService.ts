import { ApiError, apiRequest } from "./client";
import {
  FileDto,
  PagedFileResult,
  UpdateFileRequest,
  MoveFileRequest,
  ReorderFileRequest,
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

  const response = await fetch(`/api/folders/${folderId}/files`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function appendConflictSuffix(fileName: string, attempt: number): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0 && lastDotIndex < fileName.length - 1;

  if (!hasExtension) {
    return `${fileName} (${attempt})`;
  }

  const baseName = fileName.slice(0, lastDotIndex);
  const extension = fileName.slice(lastDotIndex);
  return `${baseName} (${attempt})${extension}`;
}

function isConflictError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 409;
  }

  if (error instanceof Error) {
    return error.message.includes("409");
  }

  return false;
}

export async function uploadFileWithConflictRename(
  folderId: string,
  file: File,
  preferredName: string,
  description?: string,
  maxRenameAttempts: number = 20
): Promise<FileDto> {
  let attempt = 0;
  let fileName = preferredName;

  while (attempt <= maxRenameAttempts) {
    try {
      return await uploadFile(folderId, file, fileName, description);
    } catch (error) {
      if (!isConflictError(error) || attempt === maxRenameAttempts) {
        throw error;
      }

      attempt += 1;
      fileName = appendConflictSuffix(preferredName, attempt);
    }
  }

  throw new Error("Unable to upload file: exhausted rename attempts.");
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

export async function reorderFile(
  fileId: string,
  request: ReorderFileRequest
): Promise<void> {
  return apiRequest<void>(`/api/files/${fileId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export function buildFileContentUrl(fileId: string): string {
  return `/api/files/${fileId}/content`;
}

export async function fetchFileContentAsText(fileId: string): Promise<string> {
  const response = await fetch(`/api/files/${fileId}/content`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status}`);
  }
  return response.text();
}

export async function fetchFileContentAsBlobUrl(fileId: string): Promise<string> {
  return fetchFileContentAsBlobUrlWithType(fileId);
}

export async function fetchFileContentAsBlobUrlWithType(
  fileId: string,
  forcedContentType?: string
): Promise<string> {
  const response = await fetch(`/api/files/${fileId}/content`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status}`);
  }

  const responseBlob = await response.blob();
  const blob = forcedContentType && responseBlob.type !== forcedContentType
    ? new Blob([responseBlob], { type: forcedContentType })
    : responseBlob;
  return URL.createObjectURL(blob);
}

export async function updateFileContent(
  fileId: string,
  content: string,
  contentType: string = "text/plain",
  fileName?: string
): Promise<FileDto> {
  const blob = new Blob([content], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, fileName || "content.txt");

  const response = await fetch(`/api/files/${fileId}/content`, {
    method: "PUT",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to update content: ${response.status}`);
  }

  return response.json();
}

/**
 * Lightweight PATCH for text content updates (autosave).
 * Uses JSON body instead of multipart/form-data.
 */
export async function patchFileContent(
  fileId: string,
  content: string
): Promise<FileDto> {
  return apiRequest<FileDto>(`/api/files/${fileId}/content`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}
