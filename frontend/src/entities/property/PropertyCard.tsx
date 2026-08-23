import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { formatPriceByn, formatPricePerSqm, formatArea, formatRooms, formatFloor, formatDateShort } from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';

interface PropertyCardProps {
  property: PropertyShort;
  onFavoriteToggle?: (propertyId: number, isFavorite: boolean) => void;
  className?: string;
}

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
  const photoCount = property.photo_count || 0;

  // Get display values with fallbacks for different field names
  const price = property.price_byn ?? 0;
  const pricePerSqm = property.price_per_m2_byn ?? null;
  const rooms = property.rooms_count ?? property.rooms;
  const area = property.total_area ?? property.area;
  const floor = property.floor;
  const floorsTotal = property.total_floors ?? property.floors_total;

  // Determine property type label in Russian
  const getPropertyTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      apartment: 'Квартира',
      house: 'Дом',
      land: 'Земля',
      commercial: 'Коммерческая',
      garage: 'Гараж',
      dacha: 'Дача',
    };
    return types[type] || type;
  };

  // Determine operation label
  const getOperationLabel = (operation: string): string => {
    const ops: Record<string, string> = {
      sale: 'Продажа',
      rent: 'Аренда',
      daily_rent: 'Посуточно',
      exchange: 'Обмен',
    };
    return ops[operation] || operation;
  };

  return (
    <article
      className={`bg-tg-bg rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${className}`}
      style={{
        border: '1px solid var(--tg-theme-hint-color)',
        borderWidth: '0.5px',
      }}
      onClick={handlePress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePress(); } }}
      aria-label={`${getPropertyTypeLabel(property.property_type)}, ${formatPriceByn(price)}, ${property.city}${property.district ? `, ${property.district}` : ''}`}
    >
      {/* Photo section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-tg-secondary-bg">
        {hasPhoto ? (
          <>
            <img
              src={property.photo_url!}
              alt={`${getPropertyTypeLabel(property.property_type)} в ${property.city}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Photo count badge */}
            {photoCount > 1 && (
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                }}
              >
                +{photoCount - 1}
              </div>
            )}
            {/* Favorite button */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 left-2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: property.is_favorite
                  ? 'rgba(255, 59, 48, 0.9)'
                  : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
              }}
              aria-label={property.is_favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
              aria-pressed={property.is_favorite}
            >
              <svg
                width={property.is_favorite ? 20 : 18}
                height={property.is_favorite ? 20 : 18}
                viewBox="0 0 24 24"
                fill={property.is_favorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={property.is_favorite ? 0 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: property.is_favorite ? 'white' : '#1a1a1a' }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.3 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {property.status !== 'published' && property.status !== 'draft' && (
          <span className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: 'white',
              backdropFilter: 'blur(4px)',
            }}
          >
            {property.status === 'pending_moderation' && 'На модерации'}
            {property.status === 'rejected' && 'Отклонено'}
            {property.status === 'sold' && 'Продано'}
            {property.status === 'rented' && 'Сдано'}
            {property.status === 'archived' && 'В архиве'}
            {property.status === 'blocked' && 'Заблокировано'}
          </span>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 space-y-3">
        {/* Header: Type + Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-tg-text font-semibold text-base leading-tight truncate">
              {getPropertyTypeLabel(property.property_type)}
              {rooms && property.property_type === 'apartment' && (
                <>
                  {' '}
                  <span className="font-normal text-tg-hint">{formatRooms(rooms)}</span>
                </>
              )}
            </h3>
            <p className="text-tg-hint text-sm mt-0.5 truncate">
              {getOperationLabel(property.operation)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-tg-text font-bold text-lg" style={{ whiteSpace: 'nowrap' }}>
              {formatPriceByn(price, { compact: true })}
            </span>
            {pricePerSqm && (
              <span className="text-tg-hint text-xs" style={{ whiteSpace: 'nowrap' }}>
                {formatPricePerSqm(pricePerSqm)}
              </span>
            )}
          </div>
        </div>

        {/* Details row: Area, Floor */}
        <div className="flex items-center gap-3 flex-wrap text-tg-hint text-sm">
          {area && (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.7 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              {formatArea(area)}
            </span>
          )}
          {floor && floorsTotal && (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.7 }}>
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="6" x2="22" y2="6" />
                <line x1="2" y1="18" x2="22" y2="18" />
              </svg>
              {formatFloor(floor, floorsTotal)}
            </span>
          )}
          {!area && !floor && (
            <span className="opacity-50">—</span>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-tg-hint text-sm truncate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ opacity: 0.7 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">
            {property.city}
            {property.district && `, ${property.district}`}
            {property.neighborhood_name && `, ${property.neighborhood_name}`}
            {property.street_name && `, ${property.street_name}`}
          </span>
        </div>

        {/* Date */}
        <p className="text-tg-hint text-xs truncate" style={{ opacity: 0.7 }}>
          {formatDateShort(property.created_at)}
        </p>
      </div>
    </article>
  );
}