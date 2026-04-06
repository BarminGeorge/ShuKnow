import type { GridItemType, DropIntent } from "../types";

// 计算放置意图的辅助函数
export function calculateDropIntent(
  hoverClientX: number,
  hoverClientY: number,
  width: number,
  height: number,
  targetType: GridItemType,
  draggedId: string,
  targetId: string
): DropIntent {
  // 不能拖到自己身上
  if (draggedId === targetId) return null;
  
  // 文件只能触发重新排序意图（文件不能接受嵌套）
  if (targetType === "file") return "reorder";
  
  // 文件夹：根据位置判断意图
  // 中心区域（中间60%宽度和高度）= 嵌套意图
  // 边缘区域（左右各20%宽度，或上下各20%高度）= 重新排序意图
  const centerXStart = width * 0.2;
  const centerXEnd = width * 0.8;
  const centerYStart = height * 0.2;
  const centerYEnd = height * 0.8;
  
  const isInCenterX = hoverClientX >= centerXStart && hoverClientX <= centerXEnd;
  const isInCenterY = hoverClientY >= centerYStart && hoverClientY <= centerYEnd;
  
  if (isInCenterX && isInCenterY) {
    return "nest"; // 中心区域：嵌套意图
  }
  
  return "reorder"; // 边缘区域：重新排序意图
}
