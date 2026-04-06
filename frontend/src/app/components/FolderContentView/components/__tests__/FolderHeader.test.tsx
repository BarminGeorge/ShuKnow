import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { FolderHeader } from '../FolderHeader';

describe('FolderHeader', () => {
  const mockOnBreadcrumbClick = vi.fn();
  const mockSetIsEmojiPickerOpen = vi.fn();
  const mockOnEmojiSelect = vi.fn();
  const mockOnEmojiRemove = vi.fn();
  const mockSetTitle = vi.fn();
  const mockSetIsEditingTitle = vi.fn();
  const mockOnTitleBlur = vi.fn();
  const mockOnCreateFolder = vi.fn();
  const mockOnCreateFile = vi.fn();
  const mockOnAttachFile = vi.fn();
  const mockSetAiPrompt = vi.fn();
  const mockOnPromptBlur = vi.fn();
  const mockOnFileInputChange = vi.fn();

  const defaultProps = {
    breadcrumbs: ['Workspace', 'Projects', 'Current'],
    onBreadcrumbClick: mockOnBreadcrumbClick,
    emoji: '📁',
    isEmojiPickerOpen: false,
    setIsEmojiPickerOpen: mockSetIsEmojiPickerOpen,
    onEmojiSelect: mockOnEmojiSelect,
    onEmojiRemove: mockOnEmojiRemove,
    title: 'Test Folder',
    setTitle: mockSetTitle,
    isEditingTitle: false,
    setIsEditingTitle: mockSetIsEditingTitle,
    onTitleBlur: mockOnTitleBlur,
    subfolderCount: 3,
    fileCount: 5,
    photoCount: 2,
    hasGridItems: true,
    onCreateFolder: mockOnCreateFolder,
    onCreateFile: mockOnCreateFile,
    onAttachFile: mockOnAttachFile,
    fileInputRef: { current: null },
    onFileInputChange: mockOnFileInputChange,
    aiPrompt: 'Test prompt',
    setAiPrompt: mockSetAiPrompt,
    onPromptBlur: mockOnPromptBlur,
  };

  it('should render breadcrumbs correctly', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    expect(getByText('Workspace')).toBeInTheDocument();
    expect(getByText('Projects')).toBeInTheDocument();
    expect(getByText('Current')).toBeInTheDocument();
  });

  it('should call onBreadcrumbClick when clicking non-last breadcrumb', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    fireEvent.click(getByText('Workspace'));
    expect(mockOnBreadcrumbClick).toHaveBeenCalledWith(0);
  });

  it('should render emoji', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    expect(getByText('📁')).toBeInTheDocument();
  });

  it('should render title', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    expect(getByText('Test Folder')).toBeInTheDocument();
  });

  it('should show title input when editing', () => {
    const { getByDisplayValue } = render(
      <FolderHeader {...defaultProps} isEditingTitle={true} />
    );
    
    expect(getByDisplayValue('Test Folder')).toBeInTheDocument();
  });

  it('should call setTitle when typing in title input', () => {
    const { getByDisplayValue } = render(
      <FolderHeader {...defaultProps} isEditingTitle={true} />
    );
    
    const input = getByDisplayValue('Test Folder');
    fireEvent.change(input, { target: { value: 'New Title' } });
    
    expect(mockSetTitle).toHaveBeenCalled();
  });

  it('should call onTitleBlur when blurring title input', () => {
    const { getByDisplayValue } = render(
      <FolderHeader {...defaultProps} isEditingTitle={true} />
    );
    
    const input = getByDisplayValue('Test Folder');
    fireEvent.blur(input);
    
    expect(mockOnTitleBlur).toHaveBeenCalled();
  });

  it('should render folder stats', () => {
    const { container } = render(<FolderHeader {...defaultProps} />);
    
    // Should show stats in the header
    const statsElement = container.querySelector('.text-sm.text-gray-400');
    expect(statsElement).toBeInTheDocument();
  });

  it('should render create buttons when hasGridItems is true', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    expect(getByText('Создать папку')).toBeInTheDocument();
    expect(getByText('Создать файл')).toBeInTheDocument();
  });

  it('should not render create buttons when hasGridItems is false', () => {
    const { queryByText } = render(
      <FolderHeader {...defaultProps} hasGridItems={false} />
    );
    
    expect(queryByText('Создать папку')).not.toBeInTheDocument();
    expect(queryByText('Создать файл')).not.toBeInTheDocument();
  });

  it('should call onCreateFolder when clicking create folder button', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    fireEvent.click(getByText('Создать папку'));
    expect(mockOnCreateFolder).toHaveBeenCalled();
  });

  it('should call onCreateFile when clicking create file button', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    fireEvent.click(getByText('Создать файл'));
    expect(mockOnCreateFile).toHaveBeenCalled();
  });

  it('should call onAttachFile when clicking attach file button', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    fireEvent.click(getByText('Прикрепить файл'));
    expect(mockOnAttachFile).toHaveBeenCalled();
  });

  it('should render AI prompt textarea', () => {
    const { getByDisplayValue } = render(<FolderHeader {...defaultProps} />);
    
    expect(getByDisplayValue('Test prompt')).toBeInTheDocument();
  });

  it('should call setAiPrompt when typing in prompt textarea', () => {
    const { getByDisplayValue } = render(<FolderHeader {...defaultProps} />);
    
    const textarea = getByDisplayValue('Test prompt');
    fireEvent.change(textarea, { target: { value: 'New prompt' } });
    
    expect(mockSetAiPrompt).toHaveBeenCalledWith('New prompt');
  });

  it('should call onPromptBlur when blurring prompt textarea', () => {
    const { getByDisplayValue } = render(<FolderHeader {...defaultProps} />);
    
    const textarea = getByDisplayValue('Test prompt');
    fireEvent.blur(textarea);
    
    expect(mockOnPromptBlur).toHaveBeenCalled();
  });

  it('should toggle emoji picker when clicking emoji button', () => {
    const { getByText } = render(<FolderHeader {...defaultProps} />);
    
    const emojiButton = getByText('📁').closest('button');
    if (emojiButton) {
      fireEvent.click(emojiButton);
      expect(mockSetIsEmojiPickerOpen).toHaveBeenCalledWith(true);
    }
  });

  it('should show "Add icon" text when no emoji', () => {
    const { getByText } = render(
      <FolderHeader {...defaultProps} emoji="" />
    );
    
    expect(getByText('иконка')).toBeInTheDocument();
  });
});
