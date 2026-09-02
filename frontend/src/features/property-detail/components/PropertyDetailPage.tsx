import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useFavoritesStore } from '@/features/favorites';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PropertyPhotoGallery } from '@/entities/property/components/PropertyPhotoGallery';
import { PropertyInfoSection } from '@/entities/property/components/PropertyInfoSection';
import { PropertyDescription } from '@/entities/property/components/PropertyDescription';
import { PropertyCharacteristics } from '@/entities/property/components/PropertyCharacteristics';
import { PropertyLocation } from '@/entities/property/components/PropertyLocation';
import { PropertyOwner } from '@/entities/property/components/PropertyOwner';
import { PropertyContacts } from '@/entities/property/components/PropertyContacts';
import { PropertyActions } from '@/entities/property/components/PropertyActions';
import { PriceHistoryView } from '@/features/analytics/components/PriceHistoryView';
import { CollectionPickerModal } from '@/features/collections/CollectionPickerModal';
import { PropertyNoteSection } from '@/features/notes/PropertyNoteSection';
import { ViewingRequestForm } from '@/features/viewings/ViewingRequestForm';

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const { mainButton } = useTelegram();
  const { fetchPropertyDetail, propertyDetail, isLoadingDetail, errorDetail, clearPropertyDetail } = usePropertiesStore();
  const { toggleFavorite } = useFavoritesStore();

  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

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

  // Telegram MainButton for primary action (contact/phone)
  useEffect(() => {
    if (mainButton && propertyDetail && propertyDetail.phone) {
      mainButton.setText(`Позвонить`);
      mainButton.show();
      const handleMainClick = () => {
        trigger('success');
        window.location.href = `tel:${propertyDetail.phone!.replace(/[^\d+]/g, '')}`;
      };
      mainButton.onClick(handleMainClick);
      return () => {
        mainButton.offClick(handleMainClick);
        mainButton.hide();
      };
    } else if (mainButton) {
      mainButton.hide();
    }
  }, [mainButton, propertyDetail, trigger]);

  // Handle loading state
  if (isLoadingDetail) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
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

  return (
    <div className="p-4 pb-28 space-y-4" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Photo Gallery */}
      <PropertyPhotoGallery photos={property.photos || []} />

      {/* Price & Key Info */}
      <PropertyInfoSection property={property} />

      {/* Description */}
      <PropertyDescription description={property.description} />

      {/* Characteristics */}
      <PropertyCharacteristics property={property} />

      {/* Location */}
      <PropertyLocation property={property} />

      {/* Owner */}
      <PropertyOwner
        owner={property.owner || null}
        property={property}
      />

      {/* Contacts */}
      <PropertyContacts
        phone={property.phone}
        email={property.email}
        telegram={property.telegram}
        onCallClick={(phone) => {
          trigger('success');
          window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
        }}
        onTelegramClick={(username) => {
          trigger('success');
          window.open(`https://t.me/${username}`, '_blank');
        }}
      />

      {/* Actions (Favorite, Share) */}
      <PropertyActions
        propertyId={property.id}
        isFavorite={property.is_favorite}
        favoritesCount={property.favorites_count}
        propertyTitle={property.title || `Объявление #${property.id}`}
        propertyUrl={typeof window !== 'undefined' ? window.location.href : undefined}
        onFavoriteToggle={async (propertyId, _currentState) => {
          trigger('light');
          try {
            await toggleFavorite(propertyId);
            // Refresh property detail to update is_favorite there too
            await fetchPropertyDetail(propertyId);
          } catch {
            // Error already handled in store
          }
        }}
      />

      {/* Add to Collection */}
      <button
        onClick={() => { trigger('light'); setShowCollectionPicker(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          color: 'var(--tg-theme-button-color)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        📁 В подборку
      </button>

      {/* Note Section */}
      <PropertyNoteSection propertyId={property.id} />

      {/* Viewing Request */}
      <ViewingRequestForm propertyId={property.id} />

      {/* Collection Picker Modal */}
      <CollectionPickerModal
        propertyId={property.id}
        isOpen={showCollectionPicker}
        onClose={() => setShowCollectionPicker(false)}
      />

      {/* Price History */}
      <PriceHistoryView propertyId={property.id} />
    </div>
  );
}