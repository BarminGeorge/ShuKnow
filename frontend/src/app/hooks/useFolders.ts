import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { 
  foldersAtom, 
  isLoadingFoldersAtom, 
  loadFoldersAtom, 
  updateFolderAtom, 
  setFoldersAtom,
  createFolderAtom,
  moveFolderAtom
} from '../store';

export function useFolders() {
  const [folders, setFolders] = useAtom(foldersAtom);
  const isLoading = useAtomValue(isLoadingFoldersAtom);
  const loadFolders = useSetAtom(loadFoldersAtom);
  const updateFolder = useSetAtom(updateFolderAtom);
  const setFoldersDirectly = useSetAtom(setFoldersAtom);
  const createFolder = useSetAtom(createFolderAtom);
  const moveFolder = useSetAtom(moveFolderAtom);

  return {
    folders,
    setFolders: setFoldersDirectly,
    isLoading,
    loadFolders,
    updateFolder,
    createFolder,
    moveFolder,
  };
}
