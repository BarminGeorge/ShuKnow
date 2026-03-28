/**
 * Folder API service
 */

import { apiRequest } from "./client";
import {
  FolderTreeNodeDto,
  FolderDto,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
  ReorderFolderRequest,
  Folder,
  mapFolderTreeNode,
} from "./types";

/**
 * Get the full folder tree for rendering the sidebar
 */
export async function getFolderTree(): Promise<Folder[]> {
  const nodes = await apiRequest<FolderTreeNodeDto[]>("/api/folders/tree");
  return nodes.map(mapFolderTreeNode);
}

/**
 * List folders at a given level (flat list)
 */
export async function listFolders(parentId?: string | null): Promise<FolderDto[]> {
  const params = new URLSearchParams();
  if (parentId) {
    params.set("parentId", parentId);
  }
  const query = params.toString();
  return apiRequest<FolderDto[]>(`/api/folders${query ? `?${query}` : ""}`);
}

/**
 * Get a single folder by ID (includes breadcrumb path)
 */
export async function getFolder(folderId: string): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}`);
}

/**
 * Create a new folder
 */
export async function createFolder(request: CreateFolderRequest): Promise<FolderDto> {
  return apiRequest<FolderDto>("/api/folders", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Update folder name and/or description
 */
export async function updateFolder(
  folderId: string,
  request: UpdateFolderRequest
): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Delete a folder
 */
export async function deleteFolder(
  folderId: string,
  recursive: boolean = false
): Promise<void> {
  const params = new URLSearchParams();
  if (recursive) {
    params.set("recursive", "true");
  }
  const query = params.toString();
  return apiRequest<void>(`/api/folders/${folderId}${query ? `?${query}` : ""}`, {
    method: "DELETE",
  });
}

/**
 * Move a folder to a new parent
 */
export async function moveFolder(
  folderId: string,
  request: MoveFolderRequest
): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}/move`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

/**
 * Reorder a folder among its siblings
 */
export async function reorderFolder(
  folderId: string,
  request: ReorderFolderRequest
): Promise<void> {
  return apiRequest<void>(`/api/folders/${folderId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

/**
 * Get direct child folders
 */
export async function getFolderChildren(folderId: string): Promise<FolderDto[]> {
  return apiRequest<FolderDto[]>(`/api/folders/${folderId}/children`);
}
