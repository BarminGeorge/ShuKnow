import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GridContainer } from '../GridContainer';
import type { GridItem } from '../../types';
import type { FileItem } from '../../../../../api/types';

describe('GridContainer', () => {
  const mockGridRef = { current: null };
  const mockMoveItem = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnFileContextMenu = vi.fn();
  const mockOnFolderContextMenu = vi.fn();
  const mockOnFolderClick = vi.fn();
  const mockOnFileDoubleClick = vi.fn();
  const mockOnMoveItemToFolder = vi.fn();
  const mockOnFileNameChange = vi.fn();
  const mockOnEditingComplete = vi.fn();
  const mockOnCreateFolder = vi.fn();
  const mockOnCreateFile = vi.fn();

  const mockFile: FileItem = {
    id: 'file-1',
    name: 'test.txt',
    type: 'text',
    folderId: 'folder-1',
    content: 'test',
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
  };

  const mockGridItems: GridItem[] = [
    {
      id: 'file-1',
      type: 'file',
      data: mockFile,
    },
  ];

  const defaultProps = {
    gridRef: mockGridRef,
    gridItems: mockGridItems,
    isFileOver: false,
    emoji: '📁',
    moveItem: mockMoveItem,
    onDragEnd: mockOnDragEnd,
    onFileContextMenu: mockOnFileContextMenu,
    onFolderContextMenu: mockOnFolderContextMenu,
    onFolderClick: mockOnFolderClick,
    onFileDoubleClick: mockOnFileDoubleClick,
    onMoveItemToFolder: mockOnMoveItemToFolder,
    editingFileId: null,
    onFileNameChange: mockOnFileNameChange,
    onEditingComplete: mockOnEditingComplete,
    allFiles: [mockFile],
    openContextMenuId: null,
    onCreateFolder: mockOnCreateFolder,
    onCreateFile: mockOnCreateFile,
  };

  it('should render grid items', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} />
      </DndProvider>
    );

    expect(getByText('test')).toBeInTheDocument();
  });

  it('should render empty state when no items', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} gridItems={[]} />
      </DndProvider>
    );

    expect(getByText('Папка пуста')).toBeInTheDocument();
    expect(getByText('Перетащите файлы сюда или создайте новый')).toBeInTheDocument();
  });

  it('should show emoji in empty state', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} gridItems={[]} />
      </DndProvider>
    );

    expect(getByText('📁')).toBeInTheDocument();
  });

  it('should show create buttons in empty state', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} gridItems={[]} />
      </DndProvider>
    );

    expect(getByText('Создать папку')).toBeInTheDocument();
    expect(getByText('Создать файл')).toBeInTheDocument();
  });

  it('should show drop overlay when file is over and has items', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} isFileOver={true} />
      </DndProvider>
    );

    expect(getByText('Отпустите файлы для загрузки')).toBeInTheDocument();
  });

  it('should show upload message in empty state when file is over', () => {
    const { getByText, queryByText } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} gridItems={[]} isFileOver={true} />
      </DndProvider>
    );

    expect(getByText('Отпустите файлы для загрузки')).toBeInTheDocument();
    expect(queryByText('Создать папку')).not.toBeInTheDocument();
  });

  it('should render CustomDragLayer', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} />
      </DndProvider>
    );

    // CustomDragLayer is rendered
    expect(container.querySelector('.flex-1.overflow-y-auto')).toBeInTheDocument();
  });

  it('should apply correct grid styles', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <GridContainer {...defaultProps} />
      </DndProvider>
    );

    const gridElement = container.querySelector('.grid.gap-4');
    expect(gridElement).toBeInTheDocument();
    expect(gridElement).toHaveStyle({ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' });
  });
});
