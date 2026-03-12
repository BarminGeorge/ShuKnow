import { X, FileText, ImageIcon, ArrowLeft, FolderOpen } from "lucide-react";
import type { FileItem } from "../../App";

interface TabBarProps {
  tabs: FileItem[];
  activeTabId: string | null;
  viewMode: string;
  onSwitchTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onBack: () => void;
  onNavigateToFolder?: (folderId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  viewMode,
  onSwitchTab,
  onCloseTab,
  onBack,
  onNavigateToFolder,
}: TabBarProps) {
  // Hide completely in chat mode when no tabs
  if (viewMode === "chat" && tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 h-11 bg-[#0e0e0e] border-b border-white/8 px-3 flex-shrink-0 select-none">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
      >
        <ArrowLeft size={13} />
        <span className="text-xs">Назад</span>
      </button>

      {tabs.length > 0 && (
        <>
          <div className="w-px h-5 bg-white/10 flex-shrink-0" />

          {/* Scrollable tab strip */}
          <div
            className="flex-1 flex items-center gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {tabs.map((file) => {
              const isActive = file.id === activeTabId;
              return (
                <div
                  key={file.id}
                  onClick={() => onSwitchTab(file.id)}
                  className={`group relative flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 min-w-0 max-w-[180px] flex-shrink-0 cursor-pointer rounded-lg transition-all ${
                    isActive
                      ? "bg-white/10 text-gray-100 ring-1 ring-white/10"
                      : "bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
                  }`}
                >
                  {/* Icon */}
                  {file.type === "photo" ? (
                    <ImageIcon size={12} className="flex-shrink-0 opacity-70" />
                  ) : (
                    <FileText size={12} className="flex-shrink-0 opacity-70" />
                  )}

                  {/* File name */}
                  <span className="flex-1 text-xs truncate min-w-0">{file.name}</span>

                  {/* Navigate to folder button */}
                  {onNavigateToFolder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToFolder(file.folderId);
                      }}
                      title="Перейти в папку"
                      className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-all ${
                        isActive
                          ? "opacity-40 hover:opacity-100 hover:bg-white/15"
                          : "opacity-0 group-hover:opacity-40 group-hover:hover:opacity-80 hover:bg-white/15"
                      }`}
                    >
                      <FolderOpen size={10} />
                    </button>
                  )}

                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(file.id);
                    }}
                    className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-all ${
                      isActive
                        ? "opacity-40 hover:opacity-100 hover:bg-white/15"
                        : "opacity-0 group-hover:opacity-40 group-hover:hover:opacity-80 hover:bg-white/15"
                    }`}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
