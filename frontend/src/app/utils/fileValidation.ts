import type { FileDisplayType } from "../../api/types";

const TEXT_EXTENSIONS = ["md", "txt", "json", "js", "ts", "tsx", "jsx", "html", "css", "py", "cs"] as const;
const CODE_EXTENSIONS = ["json", "js", "ts", "tsx", "jsx", "html", "css", "py", "cs"] as const;
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
const PDF_EXTENSIONS = ["pdf"] as const;
const IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

const TEXT_CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  js: "text/javascript",
  ts: "text/typescript",
  tsx: "text/tsx",
  jsx: "text/jsx",
  html: "text/html",
  css: "text/css",
  py: "text/x-python",
  cs: "text/x-csharp",
};

export const SUPPORTED_TEXT_EXTENSIONS = [...TEXT_EXTENSIONS];
export const SUPPORTED_UPLOAD_EXTENSIONS = [
  ...TEXT_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
];

export const SUPPORTED_TEXT_EXTENSIONS_LABEL = SUPPORTED_TEXT_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(", ");

export const SUPPORTED_UPLOAD_EXTENSIONS_LABEL = SUPPORTED_UPLOAD_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(", ");

export const ACCEPTED_UPLOAD_FILE_TYPES = [
  ...SUPPORTED_TEXT_EXTENSIONS.map((extension) => `.${extension}`),
  ".pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
].join(",");

export function getFileExtension(fileName: string): string | null {
  const trimmedName = fileName.trim().toLowerCase();
  const dotIndex = trimmedName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === trimmedName.length - 1) {
    return null;
  }

  return trimmedName.slice(dotIndex + 1);
}

export function isSupportedTextFileName(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return !!extension && SUPPORTED_TEXT_EXTENSIONS.includes(extension as typeof TEXT_EXTENSIONS[number]);
}

export function isCodeFileName(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return !!extension && CODE_EXTENSIONS.includes(extension as typeof CODE_EXTENSIONS[number]);
}

export function isSupportedUploadFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (extension && SUPPORTED_UPLOAD_EXTENSIONS.includes(extension as typeof SUPPORTED_UPLOAD_EXTENSIONS[number])) {
    return true;
  }

  return file.type === "application/pdf" || IMAGE_CONTENT_TYPES.includes(file.type as typeof IMAGE_CONTENT_TYPES[number]);
}

export function getDisplayTypeForFile(file: File): FileDisplayType {
  const extension = getFileExtension(file.name);

  if (IMAGE_CONTENT_TYPES.includes(file.type as typeof IMAGE_CONTENT_TYPES[number]) || (extension && IMAGE_EXTENSIONS.includes(extension as typeof IMAGE_EXTENSIONS[number]))) {
    return "photo";
  }

  if (file.type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  return "text";
}

export function getContentTypeForFileName(fileName: string): string {
  const extension = getFileExtension(fileName);

  if (!extension) {
    return "application/octet-stream";
  }

  if (extension in TEXT_CONTENT_TYPES) {
    return TEXT_CONTENT_TYPES[extension];
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (IMAGE_EXTENSIONS.includes(extension as typeof IMAGE_EXTENSIONS[number])) {
    return `image/${extension}`;
  }

  return "application/octet-stream";
}
