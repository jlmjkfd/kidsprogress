/**
 * Addition & Subtraction Settings Editor
 * Shown in task creation modal for parent to configure practice settings
 */
import type { SettingsEditorProps } from '../../_shared/types/plugin-interface';
import type { AdditionSubtractionConfig } from '../types';

export default function SettingsEditor({
  config,
  onChange,
}: SettingsEditorProps<AdditionSubtractionConfig>) {
  const handleChange = (field: keyof AdditionSubtractionConfig, value: number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const maxValue = config.max_value ?? 100;
  const numQuestions = config.num_questions ?? 10;
  const onlyCarry = config.only_carry ?? false;
  const hasTimer = config.has_timer ?? true;
  const requiredAttempts = config.required_attempts ?? null;

  return (
    <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="font-medium text-gray-900">Practice Settings</h4>

      {/* Max Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number Range (max value)
        </label>
        <input
          type="number"
          min={10}
          max={10000}
          value={maxValue}
          onChange={(e) => handleChange('max_value', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Questions will use numbers up to this value (min: 10)
        </p>
      </div>

      {/* Number of Questions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Number of Questions
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={numQuestions}
          onChange={(e) => handleChange('num_questions', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Only Carry Operations */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="only_carry"
          checked={onlyCarry}
          onChange={(e) => handleChange('only_carry', e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1">
          <label htmlFor="only_carry" className="text-sm font-medium text-gray-700 cursor-pointer">
            Only Carry/Borrow Operations
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Practice only addition with carrying and subtraction with borrowing
          </p>
        </div>
      </div>

      {/* Enable Timer */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="has_timer"
          checked={hasTimer}
          onChange={(e) => handleChange('has_timer', e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div className="flex-1">
          <label htmlFor="has_timer" className="text-sm font-medium text-gray-700 cursor-pointer">
            Enable Timer
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Track how long it takes to complete all questions
          </p>
        </div>
      </div>

      {/* Required Attempts */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Required Attempts (Optional)
        </label>
        <input
          type="number"
          min={0}
          max={20}
          value={requiredAttempts ?? ''}
          placeholder="Leave empty for no requirement"
          onChange={(e) => {
            const value = e.target.value === '' ? null : parseInt(e.target.value);
            handleChange('required_attempts', value as any);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Task shows as incomplete/overdue until this many attempts are completed. Kids can still do more attempts after reaching this number.
        </p>
      </div>
    </div>
  );
}
