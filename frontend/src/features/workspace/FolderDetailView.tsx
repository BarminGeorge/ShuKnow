export default function FolderDetailView({ folderId }: { folderId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
      Folder: {folderId}
    </div>
  );
}