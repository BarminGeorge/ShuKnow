import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { foldersAtom, isLoadingFoldersAtom, loadFoldersAtom, updateFolderAtom, setFoldersAtom } from '../store';

export function useFolders() {
  const [folders, setFolders] = useAtom(foldersAtom);
  const isLoading = useAtomValue(isLoadingFoldersAtom);
  const loadFolders = useSetAtom(loadFoldersAtom);
  const updateFolder = useSetAtom(updateFolderAtom);
  const setFoldersDirectly = useSetAtom(setFoldersAtom);

  return {
    folders,
    setFolders,
    isLoading,
    loadFolders,
    updateFolder,
    setFoldersDirectly,
  };
}
