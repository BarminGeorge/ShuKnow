import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '@/stores/chatStore';
import type { MsgId } from '@/types';

interface UndoButtonProps {
  messageId: MsgId;
  disabled?: boolean;
}

export function UndoButton({ messageId, disabled = false }: UndoButtonProps) {
  const undoMessage = useChatStore((s) => s.undoMessage);

  const handleUndo = () => {
    undoMessage(messageId);
    toast.success('Изменения отменены');
  };

  return (
    <button
      onClick={handleUndo}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-blue-400 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Undo2 size={13} />
      <span>Отменить</span>
    </button>
  );
}
