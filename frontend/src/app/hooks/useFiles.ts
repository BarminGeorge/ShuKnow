import { useAtom, useSetAtom } from 'jotai';
import { filesAtom, createFileAtom, updateFileAtom, deleteFileAtom } from '../store';

export function useFiles() {
  const [files, setFiles] = useAtom(filesAtom);
  const createFile = useSetAtom(createFileAtom);
  const updateFile = useSetAtom(updateFileAtom);
  const deleteFile = useSetAtom(deleteFileAtom);

  return {
    files,
    setFiles,
    createFile,
    updateFile,
    deleteFile,
  };
}
