import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessages } from "./components/ChatMessages";
import { InputConsole } from "./components/InputConsole";
import { Sparkles } from "lucide-react";
import { FolderContentView } from "./components/FolderContentView";
import { TabsWorkspace } from "./components/workspace/TabsWorkspace";
import { TabBar } from "./components/workspace/TabBar";
import { WorkspaceErrorBoundary } from "./components/workspace/WorkspaceErrorBoundary";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster, toast } from "sonner";
import type { Folder, FileItem, Folder as ApiFolder, FileItem as ApiFileItem } from "../api/types";
import { fileService } from "../api";
import { useFolders } from "./hooks/useFolders";
import { useFiles } from "./hooks/useFiles";
import { useTabs } from "./hooks/useTabs";
import { useWorkspaceView } from "./hooks/useWorkspaceView";
import { useChatController } from "./hooks/useChatController";

function mapApiFolderToLocalFolder(apiFolder: ApiFolder): Folder {
  return {
    ...apiFolder,
    emoji: undefined,
    prompt: undefined,
    customOrder: undefined,
    subfolders: apiFolder.subfolders?.map(mapApiFolderToLocalFolder) || [],
  };
}

function mapApiFileToLocalFile(apiFile: ApiFileItem): FileItem {
  const contentType = apiFile.contentType || "application/octet-stream";
  let type: FileItem["type"] = "other";
  
  if (contentType.startsWith("text/") || contentType === "application/json") {
    type = "text";
  } else if (contentType.startsWith("image/")) {
    type = "photo";
  } else if (contentType === "application/pdf") {
    type = "pdf";
  }
  
  return {
    ...apiFile,
    type,
    createdAt: new Date().toISOString(),
  };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function Workspace() {
  // Check if we're in mock mode
  const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
  
  // Jotai hooks
  const { viewMode, setViewMode, isSidebarCollapsed, setIsSidebarCollapsed, selectedFolderPath, setSelectedFolderPath, currentFolder, breadcrumbs } = useWorkspaceView();
  const { folders, setFolders, isLoading: isLoadingFolders, loadFolders } = useFolders();
  const { files, createFile, updateFile, deleteFile } = useFiles();
  const { openTabs, activeTab, activeTabId, openTab, closeTab, switchTab } = useTabs();
  const getFolderDisplayPathById = useCallback((folderId: string): string | null => {
    const search = (items: Folder[], parentPath: string[]): string | null => {
      for (const folder of items) {
        const currentPath = [...parentPath, folder.name];
        if (folder.id === folderId) {
          return currentPath.join("/");
        }

        const nestedPath = search(folder.subfolders ?? [], currentPath);
        if (nestedPath) {
          return nestedPath;
        }
      }

      return null;
    };

    return search(folders, []);
  }, [folders]);

  const {
    messages,
    currentTitle,
    handleSendMessage,
    handleCancelMessage,
    handleRetryMessage,
    handleResendMessage,
  } = useChatController({
    isMockMode,
    isChatView: viewMode === "chat",
    loadFolders,
    getFolderPathById: getFolderDisplayPathById,
  });
  
  const composerRef = useRef<HTMLDivElement>(null);
  const autosaveSequenceRef = useRef(0);
  const latestAutosaveByFileRef = useRef<Map<string, number>>(new Map());
  const lastAutosavedContentRef = useRef<Map<string, string>>(new Map());
  const autosaveFailureNotifiedRef = useRef<Set<string>>(new Set());
  const [composerBottomPadding, setComposerBottomPadding] = useState(176);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const updatePadding = () => {
      // Keep extra breathing room so the last/streaming message never hides under the composer.
      setComposerBottomPadding(Math.ceil(composer.getBoundingClientRect().height + 84));
    };

    updatePadding();
    const observer = new ResizeObserver(updatePadding);
    observer.observe(composer);

    return () => observer.disconnect();
  }, [messages.length > 0]);

  // Load folders from API
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // ── Tab management ──────────────────────────────────────────────────────────

  const handleOpenTab = (fileId: string) => {
    openTab(fileId);
  };

  const handleCloseTab = (fileId: string) => {
    closeTab(fileId);
  };

  const handleSwitchTab = (fileId: string) => {
    switchTab(fileId);
  };

  // ── File management ─────────────────────────────────────────────────────────

  const handleUpdateFileContent = useCallback((fileId: string, content: string) => {
    updateFile(fileId, { content });

    const targetFile = files.find((file) => file.id === fileId);
    const isPersistableTextFile = targetFile?.contentType.startsWith("text/") ?? false;
    if (isMockMode || !isPersistableTextFile) {
      return;
    }

    if (lastAutosavedContentRef.current.get(fileId) === content) {
      return;
    }

    const autosaveSequence = autosaveSequenceRef.current + 1;
    autosaveSequenceRef.current = autosaveSequence;
    latestAutosaveByFileRef.current.set(fileId, autosaveSequence);

    void fileService.patchFileContent(fileId, content)
      .then((savedFile) => {
        if (latestAutosaveByFileRef.current.get(fileId) !== autosaveSequence) {
          return;
        }

        lastAutosavedContentRef.current.set(fileId, content);
        autosaveFailureNotifiedRef.current.delete(fileId);
        updateFile(fileId, {
          description: savedFile.description,
          contentType: savedFile.contentType,
          sizeBytes: savedFile.sizeBytes,
          createdAt: savedFile.createdAt,
          sortOrder: savedFile.sortOrder,
        });
      })
      .catch((error) => {
        console.error("Failed to autosave file content:", error);
        if (autosaveFailureNotifiedRef.current.has(fileId)) {
          return;
        }
        autosaveFailureNotifiedRef.current.add(fileId);
        toast.error("Не удалось сохранить изменения. Попробуйте ещё раз.");
      });
  }, [files, isMockMode, updateFile]);

  const handleCreateFile = (file: FileItem, openAfterCreate: boolean = true) => {
    createFile(file, openAfterCreate);
  };

  const handleDeleteFile = (fileId: string) => {
    deleteFile(fileId);
  };

  const handleUpdateFile = (fileId: string, updates: Partial<FileItem>) => {
    updateFile(fileId, updates);
  };

  // ── Folder navigation ───────────────────────────────────────────────────────

  const handleFolderClick = (_folder: Folder, path: string[]) => {
    setSelectedFolderPath(path);
    setViewMode("folder");
  };

  const handleGoToChat = () => {
    setViewMode("chat");
    setSelectedFolderPath(null);
  };

  const handleNavigateBack = () => {
    if (viewMode === "editor") {
      if (selectedFolderPath) {
        setViewMode("folder");
      } else {
        setViewMode("chat");
      }
    } else if (viewMode === "folder") {
      if (selectedFolderPath && selectedFolderPath.length > 1) {
        setSelectedFolderPath((prev) => prev ? prev.slice(0, -1) : null);
      } else {
        setViewMode("chat");
        setSelectedFolderPath(null);
      }
    }
  };

  const handleNavigateToSubfolder = (_subfolder: Folder, subfolderIndex: number) => {
    if (!selectedFolderPath) return;
    setSelectedFolderPath([...selectedFolderPath, subfolderIndex.toString()]);
  };

  const handleUpdateFolder = (path: string[], updates: Partial<Folder>) => {
    setFolders((prevFolders) => {
      const newFolders = JSON.parse(JSON.stringify(prevFolders)) as Folder[];
      let current: Folder[] = newFolders;

      for (let i = 0; i < path.length - 1; i++) {
        const idx = parseInt(path[i]);
        if (!current[idx].subfolders) return prevFolders;
        current = current[idx].subfolders!;
      }

      const fi = parseInt(path[path.length - 1]);
      if (updates.name       !== undefined) current[fi].name       = updates.name;
      if (updates.emoji      !== undefined) current[fi].emoji      = updates.emoji;
      if (updates.prompt     !== undefined) current[fi].prompt     = updates.prompt;
      if (updates.customOrder !== undefined) current[fi].customOrder = updates.customOrder;
      if (updates.subfolders !== undefined) current[fi].subfolders = updates.subfolders;

      return newFolders;
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    if (!selectedFolderPath) return;
    setSelectedFolderPath(selectedFolderPath.slice(0, index + 1));
  };

  // ── Navigate to folder by file's folderId ──────────────────────────────────

  const findFolderPathById = useCallback((folderId: string): string[] | null => {
    const search = (list: Folder[], path: string[]): string[] | null => {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const currentPath = [...path, i.toString()];
        if (f.id === folderId) return currentPath;
        if (f.subfolders) {
          const found = search(f.subfolders, currentPath);
          if (found) return found;
        }
      }
      return null;
    };
    return search(folders, []);
  }, [folders]);

  const handleNavigateToFolder = useCallback((folderId: string) => {
    const path = findFolderPathById(folderId);
    if (path) {
      setSelectedFolderPath(path);
      setViewMode("folder");
    }
  }, [findFolderPathById]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden">
        <div className="h-full w-full flex">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside
            className={`${isSidebarCollapsed ? "w-16" : "w-80"} h-full flex-none border-r border-white/10 transition-[width] duration-200 ease-out`}
          >
            <Sidebar
              onLogoClick={handleGoToChat}
              onToggleSidebar={handleToggleSidebar}
              isCollapsed={isSidebarCollapsed}
            />
          </aside>

          {/* ── Main workspace ──────────────────────────────────────── */}
          <main className="min-w-0 flex-1">
            <div className="h-full flex flex-col relative">

              {/* ── Global Tab Bar ────────────────────────────────────── */}
              <TabBar
                tabs={openTabs}
                activeTabId={activeTabId}
                viewMode={viewMode}
                onSwitchTab={handleSwitchTab}
                onCloseTab={handleCloseTab}
                onBack={handleNavigateBack}
                onNavigateToFolder={handleNavigateToFolder}
              />

              {/* ── Content area ──────────────────────────────────────── */}
              <div className="flex-1 overflow-hidden">
                {viewMode === "editor" ? (
                  <TabsWorkspace
                    activeFile={activeTab}
                    onUpdateFileContent={handleUpdateFileContent}
                  />

                ) : viewMode === "folder" ? (
                  currentFolder && selectedFolderPath ? (
                    <WorkspaceErrorBoundary onReset={() => {
                      setViewMode('chat');
                      setSelectedFolderPath(null);
                    }}>
                      <FolderContentView
                        onBack={handleNavigateBack}
                        onNavigateToSubfolder={handleNavigateToSubfolder}
                        onBreadcrumbClick={handleBreadcrumbClick}
                      />
                    </WorkspaceErrorBoundary>
                  ) : null

                ) : (
                  <div className="h-full flex flex-col relative w-full">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center pb-20">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="relative flex h-9 w-9 items-center justify-center">
                            <div className="absolute inset-2 rounded-full bg-[#4c1d95]/7 blur-sm" />
                            <Sparkles
                              size={26}
                              className="relative text-violet-300/62 drop-shadow-[0_0_5px_rgba(91,33,182,0.16)]"
                              strokeWidth={2.25}
                            />
                          </div>
                          <h2 className="text-2xl font-semibold text-gray-100/90 text-center">{currentTitle}</h2>
                        </div>
                        <div className="w-full max-w-3xl">
                          <InputConsole onSend={handleSendMessage} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <ChatMessages 
                          messages={messages} 
                          bottomPadding={composerBottomPadding}
                          onOpenFolder={(folderId) => {
                            // Navigate to folder
                            handleNavigateToFolder(folderId);
                          }}
                          onUndo={handleCancelMessage}
                          onRetry={handleRetryMessage}
                          onSelectFolder={(messageId) => {
                            // Show folder picker
                            setViewMode("folder");
                          }}
                          onResend={handleResendMessage}
                        />
                        <div ref={composerRef} className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                          <div className="pointer-events-auto">
                            <InputConsole onSend={handleSendMessage} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <Toaster theme="dark" />
    </DndProvider>
  );
}
