import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  additionSubtractionConfigV1Schema,
  countWords,
  generateProblems,
  mulberry32,
  readingLogConfigV1Schema,
  writingConfigV1Schema,
  type AdditionSubtractionConfigV1,
  type ProgressState,
  type ReadingLogConfigV1,
  type WritingConfigV1,
} from '@kidsprogress/shared';
import { ChildShell } from '@/app/layouts/ChildShell';
import { useAuthStore } from '@/features/auth/store';
import { todayApi } from '../api';

/**
 * Kid-side execution surface. Branches on `template.handlerId`:
 *
 *  - `generic`: shows the description + a single Done button.
 *  - `addition-subtraction`: deterministic problem stream, answer field,
 *    progress saved to `task_sessions.progressState.templateData` after
 *    every correct answer.
 *
 * Other handlers will land later; for unknown ids we show a friendly
 * "this task isn't supported on this device yet" screen.
 */
export function ExecutionPage() {
  const { instanceId = '' } = useParams<{ instanceId: string }>();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentChild = useAuthStore((s) => s.currentChild);

  const run = useQuery({
    queryKey: ['today', 'run', instanceId],
    queryFn: () => todayApi.run(instanceId),
    enabled: instanceId.length > 0,
  });

  const session = useQuery({
    queryKey: ['today', 'session', instanceId],
    queryFn: () => todayApi.getSession(instanceId),
    enabled: instanceId.length > 0,
  });

  const save = useMutation({
    mutationFn: (state: ProgressState) =>
      todayApi.saveSession(instanceId, run.data!.template.pluginVersion, state),
  });

  const complete = useMutation({
    mutationFn: () =>
      todayApi.transition({
        assignmentId: run.data!.instance.assignmentId,
        originalDate: run.data!.instance.originalDate,
        action: 'complete',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['today'] });
      navigate('/today', { replace: true });
    },
  });

  if (run.isPending || session.isPending) {
    return (
      <ChildShell age={currentChild?.ageBand ?? 'younger'}>
        <p className="text-text-muted p-6">{t('common.loading')}</p>
      </ChildShell>
    );
  }
  if (run.isError || !run.data) {
    return (
      <ChildShell age={currentChild?.ageBand ?? 'younger'}>
        <p role="alert" className="text-danger p-6">
          {t('today.load_failed')}
        </p>
      </ChildShell>
    );
  }

  return (
    <ChildShell age={currentChild?.ageBand ?? 'younger'}>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
        <header>
          <h1 className="text-3xl font-display">{run.data.instance.effectiveTitle}</h1>
          {run.data.instance.effectiveDescription && (
            <p className="text-text-muted mt-2">
              {run.data.instance.effectiveDescription}
            </p>
          )}
        </header>

        {run.data.template.handlerId === 'generic' && (
          <GenericExecutor
            onComplete={() => complete.mutate()}
            completing={complete.isPending}
            tBack={t('execution.back')}
            tDone={t('execution.done')}
            onBack={() => navigate('/today')}
          />
        )}

        {run.data.template.handlerId === 'addition-subtraction' && (
          <MathExecutor
            templateConfig={run.data.template.config}
            childId={run.data.instance.childId}
            occurrenceDate={run.data.instance.originalDate}
            initialState={session.data?.progressState ?? null}
            onSave={(s) => save.mutate(s)}
            onComplete={() => complete.mutate()}
            completing={complete.isPending}
            onBack={() => navigate('/today')}
          />
        )}

        {run.data.template.handlerId === 'writing' && (
          <WritingExecutor
            templateConfig={run.data.template.config}
            initialState={session.data?.progressState ?? null}
            onSave={(s) => save.mutate(s)}
            onComplete={() => complete.mutate()}
            completing={complete.isPending}
            onBack={() => navigate('/today')}
          />
        )}

        {run.data.template.handlerId === 'reading-log' && (
          <ReadingLogExecutor
            templateConfig={run.data.template.config}
            initialState={session.data?.progressState ?? null}
            onSave={(s) => save.mutate(s)}
            onComplete={() => complete.mutate()}
            completing={complete.isPending}
            onBack={() => navigate('/today')}
          />
        )}

        {!['generic', 'addition-subtraction', 'writing', 'reading-log'].includes(
          run.data.template.handlerId,
        ) && (
          <p className="text-text-muted">
            {t('execution.unsupported_handler', { id: run.data.template.handlerId })}
          </p>
        )}
      </div>
    </ChildShell>
  );
}

function GenericExecutor(props: {
  onComplete: () => void;
  completing: boolean;
  tBack: string;
  tDone: string;
  onBack: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={props.onBack}
        className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
      >
        {props.tBack}
      </button>
      <button
        type="button"
        onClick={props.onComplete}
        disabled={props.completing}
        className="flex-1 min-h-touch rounded-2xl bg-success text-white py-3 disabled:opacity-40 text-lg"
      >
        {props.tDone}
      </button>
    </div>
  );
}

