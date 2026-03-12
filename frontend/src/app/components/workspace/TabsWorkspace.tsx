import { FileText } from "lucide-react";
import { EditorPane } from "./EditorPane";
import type { FileItem } from "../../App";

interface TabsWorkspaceProps {
  activeFile: FileItem | null;
  onUpdateFileContent: (fileId: string, content: string) => void;
}

export function TabsWorkspace({
  activeFile,
  onUpdateFileContent,
}: TabsWorkspaceProps) {
  return (
    <div className="h-full flex flex-col bg-[#111111]">
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
