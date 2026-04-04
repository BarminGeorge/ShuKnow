import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFolderActions } from '../useFolderActions';

describe('useFolderActions', () => {
  it('should call updateFolder with correct path and updates', () => {
    const mockUpdateFolder = vi.fn();
    const selectedFolderPath = ['0', '1'];

    const { result } = renderHook(() =>
      useFolderActions({ selectedFolderPath, updateFolder: mockUpdateFolder })
    );

    result.current.handleUpdateFolder({ name: 'New Name' });

    expect(mockUpdateFolder).toHaveBeenCalledWith(['0', '1'], { name: 'New Name' });
  });

  it('should warn when no folder path is selected', () => {
    const mockUpdateFolder = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFolderActions({ selectedFolderPath: null, updateFolder: mockUpdateFolder })
    );

    result.current.handleUpdateFolder({ name: 'New Name' });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot update folder: no folder path selected');
    expect(mockUpdateFolder).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('should warn when folder path is empty', () => {
    const mockUpdateFolder = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFolderActions({ selectedFolderPath: [], updateFolder: mockUpdateFolder })
    );

    result.current.handleUpdateFolder({ name: 'New Name' });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot update folder: no folder path selected');
    expect(mockUpdateFolder).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
