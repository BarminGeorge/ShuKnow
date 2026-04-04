import { authHandlers } from './auth';
import { folderHandlers } from './folders';
import { fileHandlers } from './files';

export const handlers = [
  ...authHandlers,
  ...folderHandlers,
  ...fileHandlers,
];
