import type { Folder, FileItem } from '../api/types';

export const MOCK_FOLDERS: Folder[] = [
  {
    id: "1",
    name: "Идеи",
    emoji: "💡",
    prompt: "Все идеи, заметки о новых концепциях и креативные мысли",
    description: "Папка для идей",
    sortOrder: 0,
    fileCount: 0,
    subfolders: [
      { 
        id: "1-1", 
        name: "Бизнес", 
        emoji: "💼", 
        prompt: "Бизнес-идеи и предложения",
        description: "",
        sortOrder: 0,
        fileCount: 0,
        subfolders: []
      },
      { 
        id: "1-2", 
        name: "Личное", 
        emoji: "✨", 
        prompt: "Личные идеи и планы",
        description: "",
        sortOrder: 1,
        fileCount: 0,
        subfolders: []
      },
    ],
  },
  {
    id: "2",
    name: "Дизайн",
    emoji: "🎨",
    prompt: "Визуальные материалы, скриншоты дизайна и референсы",
    description: "Папка для дизайна",
    sortOrder: 1,
    fileCount: 0,
    subfolders: [],
  },
  {
    id: "3",
    name: "Учёба",
    emoji: "📚",
    prompt: "Учебные материалы, конспекты, домашние задания",
    description: "Папка для учёбы",
    sortOrder: 2,
    fileCount: 0,
    subfolders: [],
  },
];

export const MOCK_FILES: FileItem[] = [
  {
    id: "f1",
    name: "Идея стартапа.md",
    folderId: "1-1",
    description: "Концепция нового продукта",
    contentType: "text/markdown",
    sizeBytes: 1024,
    type: "text",
    content: "# Идея стартапа\n\nОписание идеи...",
    createdAt: new Date().toISOString(),
  },
  {
    id: "f2",
    name: "Скриншот UI.png",
    folderId: "2",
    description: "Референс интерфейса",
    contentType: "image/png",
    sizeBytes: 204800,
    type: "photo",
    contentUrl: "https://via.placeholder.com/400x300",
    createdAt: new Date().toISOString(),
  },
];
