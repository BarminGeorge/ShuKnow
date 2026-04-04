import type { FileItem } from '../../api/types';

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
