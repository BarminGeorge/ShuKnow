import { useCallback } from "react";
import { toast } from "sonner";
import type { FileItem } from "../../../../api/types";
import {
  getContentTypeForFileName,
  getDisplayTypeForFile,
  isSupportedUploadFile,
  SUPPORTED_UPLOAD_EXTENSIONS_LABEL,
} from "../../../utils/fileValidation";

interface UseFileUploadProps {
  folderId: string;
  createFile: (file: FileItem, openAfterCreate: boolean) => void;
}

export function useFileUpload({ folderId, createFile }: UseFileUploadProps) {
  // Handle dropped files from OS file explorer
  const handleDroppedFiles = useCallback((files: File[]) => {
    const unsupportedFiles = files.filter((file) => !isSupportedUploadFile(file));
    if (unsupportedFiles.length > 0) {
      toast.error(
        unsupportedFiles.length === 1
          ? `Формат файла "${unsupportedFiles[0].name}" не поддерживается. Поддерживаются: ${SUPPORTED_UPLOAD_EXTENSIONS_LABEL}`
          : `Не поддерживаются ${unsupportedFiles.length} файл(ов). Поддерживаются: ${SUPPORTED_UPLOAD_EXTENSIONS_LABEL}`
      );
    }

    files.forEach((file, index) => {
      if (!isSupportedUploadFile(file)) return;

      const displayType = getDisplayTypeForFile(file);
      const contentType = file.type || getContentTypeForFileName(file.name);
      
      if (displayType === "photo") {
        // Create object URL for image preview
        const contentUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "photo",
          folderId: folderId,
          contentType,
          sizeBytes: file.size,
          contentUrl,
          createdAt: new Date().toISOString(),
        };
        createFile(newFile, false); // Don't open after drop
      } else if (displayType === "pdf") {
        // Create object URL for PDF viewing
        const pdfUrl = URL.createObjectURL(file);
        const newFile: FileItem = {
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: "pdf",
          folderId: folderId,
          contentType,
          sizeBytes: file.size,
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
            contentType,
            sizeBytes: file.size,
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
            contentType,
            sizeBytes: file.size,
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
