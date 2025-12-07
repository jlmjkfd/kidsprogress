/**
 * PluginSettingsEditor - Plugin-based configuration editor
 * Dynamically loads the SettingsEditor component from the selected plugin
 */
import { TaskTemplate } from "@/types/template";
import { getPlugin } from "@/templates/registry";

interface PluginSettingsEditorProps {
  template: TaskTemplate;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function PluginSettingsEditor({
  template,
  config,
  onChange,
}: PluginSettingsEditorProps) {
  // Get the plugin by template_id
  const plugin = getPlugin(template.template_id);

  if (!plugin) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="text-sm text-gray-500">
          No configuration available for this template
        </div>
      </div>
    );
  }

  // Get the SettingsEditor component from the plugin
  const { SettingsEditor } = plugin.components;

  // Merge config with default values
  const mergedConfig = {
    ...plugin.defaultConfig,
    ...template.execution_config,
    ...config,
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <SettingsEditor config={mergedConfig} onChange={onChange} />
    </div>
  );
}
