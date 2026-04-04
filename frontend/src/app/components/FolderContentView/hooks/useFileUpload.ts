import { useCallback } from "react";
import type { FileItem } from "../../../../api/types";

interface UseFileUploadProps {
  folderId: string;
  createFile: (file: FileItem, openAfterCreate: boolean) => void;
}

export function useFileUpload({ folderId, createFile }: UseFileUploadProps) {
  // Handle dropped files from OS file explorer
  const handleDroppedFiles = useCallback((files: File[]) => {
    files.forEach((file, index) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      
      if (isImage) {
        // Create object URL for image preview
        const contentUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "photo",
          folderId: folderId,
          contentUrl,
          createdAt: new Date().toISOString(),
        };
        createFile(newFile, false); // Don't open after drop
      } else if (isPdf) {
        // Create object URL for PDF viewing
        const pdfUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "pdf",
          folderId: folderId,
          pdfUrl,
          createdAt: new Date().toISOString(),
        };
        createFile(newFile, false); // Don't open after drop
      } else {
        // For text files, try to read content
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string || "";
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folderId,
            content,
            createdAt: new Date().toISOString(),
          };
          createFile(newFile, false); // Don't open after drop
        };
        reader.onerror = () => {
          // If reading fails, create empty text file
          const newFile: FileItem = {
            id: `${Date.now()}-${index}`,
            name: file.name,
            type: "text",
            folderId: folderId,
            content: "",
            createdAt: new Date().toISOString(),
          };
          createFile(newFile, false); // Don't open after drop
        };
        reader.readAsText(file);
      }
    });
  }, [folderId, createFile]);

  return {
    handleDroppedFiles,
  };
}
