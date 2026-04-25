import { useDragLayer } from "react-dnd";
import { GRID_ITEM_TYPE } from "../constants";
import { getFileNameWithoutExtension, getFileExtension } from "../helpers";

// 自定义 Drag Layer：在拖拽时显示自定义的拖拽预览
export function CustomDragLayer() {
  const { isDragging, item, currentOffset, itemType } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
    itemType: monitor.getItemType(),
  }));

  // Не показываем preview для нативных файлов из ОС (NativeTypes.FILE)
  // и для случаев, когда нет валидного элемента
  if (!isDragging || !currentOffset || !item || itemType !== GRID_ITEM_TYPE) return null;

  const isFolder = item.origType === "folder";
  const isPhoto = item.fileType === "photo" && item.contentUrl;
  const extensionKey = item.name?.split(".").pop()?.toLowerCase() || "";

  const folderVisualStyle = {
    card: "bg-[linear-gradient(135deg,rgba(76,29,149,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-violet-200/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_36px_rgba(0,0,0,0.30)]",
    line: "via-violet-200/32",
  };

  const getFileVisualStyle = () => {
    if (item.fileType === "pdf" || extensionKey === "pdf") {
      return {
        badgeBg: "bg-rose-300/10",
        badgeText: "text-rose-200",
        card: "bg-[linear-gradient(135deg,rgba(157,23,77,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-rose-200/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_36px_rgba(0,0,0,0.30)]",
        line: "via-rose-200/28",
      };
    }

    if (["md", "txt", "rtf"].includes(extensionKey)) {
      return {
        badgeBg: "bg-[rgba(129,140,248,0.15)]",
        badgeText: "text-[#818cf8]",
        card: "bg-[linear-gradient(135deg,rgba(67,56,202,0.14),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-indigo-300/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_36px_rgba(0,0,0,0.30)]",
        line: "via-indigo-300/34",
      };
    }

    return {
      badgeBg: "bg-sky-300/10",
      badgeText: "text-sky-200",
      card: "bg-[linear-gradient(135deg,rgba(3,105,161,0.13),rgba(14,14,18,0.96)_54%,rgba(9,10,13,0.98))] border-sky-200/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_36px_rgba(0,0,0,0.30)]",
      line: "via-sky-200/28",
    };
  };

  const fileVisualStyle = getFileVisualStyle();

  // Use captured dimensions or fall back to defaults
  const cardWidth = item.sourceWidth || 280;
  const cardHeight = item.sourceHeight || 180;
  // Get display name without extension
  const displayName = item.name ? getFileNameWithoutExtension(item.name) : "Перемещение...";
  const fileExtension = getFileExtension(item.name || "");

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 10000,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: currentOffset.x - cardWidth / 2,
          top: currentOffset.y - cardHeight / 2,
          transform: "rotate(-2deg) scale(1.015)",
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        {/* Photo Card Preview */}
        {isPhoto ? (
          <div
            className="rounded-2xl overflow-hidden relative cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_16px_36px_rgba(0,0,0,0.30)] ring-1 ring-white/10"
            style={{ width: cardWidth, height: cardHeight, borderRadius: '20px', overflow: 'hidden' }}
          >
            <img
              src={item.contentUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ borderRadius: '0' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/16 to-black/4" />
            {/* Format badge - top left */}
            <span className="absolute top-6 left-7 text-[12px] font-semibold uppercase tracking-wide px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white/85">
              {fileExtension}
            </span>
            {/* Content at bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-7 py-6 min-w-0">
              <p className="text-[18px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {displayName}
              </p>
              {item.relativeDate && (
                <p className="text-[13px] text-white/60 mt-1 font-normal">
                  {item.relativeDate}
                </p>
              )}
            </div>
          </div>
        ) : isFolder ? (
          /* Folder Card Preview */
          <div
            className={`relative rounded-2xl overflow-hidden cursor-pointer border ${folderVisualStyle.card}`}
            style={{ width: cardWidth, height: cardHeight }}
          >
            <div className="h-full px-7 py-6 flex flex-col justify-between">
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${folderVisualStyle.line} to-transparent`} />

              {/* Top: Emoji */}
              <div className="flex items-start justify-between">
                <span className="text-[40px] leading-none">
                  {item.emoji || "📁"}
                </span>
              </div>
              {/* Bottom: Name and Meta */}
              <div className="min-w-0">
                <p className="text-[18px] font-medium text-[rgba(255,255,255,0.92)] whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayName}
                </p>
                <p className="text-[13px] text-[rgba(255,255,255,0.60)] mt-1 font-normal">
                  {item.metaText || "Пусто"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* File Card Preview */
          <div
            className={`relative rounded-2xl overflow-hidden cursor-pointer border ${fileVisualStyle.card}`}
            style={{ width: cardWidth, height: cardHeight }}
          >
            <div className="h-full px-7 py-6 flex flex-col justify-between">
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${fileVisualStyle.line} to-transparent`} />

              {/* Top: Type badge */}
              <div className="flex items-start justify-between">
                <span className={`text-[12px] font-semibold uppercase tracking-wide px-3 py-1 rounded-lg ${fileVisualStyle.badgeBg} ${fileVisualStyle.badgeText}`}>
                  {item.fileType === "pdf" ? "PDF" : fileExtension}
                </span>
              </div>
              {/* Bottom: Name and Date */}
              <div className="min-w-0">
                <p className="text-[18px] font-medium text-[rgba(255,255,255,0.92)] whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayName}
                </p>
                {item.relativeDate && (
                  <p className="text-[13px] text-[rgba(255,255,255,0.60)] mt-1 font-normal">
                    {item.relativeDate}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
