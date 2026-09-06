import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { formatPriceByn, formatPricePerSqm, formatArea, formatRooms, formatFloor, formatDateShort } from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';
import { useComparisonStore } from '@/features/comparison/comparisonStore';
import { useToast } from '@/shared/ui/Toast';
import { PromotionBadge } from './components/PromotionBadge';

interface PropertyCardProps {
  property: PropertyShort;
  onFavoriteToggle?: (propertyId: number, isFavorite: boolean) => void;
  showComparisonButton?: boolean;
  className?: string;
}

export function PropertyCard({
  property,
  onFavoriteToggle,
  showComparisonButton = true,
  className = '',
}: PropertyCardProps) {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const { addToComparison, removeFromComparison, isInComparison } = useComparisonStore();
  const { showToast } = useToast();

  const inComparison = isInComparison(property.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    onFavoriteToggle?.(property.id, !property.is_favorite);
  };

  const handleComparisonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    if (inComparison) {
      removeFromComparison(property.id);
      showToast('Убрано из сравнения', 'info');
    } else {
      const added = addToComparison(property);
      if (!added) {
        showToast('Максимум 4 объявления для сравнения', 'warning');
      } else {
        showToast('Добавлено к сравнению', 'success');
      }
    }
  };

  const handlePress = () => {
    trigger('light');
    navigate(`/property/${property.id}`);
  };

  const hasPhoto = property.photo_url && property.photo_url.length > 0;
  const photoCount = property.photo_count || 0;

  // Display values from backend (type_name/operation_name already localised)
  const hasPrice = property.price_byn != null && property.price_byn > 0;
  const priceLabel = hasPrice ? formatPriceByn(property.price_byn!, { compact: true }) : 'Договорная';
  const pricePerSqm = property.price_per_m2_byn ?? null;
  const rooms = property.rooms_count;
  const area = property.total_area;
  const floor = property.floor;
  const floorsTotal = property.total_floors;
  const typeLabel = property.type_name || 'Объявление';
  const cityLabel = property.city_name || '';
  const districtLabel = property.district_name || '';
  // Krisha-style: цена на фото поверх градиентного скрима (+ статус над ценой).
  const STATUS_LABELS: Record<string, string> = {
    pending_moderation: 'На модерации',
    rejected: 'Отклонено',
    sold: 'Продано',
    rented: 'Сдано',
    archived: 'В архиве',
    blocked: 'Заблокировано',
  };
  const statusLabel =
    property.status !== 'published' && property.status !== 'draft'
      ? (STATUS_LABELS[property.status] ?? property.status)
      : null;

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
      aria-label={`${typeLabel}, ${priceLabel}, ${cityLabel}${districtLabel ? `, ${districtLabel}` : ''}`}
    >
      {/* Photo section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-tg-secondary-bg">
        {hasPhoto ? (
          <>
            <img
              src={property.photo_url!}
              alt={`${typeLabel} в ${cityLabel}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Scrim для читаемости цены/статуса на фото */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(10, 14, 26, 0.62) 0%, rgba(10, 14, 26, 0.14) 42%, rgba(10, 14, 26, 0) 72%)',
              }}
            />
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

        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 left-2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            backgroundColor: property.is_favorite
              ? 'rgba(255, 59, 48, 0.92)'
              : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 10px rgba(10, 14, 26, 0.2)',
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

        {/* Comparison button */}
        {showComparisonButton && (
          <button
            onClick={handleComparisonClick}
            className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: inComparison
                ? 'rgba(47, 111, 237, 0.92)'
                : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 10px rgba(10, 14, 26, 0.2)',
            }}
            aria-label={inComparison ? 'Убрать из сравнения' : 'Добавить к сравнению'}
            aria-pressed={inComparison}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: inComparison ? 'white' : '#1a1a1a' }}
            >
              <polyline points="4 14 10 20 20 4" />
              <line x1="14" y1="4" x2="14" y2="20" />
              <line x1="4" y1="10" x2="4" y2="20" />
            </svg>
          </button>
        )}

        {/* Bottom overlay: статус + цена слева, счётчик фото справа */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 pointer-events-none">
          <div className="flex flex-col items-start gap-1 min-w-0 pointer-events-auto">
            {statusLabel && (
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: 'rgba(10, 14, 26, 0.78)', color: '#fff' }}
              >
                {statusLabel}
              </span>
            )}
            <span
              className="px-2.5 py-1 rounded-lg text-[15px] font-bold leading-tight whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                color: '#111827',
                boxShadow: '0 2px 10px rgba(10, 14, 26, 0.25)',
              }}
            >
              {priceLabel}
            </span>
            {hasPrice && pricePerSqm && (
              <span
                className="text-[11px] font-medium leading-none"
                style={{ color: 'rgba(255, 255, 255, 0.92)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}
              >
                {formatPricePerSqm(pricePerSqm)}
              </span>
            )}
          </div>
          {photoCount > 1 && (
            <span
              className="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap pointer-events-auto backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(10, 14, 26, 0.62)', color: '#fff' }}
            >
              📷 {photoCount}
            </span>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="p-4 space-y-2.5">
        {/* Header: title + rooms */}
        <h3 className="text-tg-text font-semibold text-base leading-tight truncate">
          {typeLabel}
          {rooms && (
            <>
              {' '}
              <span className="font-normal text-tg-hint">{formatRooms(rooms)}</span>
            </>
          )}
        </h3>

        {/* Trust badges: продвижение / новостройка / без посредников */}
        {(property.is_promoted || property.is_direct || property.is_new_building) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.is_promoted && <PromotionBadge type={property.promotion_type} />}
            {property.is_new_building && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(47, 111, 237, 0.12)', color: '#2f6fed' }}
              >
                🏗️ Новостройка
              </span>
            )}
            {property.is_direct && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)', color: '#34c759' }}
              >
                🤝 Без посредников
              </span>
            )}
          </div>
        )}

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
            {cityLabel}
            {districtLabel && `, ${districtLabel}`}
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