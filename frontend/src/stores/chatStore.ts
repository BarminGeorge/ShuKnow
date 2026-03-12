/**
 * chatStore — manages the AI chat session:
 * messages, loading state, and file snapshots created during AI edits.
 */
import { create } from 'zustand';
import type { ChatMessage, FileSnapshot, MsgId } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  snapshots: FileSnapshot[];
  isLoading: boolean;
}

interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  undoMessage: (id: MsgId) => void;
  setLoading: (loading: boolean) => void;
  addSnapshot: (snapshot: FileSnapshot) => void;
  clearMessages: () => void;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  snapshots: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  undoMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, undone: true } : m,
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  addSnapshot: (snapshot) =>
    set((state) => ({ snapshots: [...state.snapshots, snapshot] })),

  clearMessages: () => set({ messages: [], snapshots: [] }),
}));
