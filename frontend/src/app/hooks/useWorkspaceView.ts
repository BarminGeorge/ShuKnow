import { useAtom, useAtomValue } from 'jotai';
import { 
  viewModeAtom, 
  isSidebarCollapsedAtom, 
  selectedFolderPathAtom, 
  currentFolderAtom, 
  breadcrumbsAtom 
} from '../store';

export function useWorkspaceView() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useAtom(isSidebarCollapsedAtom);
  const [selectedFolderPath, setSelectedFolderPath] = useAtom(selectedFolderPathAtom);
  const currentFolder = useAtomValue(currentFolderAtom);
  const breadcrumbs = useAtomValue(breadcrumbsAtom);

  return {
    viewMode,
    setViewMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    selectedFolderPath,
    setSelectedFolderPath,
    currentFolder,
    breadcrumbs,
  };
}
