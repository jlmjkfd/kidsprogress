import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useCreateTemplate } from '../hooks';

type HandlerChoice = 'generic' | 'addition-subtraction' | 'writing' | 'reading-log';

/**
 * Minimal handler-aware template creation form. v2.5 launch supports two
 * concrete handlers — `generic` (checklist / open-ended) and
 * `addition-subtraction` (math drills). Selecting one swaps in the
 * relevant config-config fields. Richer plugin authoring lands later.
 */
export function NewTemplatePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const create = useCreateTemplate();
  const [handlerId, setHandlerId] = useState<HandlerChoice>('generic');
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxValue, setMaxValue] = useState(20);
  const [allowCarry, setAllowCarry] = useState(true);
  const [includeSubtraction, setIncludeSubtraction] = useState(false);
  const [questionsPerSlot, setQuestionsPerSlot] = useState(10);
  const [requiredSlots, setRequiredSlots] = useState(1);
  // writing
  const [writingPrompt, setWritingPrompt] = useState('');
  const [writingMin, setWritingMin] = useState(30);
  const [writingMax, setWritingMax] = useState(150);
  // reading-log
  const [readingMinMinutes, setReadingMinMinutes] = useState(15);
  const [readingRequireSummary, setReadingRequireSummary] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    const config = (() => {
      switch (handlerId) {
        case 'generic':
          return {
            steps: [],
            ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          };
        case 'addition-subtraction':
          return {
            maxValue,
            operations: includeSubtraction
              ? ['addition', 'subtraction']
              : ['addition'],
            allowCarry,
            minResult: 0,
            questionsPerSlot,
            requiredSlots,
          };
        case 'writing':
          return {
            prompt: writingPrompt.trim(),
            minWords: writingMin,
            maxWords: writingMax,
            aiEvalEnabled: false,
          };
        case 'reading-log':
          return {
            minMinutes: readingMinMinutes,
            requireSummary: readingRequireSummary,
          };
      }
    })();
    create.mutate(
      { handlerId, schemaVersion: 1, name: name.trim(), config },
      {
        onSuccess: () => navigate('/parent/templates', { replace: true }),
        onError: () => setError('templates.create_failed'),
      },
    );
  };

  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
        <h1 className="text-2xl font-display">{t('templates.new_title')}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="handler" className="block text-sm mb-1">
              {t('templates.field_handler')}
            </label>
            <select
              id="handler"
              value={handlerId}
              onChange={(e) => setHandlerId(e.target.value as HandlerChoice)}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            >
              <option value="generic">{t('templates.handler_generic')}</option>
              <option value="addition-subtraction">
                {t('templates.handler_math')}
              </option>
              <option value="writing">{t('templates.handler_writing')}</option>
              <option value="reading-log">{t('templates.handler_reading_log')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm mb-1">
              {t('templates.field_name')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              maxLength={200}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>

          {handlerId === 'generic' && (
            <div>
              <label htmlFor="instructions" className="block text-sm mb-1">
                {t('templates.field_instructions')}
              </label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full rounded-2xl border border-text-muted/30 bg-surface p-3"
              />
              <p className="text-xs text-text-muted mt-1">
                {t('templates.field_instructions_hint')}
              </p>
            </div>
          )}

          {handlerId === 'writing' && (
            <div className="space-y-3 p-3 rounded-2xl bg-surface">
              <div>
                <label htmlFor="wp" className="block text-sm mb-1">
                  {t('templates.field_writing_prompt')}
                </label>
                <textarea
                  id="wp"
                  value={writingPrompt}
                  onChange={(e) => setWritingPrompt(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  required
                  className="w-full rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wmin" className="block text-sm mb-1">
                    {t('templates.field_writing_min')}
                  </label>
                  <input
                    id="wmin"
                    type="number"
                    min={0}
                    max={2000}
                    value={writingMin}
                    onChange={(e) => setWritingMin(Number(e.target.value))}
                    className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                  />
                </div>
                <div>
                  <label htmlFor="wmax" className="block text-sm mb-1">
                    {t('templates.field_writing_max')}
                  </label>
                  <input
                    id="wmax"
                    type="number"
                    min={1}
                    max={5000}
                    value={writingMax}
                    onChange={(e) => setWritingMax(Number(e.target.value))}
                    className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                  />
                </div>
              </div>
            </div>
          )}

          {handlerId === 'reading-log' && (
            <div className="space-y-3 p-3 rounded-2xl bg-surface">
              <div>
                <label htmlFor="rmm" className="block text-sm mb-1">
                  {t('templates.field_reading_min_minutes')}
                </label>
                <input
                  id="rmm"
                  type="number"
                  min={0}
                  max={240}
                  value={readingMinMinutes}
                  onChange={(e) => setReadingMinMinutes(Number(e.target.value))}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              <label className="flex items-center gap-2 min-h-touch">
                <input
                  type="checkbox"
                  checked={readingRequireSummary}
                  onChange={(e) => setReadingRequireSummary(e.target.checked)}
                />
                {t('templates.field_reading_require_summary')}
              </label>
            </div>
          )}

          {handlerId === 'addition-subtraction' && (
            <div className="space-y-3 p-3 rounded-2xl bg-surface">
              <div>
                <label htmlFor="mv" className="block text-sm mb-1">
                  {t('templates.field_max_value')}
                </label>
                <input
                  id="mv"
                  type="number"
                  min={1}
                  max={1000}
                  value={maxValue}
                  onChange={(e) => setMaxValue(Number(e.target.value))}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              <label className="flex items-center gap-2 min-h-touch">
                <input
                  type="checkbox"
                  checked={includeSubtraction}
                  onChange={(e) => setIncludeSubtraction(e.target.checked)}
                />
                {t('templates.field_include_subtraction')}
              </label>
              <label className="flex items-center gap-2 min-h-touch">
                <input
                  type="checkbox"
                  checked={allowCarry}
                  onChange={(e) => setAllowCarry(e.target.checked)}
                />
                {t('templates.field_allow_carry')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qps" className="block text-sm mb-1">
                    {t('templates.field_questions_per_slot')}
                  </label>
                  <input
                    id="qps"
                    type="number"
                    min={1}
                    max={50}
                    value={questionsPerSlot}
                    onChange={(e) => setQuestionsPerSlot(Number(e.target.value))}
                    className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                  />
                </div>
                <div>
                  <label htmlFor="rs" className="block text-sm mb-1">
                    {t('templates.field_required_slots')}
                  </label>
                  <input
                    id="rs"
                    type="number"
                    min={1}
                    max={20}
                    value={requiredSlots}
                    onChange={(e) => setRequiredSlots(Number(e.target.value))}
                    className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={create.isPending || name.trim().length === 0}
              className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
            >
              {create.isPending ? t('common.loading') : t('templates.create_submit')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/parent/templates')}
              className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
            >
              {t('templates.create_cancel')}
            </button>
          </div>
        </form>
      </div>
    </ParentShell>
  );
}
