import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('useFileUpload', () => {
  it('should handle image file upload', () => {
    const mockCreateFile = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    result.current.handleDroppedFiles([imageFile]);

    expect(mockCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test.jpg',
        type: 'photo',
        folderId: 'folder-1',
      }),
      false
    );
  });

  it('should handle PDF file upload', () => {
    const mockCreateFile = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
    
    result.current.handleDroppedFiles([pdfFile]);

    expect(mockCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'document.pdf',
        type: 'pdf',
        folderId: 'folder-1',
      }),
      false
    );
  });

  it('should handle multiple files', () => {
    const mockCreateFile = vi.fn();
    const { result } = renderHook(() =>
      useFileUpload({ folderId: 'folder-1', createFile: mockCreateFile })
    );

    const files = [
      new File(['image1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'photo2.png', { type: 'image/png' }),
    ];
    
    result.current.handleDroppedFiles(files);

    expect(mockCreateFile).toHaveBeenCalledTimes(2);
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
