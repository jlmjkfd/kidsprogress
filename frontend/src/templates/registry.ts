/**
 * Template Plugin Registry
 * Auto-discovers and registers all template plugins
 */
import type { TemplatePlugin } from './_shared/types/plugin-interface';
import additionSubtractionPlugin from './addition-subtraction';
import writingPlugin from './writing';

/**
 * Central registry of all template plugins
 * Add new plugins here as they are created
 */
const pluginRegistry = new Map<string, TemplatePlugin>([
  [additionSubtractionPlugin.id, additionSubtractionPlugin],
  [writingPlugin.id, writingPlugin],
  // Add more plugins here:
  // [multiplicationPlugin.id, multiplicationPlugin],
]);

/**
 * Get a plugin by its ID
 */
export function getPlugin(id: string): TemplatePlugin | undefined {
  return pluginRegistry.get(id);
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): TemplatePlugin[] {
  return Array.from(pluginRegistry.values());
}

/**
 * Get plugins filtered by tag
 */
export function getPluginsByTag(tag: string): TemplatePlugin[] {
  return getAllPlugins().filter((plugin) =>
    plugin.description.toLowerCase().includes(tag.toLowerCase())
  );
}

/**
 * Check if a plugin exists
 */
export function hasPlugin(id: string): boolean {
  return pluginRegistry.has(id);
}

/**
 * Register a new plugin (for dynamic registration)
 */
export function registerPlugin(plugin: TemplatePlugin): void {
  if (pluginRegistry.has(plugin.id)) {
    console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
  }
  pluginRegistry.set(plugin.id, plugin);
}

export default {
  getPlugin,
  getAllPlugins,
  getPluginsByTag,
  hasPlugin,
  registerPlugin,
};
