import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  IconArchive,
  IconArchiveOff,
  IconEdit,
  IconEye,
  IconKey,
  IconKeyOff,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/store';
import {
  useArchiveChild,
  useChildrenList,
  useClearChildPin,
  useCreateChild,
  useIssuePinReset,
  useRestoreChild,
  useSetChildPin,
  useUpdateChild,
} from '../hooks';
import type { Child } from '@kidsprogress/shared';

function ChildEditRow(props: {
  child: Child;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const [name, setName] = useState(props.child.displayName);
  const [year, setYear] = useState<string>(
    props.child.birthYear ? String(props.child.birthYear) : '',
  );
  const [avatar, setAvatar] = useState(props.child.avatarKey);
  const update = useUpdateChild(props.child.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            displayName: name.trim(),
            avatarKey: avatar as `avatar-${string}`,
            ...(year ? { birthYear: Number(year) } : {}),
          },
          { onSuccess: () => props.onClose() },
        );
      }}
      className="p-4 rounded-2xl bg-surface space-y-3"
    >
      <h3 className="font-display text-lg">
        {t('children.edit_title', { name: props.child.displayName })}
      </h3>
      <div>
        <label htmlFor="edit-name" className="block text-sm mb-1">
          {t('children.field_name')}
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={80}
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
        />
      </div>
      <div>
        <label htmlFor="edit-year" className="block text-sm mb-1">
          {t('children.field_birth_year')}
        </label>
        <input
          id="edit-year"
          type="number"
          min={2000}
          max={2030}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
        />
      </div>
      <div>
        <label htmlFor="edit-avatar" className="block text-sm mb-1">
          {t('children.field_avatar')}
        </label>
        <select
          id="edit-avatar"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
        >
          {Array.from({ length: 12 }, (_, i) =>
            `avatar-${String(i + 1).padStart(2, '0')}`,
          ).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={update.isPending || name.trim().length === 0}
          className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
        >
          {update.isPending ? t('common.loading') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={props.onClose}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

type ResetCodeInfo = {
  childId: string;
  resetCode: string;
  expiresAt: string;
};

export function ChildrenListPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const setChildAccess = useAuthStore((s) => s.setChildAccess);
  const setCurrentChild = useAuthStore((s) => s.setCurrentChild);
  const list = useChildrenList();
  const create = useCreateChild();
  const archive = useArchiveChild();
  const restore = useRestoreChild();
  const setPin = useSetChildPin();
  const clearPin = useClearChildPin();
  const issueReset = useIssuePinReset();

  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarKey, setAvatarKey] = useState('avatar-01');
  const [birthYear, setBirthYear] = useState<string>('');
  const [initialPin, setInitialPin] = useState('');
  const [createError, setCreateError] = useState<string | undefined>();

  const [pinEntryFor, setPinEntryFor] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState<string | undefined>();

  const [resetInfo, setResetInfo] = useState<ResetCodeInfo | null>(null);

  const [editFor, setEditFor] = useState<string | null>(null);

  const [viewAsFor, setViewAsFor] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [viewAsPin, setViewAsPin] = useState('');
  const [viewAsError, setViewAsError] = useState<string | undefined>();

  const viewAs = useMutation({
    mutationFn: () => authApi.viewAsChild(viewAsFor!.id, viewAsPin),
    onSuccess: (res) => {
      setChildAccess(res.tokens.accessToken, res.tokens.expiresAt);
      setCurrentChild({
        id: res.child.id,
        familyId: res.child.familyId,
        displayName: res.child.displayName,
        avatarKey: res.child.avatarKey,
        ageBand: res.child.ageBand,
      });
      navigate('/today');
    },
    onError: () => setViewAsError('children.view_as_failed'),
  });

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(undefined);
    create.mutate(
      {
        displayName: displayName.trim(),
        avatarKey: avatarKey as `avatar-${string}`,
        ...(birthYear ? { birthYear: Number(birthYear) } : {}),
        ...(initialPin && /^\d{4,6}$/.test(initialPin) ? { pin: initialPin } : {}),
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setDisplayName('');
          setAvatarKey('avatar-01');
          setBirthYear('');
          setInitialPin('');
        },
        onError: () => setCreateError('children.create_failed'),
      },
    );
  };

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(undefined);
    if (!pinEntryFor) return;
    if (!/^\d{4,6}$/.test(pinDraft)) {
      setPinError('children.pin_invalid');
      return;
    }
    setPin.mutate(
      { id: pinEntryFor, pin: pinDraft },
      {
        onSuccess: () => {
          setPinEntryFor(null);
          setPinDraft('');
        },
        onError: () => setPinError('children.pin_failed'),
      },
    );
  };

  const onIssueReset = (childId: string) =>
    issueReset.mutate(childId, {
      onSuccess: (res) => setResetInfo({ childId, ...res }),
    });

  return (
    <ParentShell>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-display">{t('children.list_title')}</h1>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white min-h-touch"
            >
              <IconPlus size={18} aria-hidden />
              {t('children.new_button')}
            </button>
          )}
        </header>

        {resetInfo && (
          <section
            role="status"
            aria-live="polite"
            className="p-4 rounded-3xl bg-accent-soft border border-accent-border space-y-2"
          >
            <h2 className="font-display text-lg">{t('children.reset_title')}</h2>
            <p className="text-sm text-text-muted">{t('children.reset_warning')}</p>
            <p className="font-mono text-2xl tracking-widest text-center py-2">
              {resetInfo.resetCode}
            </p>
            <p className="text-xs text-text-muted text-center">
              {t('children.reset_expires_at', {
                at: new Date(resetInfo.expiresAt).toLocaleString(),
              })}
            </p>
            <button
              type="button"
              onClick={() => setResetInfo(null)}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 mt-2"
            >
              {t('children.reset_dismiss')}
            </button>
          </section>
        )}

        {showForm && (
          <section className="p-4 rounded-3xl bg-surface space-y-4">
            <h2 className="font-display text-lg">{t('children.form_title')}</h2>
            <form onSubmit={submitNew} className="space-y-3">
              <div>
                <label htmlFor="dn" className="block text-sm mb-1">
                  {t('children.field_name')}
                </label>
                <input
                  id="dn"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={80}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              <div>
                <label htmlFor="ay" className="block text-sm mb-1">
                  {t('children.field_birth_year')}
                </label>
                <input
                  id="ay"
                  type="number"
                  min={2000}
                  max={2030}
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="2018"
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              <div>
                <label htmlFor="av" className="block text-sm mb-1">
                  {t('children.field_avatar')}
                </label>
                <select
                  id="av"
                  value={avatarKey}
                  onChange={(e) => setAvatarKey(e.target.value)}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                >
                  {Array.from({ length: 12 }, (_, i) =>
                    `avatar-${String(i + 1).padStart(2, '0')}`,
                  ).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pp" className="block text-sm mb-1">
                  {t('children.field_initial_pin')}
                </label>
                <input
                  id="pp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  value={initialPin}
                  onChange={(e) =>
                    setInitialPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder={t('children.field_initial_pin_placeholder')}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono"
                />
                <p className="text-xs text-text-muted mt-1">
                  {t('children.field_initial_pin_hint')}
                </p>
              </div>
              {createError && (
                <p role="alert" className="text-danger text-sm">
                  {t(createError)}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={create.isPending || displayName.trim().length === 0}
                  className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
                >
                  {create.isPending ? t('common.loading') : t('children.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
                >
                  {t('children.cancel')}
                </button>
              </div>
            </form>
          </section>
        )}

        {editFor && list.data && (
          (() => {
            const child = list.data.find((c) => c.id === editFor);
            return child ? (
              <ChildEditRow child={child} onClose={() => setEditFor(null)} />
            ) : null;
          })()
        )}

        {viewAsFor && (
          <section className="p-4 rounded-3xl bg-surface space-y-3">
            <h2 className="font-display text-lg">
              {t('children.view_as_title', { name: viewAsFor.name })}
            </h2>
            <p className="text-sm text-text-muted">{t('children.view_as_hint')}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setViewAsError(undefined);
                if (!/^\d{4,6}$/.test(viewAsPin)) {
                  setViewAsError('children.pin_invalid');
                  return;
                }
                viewAs.mutate();
              }}
              className="space-y-3"
            >
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={viewAsPin}
                onChange={(e) =>
                  setViewAsPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                placeholder={t('settings.pin_new_label')}
                autoFocus
                className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono text-center text-xl tracking-widest"
              />
              {viewAsError && (
                <p role="alert" className="text-danger text-sm">
                  {t(viewAsError)}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={viewAs.isPending}
                  className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
                >
                  {viewAs.isPending ? t('common.loading') : t('children.view_as_submit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewAsFor(null);
                    setViewAsPin('');
                  }}
                  className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
                >
                  {t('children.cancel')}
                </button>
              </div>
            </form>
          </section>
        )}

        {pinEntryFor && (
          <section className="p-4 rounded-3xl bg-surface space-y-3">
            <h2 className="font-display text-lg">{t('children.set_pin_title')}</h2>
            <form onSubmit={submitPin} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={pinDraft}
                onChange={(e) =>
                  setPinDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                placeholder={t('children.field_initial_pin_placeholder')}
                autoFocus
                className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono"
              />
              {pinError && (
                <p role="alert" className="text-danger text-sm">
                  {t(pinError)}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={setPin.isPending}
                  className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3"
                >
                  {setPin.isPending ? t('common.loading') : t('children.set_pin_submit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinEntryFor(null);
                    setPinDraft('');
                  }}
                  className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
                >
                  {t('children.cancel')}
                </button>
              </div>
            </form>
          </section>
        )}

        {list.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {list.isError && (
          <p role="alert" className="text-danger">
            {t('children.list_failed')}
          </p>
        )}
        {list.data && list.data.length === 0 && !showForm && (
          <p className="text-text-muted">{t('children.empty')}</p>
        )}
        {list.data && list.data.length > 0 && (
          <ul className="space-y-3">
            {list.data.map((c) => (
              <li
                key={c.id}
                className={
                  'flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface ' +
                  (c.archivedAt ? 'opacity-60' : '')
                }
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.displayName}</p>
                  <p className="text-xs text-text-muted">
                    {c.avatarKey}
                    {c.birthYear && ` · ${c.birthYear}`}
                    {c.pinRequired && ` · ${t('children.pin_on_label')}`}
                    {c.archivedAt && ` · ${t('children.archived_badge')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!c.archivedAt && (
                    <button
                      type="button"
                      onClick={() => setEditFor(c.id)}
                      aria-label={t('children.edit_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconEdit size={18} aria-hidden />
                    </button>
                  )}
                  {!c.archivedAt && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewAsError(undefined);
                        setViewAsPin('');
                        setViewAsFor({ id: c.id, name: c.displayName });
                      }}
                      aria-label={t('children.view_as_button', { name: c.displayName })}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconEye size={18} aria-hidden />
                    </button>
                  )}
                  {!c.archivedAt && !c.pinRequired && (
                    <button
                      type="button"
                      onClick={() => {
                        setPinError(undefined);
                        setPinDraft('');
                        setPinEntryFor(c.id);
                      }}
                      aria-label={t('children.set_pin_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconKey size={18} aria-hidden />
                    </button>
                  )}
                  {!c.archivedAt && c.pinRequired && (
                    <>
                      <button
                        type="button"
                        onClick={() => onIssueReset(c.id)}
                        disabled={issueReset.isPending}
                        aria-label={t('children.issue_reset_button')}
                        className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                      >
                        <IconRefresh size={18} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearPin.mutate(c.id)}
                        disabled={clearPin.isPending}
                        aria-label={t('children.clear_pin_button')}
                        className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                      >
                        <IconKeyOff size={18} aria-hidden />
                      </button>
                    </>
                  )}
                  {c.archivedAt ? (
                    <button
                      type="button"
                      onClick={() => restore.mutate(c.id)}
                      disabled={restore.isPending}
                      aria-label={t('children.restore_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconArchiveOff size={18} aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archive.mutate(c.id)}
                      disabled={archive.isPending}
                      aria-label={t('children.archive_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconArchive size={18} aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentShell>
  );
}
