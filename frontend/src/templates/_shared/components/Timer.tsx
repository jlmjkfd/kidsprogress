/**
 * Shared Timer Component
 * Reusable timer for template plugins
 */
import { IconClock } from '@tabler/icons-react';

interface TimerProps {
  seconds: number;
  className?: string;
}

export function Timer({ seconds, className = '' }: TimerProps) {
  const formatTime = (secs: number): string => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const remainingSeconds = secs % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center gap-2 text-lg font-mono bg-blue-50 text-blue-700 px-4 py-2 rounded-lg ${className}`}
    >
      <IconClock size={20} />
      <span>{formatTime(seconds)}</span>
    </div>
  );
}
