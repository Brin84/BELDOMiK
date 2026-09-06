import { Heart, ImageOff, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import {
  formatPriceByn,
  formatArea,
  formatRooms,
  formatFloor,
  formatRelativeTime,
} from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';

interface HotPropertyCardProps {
  property: PropertyShort;
  onFavoriteToggle?: (propertyId: number, isFavorite: boolean) => void;
  /** Горячие предложения выводит цену и время, основные — без времени. */
  showTime?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending_moderation: 'На модерации',
  rejected: 'Отклонено',
  sold: 'Продано',
  rented: 'Сдано',
  archived: 'В архиве',
  blocked: 'Заблокировано',
};

export function HotPropertyCard({ property, onFavoriteToggle, showTime = false }: HotPropertyCardProps) {
  const { trigger } = useHaptics();
  const navigate = useNavigate();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    onFavoriteToggle?.(property.id, !property.is_favorite);
  };

  const handlePress = () => {
    trigger('light');
    navigate(`/property/${property.id}`);
  };

  const hasPhoto = property.photo_url && property.photo_url.length > 0;
  const hasPrice = property.price_byn != null && property.price_byn > 0;
  const priceLabel = hasPrice ? formatPriceByn(property.price_byn!, { showCurrency: true }) : 'Договорная';
  const priceAria: string = hasPrice
    ? (formatPriceByn(property.price_byn!, { showCurrency: false }) as string)
    : 'Договорная';

  const title =
    property.address ||
    property.street_name ||
    property.neighborhood_name ||
    property.district_name ||
    property.city_name ||
    property.type_name ||
    'Объявление';

  const location = [property.city_name, property.district_name].filter(Boolean).join(', ');

  const statusLabel =
    property.status !== 'published' && property.status !== 'draft'
      ? (STATUS_LABELS[property.status] ?? property.status)
      : null;
  const badgeLabel = statusLabel ?? (property.is_new_building ? 'Новостройка' : null);

  const specParts: string[] = [];
  if (property.rooms_count) specParts.push(formatRooms(property.rooms_count));
  if (property.total_area) specParts.push(formatArea(property.total_area));
  if (property.floor && property.total_floors) specParts.push(formatFloor(property.floor, property.total_floors));
  const specLabel = specParts.length > 0 ? specParts.join(' · ') : property.type_name || 'Объявление';

  return (
    <article
      className="hot-card"
      onClick={handlePress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePress();
        }
      }}
      aria-label={`${title}, ${specLabel}, ${priceAria}`}
    >
      {/* Фото слева */}
      <div className="hot-card__photo">
        {!hasPhoto && (
          <div className="hot-card__photo-placeholder">
            <ImageOff size={24} strokeWidth={1.5} />
          </div>
        )}
        {hasPhoto ? (
          <img
            src={property.photo_url!}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {badgeLabel && (
          <div className={`hot-card__badge ${statusLabel ? 'hot-card__badge--dark' : ''}`}>
            {badgeLabel}
          </div>
        )}

        <button
          type="button"
          onClick={handleFavoriteClick}
          className="hot-card__fav"
          aria-label={property.is_favorite ? 'Удалить из избранного' : 'В избранное'}
          aria-pressed={property.is_favorite}
        >
          <Heart
            size={15}
            className={property.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}
          />
        </button>
      </div>

      {/* Информация справа */}
      <div className="hot-card__body">
        <h3 className="hot-card__title">{title}</h3>
        <p className="hot-card__specs">{specLabel}</p>

        {location && (
          <div className="hot-card__location">
            <MapPin size={12} className="hot-card__location-icon" />
            <span className="hot-card__location-text">{location}</span>
          </div>
        )}

        <div className="hot-card__price">
          {priceLabel}
          {showTime && property.created_at && (
            <span className="hot-card__time">{formatRelativeTime(property.created_at)}</span>
          )}
        </div>
      </div>
    </article>
  );
}