import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { formatPriceByn, formatArea, formatRooms } from '@/shared/lib/format';
import type { PropertyShort } from '@/shared/api/types';
import './map.css';

interface PropertyMapPreviewProps {
  property: PropertyShort | null;
  onClose: () => void;
}

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
  const rooms = property.rooms_count;
  const area = property.total_area;
  const typeLabel = property.type_name || 'Объявление';
  const operationLabel = property.operation_name || 'Продажа';

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
        className="mpv__card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mpv__grabber" />

        <div className="mpv__body">
          {/* Header: Photo + Type + Operation + Close */}
          <div className="flex items-start gap-3">
            {/* Photo */}
            <div className="mpv__photo">
              {property.photo_url ? (
                <img
                  src={property.photo_url}
                  alt={typeLabel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ color: '#a0aec0' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.4 }}>
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
              <h3 className="mpv__title">
                {typeLabel}
                {rooms && (
                  <span className="mpv__title-rooms">{formatRooms(rooms)}</span>
                )}
              </h3>
              <p className="mpv__sub">{operationLabel}</p>
              <p className="mpv__loc">
                {property.city_name}
                {property.district_name && `, ${property.district_name}`}
                {property.neighborhood_name && `, ${property.neighborhood_name}`}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="mpv__close"
              aria-label="Закрыть"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Price & Area */}
          <div className="mpv__price-row">
            <div className="flex flex-col">
              <span className="mpv__price" style={{ whiteSpace: 'nowrap' }}>
                {formatPriceByn(price, { compact: true })}
              </span>
              {property.price_per_m2_byn && (
                <span className="mpv__price-m2">
                  {formatPriceByn(property.price_per_m2_byn)} / м²
                </span>
              )}
            </div>
            {area && (
              <div className="mpv__area">
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
            className="mpv__cta"
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
}