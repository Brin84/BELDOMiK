import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useAgenciesStore } from '@/features/agencies';
import { EmptyState, InlineError } from '@/shared/ui';

function formatCount(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export function AgencyCatalogPage() {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { agencies, total, isLoading, error, fetchAgencies } = useAgenciesStore();

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-tg-text text-xl font-bold">🏢 Агентства</h1>
        <p className="text-tg-hint text-sm mt-1">Проверенные компании и агенты недвижимости</p>
      </div>

      {error && <InlineError message={error} onDismiss={() => useAgenciesStore.getState().clearError()} />}

      {isLoading && agencies.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded animate-pulse" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
                  <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">🏢</span>}
          title="Пока нет агентств"
          description="Здесь появятся проверенные агентства недвижимости"
        />
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => (
            <button
              key={agency.id}
              onClick={() => { trigger('light'); navigate(`/agencies/${agency.id}`); }}
              className="w-full p-4 rounded-2xl text-left transition-colors active:opacity-70 flex items-center gap-3"
              style={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                border: '0.5px solid var(--tg-theme-hint-color)',
              }}
            >
              {agency.logo_url ? (
                <img src={agency.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color)' }}>
                  <span className="text-xl">🏢</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-tg-text font-semibold truncate">{agency.name}</h3>
                <p className="text-tg-hint text-sm mt-0.5">
                  {agency.property_count > 0
                    ? `${formatCount(agency.property_count)} объявл.`
                    : 'Нет объявлений'}
                </p>
                {agency.description && (
                  <p className="text-tg-hint text-xs mt-1 line-clamp-2">{agency.description}</p>
                )}
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          ))}
          <p className="text-center text-tg-hint text-sm pt-2">
            Всего агентств: {formatCount(total)}
          </p>
        </div>
      )}
    </div>
  );
}
