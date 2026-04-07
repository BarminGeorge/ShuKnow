import { authHandlers } from './auth';
import { folderHandlers } from './folders';
import { fileHandlers } from './files';
import { chatHandlers } from './chat';
import { settingsHandlers } from './settings';

export const handlers = [
  ...authHandlers,
  ...folderHandlers,
  ...fileHandlers,
  ...chatHandlers,
  ...settingsHandlers,
];
