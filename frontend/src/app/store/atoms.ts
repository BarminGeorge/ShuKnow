import { atom } from 'jotai';
import type { Folder, FileItem } from '../../api/types';
import type { Message, Attachment } from '../components/ChatMessages';

// ── View state ──────────────────────────────────────────────────────────────

export type ViewMode = "chat" | "folder" | "editor";

export const viewModeAtom = atom<ViewMode>("chat");
export const isSidebarCollapsedAtom = atom<boolean>(false);

// ── Folders ─────────────────────────────────────────────────────────────────

export const foldersAtom = atom<Folder[]>([]);
export const isLoadingFoldersAtom = atom<boolean>(false);
export const selectedFolderPathAtom = atom<string[] | null>(null);

// ── Files ───────────────────────────────────────────────────────────────────

export const filesAtom = atom<FileItem[]>([]);

// ── Tabs ────────────────────────────────────────────────────────────────────

export const openTabIdsAtom = atom<string[]>([]);
export const activeTabIdAtom = atom<string | null>(null);

// ── Chat ────────────────────────────────────────────────────────────────────

export const messagesAtom = atom<Message[]>([]);
export const currentTitleAtom = atom<string>("Привет! Чем могу помочь?");
