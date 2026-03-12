export default function FileEditorView({ fileId }: { fileId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      File: {fileId}
    </div>
  );
}