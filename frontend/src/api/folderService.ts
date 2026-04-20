import { apiRequest } from "./client";
import {
  FolderTreeNodeDto,
  FolderDto,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
  ReorderFolderRequest,
  Folder,
  mapFolderTreeNodeToFolder,
} from "./types";

export async function fetchFolderTree(): Promise<Folder[]> {
  const nodes = await apiRequest<FolderTreeNodeDto[]>("/api/folders/tree");
  return nodes.map(mapFolderTreeNodeToFolder);
}

export async function fetchFolders(parentId?: string | null): Promise<FolderDto[]> {
  const params = new URLSearchParams();
  if (parentId) {
    params.set("parentId", parentId);
  }
  const query = params.toString();
  return apiRequest<FolderDto[]>(`/api/folders${query ? `?${query}` : ""}`);
}

export async function fetchFolderById(folderId: string): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}`);
}

export async function createFolder(request: CreateFolderRequest): Promise<FolderDto> {
  return apiRequest<FolderDto>("/api/folders", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updateFolder(
  folderId: string,
  request: UpdateFolderRequest
): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function deleteFolder(
  folderId: string,
  _shouldDeleteRecursively: boolean = false
): Promise<void> {
  return apiRequest<void>(`/api/folders/${folderId}`, {
    method: "DELETE",
  });
}

export async function moveFolder(
  folderId: string,
  request: MoveFolderRequest
): Promise<FolderDto> {
  return apiRequest<FolderDto>(`/api/folders/${folderId}/move`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export async function reorderFolder(
  folderId: string,
  request: ReorderFolderRequest
): Promise<void> {
  return apiRequest<void>(`/api/folders/${folderId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}

export async function fetchFolderChildren(folderId: string): Promise<FolderDto[]> {
  return apiRequest<FolderDto[]>(`/api/folders/${folderId}/children`);
}
