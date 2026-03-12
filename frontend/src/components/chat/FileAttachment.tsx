import { FileText, File, X } from 'lucide-react';
import type { Attachment } from '@/types';
import { isImageMimeType, formatFileSize } from '@/utils/fileHelpers';

interface FileAttachmentProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
}

export function FileAttachment({ attachment, onRemove }: FileAttachmentProps) {
  const isImage = isImageMimeType(attachment.mimeType);

  return (
    <div className="relative inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden flex-shrink-0">
      {isImage ? (
        <>
          <div className="w-12 h-12 flex-shrink-0">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="pr-2 flex flex-col min-w-0 max-w-[100px]">
            <span className="text-xs text-gray-200 truncate">{attachment.name}</span>
            <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2">
          {attachment.mimeType === 'application/pdf' ? (
            <FileText size={16} className="text-red-400 flex-shrink-0" />
          ) : (
            <File size={16} className="text-blue-400 flex-shrink-0" />
          )}
          <div className="flex flex-col min-w-0 max-w-[120px]">
            <span className="text-xs text-gray-200 truncate">{attachment.name}</span>
            <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
          </div>
        </div>
      )}

      {onRemove && (
        <button
          onClick={() => onRemove(attachment.id)}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Удалить вложение"
        >
          <X size={10} className="text-gray-300" />
        </button>
      )}
    </div>
  );
}
