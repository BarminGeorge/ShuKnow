import { useChatStore } from '@/stores/chatStore';

/**
 * Convenience hook for chat state and actions.
 */
export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const addMessage = useChatStore((s) => s.addMessage);
  const undoMessage = useChatStore((s) => s.undoMessage);
  const setLoading = useChatStore((s) => s.setLoading);

  return { messages, isLoading, addMessage, undoMessage, setLoading };
}
