/**
 * Tool Plugin System Entry Point
 * Registers all system tools
 */
import { registerTool } from './registry';
import { timerToolPlugin } from './timer';
import { noteToolPlugin } from './note';
import { calculatorToolPlugin } from './calculator';

// Register all system tools
registerTool(timerToolPlugin);
registerTool(noteToolPlugin);
registerTool(calculatorToolPlugin);

// Re-export registry functions
export { getTool, getAllTools, getSystemTools, getToolsByCategory } from './registry';
export type { ToolPlugin, ToolProps, ToolState, ToolData, ExecutionSession } from './types';
