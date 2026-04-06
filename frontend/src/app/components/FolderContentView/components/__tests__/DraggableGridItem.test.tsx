import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableGridItem } from '../DraggableGridItem';
import type { GridItem } from '../../types';
import type { Folder, FileItem } from '../../../../../api/types';

describe('DraggableGridItem', () => {
  const mockMoveItem = vi.fn();
  const mockOnDragEnd = vi.fn();
  const mockOnFileContextMenu = vi.fn();
  const mockOnFolderContextMenu = vi.fn();
  const mockOnFolderClick = vi.fn();
  const mockOnFileDoubleClick = vi.fn();
  const mockOnMoveItemToFolder = vi.fn();
  const mockOnFileNameChange = vi.fn();
  const mockOnEditingComplete = vi.fn();

  const mockFile: FileItem = {
    id: 'file-1',
    name: 'test-document.txt',
    type: 'text',
    folderId: 'folder-1',
    content: 'test content',
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
  };

  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    emoji: '📁',
    description: 'Test description',
    sortOrder: 0,
    fileCount: 5,
    subfolders: [],
  };

  const mockFileGridItem: GridItem = {
    id: 'file-1',
    type: 'file',
    data: mockFile,
  };

  const mockFolderGridItem: GridItem = {
    id: 'folder-1',
    type: 'folder',
    data: mockFolder,
  };

  const defaultProps = {
    index: 0,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render file item correctly', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFileGridItem} {...defaultProps} />
      </DndProvider>
    );

    expect(getByText('test-document')).toBeInTheDocument();
    expect(getByText('TXT')).toBeInTheDocument();
  });

  it('should render folder item correctly', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFolderGridItem} {...defaultProps} />
      </DndProvider>
    );

    expect(getByText('Test Folder')).toBeInTheDocument();
    expect(getByText('📁')).toBeInTheDocument();
  });

  it('should call onFileContextMenu when clicking more button on file', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFileGridItem} {...defaultProps} />
      </DndProvider>
    );

    const moreButton = container.querySelector('button');
    if (moreButton) {
      fireEvent.click(moreButton);
      expect(mockOnFileContextMenu).toHaveBeenCalledWith('file-1', expect.any(Object));
    }
  });

  it('should call onFolderContextMenu when clicking more button on folder', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFolderGridItem} {...defaultProps} />
      </DndProvider>
    );

    const moreButton = container.querySelector('button');
    if (moreButton) {
      fireEvent.click(moreButton);
      expect(mockOnFolderContextMenu).toHaveBeenCalledWith('folder-1', expect.any(Object));
    }
  });

  it('should call onFolderClick when clicking folder', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFolderGridItem} {...defaultProps} />
      </DndProvider>
    );

    const folderElement = getByText('Test Folder').closest('div[data-grid-item-id]');
    expect(folderElement).toBeInTheDocument();
    
    if (folderElement) {
      fireEvent.click(folderElement);
      expect(mockOnFolderClick).toHaveBeenCalledWith(mockFolder);
    }
  });

  it('should have file click handler', () => {
    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={mockFileGridItem} {...defaultProps} />
      </DndProvider>
    );

    const fileElement = getByText('test-document').closest('div[data-grid-item-id]');
    expect(fileElement).toBeInTheDocument();
  });

  it('should show file name input when editing', () => {
    const { getByDisplayValue } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem 
          item={mockFileGridItem} 
          {...defaultProps} 
          editingFileId="file-1"
        />
      </DndProvider>
    );

    expect(getByDisplayValue('test-document.txt')).toBeInTheDocument();
  });

  it('should call onFileNameChange when editing file name', () => {
    const { getByDisplayValue } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem 
          item={mockFileGridItem} 
          {...defaultProps} 
          editingFileId="file-1"
        />
      </DndProvider>
    );

    const input = getByDisplayValue('test-document.txt');
    fireEvent.change(input, { target: { value: 'new-name.txt' } });
    fireEvent.blur(input);

    expect(mockOnFileNameChange).toHaveBeenCalledWith('file-1', 'new-name.txt');
  });

  it('should display folder stats correctly', () => {
    const folderWithStats: Folder = {
      ...mockFolder,
      subfolders: [{ ...mockFolder, id: 'sub-1' }],
    };

    const gridItem: GridItem = {
      id: 'folder-1',
      type: 'folder',
      data: folderWithStats,
    };

    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem 
          item={gridItem} 
          {...defaultProps}
          allFiles={[mockFile]}
        />
      </DndProvider>
    );

    // Should show folder count and file count
    expect(getByText(/папк/)).toBeInTheDocument();
  });

  it('should render with context menu open', () => {
    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem 
          item={mockFileGridItem} 
          {...defaultProps}
          openContextMenuId="file-1"
        />
      </DndProvider>
    );

    const itemElement = container.querySelector('div[data-grid-item-id]');
    expect(itemElement).toBeInTheDocument();
  });

  it('should render photo preview for photo files', () => {
    const photoFile: FileItem = {
      ...mockFile,
      id: 'photo-1',
      name: 'photo.jpg',
      type: 'photo',
      contentUrl: 'https://example.com/photo.jpg',
    };

    const photoGridItem: GridItem = {
      id: 'photo-1',
      type: 'file',
      data: photoFile,
    };

    const { getByAltText } = render(
      <DndProvider backend={HTML5Backend}>
        <DraggableGridItem item={photoGridItem} {...defaultProps} />
      </DndProvider>
    );

    expect(getByAltText('photo.jpg')).toBeInTheDocument();
  });
});
