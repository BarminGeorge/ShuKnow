/**
 * API Types matching backend DTOs from openapi.yaml
 */

// ── Folders ───────────────────────────────────

export interface FolderTreeNodeDto {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  fileCount: number;
  children: FolderTreeNodeDto[];
}

export interface FolderDto {
  id: string;
  name: string;
  description?: string;
  parentFolderId: string | null;
  sortOrder: number;
  fileCount: number;
  hasChildren: boolean;
  path?: string[];
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  parentFolderId?: string | null;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
}

export interface MoveFolderRequest {
  newParentFolderId: string | null;
}

export interface ReorderFolderRequest {
  position: number;
}

// ── Files ─────────────────────────────────────

export interface FileDto {
  id: string;
  folderId: string;
  folderName: string;
  name: string;
  description?: string;
  contentType: string;
  sizeBytes: number;
  version: number;
  checksumSha256?: string | null;
}

export interface UpdateFileRequest {
  name?: string;
  description?: string;
}

export interface MoveFileRequest {
  targetFolderId: string;
}

export interface PagedFileResult {
  items: FileDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ── Mapped types for frontend use ─────────────

/**
 * Frontend Folder type (recursive tree structure)
 * Maps from FolderTreeNodeDto
 */
export interface Folder {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  fileCount: number;
  subfolders: Folder[];
}

/**
 * Frontend FileItem type
 * Maps from FileDto with content loaded separately
 */
export interface FileItem {
  id: string;
  name: string;
  folderId: string;
  description?: string;
  contentType: string;
  sizeBytes: number;
  // Content is loaded separately via /api/files/{fileId}/content
  content?: string;
  // For image files, we can generate a URL
  contentUrl?: string;
}

/**
 * Maps backend content types to UI file types
 */
export function getFileUiType(contentType: string): "text" | "photo" | "pdf" | "other" {
  if (contentType.startsWith("text/") || contentType === "application/json") {
    return "text";
  }
  if (contentType.startsWith("image/")) {
    return "photo";
  }
  if (contentType === "application/pdf") {
    return "pdf";
  }
  return "other";
}

/**
 * Maps FolderTreeNodeDto to frontend Folder type
 */
export function mapFolderTreeNode(node: FolderTreeNodeDto): Folder {
  return {
    id: node.id,
    name: node.name,
    description: node.description,
    sortOrder: node.sortOrder,
    fileCount: node.fileCount,
    subfolders: node.children.map(mapFolderTreeNode),
  };
}

/**
 * Maps FileDto to frontend FileItem type
 */
export function mapFileDto(dto: FileDto): FileItem {
  return {
    id: dto.id,
    name: dto.name,
    folderId: dto.folderId,
    description: dto.description,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    contentUrl: `/api/files/${dto.id}/content`,
  };
}

// ── AI Settings ───────────────────────────────

/**
 * Supported AI providers
 * Frontend is ready for backend to add provider enum
 */
export type AiProvider = "openai" | "openrouter" | "anthropic" | "custom";

export interface AiSettingsDto {
  baseUrl: string;
  apiKeyMasked: string;
  isConfigured: boolean;
  // Optional fields - ready for when backend adds them
  provider?: AiProvider;
  modelId?: string;
}

export interface UpdateAiSettingsRequest {
  baseUrl: string;
  apiKey: string;
  // Optional fields - ready for when backend adds them
  provider?: AiProvider;
  modelId?: string;
}

export interface AiConnectionTestDto {
  success: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
}
