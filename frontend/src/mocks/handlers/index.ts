import { authHandlers } from './auth';
import { folderHandlers } from './folders';
import { fileHandlers } from './files';
import { chatHandlers } from './chat';

export const handlers = [
  ...authHandlers,
  ...folderHandlers,
  ...fileHandlers,
  ...chatHandlers,
];
