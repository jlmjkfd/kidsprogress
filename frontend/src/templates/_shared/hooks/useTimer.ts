/**
 * Shared Timer Hook
 * Reusable timer logic for template plugins
 */
import { useState, useEffect, useRef } from 'react';

interface UseTimerOptions {
  autoStart?: boolean;
  initialSeconds?: number;
  onTick?: (seconds: number) => void;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { autoStart = false, initialSeconds = 0, onTick } = options;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1;
          onTick?.(newSeconds);
          return newSeconds;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTick]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = (value: number = 0) => {
    setSeconds(value);
    setIsRunning(autoStart); // If autoStart was true, keep it running
  };

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
  };
}
