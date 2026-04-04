import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useTabs } from '../useTabs';
import { useFiles } from '../useFiles';
import type { FileItem } from '../../../api/types';

describe('useTabs', () => {
  it('should return empty tabs initially', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useTabs(), { wrapper });
    expect(result.current.openTabs).toEqual([]);
    expect(result.current.activeTab).toBe(null);
    expect(result.current.activeTabId).toBe(null);
  });

  it('should open a tab', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => ({
      files: useFiles(),
      tabs: useTabs(),
    }), { wrapper });

    const mockFile: FileItem = {
      id: 'f1',
      name: 'Test File',
      folderId: '1',
      contentType: 'text/plain',
      sizeBytes: 100,
      type: 'text',
    };

    act(() => {
      result.current.files.setFiles([mockFile]);
    });

    act(() => {
      result.current.tabs.openTab('f1');
    });

    expect(result.current.tabs.openTabs).toHaveLength(1);
    expect(result.current.tabs.activeTabId).toBe('f1');
  });

  it('should close a tab', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => ({
      files: useFiles(),
      tabs: useTabs(),
    }), { wrapper });

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
      result.current.files.setFiles(mockFiles);
    });

    act(() => {
      result.current.tabs.openTab('f1');
      result.current.tabs.openTab('f2');
    });

    expect(result.current.tabs.openTabs).toHaveLength(2);

    act(() => {
      result.current.tabs.closeTab('f1');
    });

    expect(result.current.tabs.openTabs).toHaveLength(1);
    expect(result.current.tabs.openTabs[0].id).toBe('f2');
  });

  it('should switch active tab', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => ({
      files: useFiles(),
      tabs: useTabs(),
    }), { wrapper });

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
      result.current.files.setFiles(mockFiles);
      result.current.tabs.openTab('f1');
      result.current.tabs.openTab('f2');
    });

    expect(result.current.tabs.activeTabId).toBe('f2');

    act(() => {
      result.current.tabs.switchTab('f1');
    });

    expect(result.current.tabs.activeTabId).toBe('f1');
  });
});
