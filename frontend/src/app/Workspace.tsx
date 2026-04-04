import { useState, useCallback, useEffect } from "react";
import { PanelLeftOpen, Loader2 } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";
import { useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessages, type Message, type Attachment } from "./components/ChatMessages";
import { InputConsole } from "./components/InputConsole";
import { Sparkles } from "lucide-react";
import { FolderContentView } from "./components/FolderContentView";
import { TabsWorkspace } from "./components/workspace/TabsWorkspace";
import { TabBar } from "./components/workspace/TabBar";
import { WorkspaceErrorBoundary } from "./components/workspace/WorkspaceErrorBoundary";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "sonner";
import { folderService, fileService } from "../api";
import type { Folder, FileItem, Folder as ApiFolder, FileItem as ApiFileItem } from "../api/types";
import { useFolders } from "./hooks/useFolders";
import { useFiles } from "./hooks/useFiles";
import { useTabs } from "./hooks/useTabs";
import { useWorkspaceView } from "./hooks/useWorkspaceView";
import { useChat } from "./hooks/useChat";

const IS_MOCK_MODE_ENABLED = import.meta.env.VITE_USE_MOCK_AUTH === "true";

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

type ViewMode = "chat" | "folder" | "editor";

const CHAT_TITLES = [
  "Сохраним что-нибудь?",
  "ShuKnow?",
  "Посохраняемся?",
  "Что хотите сохранить сегодня?",
  "Опять ты..",
  "Снова что-то нашёл?",
  "Есть что сохранить?",
  "Готов сохранить что-нибудь?",
  "42?"
];

export default function Workspace() {
  // Jotai hooks
  const { viewMode, setViewMode, isSidebarCollapsed, setIsSidebarCollapsed, selectedFolderPath, setSelectedFolderPath } = useWorkspaceView();
  const { folders, setFolders, isLoading: isLoadingFolders, loadFolders } = useFolders();
  const { files, setFiles } = useFiles();
  const { messages, setMessages, currentTitle, setCurrentTitle } = useChat();
  const { openTabs, activeTab, activeTabId, openTab, closeTab, switchTab } = useTabs();
  
  const sidebarRef = useRef<ImperativePanelHandle>(null);

  // Load folders from API
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Randomize title when entering chat view
  useEffect(() => {
    if (viewMode === "chat") {
      const randomIndex = Math.floor(Math.random() * CHAT_TITLES.length);
      setCurrentTitle(CHAT_TITLES[randomIndex]);
    }
  }, [viewMode, setCurrentTitle]);

  const handleSendMessage = (content: string, attachments?: Attachment[]) => {
    // Don't send if no content and no attachments
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(), // Store trimmed content (may be empty if only files)
      attachments,
      timestamp: new Date(),
      status: "sending",
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Simulate processing -> success/error
    const agentMessageId = (Date.now() + 1).toString();
    
    // Show processing state
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: agentMessageId,
          type: "agent",
          content: "",
          timestamp: new Date(),
          status: "processing",
          attachments,
        },
      ]);
    }, 500);
    
    // Simulate AI response (success or error randomly for demo)
    setTimeout(() => {
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.id === agentMessageId) {
            // Demo: 80% success, 20% error
            if (Math.random() > 0.2) {
              return {
                ...msg,
                status: "success" as const,
                timestamp: new Date(),
                result: attachments?.map((a) => ({
                  name: a.name,
                  folder: "📁 Учёба / Матан",
                  folderId: "demo-folder-id",
                  action: "sorted" as const,
                })) || [{ name: "заметка.txt", folder: "📁 Заметки", folderId: "notes-folder", action: "created" as const }],
              };
            } else {
              return {
                ...msg,
                status: "error" as const,
                timestamp: new Date(),
                errorMessage: "Не удалось определить папку",
              };
            }
          }
          return msg;
        })
      );
    }, 2000);
  };

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

  const handleUpdateFileContent = (fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f))
    );
  };

  const handleCreateFile = (file: FileItem, openAfterCreate: boolean = true) => {
    setFiles((prev) => [...prev, file]);
    if (openAfterCreate) {
      // Small delay so the file is in state before opening the tab
      setTimeout(() => handleOpenTab(file.id), 50);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    handleCloseTab(fileId);
  };

  const handleUpdateFile = (fileId: string, updates: Partial<FileItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  };

  // ── Folder navigation ───────────────────────────────────────────────────────

  const getFolderByPath = (path: string[]): Folder | null => {
    let current: Folder[] = folders;
    for (let i = 0; i < path.length; i++) {
      const idx = parseInt(path[i]);
      if (!current[idx]) return null;
      if (i === path.length - 1) return current[idx];
      if (!current[idx].subfolders) return null;
      current = current[idx].subfolders!;
    }
    return null;
  };

  const buildBreadcrumbs = (path: string[]): string[] => {
    const crumbs: string[] = [];
    let current: Folder[] = folders;
    for (let i = 0; i < path.length; i++) {
      const idx = parseInt(path[i]);
      if (current[idx]) {
        crumbs.push(current[idx].name);
        if (current[idx].subfolders) current = current[idx].subfolders!;
      }
    }
    return crumbs;
  };

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

  const selectedFolder      = selectedFolderPath ? getFolderByPath(selectedFolderPath) : null;
  const selectedBreadcrumbs = selectedFolderPath ? buildBreadcrumbs(selectedFolderPath) : [];

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
    const panel = sidebarRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <Panel 
            ref={sidebarRef}
            defaultSize={25} 
            minSize={15} 
            maxSize={45}
            collapsible={true}
            collapsedSize={4}
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
          >
            <Sidebar
              onLogoClick={handleGoToChat}
              onToggleSidebar={handleToggleSidebar}
              isCollapsed={isSidebarCollapsed}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-white/10 hover:bg-indigo-500/50 transition-colors cursor-col-resize" />

          {/* ── Main workspace ──────────────────────────────────────── */}
          <Panel minSize={50}>
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
                  selectedFolder && selectedFolderPath ? (
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
                          <div className="w-8 h-8 flex items-center justify-center text-indigo-400">
                            <Sparkles size={24} />
                          </div>
                          <h2 className="text-2xl font-semibold text-white text-center">{currentTitle}</h2>
                        </div>
                        <div className="w-full max-w-3xl">
                          <InputConsole onSend={handleSendMessage} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <ChatMessages 
                          messages={messages} 
                          onOpenFolder={(folderId) => {
                            // TODO: Navigate to folder
                            console.log("Open folder:", folderId);
                          }}
                          onUndo={(messageId) => {
                            // Set cancelled = true instead of removing message
                            setMessages((prev) => 
                              prev.map((m) => 
                                m.id === messageId ? { ...m, cancelled: true } : m
                              )
                            );
                          }}
                          onRetry={(messageId) => {
                            // TODO: Implement retry
                            console.log("Retry:", messageId);
                          }}
                          onSelectFolder={(messageId) => {
                            // TODO: Show folder picker
                            console.log("Select folder for:", messageId);
                          }}
                          onResend={(messageId) => {
                            // Find the message and resend it
                            const message = messages.find(m => m.id === messageId);
                            if (message) {
                              handleSendMessage(message.content, message.attachments);
                            }
                          }}
                        />
                        <InputConsole onSend={handleSendMessage} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
      <Toaster theme="dark" />
    </DndProvider>
  );
}
