import { Heart, ImageOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import {
  formatPriceByn,
  formatArea,
  formatRooms,
} from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';

interface PropertyCardProps {
  property: PropertyShort;
  onFavoriteToggle?: (propertyId: number, isFavorite: boolean) => void;
  /** Принимается для совместимости; в этой раскладке кнопка сравнения не выводится. */
  showComparisonButton?: boolean;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_moderation: 'На модерации',
  rejected: 'Отклонено',
  sold: 'Продано',
  rented: 'Сдано',
  archived: 'В архиве',
  blocked: 'Заблокировано',
};

export function PropertyCard({
  property,
  onFavoriteToggle,
  className = '',
}: PropertyCardProps) {
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

  const typeLabel = property.type_name || 'Объявление';
  const rooms = property.rooms_count;
  const area = property.total_area;

  // Заголовок — самый характерный элемент адреса: сначала адрес/улица,
  // иначе район/микрорайон, иначе город.
  const title =
    property.address ||
    [property.street_name, property.address].filter(Boolean)[0] ||
    property.neighborhood_name ||
    property.district_name ||
    property.city_name ||
    typeLabel;

  // Неопубликованные статусы приоритетнее бейджа «Новостройка».
  const statusLabel =
    property.status !== 'published' && property.status !== 'draft'
      ? (STATUS_LABELS[property.status] ?? property.status)
      : null;
  const badgeLabel = statusLabel ?? (property.is_new_building ? 'Новостройка' : null);

  // Строка характеристик: «2-комн. · 56 м² · 180 000 BYN».
  const specParts: string[] = [];
  if (rooms) specParts.push(formatRooms(rooms));
  if (area) specParts.push(formatArea(area));
  specParts.push(priceLabel);
  const specLabel = specParts.join(' · ');

  return (
    <article
      className={`overflow-hidden rounded-[26px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-transform duration-150 active:scale-[0.98] ${className}`}
      onClick={handlePress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePress();
        }
      }}
      aria-label={`${title}, ${specLabel}`}
    >
      {/* Фото-зона с бейджем и избранным */}
      <div className="relative h-[180px]">
        {hasPhoto ? (
          <img
            src={property.photo_url!}
            alt={`${typeLabel} в ${property.city_name ?? 'Беларуси'}`}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {/* Плейсхолдер без фото */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 ${hasPhoto ? 'hidden' : ''}`}
        >
          <ImageOff size={36} strokeWidth={1.5} />
        </div>

        {badgeLabel && (
          <div
            className={`absolute left-4 top-4 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg ${
              statusLabel ? 'bg-slate-900/75' : 'bg-blue-500'
            }`}
          >
            {badgeLabel}
          </div>
        )}

        <button
          onClick={handleFavoriteClick}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur"
          aria-label={property.is_favorite ? 'Удалить из избранного' : 'В избранное'}
          aria-pressed={property.is_favorite}
        >
          <Heart
            size={22}
            className={property.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}
          />
        </button>
      </div>

      {/* Текстовая часть */}
      <div className="p-5">
        <h3 className="text-[20px] font-bold text-slate-900 leading-snug line-clamp-2">
          {title}
        </h3>
        <p className="mt-2 text-[16px] text-slate-500">{specLabel}</p>
      </div>
    </article>
  );
}