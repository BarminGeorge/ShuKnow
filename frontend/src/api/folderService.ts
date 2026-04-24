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
  shouldDeleteRecursively: boolean = false
): Promise<void> {
  const params = new URLSearchParams();
  if (shouldDeleteRecursively) {
    params.set("recursive", "true");
  }
  const query = params.toString();

  return apiRequest<void>(`/api/folders/${folderId}${query ? `?${query}` : ""}`, {
    method: "DELETE",
  });
}

export async function deleteFolderSubtree(folder: Pick<Folder, "id" | "subfolders">): Promise<void> {
  for (const subfolder of folder.subfolders || []) {
    await deleteFolderSubtree(subfolder);
  }

  await deleteFolder(folder.id, true);
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
