import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridItems } from '../useGridItems';
import type { Folder, FileItem } from '../../../../../api/types';

describe('useGridItems', () => {
  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    description: '',
    sortOrder: 0,
    fileCount: 0,
    subfolders: [
      { id: 'subfolder-1', name: 'Subfolder 1', description: '', sortOrder: 0, fileCount: 0, subfolders: [] },
    ],
  };

  const mockFiles: FileItem[] = [
    { id: 'file-1', name: 'File 1', folderId: 'folder-1', type: 'text', content: '', contentType: 'text/plain', sizeBytes: 0 },
    { id: 'file-2', name: 'File 2', folderId: 'folder-1', type: 'text', content: '', contentType: 'text/plain', sizeBytes: 0 },
  ];

  const mockUpdateFolder = () => {};

  it('should initialize grid items from folder and files', () => {
    const { result } = renderHook(() =>
      useGridItems({ folder: mockFolder, files: mockFiles, onUpdateFolder: mockUpdateFolder })
    );

    expect(result.current.gridItems).toHaveLength(3); // 1 subfolder + 2 files
    expect(result.current.gridItems[0].type).toBe('folder');
    expect(result.current.gridItems[1].type).toBe('file');
    expect(result.current.gridItems[2].type).toBe('file');
  });

  it('should move items correctly', () => {
    const { result } = renderHook(() =>
      useGridItems({ folder: mockFolder, files: mockFiles, onUpdateFolder: mockUpdateFolder })
    );

    act(() => {
      result.current.moveItem(0, 2); // Move first item to third position
    });

    expect(result.current.gridItems[0].id).toBe('file-1');
    expect(result.current.gridItems[1].id).toBe('file-2');
    expect(result.current.gridItems[2].id).toBe('subfolder-1');
  });

  it('should respect custom order if provided', () => {
    const folderWithCustomOrder: Folder = {
      ...mockFolder,
      customOrder: ['file-2', 'subfolder-1', 'file-1'],
    };

    const { result } = renderHook(() =>
      useGridItems({ folder: folderWithCustomOrder, files: mockFiles, onUpdateFolder: mockUpdateFolder })
    );

    expect(result.current.gridItems[0].id).toBe('file-2');
    expect(result.current.gridItems[1].id).toBe('subfolder-1');
    expect(result.current.gridItems[2].id).toBe('file-1');
  });
});
