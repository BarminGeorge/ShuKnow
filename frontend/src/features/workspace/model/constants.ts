import type { ViewMode } from "./types";

export const DEFAULT_VIEW_MODE: ViewMode = "chat";
export const CONTENT_SAVE_DEBOUNCE_MS = 800;
export const OPEN_TAB_DELAY_MS = 50;

export const NEW_FOLDER_DEFAULTS = {
  name: "New folder",
  emoji: "",
  prompt: "",
} as const;

export const NEW_TEXT_FILE_DEFAULTS = {
  name: "New note.txt",
  content: "",
  type: "text",
} as const;
