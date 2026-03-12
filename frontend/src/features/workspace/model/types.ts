export interface Folder {
  id: string;
  name: string;
  emoji?: string;
  prompt?: string;
  subfolders?: Folder[];
  customOrder?: string[];
}

export type FileType = "text" | "photo";

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  folderId: string;
  content?: string;
  imageUrl?: string;
  prompt?: string;
  createdAt: string;
}

export type ViewMode = "chat" | "folder" | "editor";

export type FolderPath = string[];

export type DropZone = "before" | "after" | "inside";
