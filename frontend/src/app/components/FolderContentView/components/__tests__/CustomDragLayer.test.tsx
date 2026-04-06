import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CustomDragLayer } from '../CustomDragLayer';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Mock useDragLayer
vi.mock('react-dnd', async () => {
  const actual = await vi.importActual('react-dnd');
  return {
    ...actual,
    useDragLayer: vi.fn(),
  };
});

describe('CustomDragLayer', () => {

  it('should return null when not dragging', () => {
    vi.mocked(useDragLayer).mockReturnValue({
      isDragging: false,
      item: null,
      currentOffset: null,
      itemType: null,
    });

    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
      </DndProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should return null when no current offset', () => {
    vi.mocked(useDragLayer).mockReturnValue({
      isDragging: true,
      item: { name: 'test' },
      currentOffset: null,
      itemType: 'GRID_ITEM',
    });

    const { container } = render(
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
      </DndProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render file preview when dragging file', () => {
    vi.mocked(useDragLayer).mockReturnValue({
      isDragging: true,
      item: {
        name: 'document.txt',
        origType: 'file',
        fileType: 'text',
        sourceWidth: 280,
        sourceHeight: 180,
        relativeDate: 'сегодня',
      },
      currentOffset: { x: 100, y: 100 },
      itemType: 'GRID_ITEM',
    });

    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
      </DndProvider>
    );

    expect(getByText('document')).toBeInTheDocument();
    expect(getByText('TXT')).toBeInTheDocument();
    expect(getByText('сегодня')).toBeInTheDocument();
  });

  it('should render folder preview when dragging folder', () => {
    vi.mocked(useDragLayer).mockReturnValue({
      isDragging: true,
      item: {
        name: 'My Folder',
        origType: 'folder',
        emoji: '📁',
        metaText: '5 файлов',
        sourceWidth: 280,
        sourceHeight: 180,
      },
      currentOffset: { x: 100, y: 100 },
      itemType: 'GRID_ITEM',
    });

    const { getByText } = render(
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
      </DndProvider>
    );

    expect(getByText('My Folder')).toBeInTheDocument();
    expect(getByText('📁')).toBeInTheDocument();
    expect(getByText('5 файлов')).toBeInTheDocument();
  });

  it('should render photo preview when dragging photo', () => {
    vi.mocked(useDragLayer).mockReturnValue({
      isDragging: true,
      item: {
        name: 'photo.jpg',
        origType: 'file',
        fileType: 'photo',
        contentUrl: 'https://example.com/photo.jpg',
        sourceWidth: 280,
        sourceHeight: 180,
        relativeDate: 'вчера',
      },
      currentOffset: { x: 100, y: 100 },
      itemType: 'GRID_ITEM',
    });

    const { getByText, getByAltText } = render(
      <DndProvider backend={HTML5Backend}>
        <CustomDragLayer />
      </DndProvider>
    );

    expect(getByText('photo')).toBeInTheDocument();
    expect(getByText('JPG')).toBeInTheDocument();
    expect(getByAltText('photo.jpg')).toBeInTheDocument();
  });
});
