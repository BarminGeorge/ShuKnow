import { X, FileText, ImageIcon, ArrowLeft } from "lucide-react";
import type { FileItem } from "../../App";

interface TabBarProps {
  tabs: FileItem[];
  activeTabId: string | null;
  onSwitchTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onBack: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onBack,
}: TabBarProps) {
  return (
    <div className="flex items-stretch h-10 bg-[#0a0a0a] border-b border-white/8 overflow-hidden flex-shrink-0 select-none">
      {/* Back to Chat button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 h-full text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors border-r border-white/8 flex-shrink-0"
      >
        <ArrowLeft size={13} />
        <span className="text-xs">Чат</span>
      </button>

      {/* Scrollable tab strip */}
      <div className="flex-1 flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map((file) => {
          const isActive = file.id === activeTabId;
          return (
            <div
              key={file.id}
              onClick={() => onSwitchTab(file.id)}
              className={`group relative flex items-center gap-1.5 px-3 h-full min-w-0 w-[160px] max-w-[200px] flex-shrink-0 cursor-pointer border-r border-white/5 transition-all ${
                isActive
                  ? "bg-[#161616] text-gray-100"
                  : "bg-transparent text-gray-500 hover:bg-white/[0.04] hover:text-gray-300"
              }`}
            >
              {/* Active tab top indicator */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 rounded-b" />
              )}

              {/* Icon */}
              {file.type === "photo" ? (
                <ImageIcon size={12} className="flex-shrink-0 opacity-70" />
              ) : (
                <FileText size={12} className="flex-shrink-0 opacity-70" />
              )}

              {/* File name */}
              <span className="flex-1 text-xs truncate min-w-0">{file.name}</span>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file.id);
                }}
                className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/15 transition-all ${
                  isActive
                    ? "opacity-40 hover:opacity-100"
                    : "opacity-0 group-hover:opacity-40 group-hover:hover:opacity-80"
                }`}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
