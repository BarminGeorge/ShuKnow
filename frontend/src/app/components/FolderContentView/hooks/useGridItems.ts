import { useState, useEffect, useRef, useCallback } from "react";
import type { Folder, FileItem } from "../../../../api/types";
import type { GridItem } from "../types";
import {
  buildGridItems,
  readStoredFolderContentOrder,
  saveStoredFolderContentOrder,
} from "../helpers/order";

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

  // Rebuild grid from persisted mixed sortOrder, then apply any local drag order.
  useEffect(() => {
    setGridItems(buildGridItems(folder, files, readStoredFolderContentOrder(folder.id)));
  }, [folder, files]);

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
      saveStoredFolderContentOrder(folder.id, orderRef.current);
      onUpdateFolder({ customOrder: orderRef.current });
      hasOrderChangedRef.current = false;
    }
  }, [folder.id, onUpdateFolder]);

  return {
    gridItems,
    setGridItems,
    moveItem,
    handleDragEnd,
  };
}
