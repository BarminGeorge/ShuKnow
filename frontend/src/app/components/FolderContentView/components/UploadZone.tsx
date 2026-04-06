import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";

interface UploadZoneProps {
  onDropFiles: (files: File[]) => void;
  onChatFileDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isFileOver: boolean;
  children: React.ReactNode;
}

export function UploadZone({
  onDropFiles,
  onChatFileDrop,
  onDragOver,
  isFileOver,
  children,
}: UploadZoneProps) {
  const [{ }, fileDropRef] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item: { files: File[] }) => {
      if (item.files && item.files.length > 0) {
        onDropFiles(item.files);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={fileDropRef}
      onDragOver={onDragOver}
      onDrop={onChatFileDrop}
      className={`h-full flex flex-col bg-[#121212] transition-colors ${
        isFileOver ? "bg-indigo-500/5" : ""
      }`}
    >
      {children}
    </div>
  );
}
