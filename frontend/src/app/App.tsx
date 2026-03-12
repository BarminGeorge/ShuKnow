import { useState, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Sidebar } from "./components/Sidebar";
import { ChatMessages } from "./components/ChatMessages";
import { InputConsole } from "./components/InputConsole";
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

export default function App() {
  const [viewMode, setViewMode]                   = useState<ViewMode>("chat");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[] | null>(null);
  const [folders, setFolders]                     = useState<Folder[]>(initialFolders);
  const [files, setFiles]                         = useState<FileItem[]>(initialFiles);

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
        if (newActive === null) setViewMode("chat");
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

  const handleCreateFile = (file: FileItem) => {
    setFiles((prev) => [...prev, file]);
    // Small delay so the file is in state before opening the tab
    setTimeout(() => handleOpenTab(file.id), 50);
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

  const handleBackToChat = () => {
    setViewMode("chat");
    setSelectedFolderPath(null);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen w-screen bg-[#121212] text-white overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <Panel defaultSize={25} minSize={18} maxSize={45}>
            <Sidebar
              folders={folders}
              setFolders={setFolders}
              onFolderClick={handleFolderClick}
              onUpdateFolder={handleUpdateFolder}
              onLogoClick={handleBackToChat}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-white/10 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          {/* ── Main workspace ──────────────────────────────────────── */}
          <Panel defaultSize={75} minSize={50}>
            <div className="h-full flex flex-col">
              {/* ── Global Tab Bar ────────────────────────────────────── */}
              <TabBar
                tabs={openTabs}
                activeTabId={activeTabId}
                viewMode={viewMode}
                onSwitchTab={handleSwitchTab}
                onCloseTab={handleCloseTab}
                onBack={handleBackToChat}
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
                      onBack={handleBackToChat}
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
                  <div className="h-full flex flex-col">
                    <ChatMessages />
                    <InputConsole />
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
