import type { FileItem, Folder } from "../../../../api/types";
import type { GridItem } from "../types";

const UNSORTED_ITEM_ORDER = Number.MAX_SAFE_INTEGER;
const FOLDER_CONTENT_ORDER_STORAGE_KEY = "shuknow.folderContent.order";

function getGridItemSortOrder(item: GridItem): number {
  const sortOrder = item.type === "folder"
    ? (item.data as Folder).sortOrder
    : (item.data as FileItem).sortOrder;

  return typeof sortOrder === "number" ? sortOrder : UNSORTED_ITEM_ORDER;
}

export function sortGridItemsBySortOrder(items: GridItem[]): GridItem[] {
  return [...items].sort((a, b) => {
    const sortOrderDelta = getGridItemSortOrder(a) - getGridItemSortOrder(b);
    if (sortOrderDelta !== 0) return sortOrderDelta;

    return a.order - b.order;
  });
}

export function applyCustomGridOrder(items: GridItem[], customOrder?: string[]): GridItem[] {
  if (!customOrder?.length) {
    return items;
  }

  const orderedItems: GridItem[] = [];
  const itemsMap = new Map(items.map((item) => [item.id, item]));

  customOrder.forEach((id) => {
    const item = itemsMap.get(id);
    if (!item) return;

    orderedItems.push(item);
    itemsMap.delete(id);
  });

  itemsMap.forEach((item) => orderedItems.push(item));
  return orderedItems;
}

export function buildGridItems(folder: Folder, files: FileItem[], customOrder?: string[]): GridItem[] {
  const folderFiles = files.filter((file) => file.folderId === folder.id);
  const items: GridItem[] = [];
  let order = 0;

  folder.subfolders?.forEach((subfolder) => {
    items.push({ id: subfolder.id, type: "folder", data: subfolder, order: order++ });
  });

  folderFiles.forEach((file) => {
    items.push({ id: file.id, type: "file", data: file, order: order++ });
  });

  return applyCustomGridOrder(sortGridItemsBySortOrder(items), customOrder ?? folder.customOrder);
}

function readStoredOrders(): Record<string, string[]> {
  if (typeof window === "undefined") return {};

  try {
    const storedValue = window.localStorage.getItem(FOLDER_CONTENT_ORDER_STORAGE_KEY);
    if (!storedValue) return {};

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return parsedValue as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function readStoredFolderContentOrder(folderId: string): string[] | undefined {
  const order = readStoredOrders()[folderId];
  return Array.isArray(order) ? order.filter((id): id is string => typeof id === "string") : undefined;
}

export function saveStoredFolderContentOrder(folderId: string, order: string[]) {
  if (typeof window === "undefined") return;

  const nextOrders = {
    ...readStoredOrders(),
    [folderId]: order,
  };

  window.localStorage.setItem(FOLDER_CONTENT_ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
}

export interface ReorderOperation {
  id: string;
  position: number;
}

export interface FolderContentReorderPlan {
  folders: ReorderOperation[];
  files: ReorderOperation[];
}

export function buildFolderContentReorderPlan(
  gridItems: GridItem[],
  currentSubfolders: Folder[] = []
): FolderContentReorderPlan {
  const desiredFolderIds = gridItems
    .filter((item) => item.type === "folder")
    .map((item) => item.id);
  const currentFolderIds = currentSubfolders.map((folder) => folder.id);
  const hasFolderOrderChanged = desiredFolderIds.some((id, index) => id !== currentFolderIds[index]);

  return {
    folders: hasFolderOrderChanged
      ? desiredFolderIds.map((id, position) => ({ id, position }))
      : [],
    files: gridItems.flatMap((item, position) => (
      item.type === "file" && (item.data as FileItem).sortOrder !== position
        ? [{ id: item.id, position }]
        : []
    )),
  };
}
