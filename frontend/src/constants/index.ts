export const LOCAL_STORAGE_AUTH_TOKEN_KEY = "shuknow_auth_token";
export const LOCAL_STORAGE_USER_DATA_KEY = "shuknow_user";

export const ANIMATION_DURATION_MS = {
  DROP_LAND: 400,
  TOOLTIP_DELAY: 200,
} as const;

export const Z_INDEX = {
  DRAG_PREVIEW: 9999,
  MODAL_OVERLAY: 50,
  EMOJI_PICKER: 9999,
  CONTEXT_MENU: 50,
} as const;

export const SIGNALR_RECONNECT_MAX_DELAY_MS = 16000;
export const SIGNALR_RECONNECT_BASE_DELAY_MS = 1000;

export const FILE_SAVE_DELAY_MS = 1000;

export const FILE_NAME_MAX_LENGTH = 50;
export const FOLDER_NAME_MAX_LENGTH = 50;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const API_ENDPOINTS = {
  FOLDERS: "/api/folders",
  FILES: "/api/files",
  ACTIONS: "/api/actions",
  CHAT: "/api/chat",
  SETTINGS: "/api/settings",
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    LOGOUT: "/api/auth/logout",
  },
} as const;

export const CHAT_HUB_URL = "/hubs/chat";

export const SORT_OPTIONS = {
  NAME: "name",
  DATE: "date",
  TYPE: "type",
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];
