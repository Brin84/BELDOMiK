import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useAgenciesStore } from '@/features/agencies';
import { PropertyCard } from '@/entities/property';
import { useFavoritesStore } from '@/features/favorites';
import { EmptyState, InlineError, ListSkeleton } from '@/shared/ui';

export function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const agencyId = Number(id);
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { agencyDetail, detailProperties, detailTotal, isLoadingDetail, isLoadingProperties, fetchAgency, fetchAgencyProperties } = useAgenciesStore();
  const { toggleFavorite } = useFavoritesStore();

  useEffect(() => {
    if (agencyId) {
      fetchAgency(agencyId);
      fetchAgencyProperties(agencyId);
    }
  }, [agencyId, fetchAgency, fetchAgencyProperties]);

  if (isLoadingDetail && !agencyDetail) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <div className="h-6 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.2 }} />
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  if (!agencyDetail) {
    return (
      <div className="p-4 pb-24">
        <EmptyState
          icon={<span className="text-5xl">🏢</span>}
          title="Агентство не найдено"
          description="Возможно, оно скрыто или удалено"
          action={{ label: 'Назад к агентствам', onClick: () => navigate('/agencies') }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}>
        <div className="flex items-center gap-3">
          {agencyDetail.logo_url ? (
            <img src={agencyDetail.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color)' }}>
              <span className="text-3xl">🏢</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-tg-text text-xl font-bold truncate">{agencyDetail.name}</h1>
            <p className="text-tg-hint text-sm mt-0.5">{agencyDetail.property_count} объявлений</p>
            {agencyDetail.verified && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)', color: '#34c759' }}>
                ✅ Проверено
              </span>
            )}
          </div>
        </div>

        {agencyDetail.description && (
          <p className="text-tg-text text-sm mt-4">{agencyDetail.description}</p>
        )}

        {/* Contacts */}
        <div className="mt-4 space-y-2">
          {agencyDetail.contact_phone && (
            <a href={`tel:${agencyDetail.contact_phone}`} className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
              📞 {agencyDetail.contact_phone}
            </a>
          )}
          {agencyDetail.contact_email && (
            <a href={`mailto:${agencyDetail.contact_email}`} className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
              ✉️ {agencyDetail.contact_email}
            </a>
          )}
          {agencyDetail.website && (
            <a href={agencyDetail.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
              🌐 {agencyDetail.website}
            </a>
          )}
        </div>
      </div>

      {/* Properties */}
      <section>
        <h2 className="text-tg-text text-xl font-bold mb-3">Объявления агентства</h2>
        {isLoadingProperties && detailProperties.length === 0 ? (
          <ListSkeleton count={3} />
        ) : detailProperties.length === 0 ? (
          <EmptyState
            icon={<span className="text-5xl">🏠</span>}
            title="Нет объявлений"
            description="У агентства пока нет опубликованных объявлений"
          />
        ) : (
          <div className="space-y-3">
            {detailProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onFavoriteToggle={async (propertyId) => {
                  trigger('light');
                  try { await toggleFavorite(propertyId); } catch { /* handled */ }
                }}
              />
            ))}
            <p className="text-center text-tg-hint text-sm pt-2">
              Всего объявлений: {detailTotal}
            </p>
          </div>
        )}
      </section>

      {useAgenciesStore.getState().error && (
        <InlineError message={useAgenciesStore.getState().error!} onDismiss={() => useAgenciesStore.getState().clearError()} />
      )}
    </div>
  );
}
