/**
 * Executor component types
 */

export interface ExecutorProps {
  taskId: string;
  executionData: any; // Handler-specific data from prepare_execution
  onComplete: (completionData: any) => Promise<void>;
  onCancel: () => void;
}

export type ExecutorComponent = (props: ExecutorProps) => JSX.Element;
