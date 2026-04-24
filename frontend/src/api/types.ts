export interface FolderTreeNodeDto {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  sortOrder: number;
  fileCount?: number;
  children: FolderTreeNodeDto[];
}

export interface FolderDto {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  parentFolderId: string | null;
  sortOrder: number;
  fileCount?: number;
  hasChildren?: boolean;
  path?: string[];
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  emoji?: string;
  parentFolderId?: string | null;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  emoji?: string;
}

export interface MoveFolderRequest {
  newParentFolderId: string | null;
}

export interface ReorderFolderRequest {
  position: number;
}

export interface FileDto {
  id: string;
  folderId: string | null;
  folderName: string | null;
  name: string;
  description: string;
  contentType: string;
  sizeBytes: number;
  version: number;
  checksumSha256?: string | null;
  createdAt: string;
  sortOrder: number;
}

export interface UpdateFileRequest {
  name?: string;
  description?: string;
}

export interface MoveFileRequest {
  targetFolderId: string | null;
}

export interface ReorderFileRequest {
  position: number;
}

export interface PagedFileResult {
  items: FileDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  fileCount: number;
  subfolders: Folder[];
  // UI-специфичные поля (опциональные):
  emoji?: string;
  prompt?: string;
  customOrder?: string[];
}

export interface FileItem {
  id: string;
  name: string;
  folderId: string;
  description?: string;
  prompt?: string;
  contentType: string;
  sizeBytes: number;
  content?: string;
  contentUrl?: string;
  // UI-специфичные поля:
  type?: "text" | "photo" | "pdf" | "other";
  createdAt?: string;
  sortOrder?: number;
}

export type FileDisplayType = "text" | "photo" | "pdf" | "other";

export function getFileDisplayType(contentType: string): FileDisplayType {
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

export function mapFolderTreeNodeToFolder(node: FolderTreeNodeDto): Folder {
  return {
    id: node.id,
    name: node.name,
    description: node.description,
    prompt: node.description,
    emoji: node.emoji,
    sortOrder: node.sortOrder,
    fileCount: node.fileCount ?? 0,
    subfolders: node.children.map(mapFolderTreeNodeToFolder),
  };
}

export function mapFileDtoToFileItem(dto: FileDto): FileItem {
  return {
    id: dto.id,
    name: dto.name,
    folderId: dto.folderId ?? "",
    description: dto.description,
    prompt: dto.description,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    contentUrl: `/api/files/${dto.id}/content`,
    createdAt: dto.createdAt,
    sortOrder: dto.sortOrder,
  };
}

export type AiProvider = "unknown" | "openai" | "openrouter" | "gemini" | "anthropic";

export interface AiSettingsDto {
  baseUrl: string;
  apiKeyMasked: string;
  isConfigured: boolean;
  provider?: AiProvider;
  modelId?: string;
}

export interface UpdateAiSettingsRequest {
  baseUrl: string;
  apiKey: string;
  provider?: AiProvider;
  modelId?: string;
}

export interface AiConnectionTestResult {
  success: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
}
