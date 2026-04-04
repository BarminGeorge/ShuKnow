import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useWorkspaceView } from '../useWorkspaceView';
import { useFolders } from '../useFolders';
import type { Folder } from '../../../api/types';

describe('useWorkspaceView', () => {
  it('should return initial values', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useWorkspaceView(), { wrapper });
    
    expect(result.current.viewMode).toBe('chat');
    expect(result.current.isSidebarCollapsed).toBe(false);
    expect(result.current.selectedFolderPath).toBe(null);
    expect(result.current.currentFolder).toBe(null);
    expect(result.current.breadcrumbs).toEqual([]);
  });

  it('should allow changing view mode', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useWorkspaceView(), { wrapper });

    act(() => {
      result.current.setViewMode('folder');
    });

    expect(result.current.viewMode).toBe('folder');
  });

  it('should allow toggling sidebar', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useWorkspaceView(), { wrapper });

    act(() => {
      result.current.setIsSidebarCollapsed(true);
    });

    expect(result.current.isSidebarCollapsed).toBe(true);
  });

  it('should allow setting folder path', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useWorkspaceView(), { wrapper });

    act(() => {
      result.current.setSelectedFolderPath(['0']);
    });

    expect(result.current.selectedFolderPath).toEqual(['0']);
  });

  it('should return current folder and breadcrumbs', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    
    const { result } = renderHook(() => ({
      view: useWorkspaceView(),
      folders: useFolders(),
    }), { wrapper });

    const mockFolders: Folder[] = [
      {
        id: '1',
        name: 'Test Folder',
        description: 'Test',
        sortOrder: 0,
        fileCount: 0,
        subfolders: [
          {
            id: '1-1',
            name: 'Subfolder',
            description: '',
            sortOrder: 0,
            fileCount: 0,
            subfolders: [],
          },
        ],
      },
    ];

    act(() => {
      result.current.folders.setFolders(mockFolders);
      result.current.view.setSelectedFolderPath(['0']);
    });

    expect(result.current.view.currentFolder?.name).toBe('Test Folder');
    expect(result.current.view.breadcrumbs).toEqual(['Test Folder']);

    act(() => {
      result.current.view.setSelectedFolderPath(['0', '0']);
    });

    expect(result.current.view.currentFolder?.name).toBe('Subfolder');
    expect(result.current.view.breadcrumbs).toEqual(['Test Folder', 'Subfolder']);
  });
});