interface MathTemplateData {
  index: number;
  correct: number;
  answers: { problemId: string; given: string; correct: boolean }[];
}

function MathExecutor(props: {
  templateConfig: Record<string, unknown>;
  childId: string;
  occurrenceDate: string;
  initialState: ProgressState | null;
  onSave: (state: ProgressState) => void;
  onComplete: () => void;
  completing: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation('common');

  // Validate the config at the boundary so a malformed template
  // doesn't poison the executor. Falls back to a sane default if it's
  // somehow drifted.
  const config: AdditionSubtractionConfigV1 = useMemo(() => {
    const parsed = additionSubtractionConfigV1Schema.safeParse(props.templateConfig);
    if (parsed.success) return parsed.data;
    return {
      maxValue: 10,
      operations: ['addition'],
      allowCarry: false,
      minResult: 0,
      questionsPerSlot: 5,
      requiredSlots: 1,
    };
  }, [props.templateConfig]);

  // Deterministic problem stream — seed by (childId, occurrenceDate, slot).
  // For Phase 11 we only use slot 0; multi-slot lands with later phases.
  const seed = useMemo(() => {
    let h = 0;
    const key = `${props.childId}|${props.occurrenceDate}|0`;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h || 1;
  }, [props.childId, props.occurrenceDate]);

  const problems = useMemo(
    () => generateProblems(config, mulberry32(seed), config.questionsPerSlot),
    [config, seed],
  );

  const initialTemplate: MathTemplateData = useMemo(() => {
    const fromState = props.initialState?.templateData as
      | Partial<MathTemplateData>
      | undefined;
    return {
      index: typeof fromState?.index === 'number' ? fromState.index : 0,
      correct: typeof fromState?.correct === 'number' ? fromState.correct : 0,
      answers: Array.isArray(fromState?.answers) ? fromState!.answers! : [],
    };
  }, [props.initialState]);

  const [data, setData] = useState<MathTemplateData>(initialTemplate);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const problem = problems[data.index];
  const done = data.index >= problems.length;

  const submitAnswer = () => {
    if (!problem) return;
    const given = draft.trim();
    if (given.length === 0) return;
    const isCorrect = Number(given) === problem.answer;
    const nextAnswers = [
      ...data.answers,
      { problemId: problem.id, given, correct: isCorrect },
    ];
    const nextData: MathTemplateData = {
      index: isCorrect ? data.index + 1 : data.index,
      correct: data.correct + (isCorrect ? 1 : 0),
      answers: nextAnswers,
    };
    setData(nextData);
    setDraft('');
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFeedback(null), 1200);
    props.onSave({
      templateData: nextData as unknown as Record<string, unknown>,
      toolStates: props.initialState?.toolStates ?? {},
    });
  };

  if (done) {
    return (
      <section className="space-y-4 text-center">
        <h2 className="text-2xl font-display">{t('execution.math_all_done')}</h2>
        <p className="text-text-muted">
          {t('execution.math_score', {
            correct: data.correct,
            total: problems.length,
          })}
        </p>
        <button
          type="button"
          onClick={props.onComplete}
          disabled={props.completing}
          className="w-full min-h-touch rounded-2xl bg-success text-white py-3 text-lg disabled:opacity-40"
        >
          {t('execution.done')}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-text-muted text-sm" aria-live="polite">
        {t('execution.math_progress', {
          current: data.index + 1,
          total: problems.length,
        })}
      </p>
      <div className="p-6 rounded-3xl bg-surface text-center">
        <p className="text-4xl font-mono">
          {problem!.lhs} {problem!.op === 'addition' ? '+' : '−'} {problem!.rhs} ={' '}
          <span className="text-text-muted">?</span>
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitAnswer();
        }}
        className="space-y-3"
      >
        <label htmlFor="answer" className="sr-only">
          {t('execution.math_answer_label')}
        </label>
        <input
          id="answer"
          type="text"
          inputMode="numeric"
          pattern="-?\d+"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9-]/g, '').slice(0, 6))}
          autoFocus
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3 text-center text-2xl font-mono"
        />
        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className={
              'text-center font-medium ' +
              (feedback === 'correct' ? 'text-success' : 'text-danger')
            }
          >
            {feedback === 'correct' ? t('execution.math_correct') : t('execution.math_wrong')}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onBack}
            className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
          >
            {t('execution.back')}
          </button>
          <button
            type="submit"
            disabled={draft.trim().length === 0}
            className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40 text-lg"
          >
            {t('execution.math_submit')}
          </button>
        </div>
      </form>
    </section>
  );
}

interface WritingTemplateData {
  body: string;
  submittedAt?: string;
}

