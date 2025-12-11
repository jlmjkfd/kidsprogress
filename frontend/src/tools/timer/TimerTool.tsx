/**
 * Timer Tool Plugin
 * Tracks time spent on task
 */
import { useEffect } from 'react';
import { IconClock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ToolProps } from '../types';

interface TimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  startedAt?: string;
}

export default function TimerTool({ state, onChange, isActive }: ToolProps) {
  const { t } = useTranslation(['common']);
  const timerState = state as TimerState;

  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      onChange({
        ...timerState,
        elapsedSeconds: timerState.elapsedSeconds + 1,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.elapsedSeconds, onChange]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    onChange({
      ...timerState,
      isRunning: !timerState.isRunning,
      startedAt: !timerState.isRunning ? new Date().toISOString() : timerState.startedAt,
    });
  };

  const resetTimer = () => {
    onChange({
      elapsedSeconds: 0,
      isRunning: false,
      startedAt: undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconClock size={20} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Timer</h3>
        </div>
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900 mb-4 font-mono">
          {formatTime(timerState.elapsedSeconds)}
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={toggleTimer}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              timerState.isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {timerState.isRunning ? t('common:pause') : t('common:start')}
          </button>
          <button
            onClick={resetTimer}
            className="px-6 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            {t('common:reset')}
          </button>
        </div>
      </div>
    </div>
  );
}
