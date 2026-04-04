import { useState, useEffect, useRef, useCallback } from "react";
import type { Folder, FileItem } from "../../../../api/types";
import type { GridItem } from "../types";

interface UseGridItemsProps {
  folder: Folder;
  files: FileItem[];
  onUpdateFolder: (updates: Partial<Folder>) => void;
}

export function useGridItems({ folder, files, onUpdateFolder }: UseGridItemsProps) {
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const orderRef = useRef<string[]>([]);
  const hasOrderChangedRef = useRef(false);

  // Silently update order ref on grid changes
  useEffect(() => {
    const newOrder = gridItems.map((item) => item.id);
    const hasChanged = JSON.stringify(newOrder) !== JSON.stringify(orderRef.current);
    orderRef.current = newOrder;
    if (hasChanged && newOrder.length > 0) {
      hasOrderChangedRef.current = true;
    }
  }, [gridItems]);

  // Rebuild grid only on folder change
  useEffect(() => {
    const folderFiles = files.filter((f) => f.folderId === folder.id);
    const items: GridItem[] = [];
    let order = 0;

    // Add subfolders first
    if (folder.subfolders) {
      folder.subfolders.forEach((subfolder) => {
        items.push({ id: subfolder.id, type: "folder", data: subfolder, order: order++ });
      });
    }

    // Add files
    folderFiles.forEach((file) => {
      items.push({ id: file.id, type: "file", data: file, order: order++ });
    });

    // Apply custom order if exists
    if (folder.customOrder && folder.customOrder.length > 0) {
      const orderedItems: GridItem[] = [];
      const itemsMap = new Map(items.map((item) => [item.id, item]));
      
      folder.customOrder.forEach((id) => {
        const item = itemsMap.get(id);
        if (item) {
          orderedItems.push(item);
          itemsMap.delete(id);
        }
      });
      
      // Add remaining items (new files/folders not in customOrder)
      itemsMap.forEach((item) => orderedItems.push(item));
      setGridItems(orderedItems);
    } else {
      setGridItems(items);
    }
  }, [folder.id, files, folder.subfolders]);

  // Move item in grid (for drag & drop)
  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setGridItems((prev) => {
      const newItems = [...prev];
      const [draggedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems;
    });
  }, []);

  // Save custom order after drag operation
  const handleDragEnd = useCallback(() => {
    if (hasOrderChangedRef.current && orderRef.current.length > 0) {
      onUpdateFolder({ customOrder: orderRef.current });
      hasOrderChangedRef.current = false;
    }
  }, [onUpdateFolder]);

  return {
    gridItems,
    setGridItems,
    moveItem,
    handleDragEnd,
  };
}
