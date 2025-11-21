/**
 * Executor registry for task execution handlers
 */
import type { ExecutorComponent } from "./types";
import { PassiveFormExecutor } from "./PassiveFormExecutor";
import { ContentCreationExecutor } from "./ContentCreationExecutor";

export const EXECUTOR_REGISTRY: Record<string, ExecutorComponent> = {
  passive_form: PassiveFormExecutor,
  content_creation: ContentCreationExecutor,
};

export function getExecutor(handlerType: string): ExecutorComponent {
  const executor = EXECUTOR_REGISTRY[handlerType];
  if (!executor) {
    throw new Error(`Unknown executor: ${handlerType}`);
  }
  return executor;
}
