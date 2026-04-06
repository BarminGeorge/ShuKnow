import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useFiles } from '../useFiles';
import type { FileItem } from '../../../api/types';

describe('useFiles', () => {
  it('should return empty files initially', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useFiles(), { wrapper });
    expect(result.current.files).toEqual([]);
  });

  it('should allow setting files', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useFiles(), { wrapper });
    const mockFiles: FileItem[] = [
      {
        id: 'f1',
        name: 'Test File',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 100,
        type: 'text',
      },
    ];

    act(() => {
      result.current.setFiles(mockFiles);
    });

    expect(result.current.files).toEqual(mockFiles);
  });

  it('should create a file', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useFiles(), { wrapper });
    const newFile: FileItem = {
      id: 'f1',
      name: 'New File',
      folderId: '1',
      contentType: 'text/plain',
      sizeBytes: 100,
      type: 'text',
    };

    act(() => {
      result.current.createFile(newFile, false);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].id).toBe('f1');
  });

  it('should update a file', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useFiles(), { wrapper });
    const mockFiles: FileItem[] = [
      {
        id: 'f1',
        name: 'Old Name',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 100,
        type: 'text',
      },
    ];

    act(() => {
      result.current.setFiles(mockFiles);
    });

    act(() => {
      result.current.updateFile('f1', { name: 'New Name' });
    });

    expect(result.current.files[0].name).toBe('New Name');
  });

  it('should delete a file', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useFiles(), { wrapper });
    const mockFiles: FileItem[] = [
      {
        id: 'f1',
        name: 'File 1',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 100,
        type: 'text',
      },
      {
        id: 'f2',
        name: 'File 2',
        folderId: '1',
        contentType: 'text/plain',
        sizeBytes: 200,
        type: 'text',
      },
    ];

    act(() => {
      result.current.setFiles(mockFiles);
    });

    act(() => {
      result.current.deleteFile('f1');
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].id).toBe('f2');
  });
});
