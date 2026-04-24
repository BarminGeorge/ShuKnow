import { Upload, FolderIcon, Plus } from "lucide-react";
import { useDrop } from "react-dnd";
import type { GridItem } from "../types";
import type { Folder, FileItem } from "../../../../api/types";
import { DraggableGridItem } from "./DraggableGridItem";
import { CustomDragLayer } from "./CustomDragLayer";
import { GRID_ITEM_TYPE } from "../constants";

const secondaryActionClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/[0.045] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:text-gray-100 hover:border-white/14 hover:bg-white/[0.065] transition-colors";

interface GridContainerProps {
  gridRef: React.RefObject<HTMLDivElement>;
  gridItems: GridItem[];
  isFileOver: boolean;
  emoji: string;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: (dropResult?: { movedIntoFolder?: boolean; moved?: boolean }) => void;
  onFileContextMenu: (fileId: string, event: React.MouseEvent) => void;
  onFolderContextMenu: (folderId: string, event: React.MouseEvent) => void;
  onFolderClick: (folder: Folder) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onMoveItemToFolder: (itemId: string, destFolderId: string, itemType: "file" | "folder") => void | Promise<void>;
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
    <div ref={dropGrid} className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 lg:px-8 lg:py-6 relative">
      {/* Drop overlay when dragging files */}
      {isFileOver && gridItems.length > 0 && (
        <div className="absolute inset-0 bg-violet-500/5 border-2 border-dashed border-violet-300/35 rounded-xl z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-[#101010]/95 px-6 py-4 rounded-lg border border-violet-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_42px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-3">
              <Upload size={24} className="text-violet-200/85" />
              <span className="text-violet-100/85 text-lg">Отпустите файлы для загрузки</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom drag layer */}
      <CustomDragLayer />
      
      <div ref={gridRef} className="grid gap-3 lg:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
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
          isFileOver ? "ring-2 ring-violet-300/35 ring-inset rounded-xl" : ""
        }`}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isFileOver ? "bg-violet-500/10" : "bg-white/5"
          }`}>
            {isFileOver ? (
              <Upload size={40} className="text-violet-200/85" />
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
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onCreateFolder}
                className={secondaryActionClass}
              >
                <FolderIcon size={16} />
                Создать папку
              </button>
              <button
                onClick={onCreateFile}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100
                           bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(15,23,42,0.46)_58%,rgba(167,139,250,0.09))]
                           border border-violet-200/18 shadow-[0_0_18px_rgba(167,139,250,0.06)] hover:border-violet-200/30 hover:text-white hover:shadow-[0_0_24px_rgba(167,139,250,0.12)]"
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
