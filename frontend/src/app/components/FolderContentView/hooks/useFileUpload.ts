import { useCallback } from "react";
import { toast } from "sonner";
import type { FileItem } from "../../../../api/types";
import { fileService } from "../../../../api";
import { mapFileDtoToFileItem } from "../../../../api/types";
import {
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

    void (async () => {
      for (const file of files) {
        if (!isSupportedUploadFile(file)) {
          continue;
        }

        try {
          const displayType = getDisplayTypeForFile(file);
          const uploadedFile = await fileService.uploadFileWithConflictRename(folderId, file, file.name);
          const mappedFile: FileItem = {
            ...mapFileDtoToFileItem(uploadedFile),
            type: displayType,
            content: displayType === "text" ? await file.text() : undefined,
          };
          createFile(mappedFile, false);
        } catch (error) {
          console.error(`Failed to upload file "${file.name}":`, error);
          toast.error(`Не удалось загрузить файл "${file.name}". Попробуйте ещё раз.`);
        }
      }
    })();
  }, [folderId, createFile]);

  return {
    handleDroppedFiles,
  };
}
