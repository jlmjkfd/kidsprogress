/**
 * Note Tool Plugin
 * Take notes during task execution
 */
import { IconNote } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { ToolProps } from '../types';

interface NoteState {
  content: string;
  lastUpdated?: string;
}

export default function NoteTool({ state, onChange }: ToolProps) {
  const { t } = useTranslation(['common']);
  const noteState = state as NoteState;

  const handleChange = (content: string) => {
    onChange({
      content,
      lastUpdated: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <IconNote size={20} className="text-purple-600" />
        <h3 className="font-semibold text-gray-900">Notes</h3>
      </div>

      <textarea
        value={noteState.content || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('common:write_notes_here')}
        className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
      />

      {noteState.lastUpdated && (
        <p className="text-xs text-gray-500 mt-2">
          {t('common:last_saved')}: {new Date(noteState.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
