/**
 * Writing SettingsEditor - Configuration UI for writing tasks
 */
import type { SettingsEditorProps } from "@/templates/_shared/types/plugin-interface";
import type { WritingConfig } from '../types';

export default function SettingsEditor({
  config,
  onChange,
}: SettingsEditorProps<WritingConfig>) {
  const handleChange = <K extends keyof WritingConfig>(field: K, value: WritingConfig[K]) => {
    onChange({ ...config, [field]: value });
  };

  const handlePromptsChange = (value: string) => {
    // Split by newlines and filter empty lines
    const prompts = value.split('\n').filter(p => p.trim());
    handleChange('prompts', prompts);
  };

  const promptsText = Array.isArray(config.prompts) ? config.prompts.join('\n') : '';

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Writing Settings</h4>

      {/* Writing Prompts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Writing Prompts (one per line)
        </label>
        <textarea
          rows={3}
          value={promptsText}
          onChange={(e) => handlePromptsChange(e.target.value)}
          placeholder="Write about your favorite day&#10;Describe what made it special"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Each line will be shown as a separate prompt
        </p>
      </div>

      {/* Minimum Words */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Words
        </label>
        <input
          type="number"
          min={1}
          value={config.min_length ?? 50}
          onChange={(e) => handleChange('min_length', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Maximum Words */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Words
        </label>
        <input
          type="number"
          min={config.min_length || 1}
          value={config.max_length ?? 2000}
          onChange={(e) => handleChange('max_length', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* AI Feedback */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="allow_llm_feedback"
          checked={config.allow_llm_feedback ?? true}
          onChange={(e) => handleChange('allow_llm_feedback', e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1">
          <label htmlFor="allow_llm_feedback" className="text-sm font-medium text-gray-700 cursor-pointer">
            Enable AI Feedback
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Provide AI-powered feedback on writing quality
          </p>
        </div>
      </div>

      {/* Save Drafts */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="save_drafts"
          checked={config.save_drafts ?? false}
          onChange={(e) => handleChange('save_drafts', e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1">
          <label htmlFor="save_drafts" className="text-sm font-medium text-gray-700 cursor-pointer">
            Allow Saving Drafts
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Let child save progress before final submission
          </p>
        </div>
      </div>
    </div>
  );
}
