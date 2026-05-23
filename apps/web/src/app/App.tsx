import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema, type HealthResponse } from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';

async function fetchHealth(): Promise<HealthResponse> {
  const raw = await apiClient.get('/health');
  return healthResponseSchema.parse(raw);
}

export function App() {
  const { t } = useTranslation('common');
  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t('app_title')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('phase0_placeholder')}</p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-medium">{t('api_status')}</h2>
        {isLoading && <p className="mt-1 text-sm text-slate-500">{t('loading')}</p>}
        {error && <p className="mt-1 text-sm text-red-600">{t('api_unreachable')}</p>}
        {data && (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">{t('status')}</dt>
            <dd>{data.status}</dd>
            <dt className="text-slate-500">{t('db')}</dt>
            <dd>{data.db}</dd>
            <dt className="text-slate-500">{t('version')}</dt>
            <dd>{data.version}</dd>
            <dt className="text-slate-500">{t('uptime_seconds')}</dt>
            <dd>{data.uptime}</dd>
          </dl>
        )}
      </section>
    </div>
  );
}
