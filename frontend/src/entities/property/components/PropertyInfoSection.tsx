import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useShare } from '@/shared/lib/share';
import { useComparisonStore } from '@/features/comparison/comparisonStore';
import { useToast } from '@/shared/ui/Toast';
import type { PropertyDetail, PropertyStatus } from '@/shared/api/types';
import {
  formatPriceByn,
  formatPriceUsd,
  formatPricePerSqm,
  formatArea,
} from '@/shared/lib/format';

const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: 'Черновик',
  pending_moderation: 'На модерации',
  published: 'Опубликовано',
  rejected: 'Отклонено',
  blocked: 'Заблокировано',
  archived: 'В архиве',
  sold: 'Продано',
  rented: 'Сдано',
};

interface PropertyInfoSectionProps {
  property: PropertyDetail;
  propertyTitle?: string;
  propertyUrl?: string;
  onFavoriteToggle?: (propertyId: number, isCurrentlyFavorite: boolean) => Promise<void>;
}

export function PropertyInfoSection({
  property,
  propertyTitle = 'Объявление',
  propertyUrl,
  onFavoriteToggle,
}: PropertyInfoSectionProps) {
  const { trigger } = useHaptics();
  const { share } = useShare();
  const { isInComparison, removeFromComparison, addToComparison } = useComparisonStore();
  const { showToast } = useToast();

  const price = property.price_byn ?? 0;
  const priceUsd = property.price_usd ?? null;
  const pricePerSqm = property.price_per_m2_byn ?? null;

  const inComparison = isInComparison(property.id);
  const [isFavorite, setIsFavorite] = useState(property.is_favorite);
  const [isToggling, setIsToggling] = useState(false);

  const handleFavoriteClick = async () => {
    if (isToggling) return;
    trigger('light');
    setIsToggling(true);
    const newState = !isFavorite;
    setIsFavorite(newState);
    try {
      if (onFavoriteToggle) {
        await onFavoriteToggle(property.id, isFavorite);
      }
    } catch {
      setIsFavorite(isFavorite);
      trigger('error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleShareClick = async () => {
    trigger('light');
    const url = propertyUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const text = `${propertyTitle} на BELDOMiK`;
    try {
      await share({ title: propertyTitle, text, url });
    } catch {
      // Share API может быть недоступен
    }
  };

  const handleComparisonClick = () => {
    trigger('light');
    if (inComparison) {
      removeFromComparison(property.id);
      showToast('Убрано из сравнения', 'info');
    } else {
      const { selectedIds } = useComparisonStore.getState();
      if (selectedIds.includes(property.id)) return;
      if (selectedIds.length >= 4) {
        showToast('Максимум 4 объявления для сравнения', 'warning');
        return;
      }
      addToComparison({ id: property.id });
      showToast('Добавлено к сравнению', 'success');
    }
  };

  // Адрес
  const address = [property.city_name, property.district_name, property.street_name, property.address]
    .filter(Boolean)
    .join(', ');

  const statusLabel =
    property.status !== 'published' && property.status !== 'draft'
      ? STATUS_LABELS[property.status]
      : null;

  return (
    <section className="property-info">
      <div className="property-info__row">
        <div className="property-info__main">
          <div className="property-info__price">
            {formatPriceByn(price, { showCurrency: true })}
          </div>
          {priceUsd && (
            <div className="property-info__price-usd">
              ≈ {formatPriceUsd(priceUsd, { showCurrency: true })}
            </div>
          )}
          {pricePerSqm && (
            <div className="property-info__price-sqm">{formatPricePerSqm(pricePerSqm)}</div>
          )}
        </div>

        <div className="property-info__actions">
          {/* Избранное */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            disabled={isToggling}
            className={`property-info__action ${
              isFavorite ? 'property-info__action--favorite-active' : 'property-info__action--favorite'
            }`}
            aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={isFavorite}
            style={{ opacity: isToggling ? 0.6 : 1 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Сравнить */}
          <button
            type="button"
            onClick={handleComparisonClick}
            className="property-info__action"
            style={inComparison ? { color: '#2171ee', borderColor: '#bfdbfe', background: '#eff6ff' } : undefined}
            aria-label={inComparison ? 'Убрать из сравнения' : 'Добавить к сравнению'}
            aria-pressed={inComparison}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="4 14 10 20 20 4" />
              <line x1="14" y1="4" x2="14" y2="20" />
              <line x1="4" y1="10" x2="4" y2="20" />
            </svg>
          </button>

          {/* Поделиться */}
          <button
            type="button"
            onClick={handleShareClick}
            className="property-info__action"
            aria-label="Поделиться"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </div>

      {/* Адрес (под ценой, как в Kufar) */}
      {address && (
        <div className="property-info__address">{address}</div>
      )}

      {/* Теги / чипсы */}
      <div className="property-info__chips">
        {property.type_name && (
          <span className="property-chip">{property.type_name}</span>
        )}
        {property.total_area && (
          <span className="property-chip">{formatArea(property.total_area)}</span>
        )}
        {property.rooms_count && (
          <span className="property-chip">{property.rooms_count}-комн.</span>
        )}
        {property.is_new_building && (
          <span className="property-chip property-chip--new">Новостройка</span>
        )}
        {property.agency_id == null && (
          <span className="property-chip property-chip--no-middleman">Без посредников</span>
        )}
        {statusLabel && (
          <span className="property-badge property-badge--dark">{statusLabel}</span>
        )}
      </div>
    </section>
  );
}
