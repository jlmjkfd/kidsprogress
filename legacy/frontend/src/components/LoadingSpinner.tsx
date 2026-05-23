/**
 * Unified loading spinner component
 * Provides consistent loading UI across the application
 */
import { useTranslation } from "react-i18next";
import { IconLoader } from "@tabler/icons-react";

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default "md"
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Whether to show loading text
   * @default true
   */
  showText?: boolean;
  /**
   * Custom loading text (defaults to i18n "Loading...")
   */
  text?: string;
  /**
   * Whether this is a full screen/page loader
   * @default false
   */
  fullScreen?: boolean;
  /**
   * Custom className for the container
   */
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export default function LoadingSpinner({
  size = "md",
  showText = true,
  text,
  fullScreen = false,
  className = "",
}: LoadingSpinnerProps) {
  const { t } = useTranslation(["common"]);
  const loadingText = text || t("common:loading", "Loading...");

  const containerClasses = fullScreen
    ? "flex items-center justify-center min-h-screen"
    : "flex flex-col items-center justify-center py-8";

  return (
    <div className={`${containerClasses} ${className}`}>
      <IconLoader
        className="animate-spin text-primary-600"
        size={sizeMap[size]}
      />
      {showText && (
        <p className={`mt-4 text-gray-600 ${textSizeMap[size]}`}>
          {loadingText}
        </p>
      )}
    </div>
  );
}
