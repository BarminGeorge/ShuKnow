import { beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';
import { toast } from 'sonner';
import { fileService } from '../../../../../api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('../../../../../api', () => ({
  fileService: {
    uploadFileWithConflictRename: vi.fn(),
  },
}));

function createUploadedFileDto(name: string, folderId: string, contentType: string, sizeBytes: number) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    folderId,
    folderName: null,
    name,
    description: '',
    contentType,
    sizeBytes,
    version: 1,
    checksumSha256: null,
    createdAt: new Date().toISOString(),
    sortOrder: 0,
  };
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle image file upload', async () => {
    const mockCreateFile = vi.fn();
    vi.mocked(fileService.uploadFileWithConflictRename).mockResolvedValueOnce(
      createUploadedFileDto('test.jpg', 'folder-1', 'image/jpeg', 13)
    );

    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    result.current.handleDroppedFiles([imageFile]);

    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '11111111-1111-1111-1111-111111111111',
          name: 'test.jpg',
          type: 'photo',
          folderId: 'folder-1',
        }),
        false
      );
    });
  });

  it('should handle PDF file upload', async () => {
    const mockCreateFile = vi.fn();
    vi.mocked(fileService.uploadFileWithConflictRename).mockResolvedValueOnce(
      createUploadedFileDto('document.pdf', 'folder-1', 'application/pdf', 11)
    );

    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
    
    result.current.handleDroppedFiles([pdfFile]);

    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'document.pdf',
          type: 'pdf',
          folderId: 'folder-1',
        }),
        false
      );
    });
  });

  it('should handle multiple files', async () => {
    const mockCreateFile = vi.fn();
    vi.mocked(fileService.uploadFileWithConflictRename)
      .mockResolvedValueOnce(createUploadedFileDto('photo1.jpg', 'folder-1', 'image/jpeg', 6))
      .mockResolvedValueOnce(createUploadedFileDto('photo2.png', 'folder-1', 'image/png', 6));

    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const files = [
      new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'photo2.png', { type: 'image/png' }),
    ];
    
    result.current.handleDroppedFiles(files);

    await waitFor(() => {
      expect(mockCreateFile).toHaveBeenCalledTimes(2);
    });
  });

  it('should skip unsupported files', () => {
    const mockCreateFile = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const unsupportedFile = new File(['content'], 'invalid.ppnfng', { type: 'application/octet-stream' });

    result.current.handleDroppedFiles([unsupportedFile]);

    expect(mockCreateFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('invalid.ppnfng'));
  });
});
