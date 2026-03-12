import { FileText } from "lucide-react";
import { TabBar } from "./TabBar";
import { EditorPane } from "./EditorPane";
import type { FileItem } from "@/features/workspace/model/types";

interface TabsWorkspaceProps {
  openTabIds: string[];
  activeTabId: string | null;
  files: FileItem[];
  onSwitchTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onBack: () => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
}

export function TabsWorkspace({
  openTabIds,
  activeTabId,
  files,
  onSwitchTab,
  onCloseTab,
  onBack,
  onUpdateFileContent,
}: TabsWorkspaceProps) {
  const openTabs = openTabIds
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is FileItem => f !== undefined);

  const activeFile = activeTabId
    ? files.find((f) => f.id === activeTabId) ?? null
    : null;

  return (
    <div className="h-full flex flex-col bg-[#111111]">
      {/* Tab Bar */}
      <TabBar
        tabs={openTabs}
        activeTabId={activeTabId}
        onSwitchTab={onSwitchTab}
        onCloseTab={onCloseTab}
        onBack={onBack}
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          // key forces full remount on tab switch — handles cleanup/autofocus correctly
          <EditorPane
            key={activeFile.id}
            file={activeFile}
            onUpdateContent={onUpdateFileContent}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-700">
            <FileText size={40} className="opacity-20" />
            <p className="text-sm">Выберите файл для редактирования</p>
          </div>
        )}
      </div>
    </div>
  );
}
