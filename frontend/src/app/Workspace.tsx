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
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "sonner";
import { folderService, fileService } from "../api";
import type { Folder as ApiFolder, FileItem as ApiFileItem } from "../api/types";

const IS_MOCK_MODE_ENABLED = import.meta.env.VITE_USE_MOCK_AUTH === "true";

export interface Folder {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  subfolders?: Folder[];
  customOrder?: string[];
  fileCount?: number;
  sortOrder?: number;
}

export interface FileItem {
  id: string;
  name: string;
  type: "text" | "photo" | "pdf" | "other";
  folderId: string;
  content?: string;
  contentUrl?: string;
  description?: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt: string;
}

function mapApiFolderToLocalFolder(apiFolder: ApiFolder): Folder {
  return {
    id: apiFolder.id,
    name: apiFolder.name,
    description: apiFolder.description,
    sortOrder: apiFolder.sortOrder,
    fileCount: apiFolder.fileCount,
    emoji: undefined,
    subfolders: apiFolder.subfolders?.map(mapApiFolderToLocalFolder),
    customOrder: undefined,
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
    id: apiFile.id,
    name: apiFile.name,
    folderId: apiFile.folderId,
    description: apiFile.description,
    contentType: apiFile.contentType,
    sizeBytes: apiFile.sizeBytes,
    type,
    contentUrl: apiFile.contentUrl,
    createdAt: new Date().toISOString(),
  };
}

const MOCK_INITIAL_FOLDERS: Folder[] = [
  {
    id: "1",
    name: "Идеи",
    emoji: "💡",
    description: "Все идеи, заметки о новых концепциях и креативные мысли",
    subfolders: [
      { id: "1-1", name: "Бизнес",  emoji: "💼", description: "Бизнес-идеи и предложения" },
      { id: "1-2", name: "Личное",  emoji: "✨", description: "Личные идеи и планы" },
    ],
  },
  {
    id: "2",
    name: "Дизайн",
    emoji: "🎨",
    description: "Визуальные материалы, скриншоты дизайна и референсы",
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
    description: "Все файлы, связанные с проектами",
    subfolders: [
      { id: "3-1", name: "Активные", emoji: "⚡" },
      { id: "3-2", name: "Архив",    emoji: "📦" },
    ],
  },
  { id: "4", name: "Исследования",   emoji: "📚", description: "Исследовательские материалы и аналитика" },
  { id: "5", name: "Заметки встреч", emoji: "📋", description: "Записи с встреч, протоколы и заметки" },
  {
    id: "6",
    name: "Ресурсы",
    emoji: "🔗",
    description: "Полезные ресурсы, ссылки и материалы",
    subfolders: [
      { id: "6-1", name: "Статьи", emoji: "📰" },
      { id: "6-2", name: "Видео",  emoji: "🎥" },
    ],
  },
];

