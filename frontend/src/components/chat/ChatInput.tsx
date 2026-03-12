import { useState, useRef, useEffect, useCallback, type DragEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { Paperclip, Send, Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import type { Attachment } from '@/types';
import { generateMsgId, getDefaultSessionId, isImageMimeType, getAttachmentType } from '@/utils/fileHelpers';
import { FileAttachment } from './FileAttachment';
import { ContextInput } from './ContextInput';

const ACCEPTED_MIME =
  'image/*,.pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const SIMULATED_AI_REPLY =
  'Понял! Анализирую содержимое и распределяю по папкам... ' +
  '(ИИ пока не подключён — нужен API ключ в настройках)';

function buildAttachment(file: File): Attachment {
  const url = URL.createObjectURL(file);
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    url,
    type: getAttachmentType(file.type || ''),
    ...(isImageMimeType(file.type) ? { thumbnailUrl: url } : {}),
  };
}

export function ChatInput() {
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMessage = useChatStore((s) => s.addMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const isLoading = useChatStore((s) => s.isLoading);

  // Auto-resize textarea (max 5 lines ≈ 120 px)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAtts = Array.from(files).map(buildAttachment);
    setAttachments((prev) => [...prev, ...newAtts]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    if (isLoading) return;

    const sessionId = getDefaultSessionId();

    // User message
    addMessage({
      id: generateMsgId(),
      role: 'user',
      content: text + (context.trim() ? `\n\n---\n*Контекст:* ${context.trim()}` : ''),
      attachments: [...attachments],
      undone: false,
      sessionId,
      createdAt: new Date().toISOString(),
    });

    setInput('');
    setContext('');
    setAttachments([]);

    // Simulated AI response
    setLoading(true);
    setTimeout(() => {
      addMessage({
        id: generateMsgId(),
        role: 'assistant',
        content: SIMULATED_AI_REPLY,
        attachments: [],
        undone: false,
        sessionId,
        createdAt: new Date().toISOString(),
      });
      setLoading(false);
    }, 1500);
  }, [input, context, attachments, isLoading, addMessage, setLoading]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const isEmpty = input.trim() === '' && attachments.length === 0;

  return (
    <div
      className={`border-t transition-colors ${
        isDragging ? 'border-blue-500/60 bg-blue-950/20' : 'border-white/10 bg-[#111111]'
      } p-4`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className={`bg-[#1a1a1a] border rounded-xl overflow-hidden shadow-2xl transition-colors ${
            isDragging ? 'border-blue-500/60' : 'border-white/20'
          }`}
        >
          {/* Attachment strip */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto">
              {attachments.map((att) => (
                <FileAttachment
                  key={att.id}
                  attachment={att}
                  onRemove={removeAttachment}
                />
              ))}
            </div>
          )}

          {/* Context toggle + textarea */}
          <ContextInput value={context} onChange={setContext} />

          {/* Main input row */}
          <div className="flex items-end gap-3 p-4">
            {/* Paperclip */}
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Прикрепить файл"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
              title="Прикрепить файлы"
            >
              <Paperclip size={18} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите текст, скиньте изображения или файлы... ИИ отсортирует всё сам"
              disabled={isLoading}
              className="flex-1 bg-transparent text-gray-200 placeholder:text-gray-500 resize-none outline-none text-sm overflow-y-auto disabled:opacity-50"
              style={{ minHeight: '32px', maxHeight: '120px', height: '32px' }}
              rows={1}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={isEmpty || isLoading}
              aria-label="Отправить сообщение"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 transition-all flex-shrink-0"
              title="Отправить"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>

        {isDragging && (
          <p className="text-xs text-blue-400 text-center mt-2">
            Отпустите файлы для загрузки
          </p>
        )}

        {!isDragging && (
          <p className="text-xs text-gray-600 text-center mt-2">
            Enter — отправить, Shift + Enter — новая строка
          </p>
        )}
      </div>
    </div>
  );
}
