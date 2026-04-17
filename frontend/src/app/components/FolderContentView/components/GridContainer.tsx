import { Upload, FolderIcon, Plus } from "lucide-react";
import { useDrop } from "react-dnd";
import type { GridItem } from "../types";
import type { Folder, FileItem } from "../../../../api/types";
import { DraggableGridItem } from "./DraggableGridItem";
import { CustomDragLayer } from "./CustomDragLayer";
import { GRID_ITEM_TYPE } from "../constants";

interface GridContainerProps {
  gridRef: React.RefObject<HTMLDivElement>;
  gridItems: GridItem[];
  isFileOver: boolean;
  emoji: string;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onFileContextMenu: (fileId: string, event: React.MouseEvent) => void;
  onFolderContextMenu: (folderId: string, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onMoveItemToFolder: (itemId: string, destFolderId: string, itemType: "file" | "folder") => void;
  editingFileId: string | null;
  onFileNameChange: (fileId: string, newName: string) => void;
  onEditingComplete: () => void;
  allFiles: FileItem[];
  openContextMenuId: string | null;
  onCreateFolder: () => void;
  onCreateFile: () => void;
}

export function GridContainer({
  gridRef,
  gridItems,
  isFileOver,
  emoji,
  moveItem,
  onDragEnd,
  onFileContextMenu,
  onFolderContextMenu,
  onFolderClick,
  onFileDoubleClick,
  onMoveItemToFolder,
  editingFileId,
  onFileNameChange,
  onEditingComplete,
  allFiles,
  openContextMenuId,
  onCreateFolder,
  onCreateFile,
}: GridContainerProps) {
  const [, dropGrid] = useDrop({
    accept: GRID_ITEM_TYPE,
    drop: (_item, monitor) => {
      if (monitor.didDrop()) return undefined;
      return { moved: true };
    },
  });

  return (
    <div ref={dropGrid} className="flex-1 overflow-y-auto px-8 py-6 relative">
      {/* Drop overlay when dragging files */}
      {isFileOver && gridItems.length > 0 && (
        <div className="absolute inset-0 bg-indigo-500/5 border-2 border-dashed border-indigo-500/50 rounded-xl z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-[#141414] px-6 py-4 rounded-xl border border-indigo-500/30">
            <div className="flex items-center gap-3">
              <Upload size={24} className="text-indigo-400" />
              <span className="text-indigo-300 text-lg">Отпустите файлы для загрузки</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom drag layer */}
      <CustomDragLayer />
      
      <div ref={gridRef} className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {gridItems.map((item, index) => (
          <DraggableGridItem
            key={item.id}
            item={item}
            index={index}
            moveItem={moveItem}
            onDragEnd={onDragEnd}
            onFileContextMenu={onFileContextMenu}
            onFolderContextMenu={onFolderContextMenu}
            onFolderClick={onFolderClick}
            onFileDoubleClick={onFileDoubleClick}
            onMoveItemToFolder={onMoveItemToFolder}
            editingFileId={editingFileId}
            onFileNameChange={onFileNameChange}
            onEditingComplete={onEditingComplete}
            allFiles={allFiles}
            openContextMenuId={openContextMenuId}
          />
        ))}
      </div>

      {/* Empty State */}
      {gridItems.length === 0 && (
        <div className={`flex flex-col items-center justify-center h-full text-center ${
          isFileOver ? "ring-2 ring-indigo-500/50 ring-inset rounded-xl" : ""
        }`}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isFileOver ? "bg-indigo-500/10" : "bg-white/5"
          }`}>
            {isFileOver ? (
              <Upload size={40} className="text-indigo-400" />
            ) : (
              <span className="text-5xl">{emoji}</span>
            )}
          </div>
          <p className="text-gray-400 text-lg mb-2">
            {isFileOver ? "Отпустите файлы для загрузки" : "Папка пуста"}
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {isFileOver ? "" : "Перетащите файлы сюда или создайте новый"}
          </p>
          {!isFileOver && (
            <div className="flex items-center gap-3">
              <button
                onClick={onCreateFolder}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-white rounded-lg transition-colors text-sm border border-white/10"
              >
                <FolderIcon size={16} />
                Создать папку
              </button>
              <button
                onClick={onCreateFile}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm border border-indigo-500/20"
              >
                <Plus size={16} />
                Создать файл
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
