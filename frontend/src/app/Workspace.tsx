import { useState, useCallback } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";
import { useRef, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessages, type Message, type Attachment } from "./components/ChatMessages";
import { InputConsole } from "./components/InputConsole";
import { Sparkles } from "lucide-react";
import { FolderContentView } from "./components/FolderContentView";
import { TabsWorkspace } from "./components/workspace/TabsWorkspace";
import { TabBar } from "./components/workspace/TabBar";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "sonner";

export interface Folder {
  id: string;
  name: string;
  emoji?: string;
  prompt?: string;
  subfolders?: Folder[];
  customOrder?: string[]; // IDs of children (files and subfolders) in custom order
}

export interface FileItem {
  id: string;
  name: string;
  type: "text" | "photo";
  folderId: string;
  content?: string;    // markdown / plain text
  imageUrl?: string;   // URL or base64 for photo files
  prompt?: string;     // AI instruction for sorting
  createdAt: string;
}

// ── Initial data ──────────────────────────────────────────────────────────────

const initialFolders: Folder[] = [
  {
    id: "1",
    name: "Идеи",
    emoji: "💡",
    prompt: "Все идеи, заметки о новых концепциях и креативные мысли",
    subfolders: [
      { id: "1-1", name: "Бизнес",  emoji: "💼", prompt: "Бизнес-идеи и предложения" },
      { id: "1-2", name: "Личное",  emoji: "✨", prompt: "Личные идеи и планы" },
    ],
  },
  {
    id: "2",
    name: "Дизайн",
    emoji: "🎨",
    prompt: "Визуальные материалы, скриншоты дизайна и референсы",
    subfolders: [
      { id: "2-1", name: "UI-вдохновение",    emoji: "🖼️" },
      { id: "2-2", name: "Цветовые палитры",  emoji: "🌈" },
      { id: "2-3", name: "Типографика",       emoji: "📝" },
    ],
  },
  {
    id: "3",
    name: "Проекты",
    emoji: "🚀",
    prompt: "Все файлы, связанные с проектами",
    subfolders: [
      { id: "3-1", name: "Активные", emoji: "⚡" },
      { id: "3-2", name: "Архив",    emoji: "📦" },
    ],
  },
  { id: "4", name: "Исследования",   emoji: "📚", prompt: "Исследовательские материалы и аналитика" },
  { id: "5", name: "Заметки встреч", emoji: "📋", prompt: "Записи с встреч, протоколы и заметки" },
  {
    id: "6",
    name: "Ресурсы",
    emoji: "🔗",
    prompt: "Полезные ресурсы, ссылки и материалы",
    subfolders: [
      { id: "6-1", name: "Статьи", emoji: "📰" },
      { id: "6-2", name: "Видео",  emoji: "🎥" },
    ],
  },
];

const initialFiles: FileItem[] = [
  {
    id: "file-1",
    name: "Добро пожаловать в ShuKnow.md",
    type: "text",
    folderId: "1",
    content:
      "# Добро пожаловать в ShuKnow\n\nЭто ваш AI-инструмент для заметок и сортировки файлов.\n\n## Основные возможности\n\n- 📝 **Текстовые заметки** с Markdown\n- 🖼️ **Фото и изображения**\n- 📁 **Умная сортировка** с AI-промптами\n- 🗂️ **Вкладки** — открывайте несколько файлов одновременно\n\n## Как начать\n\n1. Дважды кликните на файл — он откроется во вкладке\n2. Редактируйте текст прямо здесь\n3. Изменения сохраняются автоматически\n4. Закройте вкладку крестиком когда закончите\n\n**Попробуйте прямо сейчас!** 🚀",
    createdAt: new Date("2026-03-01T10:00:00").toISOString(),
  },
  {
    id: "file-photo-1",
    name: "фото1.webp",
    type: "photo",
    folderId: "1",
    imageUrl: "/mock_foto/фото1.webp",
    createdAt: new Date("2026-03-02T10:00:00").toISOString(),
  },
  {
    id: "file-photo-2",
    name: "фото2.webp",
    type: "photo",
    folderId: "1-2",
    imageUrl: "/mock_foto/фото2.webp",
    createdAt: new Date("2026-03-02T11:00:00").toISOString(),
  },
  {
    id: "file-2",
    name: "Идеи для стартапа.md",
    type: "text",
    folderId: "1-1",
    content:
      "# Идеи для стартапа\n\n## 1. AI Ассистент для встреч\n- Автоматическая расшифровка\n- Генерация action items\n- Интеграция с календарями\n\n## 2. Платформа для микро-обучения\n- Короткие 5-минутные курсы\n- Геймификация\n- Адаптивный AI-тренер\n\n## 3. Социальная сеть для книг\n- Обмен цитатами\n- Клубы по интересам\n- Рекомендации на основе AI",
    createdAt: new Date("2026-03-02T14:30:00").toISOString(),
  },
  {
    id: "file-3",
    name: "Мои цели на 2026.md",
    type: "text",
    folderId: "1-2",
    content:
      "# Личные цели на 2026 год\n\n## Карьера\n- [ ] Изучить TypeScript на продвинутом уровне\n- [ ] Запустить собственный SaaS проект\n- [ ] Выступить на технической конференции\n\n## Здоровье\n- [ ] Бегать 3 раза в неделю\n- [ ] Медитировать каждое утро\n- [ ] Научиться готовить 10 новых блюд\n\n## Образование\n- [ ] Прочитать 24 книги\n- [ ] Пройти курс по ML\n- [ ] Изучить основы дизайна",
    createdAt: new Date("2026-03-03T09:15:00").toISOString(),
  },
];