function WritingExecutor(props: {
  templateConfig: Record<string, unknown>;
  initialState: ProgressState | null;
  onSave: (s: ProgressState) => void;
  onComplete: () => void;
  completing: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation('common');
  const config: WritingConfigV1 = useMemo(() => {
    const p = writingConfigV1Schema.safeParse(props.templateConfig);
    return p.success
      ? p.data
      : {
          prompt: '(prompt missing)',
          minWords: 0,
          maxWords: 500,
          aiEvalEnabled: false,
        };
  }, [props.templateConfig]);

  const initial: WritingTemplateData = useMemo(() => {
    const td = props.initialState?.templateData as Partial<WritingTemplateData> | undefined;
    return { body: typeof td?.body === 'string' ? td.body : '' };
  }, [props.initialState]);

  const [body, setBody] = useState(initial.body);
  const wc = countWords(body);
  const tooShort = wc < config.minWords;
  const tooLong = wc > config.maxWords;
  const canSubmit = !tooShort && !tooLong && body.trim().length > 0;

  const saveDraft = () =>
    props.onSave({
      templateData: { body } as unknown as Record<string, unknown>,
      toolStates: props.initialState?.toolStates ?? {},
    });

  return (
    <section className="space-y-4">
      <p className="p-4 rounded-2xl bg-surface">{config.prompt}</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        maxLength={5000}
        className="w-full rounded-2xl border border-text-muted/30 bg-surface p-3 text-lg"
        placeholder={t('execution.writing_placeholder')}
      />
      <p
        className={
          'text-sm text-center ' +
          (tooShort
            ? 'text-text-muted'
            : tooLong
              ? 'text-danger'
              : 'text-success')
        }
        aria-live="polite"
      >
        {t('execution.writing_word_count', {
          current: wc,
          min: config.minWords,
          max: config.maxWords,
        })}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onBack}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('execution.back')}
        </button>
        <button
          type="button"
          onClick={saveDraft}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('execution.writing_save_draft')}
        </button>
        <button
          type="button"
          onClick={() => {
            saveDraft();
            props.onComplete();
          }}
          disabled={!canSubmit || props.completing}
          className="flex-1 min-h-touch rounded-2xl bg-success text-white py-3 disabled:opacity-40 text-lg"
        >
          {t('execution.done')}
        </button>
      </div>
    </section>
  );
}

interface ReadingTemplateData {
  bookTitle: string;
  minutes: number;
  summary: string;
}

function ReadingLogExecutor(props: {
  templateConfig: Record<string, unknown>;
  initialState: ProgressState | null;
  onSave: (s: ProgressState) => void;
  onComplete: () => void;
  completing: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation('common');
  const config: ReadingLogConfigV1 = useMemo(() => {
    const p = readingLogConfigV1Schema.safeParse(props.templateConfig);
    return p.success ? p.data : { minMinutes: 10, requireSummary: false };
  }, [props.templateConfig]);

  const initial: ReadingTemplateData = useMemo(() => {
    const td = props.initialState?.templateData as
      | Partial<ReadingTemplateData>
      | undefined;
    return {
      bookTitle: typeof td?.bookTitle === 'string' ? td.bookTitle : '',
      minutes: typeof td?.minutes === 'number' ? td.minutes : 0,
      summary: typeof td?.summary === 'string' ? td.summary : '',
    };
  }, [props.initialState]);

  const [bookTitle, setBookTitle] = useState(initial.bookTitle);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [summary, setSummary] = useState(initial.summary);

  const enoughMinutes = minutes >= config.minMinutes;
  const summaryOk = !config.requireSummary || summary.trim().length > 0;
  const canSubmit = enoughMinutes && bookTitle.trim().length > 0 && summaryOk;

  const save = () =>
    props.onSave({
      templateData: {
        bookTitle,
        minutes,
        summary,
      } as unknown as Record<string, unknown>,
      toolStates: props.initialState?.toolStates ?? {},
    });

  return (
    <section className="space-y-4">
      <div>
        <label htmlFor="bt" className="block text-sm mb-1">
          {t('execution.reading_book_title_label')}
        </label>
        <input
          id="bt"
          type="text"
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          required
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
        />
      </div>
      <div>
        <label htmlFor="mn" className="block text-sm mb-1">
          {t('execution.reading_minutes_label', { min: config.minMinutes })}
        </label>
        <input
          id="mn"
          type="number"
          min={0}
          max={240}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
        />
      </div>
      {config.requireSummary && (
        <div>
          <label htmlFor="sm" className="block text-sm mb-1">
            {t('execution.reading_summary_label')}
          </label>
          <textarea
            id="sm"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-text-muted/30 bg-surface p-3"
          />
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onBack}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('execution.back')}
        </button>
        <button
          type="button"
          onClick={save}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('execution.writing_save_draft')}
        </button>
        <button
          type="button"
          onClick={() => {
            save();
            props.onComplete();
          }}
          disabled={!canSubmit || props.completing}
          className="flex-1 min-h-touch rounded-2xl bg-success text-white py-3 disabled:opacity-40 text-lg"
        >
          {t('execution.done')}
        </button>
      </div>
    </section>
  );
}
