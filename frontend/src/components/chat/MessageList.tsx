import { useRef, useEffect } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';
import { ChatMessage } from './ChatMessage';

interface MessageListProps {
  messages: ChatMessageType[];
}

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) {
    label = 'Сегодня';
  } else if (isYesterday(date)) {
    label = 'Вчера';
  } else {
    label = format(date, 'd MMMM yyyy', { locale: ru });
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-xs text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
        <MessageSquare size={24} className="text-blue-400" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-base font-medium text-gray-300">ShuKnow</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          Отправьте что-нибудь — ИИ всё разложит по папкам
        </p>
      </div>
    </div>
  );
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <EmptyState />
      </div>
    );
  }

  // Build list with date separators injected between day changes
  const items: Array<{ type: 'separator'; date: Date } | { type: 'message'; message: ChatMessageType }> = [];

  messages.forEach((msg, i) => {
    const msgDate = new Date(msg.createdAt);
    const prevMsg = messages[i - 1];
    const showSeparator =
      i === 0 || (prevMsg && !isSameDay(new Date(prevMsg.createdAt), msgDate));

    if (showSeparator) {
      items.push({ type: 'separator', date: msgDate });
    }
    items.push({ type: 'message', message: msg });
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {items.map((item, i) =>
        item.type === 'separator' ? (
          <DateSeparator key={`sep-${i}`} date={item.date} />
        ) : (
          <ChatMessage key={item.message.id} message={item.message} />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
