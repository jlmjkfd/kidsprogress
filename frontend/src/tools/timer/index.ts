/**
 * Timer Tool Plugin Registration
 */
import { IconClock } from '@tabler/icons-react';
import type { ToolPlugin } from '../types';
import TimerTool from './TimerTool';

export const timerToolPlugin: ToolPlugin = {
  id: 'timer',
  name: 'Timer',
  icon: IconClock,
  description: 'Track time spent on task',
  component: TimerTool,
  defaultState: {
    elapsedSeconds: 0,
    isRunning: false,
    startedAt: undefined,
  },
  category: 'timer',
  isSystemTool: true,
};
