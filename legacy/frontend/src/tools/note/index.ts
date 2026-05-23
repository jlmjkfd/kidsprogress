/**
 * Note Tool Plugin Registration
 */
import { IconNote } from '@tabler/icons-react';
import type { ToolPlugin } from '../types';
import NoteTool from './NoteTool';

export const noteToolPlugin: ToolPlugin = {
  id: 'note',
  name: 'Notes',
  icon: IconNote,
  description: 'Take notes while working on task',
  component: NoteTool,
  defaultState: {
    content: '',
    lastUpdated: undefined,
  },
  category: 'note',
  isSystemTool: true,
};
