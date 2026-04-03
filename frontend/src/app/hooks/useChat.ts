import { useAtom, useSetAtom } from 'jotai';
import { messagesAtom, currentTitleAtom, sendMessageAtom } from '../store';

export function useChat() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [currentTitle, setCurrentTitle] = useAtom(currentTitleAtom);
  const sendMessage = useSetAtom(sendMessageAtom);

  return {
    messages,
    setMessages,
    currentTitle,
    setCurrentTitle,
    sendMessage,
  };
}
