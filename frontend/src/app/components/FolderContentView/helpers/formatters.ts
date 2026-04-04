// Helper: Remove file extension from name
export function getFileNameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

// Helper: Get file extension for badge
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() || "";
  return ext.length > 4 ? ext.slice(0, 4) : ext;
}

// Helper: Format relative date (short format, no prefix)
export function formatRelativeDate(dateString: string | undefined): string | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "день" : diffDays < 5 ? "дня" : "дней"} назад`;
  
  // Format as date
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

// Helper: Pluralize items count
export function pluralizeItems(count: number): string {
  if (count === 1) return "1 элемент";
  if (count < 5) return `${count} элемента`;
  return `${count} элементов`;
}

// Helper: Russian pluralization for nouns
export function pluralizeRussian(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) return `${count} ${many}`;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}

// Helper: Format folder stats for card subtitle (omits zero counts)
export function formatFolderStats(subfolderCount: number, fileCount: number, photoCount: number): string {
  const total = subfolderCount + fileCount + photoCount;
  if (total === 0) return "Пусто";
  
  const parts: string[] = [];
  if (subfolderCount > 0) parts.push(pluralizeRussian(subfolderCount, "папка", "папки", "папок"));
  if (fileCount > 0) parts.push(pluralizeRussian(fileCount, "файл", "файла", "файлов"));
  if (photoCount > 0) parts.push(`${photoCount} фото`);
  
  return parts.join(" · ");
}

// Helper: Format folder stats for header (omits zero counts, comma-separated)
export function formatFolderStatsHeader(subfolderCount: number, fileCount: number, photoCount: number): string {
  const parts: string[] = [];
  if (subfolderCount > 0) parts.push(pluralizeRussian(subfolderCount, "папка", "папки", "папок"));
  if (fileCount > 0) parts.push(pluralizeRussian(fileCount, "файл", "файла", "файлов"));
  if (photoCount > 0) parts.push(`${photoCount} фото`);
  
  return parts.join(", ");
}
