  const handleFolderClick = (folder: Folder, path: string[]) => {
    setSelectedFolderPath(path);
    setViewMode('folder');
  };

  const handleUpdateFolder = (path: string[], updates: Partial<Folder>) => {
    updateFolder(path, updates);
  };