// ── App ───────────────────────────────────────────────────────────────────────

type ViewMode = "chat" | "folder" | "editor";

const CHAT_TITLES = [
  "Сохраним что-нибудь?",
  "ShuKnow?",
  "Пoсохраняемся?",
  "Что хотите сохранить сегодня?",
  "Опять ты..",
  "Снова что-то нашёл?",
  "Есть что сохранить?",
  "Готов сохранить что-нибудь?",
  "42?"
];

export default function Workspace() {
  const [viewMode, setViewMode]                   = useState<ViewMode>("chat");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[] | null>(null);
  const [folders, setFolders]                     = useState<Folder[]>(initialFolders);
  const [files, setFiles]                         = useState<FileItem[]>(initialFiles);
  const [messages, setMessages]                   = useState<Message[]>([]);
  const [currentTitle, setCurrentTitle]           = useState<string>(CHAT_TITLES[0]);

  // Randomize title when entering chat view
  useEffect(() => {
    if (viewMode === "chat") {
      const randomIndex = Math.floor(Math.random() * CHAT_TITLES.length);
      setCurrentTitle(CHAT_TITLES[randomIndex]);
    }
  }, [viewMode]);

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

  // Tab state (replaces floating windows)
  const [openTabIds, setOpenTabIds]   = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // ── Tab management ──────────────────────────────────────────────────────────

  const handleOpenTab = (fileId: string) => {
    setOpenTabIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    setActiveTabId(fileId);
    setViewMode("editor");
  };

  const handleCloseTab = (fileId: string) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== fileId);

      // If we closed the active tab, pick an adjacent one
      if (activeTabId === fileId) {
        const idx = prev.indexOf(fileId);
        const newActive = next[idx] ?? next[idx - 1] ?? null;
        setActiveTabId(newActive);
        if (newActive === null) {
          if (selectedFolderPath) {
            setViewMode("folder");
          } else {
            setViewMode("chat");
          }
        }
      }

      return next;
    });
  };

  const handleSwitchTab = (fileId: string) => {
    setActiveTabId(fileId);
    setViewMode("editor");
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

  // ── Computed tab data ──────────────────────────────────────────────────────

  const openTabs = openTabIds
    .map((id) => files.find((f) => f.id === id))
    .filter(Boolean) as FileItem[];

  const activeFile = activeTabId
    ? files.find((f) => f.id === activeTabId) ?? null
    : null;

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
              folders={folders}
              setFolders={setFolders}
              onFolderClick={handleFolderClick}
              onUpdateFolder={handleUpdateFolder}
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
                    activeFile={activeFile}
                    onUpdateFileContent={handleUpdateFileContent}
                  />

                ) : viewMode === "folder" ? (
                  selectedFolder && selectedFolderPath ? (
                    <FolderContentView
                      folder={selectedFolder}
                      breadcrumbs={selectedBreadcrumbs}
                      onBack={handleNavigateBack}
                      onUpdateFolder={(updates) =>
                        handleUpdateFolder(selectedFolderPath, updates)
                      }
                      onNavigateToSubfolder={handleNavigateToSubfolder}
                      onBreadcrumbClick={handleBreadcrumbClick}
                      files={files}
                      onOpenFile={handleOpenTab}
                      onCreateFile={handleCreateFile}
                      onDeleteFile={handleDeleteFile}
                      onUpdateFile={handleUpdateFile}
                    />
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
