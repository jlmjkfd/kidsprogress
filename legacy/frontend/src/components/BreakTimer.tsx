import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconCoffee, IconPlayerPlay, IconX } from "@tabler/icons-react";

interface BreakTimerProps {
  durationMinutes: number;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function BreakTimer({ durationMinutes, onComplete, onSkip }: BreakTimerProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onComplete) {
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining, onComplete]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const progress = ((durationMinutes * 60 - secondsRemaining) / (durationMinutes * 60)) * 100;

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl p-8 border-4 border-amber-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconCoffee className="text-amber-600" size={40} />
          <h2 className="text-3xl font-bold text-gray-900">
            {t("tasks:break_suggested")}
          </h2>
        </div>
        {onSkip && (
          <button
            onClick={handleSkip}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
            title={t("common:close")}
          >
            <IconX size={24} />
          </button>
        )}
      </div>

      {/* Message */}
      <p className="text-xl text-gray-700 mb-6">
        {t("tasks:child_portal.break_message")}
      </p>

      {/* Timer Display */}
      <div className="relative mb-6">
        {/* Progress Ring Background */}
        <svg className="w-full max-w-sm mx-auto" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#fde68a"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            className="transition-all duration-1000"
          />
          {/* Center text */}
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-6xl font-bold fill-gray-900"
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-5 rounded-2xl font-bold text-2xl hover:bg-green-700 transition-all shadow-lg hover:scale-105 min-h-[72px]"
          >
            <IconPlayerPlay size={32} />
            {t("tasks:child_portal.start_break")}
          </button>
        ) : (
          <div className="flex-1 bg-white rounded-2xl px-8 py-5 text-center">
            <p className="text-xl font-semibold text-gray-900">
              {t("tasks:child_portal.enjoying_break")}
            </p>
            <p className="text-lg text-gray-600 mt-2">
              {t("tasks:child_portal.relax_message")}
            </p>
          </div>
        )}

        {onSkip && (
          <button
            onClick={handleSkip}
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition-colors min-h-[64px]"
          >
            {t("tasks:child_portal.skip_break")}
          </button>
        )}
      </div>

      {/* Fun motivational message */}
      {isRunning && (
        <div className="mt-6 bg-white rounded-2xl p-4 text-center">
          <p className="text-lg text-gray-700">
            {t("tasks:child_portal.break_tip")}
          </p>
        </div>
      )}
    </div>
  );
}
