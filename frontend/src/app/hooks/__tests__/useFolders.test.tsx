import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { useFolders } from '../useFolders';
import type { Folder } from '../../../api/types';

describe('useFolders', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider>{children}</Provider>
  );

  it('should return initial empty folders array', () => {
    const { result } = renderHook(() => useFolders(), { wrapper });
    expect(result.current.folders).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should allow setting folders', () => {
    const { result } = renderHook(() => useFolders(), { wrapper });
    const mockFolders: Folder[] = [
      {
        id: '1',
        name: 'Test Folder',
        description: '',
        sortOrder: 0,
        fileCount: 0,
        subfolders: [],
      },
    ];

    act(() => {
      result.current.setFolders(mockFolders);
    });

    expect(result.current.folders).toEqual(mockFolders);
  });

  it('should allow updating folder by path', () => {
    const { result } = renderHook(() => useFolders(), { wrapper });
    const mockFolders: Folder[] = [
      {
        id: '1',
        name: 'Old Name',
        description: '',
        sortOrder: 0,
        fileCount: 0,
        subfolders: [],
      },
    ];

    act(() => {
      result.current.setFolders(mockFolders);
    });

    act(() => {
      result.current.updateFolder(['0'], { name: 'New Name' });
    });

    expect(result.current.folders[0].name).toBe('New Name');
  });
});
