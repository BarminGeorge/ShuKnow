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

export interface Folder {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  fileCount: number;
  subfolders: Folder[];
}

export interface FileItem {
  id: string;
  name: string;
  folderId: string;
  description?: string;
  contentType: string;
  sizeBytes: number;
  content?: string;
  contentUrl?: string;
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
    sortOrder: node.sortOrder,
    fileCount: node.fileCount,
    subfolders: node.children.map(mapFolderTreeNodeToFolder),
  };
}

export function mapFileDtoToFileItem(dto: FileDto): FileItem {
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

export type AiProvider = "openai" | "openrouter" | "anthropic" | "custom";

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
  isSuccess: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
}
