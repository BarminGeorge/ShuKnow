import { X, FileText, ImageIcon, ArrowLeft, FolderOpen, Menu } from "lucide-react";
import type { FileItem } from "../../Workspace";

interface TabBarProps {
  tabs: FileItem[];
  activeTabId: string | null;
  viewMode: string;
  onSwitchTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onBack: () => void;
  onNavigateToFolder?: (folderId: string) => void;
  onOpenMobileSidebar?: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  viewMode,
  onSwitchTab,
  onCloseTab,
  onBack,
  onNavigateToFolder,
  onOpenMobileSidebar,
}: TabBarProps) {
  if (viewMode === "chat" && tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 h-9 bg-[#0e0e0e] border-b border-white/8 px-2 flex-shrink-0 select-none lg:h-11 lg:gap-2 lg:px-3">
      {onOpenMobileSidebar && (
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200 lg:hidden"
          title="Открыть меню"
          aria-label="Открыть меню"
        >
          <Menu size={16} />
        </button>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex h-7 items-center gap-1.5 px-2 text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 lg:h-auto lg:px-2.5 lg:py-1.5"
      >
        <ArrowLeft size={12} className="lg:h-[13px] lg:w-[13px]" />
        <span className="hidden text-xs lg:inline">Назад</span>
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
              const isActive = viewMode === "editor" && file.id === activeTabId;
              return (
                <div
                  key={file.id}
                  onClick={() => onSwitchTab(file.id)}
                  className={`group relative flex h-7 items-center gap-1.5 pl-2 pr-1 py-0.5 min-w-0 max-w-[124px] flex-shrink-0 cursor-pointer rounded-lg transition-all lg:h-auto lg:max-w-[180px] lg:pl-2.5 lg:pr-1.5 lg:py-1 ${
                    isActive
                      ? "bg-white/10 text-gray-100 ring-1 ring-white/10"
                      : "bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
                  }`}
                >
                  {/* Icon */}
                  {file.type === "photo" ? (
                    <ImageIcon size={11} className="flex-shrink-0 opacity-70 lg:h-3 lg:w-3" />
                  ) : (
                    <FileText size={11} className="flex-shrink-0 opacity-70 lg:h-3 lg:w-3" />
                  )}

                  {/* File name */}
                  <span className="flex-1 truncate text-[11px] min-w-0 lg:text-xs">{file.name}</span>

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
                          : "opacity-40 hover:bg-white/15 lg:opacity-0 lg:group-hover:opacity-40 lg:group-hover:hover:opacity-80"
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
                        : "opacity-40 hover:bg-white/15 lg:opacity-0 lg:group-hover:opacity-40 lg:group-hover:hover:opacity-80"
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
