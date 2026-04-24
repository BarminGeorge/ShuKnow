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
  appendSortOrderStart?: number;
  initialOrderIds?: string[];
  onOrderChange?: (order: string[]) => void;
}

export function useFileUpload({
  folderId,
  createFile,
  appendSortOrderStart = 0,
  initialOrderIds = [],
  onOrderChange,
}: UseFileUploadProps) {
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
      let nextAppendSortOrder = appendSortOrderStart;
      let nextOrderIds = [...initialOrderIds];

      for (const file of files) {
        if (!isSupportedUploadFile(file)) {
          continue;
        }

        try {
          const displayType = getDisplayTypeForFile(file);
          const uploadedFile = await fileService.uploadFileWithConflictRename(folderId, file, file.name);
          const appendSortOrder = nextAppendSortOrder;

          if (uploadedFile.sortOrder !== appendSortOrder) {
            try {
              await fileService.reorderFile(uploadedFile.id, { position: appendSortOrder });
            } catch (error) {
              console.warn(`Failed to persist appended order for "${file.name}":`, error);
            }
          }

          const mappedFile: FileItem = {
            ...mapFileDtoToFileItem({ ...uploadedFile, sortOrder: appendSortOrder }),
            type: displayType,
            content: displayType === "text" ? await file.text() : undefined,
          };
          createFile(mappedFile, false);
          nextOrderIds = [...nextOrderIds.filter((id) => id !== mappedFile.id), mappedFile.id];
          onOrderChange?.(nextOrderIds);
          nextAppendSortOrder += 1;
        } catch (error) {
          console.error(`Failed to upload file "${file.name}":`, error);
          toast.error(`Не удалось загрузить файл "${file.name}". Попробуйте ещё раз.`);
        }
      }
    })();
  }, [appendSortOrderStart, folderId, createFile, initialOrderIds, onOrderChange]);

  return {
    handleDroppedFiles,
  };
}
