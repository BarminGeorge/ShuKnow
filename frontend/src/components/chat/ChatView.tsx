import { useChatStore } from '@/stores/chatStore';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatView() {
  const messages = useChatStore((s) => s.messages);

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      <MessageList messages={messages} />
      <ChatInput />
    </div>
  );
}
