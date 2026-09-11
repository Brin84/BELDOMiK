import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useFavoritesStore } from '@/features/favorites';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PropertyHeroGallery } from './PropertyHeroGallery';
import { PropertyInfoSection } from '@/entities/property/components/PropertyInfoSection';
import { PropertyDescription } from '@/entities/property/components/PropertyDescription';
import { PropertyCharacteristics } from '@/entities/property/components/PropertyCharacteristics';
import { PropertyLocation } from '@/entities/property/components/PropertyLocation';
import { PropertyOwner } from '@/entities/property/components/PropertyOwner';

import './PropertyDetail.css';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const { fetchPropertyDetail, propertyDetail, isLoadingDetail, errorDetail, clearPropertyDetail } = usePropertiesStore();
  const { toggleFavorite } = useFavoritesStore();

  const propertyId = id ? parseInt(id, 10) : null;

  // Load property detail on mount
  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetail(propertyId);
    }
    return () => {
      clearPropertyDetail();
    };
  }, [propertyId, fetchPropertyDetail, clearPropertyDetail]);

  // Handle loading state
  if (isLoadingDetail) {
    return (
      <div className="property-page">
        <div className="property-page__content">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="property-section">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-1/2 mt-3 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Handle error state
  if (errorDetail) {
    return (
      <ErrorState
        message={errorDetail}
        onRetry={() => propertyId && fetchPropertyDetail(propertyId)}
      />
    );
  }

  // Handle not found
  if (!propertyDetail) {
    return (
      <ErrorState
        message="Объявление не найдено"
        onRetry={() => navigate(-1)}
      />
    );
  }

  const property = propertyDetail;

  // Krisha-style headline for share/copy; backend has no title on Property.
  const titleParts = [
    property.type_name,
    property.rooms_count ? `${property.rooms_count}-комн.` : null,
    property.total_area ? `${property.total_area} м²` : null,
    property.address || property.city_name,
  ].filter(Boolean);
  const propertyTitle = titleParts.join(', ') || `Объявление #${property.id}`;

  // Kufar-модель: звонок идёт на контактный номер из подачи (contact_phone),
  // если владелец разрешил показ (show_phone). Стрые объявления без contact_*
  // фолбэчат на телефон аккаунта владельца.
  const contactPhone = property.contact_phone || property.owner_phone || null;
  const ownerUsername = property.owner_username ?? null;
  const canCall = property.show_phone !== false && !!contactPhone;

  const handleCall = () => {
    trigger('success');
    window.location.href = `tel:${contactPhone!.replace(/[^\d+]/g, '')}`;
  };

  const handleTelegram = () => {
    trigger('success');
    window.open(`https://t.me/${ownerUsername!.replace('@', '')}`, '_blank');
  };

  return (
    <div className="property-page">
      {/* Полноширинная галерея */}
      <PropertyHeroGallery photos={property.photos || []} />

      <div className="property-page__content">
        {/* Цена + действия + тип·площадь */}
        <PropertyInfoSection
          property={property}
          propertyTitle={propertyTitle}
          propertyUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          onFavoriteToggle={async (propertyId, _currentState) => {
            trigger('light');
            try {
              await toggleFavorite(propertyId);
              await fetchPropertyDetail(propertyId);
            } catch {
              // Error already handled in store
            }
          }}
        />

        {/* Расположение (карта + адрес) */}
        <PropertyLocation property={property} />

        {/* Параметры + Дополнительно */}
        <PropertyCharacteristics property={property} />

        {/* Описание */}
        <PropertyDescription description={property.description} />

        {/* Продавец */}
        <PropertyOwner owner={null} property={property} />
      </div>

      {/* Липкий нижний бар «Написать / Позвонить».
          Позвонить — только если контактный номер задан и разрешён к показу. */}
      {(ownerUsername || canCall) && (
        <div className="property-bottom-bar">
          {ownerUsername && (
            <button
              type="button"
              onClick={handleTelegram}
              className="property-bottom-bar__btn property-bottom-bar__btn--telegram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Написать
            </button>
          )}
          {canCall && (
            <button
              type="button"
              onClick={handleCall}
              className="property-bottom-bar__btn property-bottom-bar__btn--call"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Позвонить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
