import type { Folder, FileItem } from "../../../api/types";

export type GridItemType = "folder" | "file";

export interface GridItem {
  id: string;
  type: GridItemType;
  data: Folder | FileItem;
  order: number;
}

export interface FolderContentViewProps {
  onBack: () => void;
  onNavigateToSubfolder: (subfolder: Folder, subfolderIndex: number) => void;
  onBreadcrumbClick: (index: number) => void;
}

// 放置意图类型：重新排序 vs 嵌套到文件夹内
export type DropIntent = "reorder" | "nest" | null;

export interface DraggableGridItemProps {
  item: GridItem;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onFileContextMenu: (fileId: string, event: React.MouseEvent) => void;
  onFolderContextMenu: (folderId: string, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder) => void;
  onFileDoubleClick: (fileId: string) => void;
  onMoveItemToFolder: (itemId: string, destFolderId: string, itemType: GridItemType) => void;
  editingFileId: string | null;
  onFileNameChange: (fileId: string, newName: string) => void;
  onEditingComplete: () => void;
  // 新增：父文件夹的子文件夹ID列表，用于验证
  currentFolderSubfolderIds?: string[];
  // All files for counting folder stats
  allFiles: FileItem[];
  // Context menu state for hiding the button
  openContextMenuId: string | null;
}
