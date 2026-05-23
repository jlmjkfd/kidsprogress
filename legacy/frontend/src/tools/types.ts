/**
 * Tool Plugin System
 * Similar to template plugins, but for execution tools (timer, notes, calculator, etc.)
 */

export interface ToolState {
  [key: string]: any; // Tool-specific state
}

export interface ToolProps {
  taskId: string;
  childId: string;
  state: any; // Tool-specific state
  onChange: (state: any) => void;
  isActive: boolean; // Whether tool is currently visible/active
}

export interface ToolPlugin {
  id: string;
  name: string; // Display name
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  component: React.ComponentType<ToolProps>;
  defaultState: any; // Initial state for this tool

  // Metadata
  category: 'timer' | 'note' | 'calculator' | 'media' | 'other';
  isSystemTool: boolean; // System tools available to all tasks
  requiresPermission?: boolean; // Future: parent approval required
}

export interface ToolData {
  toolId: string;
  state: any;
  lastUpdated: string;
}

export interface ExecutionSession {
  taskId: string;
  childId: string;
  startedAt: string;
  tools: Record<string, ToolData>; // toolId -> tool data
  notes?: string; // General notes for the session
}
