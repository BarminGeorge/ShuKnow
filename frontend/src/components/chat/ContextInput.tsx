import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ContextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ContextInput({ value, onChange }: ContextInputProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-4 py-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span>Контекст</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Дополнительный контекст или инструкции..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-600 resize-none outline-none focus:border-white/20 transition-colors"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
