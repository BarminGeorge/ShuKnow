import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ChatMessage as ChatMessageType } from '@/types';
import { FileAttachment } from './FileAttachment';
import { UndoButton } from './UndoButton';

interface ChatMessageProps {
  message: ChatMessageType;
}

function FileChangeLog({ changes }: { changes: ChatMessageType['fileChanges'] }) {
  if (!changes || changes.length === 0) return null;

  const actionIcon = (action: string) => {
    switch (action) {
      case 'created': return '✅';
      case 'updated': return '📝';
      case 'moved':   return '📦';
      case 'deleted': return '🗑️';
      default:        return '📄';
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Создан файл';
      case 'updated': return 'Обновлён';
      case 'moved':   return 'Перемещён';
      case 'deleted': return 'Удалён';
      default:        return 'Изменён';
    }
  };

  return (
    <div className="mb-3 rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5 space-y-1.5">
      {changes.map((change, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
          <span className="flex-shrink-0 mt-px">{actionIcon(change.action)}</span>
          <span>
            {actionLabel(change.action)}{' '}
            <span className="text-gray-200 font-medium">"{change.fileName}"</span>
            {change.folderPath && (
              <> в <span className="text-gray-300">{change.folderPath}</span></>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const timestamp = format(new Date(message.createdAt), 'HH:mm', { locale: ru });

  if (isUser) {
    return (
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={14} className="text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="max-w-[80%]">
            <div className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                {message.content}
              </p>

              {message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {message.attachments.map((att) => (
                    <FileAttachment key={att.id} attachment={att} />
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-gray-600 mt-1 ml-1 block">{timestamp}</span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-blue-400" />
      </div>

      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
          <FileChangeLog changes={message.fileChanges} />

          <div className="prose prose-invert prose-sm max-w-none text-gray-200
            prose-headings:text-gray-100
            prose-p:text-gray-200 prose-p:leading-relaxed
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-blue-300 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10
            prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-400
            prose-strong:text-gray-100
            prose-li:text-gray-200
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {message.undone ? (
              <span className="text-xs text-gray-600 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                Отменено
              </span>
            ) : (
              message.fileChanges &&
              message.fileChanges.length > 0 && (
                <UndoButton messageId={message.id} />
              )
            )}
          </div>
        </div>

        <span className="text-xs text-gray-600 mt-1 ml-1 block">{timestamp}</span>
      </div>
    </div>
  );
}