const MOCK_INITIAL_FILES: FileItem[] = [
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
    contentUrl: "/mock_foto/фото1.webp",
    createdAt: new Date("2026-03-02T10:00:00").toISOString(),
  },
  {
    id: "file-photo-2",
    name: "фото2.webp",
    type: "photo",
    folderId: "1-2",
    contentUrl: "/mock_foto/фото2.webp",
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

type WorkspaceViewMode = "chat" | "folder" | "editor";

const RANDOM_CHAT_TITLES = [
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
  const [viewMode, setViewMode]                   = useState<WorkspaceViewMode>("chat");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const sidebarPanelReference = useRef<ImperativePanelHandle>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[] | null>(null);
  const [selectedFolderId, setSelectedFolderId]   = useState<string | null>(null);
  const [folders, setFolders]                     = useState<Folder[]>(MOCK_INITIAL_FOLDERS);
  const [files, setFiles]                         = useState<FileItem[]>(MOCK_INITIAL_FILES);
  const [folderFilesCache, setFolderFilesCache]   = useState<Map<string, FileItem[]>>(new Map());
  const [messages, setMessages]                   = useState<Message[]>([]);
  const [currentChatTitle, setCurrentChatTitle]   = useState<string>(RANDOM_CHAT_TITLES[0]);
  
  const [isLoadingFolders, setIsLoadingFolders]   = useState(false);
  const [isLoadingFiles, setIsLoadingFiles]       = useState(false);
  const [loadError, setLoadError]                 = useState<string | null>(null);

  useEffect(() => {
    if (IS_MOCK_MODE_ENABLED) {
      return;
    }
    
    let mounted = true;
    
    async function loadFoldersFromApi() {
      setIsLoadingFolders(true);
      setLoadError(null);
      
      try {
        const apiFolders = await folderService.fetchFolderTree();
        if (isMounted) {
          setFolders(apiFolders.map(mapApiFolderToLocalFolder));
        }
      } catch (fetchError) {
        if (isMounted) {
          setLoadError("Не удалось загрузить папки. Используются локальные данные.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFolders(false);
        }
      }
    }
    
    loadFoldersFromApi();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (IS_MOCK_MODE_ENABLED) {
      return;
    }
    
    if (!selectedFolderId) return;
    
    if (folderFilesCache.has(selectedFolderId)) return;
    
    let isMounted = true;
    
    async function loadFilesFromApi() {
      setIsLoadingFiles(true);
      
      try {
        const result = await fileService.fetchFolderFilesAsMapped(selectedFolderId!, 1, 100);
        if (isMounted) {
          const mappedFiles = result.items.map(mapApiFileToLocalFile);
          setFolderFilesCache(previousCache => new Map(previousCache).set(selectedFolderId!, mappedFiles));
          setFiles(previousFiles => {
            const filesNotInCurrentFolder = previousFiles.filter(file => file.folderId !== selectedFolderId);
            return [...filesNotInCurrentFolder, ...mappedFiles];
          });
        }
      } catch {
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    }
    
    loadFilesFromApi();
    
    return () => {
      isMounted = false;
    };
  }, [selectedFolderId, folderFilesCache]);

  useEffect(() => {
    if (viewMode === "chat") {
      const randomIndex = Math.floor(Math.random() * RANDOM_CHAT_TITLES.length);
      setCurrentChatTitle(RANDOM_CHAT_TITLES[randomIndex]);
    }
  }, [viewMode]);

  const handleSendMessage = (content: string, attachments?: Attachment[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "User",
      content,
      attachments,
    };
    setMessages((previousMessages) => [...previousMessages, newMessage]);
    
    setTimeout(() => {
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: (Date.now() + 1).toString(),
          role: "Ai",
          content: "✅ Ваш запрос обрабатывается...",
          actionId: `mock-action-${Date.now()}`,
          actionSummary: "Создан 1 файл в папке Идеи",
          canRollback: true,
        },
      ]);
    }, 1000);
  };

  const [openTabIds, setOpenTabIds]   = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const handleOpenTab = (fileId: string) => {
    setOpenTabIds((previousTabIds) => (previousTabIds.includes(fileId) ? previousTabIds : [...previousTabIds, fileId]));
    setActiveTabId(fileId);
    setViewMode("editor");
  };

  const handleCloseTab = (fileId: string) => {
    setOpenTabIds((previousTabIds) => {
      const remainingTabIds = previousTabIds.filter((tabId) => tabId !== fileId);

      if (activeTabId === fileId) {
        const closedTabIndex = previousTabIds.indexOf(fileId);
        const newActiveTabId = remainingTabIds[closedTabIndex] ?? remainingTabIds[closedTabIndex - 1] ?? null;
        setActiveTabId(newActiveTabId);
        if (newActiveTabId === null) {
          if (selectedFolderPath) {
            setViewMode("folder");
          } else {
            setViewMode("chat");
          }
        }
      }

      return remainingTabIds;
    });
  };

  const handleSwitchTab = (fileId: string) => {
    setActiveTabId(fileId);
    setViewMode("editor");
  };

  const handleUpdateFileContent = (fileId: string, content: string) => {
    setFiles((previousFiles) =>
      previousFiles.map((file) => (file.id === fileId ? { ...file, content } : file))
    );
  };

  const handleCreateFile = (file: FileItem, shouldOpenAfterCreate: boolean = true) => {
    setFiles((previousFiles) => [...previousFiles, file]);
    if (shouldOpenAfterCreate) {
      setTimeout(() => handleOpenTab(file.id), 50);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((previousFiles) => previousFiles.filter((file) => file.id !== fileId));
    handleCloseTab(fileId);
  };

  const handleUpdateFile = (fileId: string, updates: Partial<FileItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  };

// ── Folder navigation ───────────────────────────────────────────────────────

  const findFolderByPath = (path: string[]): Folder | null => {
    let currentFolderList: Folder[] = folders;
    for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
      const folderIndex = parseInt(path[pathIndex]);
      if (!currentFolderList[folderIndex]) return null;
      if (pathIndex === path.length - 1) return currentFolderList[folderIndex];
      if (!currentFolderList[folderIndex].subfolders) return null;
      currentFolderList = currentFolderList[folderIndex].subfolders!;
    }
    return null;
  };

  const buildBreadcrumbNames = (path: string[]): string[] => {
    const breadcrumbNames: string[] = [];
    let currentFolderList: Folder[] = folders;
    for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
      const folderIndex = parseInt(path[pathIndex]);
      if (currentFolderList[folderIndex]) {
        breadcrumbNames.push(currentFolderList[folderIndex].name);
        if (currentFolderList[folderIndex].subfolders) currentFolderList = currentFolderList[folderIndex].subfolders!;
      }
    }
    return breadcrumbNames;
  };

  const handleFolderClick = (folder: Folder, path: string[]) => {
    setSelectedFolderPath(path);
    setSelectedFolderId(folder.id);
    setViewMode("folder");
  };

  const handleGoToChat = () => {
    setViewMode("chat");
    setSelectedFolderPath(null);
    setSelectedFolderId(null);
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
        const newPath = selectedFolderPath.slice(0, -1);
        setSelectedFolderPath(newPath);
        const parentFolder = findFolderByPath(newPath);
        setSelectedFolderId(parentFolder?.id || null);
      } else {
        setViewMode("chat");
        setSelectedFolderPath(null);
        setSelectedFolderId(null);
      }
    }
  };

  const handleNavigateToSubfolder = (subfolder: Folder, subfolderIndex: number) => {
    if (!selectedFolderPath) return;
    setSelectedFolderPath([...selectedFolderPath, subfolderIndex.toString()]);
    setSelectedFolderId(subfolder.id);
  };

  const handleUpdateFolder = (path: string[], updates: Partial<Folder>) => {
    setFolders((previousFolders) => {
      const clonedFolders = JSON.parse(JSON.stringify(previousFolders)) as Folder[];
      let currentFolderList: Folder[] = clonedFolders;

      for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
        const folderIndex = parseInt(path[pathIndex]);
        if (!currentFolderList[folderIndex].subfolders) return previousFolders;
        currentFolderList = currentFolderList[folderIndex].subfolders!;
      }

      const targetFolderIndex = parseInt(path[path.length - 1]);
      if (updates.name        !== undefined) currentFolderList[targetFolderIndex].name        = updates.name;
      if (updates.emoji       !== undefined) currentFolderList[targetFolderIndex].emoji       = updates.emoji;
      if (updates.description !== undefined) currentFolderList[targetFolderIndex].description = updates.description;
      if (updates.customOrder !== undefined) currentFolderList[targetFolderIndex].customOrder = updates.customOrder;
      if (updates.subfolders  !== undefined) currentFolderList[targetFolderIndex].subfolders  = updates.subfolders;

      return clonedFolders;
    });
  };

  const handleBreadcrumbClick = (breadcrumbIndex: number) => {
    if (!selectedFolderPath) return;
    setSelectedFolderPath(selectedFolderPath.slice(0, breadcrumbIndex + 1));
  };

  const selectedFolder      = selectedFolderPath ? findFolderByPath(selectedFolderPath) : null;
  const selectedBreadcrumbs = selectedFolderPath ? buildBreadcrumbNames(selectedFolderPath) : [];

  const findFolderPathById = useCallback((folderId: string): string[] | null => {
    const searchFolders = (folderList: Folder[], currentPath: string[]): string[] | null => {
      for (let folderIndex = 0; folderIndex < folderList.length; folderIndex++) {
        const folder = folderList[folderIndex];
        const pathToFolder = [...currentPath, folderIndex.toString()];
        if (folder.id === folderId) return pathToFolder;
        if (folder.subfolders) {
          const foundPath = searchFolders(folder.subfolders, pathToFolder);
          if (foundPath) return foundPath;
        }
      }
      return null;
    };
    return searchFolders(folders, []);
  }, [folders]);

  const handleNavigateToFolder = useCallback((folderId: string) => {
    const path = findFolderPathById(folderId);
    if (path) {
      setSelectedFolderPath(path);
      setViewMode("folder");
    }
  }, [findFolderPathById]);

  const openTabs = openTabIds
    .map((tabId) => files.find((file) => file.id === tabId))
    .filter(Boolean) as FileItem[];

  const activeFile = activeTabId
    ? files.find((file) => file.id === activeTabId) ?? null
    : null;

  const handleToggleSidebar = () => {
    const panel = sidebarPanelReference.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen bg-[#121212] text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel 
            ref={sidebarPanelReference}
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

          <PanelResizeHandle className="w-[1px] bg-white/10 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          <Panel minSize={50}>
            <div className="h-full flex flex-col relative">

              <TabBar
                tabs={openTabs}
                activeTabId={activeTabId}
                viewMode={viewMode}
                onSwitchTab={handleSwitchTab}
                onCloseTab={handleCloseTab}
                onBack={handleNavigateBack}
                onNavigateToFolder={handleNavigateToFolder}
              />

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
                      isLoadingFiles={isLoadingFiles}
                    />
                  ) : null

                ) : (
                  <div className="h-full flex flex-col relative w-full">
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center pb-20">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-8 flex items-center justify-center text-blue-400">
                            <Sparkles size={24} />
                          </div>
                          <h2 className="text-2xl font-semibold text-white text-center">{currentChatTitle}</h2>
                        </div>
                        <div className="w-full max-w-3xl">
                          <InputConsole onSend={handleSendMessage} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <ChatMessages messages={messages} />
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
