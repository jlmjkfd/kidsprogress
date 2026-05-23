/**
 * Tool Plugin Registry
 * Central registry for all execution tools
 */
import type { ToolPlugin } from './types';

const toolRegistry = new Map<string, ToolPlugin>();

export function registerTool(plugin: ToolPlugin): void {
  if (toolRegistry.has(plugin.id)) {
    console.warn(`Tool plugin "${plugin.id}" is already registered. Overwriting.`);
  }
  toolRegistry.set(plugin.id, plugin);
}

export function getTool(toolId: string): ToolPlugin | undefined {
  return toolRegistry.get(toolId);
}

export function getAllTools(): ToolPlugin[] {
  return Array.from(toolRegistry.values());
}

export function getSystemTools(): ToolPlugin[] {
  return Array.from(toolRegistry.values()).filter(tool => tool.isSystemTool);
}

export function getToolsByCategory(category: ToolPlugin['category']): ToolPlugin[] {
  return Array.from(toolRegistry.values()).filter(tool => tool.category === category);
}
