import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { formatPriceByn, formatArea, formatRooms } from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';

interface PropertyMapPreviewProps {
  property: PropertyShort | null;
  onClose: () => void;
}

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

const getOperationLabel = (operation: string): string => {
  const ops: Record<string, string> = {
    sale: 'Продажа',
    rent: 'Аренда',
    daily_rent: 'Посуточно',
    exchange: 'Обмен',
  };
  return ops[operation] || operation;
};

export function PropertyMapPreview({ property, onClose }: PropertyMapPreviewProps) {
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (property) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [property, onClose]);

  if (!property) return null;

  const price = property.price_byn ?? 0;
  const rooms = property.rooms_count ?? property.rooms;
  const area = property.total_area ?? property.area;

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    onClose();
    navigate(`/property/${property.id}`);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Информация об объекте"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Preview Card */}
      <div
        className="relative mx-4 mb-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          borderWidth: '0.5px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }} />
        </div>

        <div className="p-4 space-y-3">
          {/* Header: Photo + Type + Operation + Close */}
          <div className="flex items-start gap-3">
            {/* Photo */}
            <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
              {property.photo_url ? (
                <img
                  src={property.photo_url}
                  alt={property.title || getPropertyTypeLabel(property.property_type)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-tg-hint" style={{ opacity: 0.3 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
              )}
              {property.photo_count > 1 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                  +{property.photo_count - 1}
                </span>
              )}
            </div>

            {/* Type, Operation, Location */}
            <div className="flex-1 min-w-0">
              <h3 className="text-tg-text font-semibold text-base leading-tight truncate">
                {getPropertyTypeLabel(property.property_type)}
                {rooms && property.property_type === 'apartment' && (
                  <span className="font-normal text-tg-hint ml-1">{formatRooms(rooms)}</span>
                )}
              </h3>
              <p className="text-tg-hint text-sm mt-0.5">{getOperationLabel(property.operation)}</p>
              <p className="text-tg-hint text-sm truncate mt-1">
                {property.city}
                {property.district && `, ${property.district}`}
                {property.neighborhood_name && `, ${property.neighborhood_name}`}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl flex-shrink-0 transition-colors"
              style={{ color: 'var(--tg-theme-hint-color)' }}
              aria-label="Закрыть"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Price & Area */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
            <div className="flex flex-col">
              <span className="text-tg-text font-bold text-xl" style={{ whiteSpace: 'nowrap' }}>
                {formatPriceByn(price, { compact: true })}
              </span>
              {property.price_per_m2_byn && (
                <span className="text-tg-hint text-xs">
                  {formatPriceByn(property.price_per_m2_byn)} / м²
                </span>
              )}
            </div>
            {area && (
              <div className="flex items-center gap-1.5 text-tg-hint text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.7 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                <span>{formatArea(area)}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleOpenDetail}
            className="w-full py-3 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}