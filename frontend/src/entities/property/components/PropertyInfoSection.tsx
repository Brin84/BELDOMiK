import type { PropertyDetail, PropertyStatus } from '@/shared/api/types';
import {
  formatPriceByn,
  formatPricePerSqm,
  formatArea,
  formatRooms,
  formatFloor,
  formatDate,
} from '@/shared/lib/format';

const STATUS_LABELS: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.1)' },
  pending_moderation: { label: 'На модерации', color: '#007aff', bg: 'rgba(0, 122, 255, 0.1)' },
  published: { label: 'Опубликовано', color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)' },
  rejected: { label: 'Отклонено', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)' },
  blocked: { label: 'Заблокировано', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)' },
  archived: { label: 'В архиве', color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' },
  sold: { label: 'Продано', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.1)' },
  rented: { label: 'Сдано', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.1)' },
};

function StatusBadge({ status }: { status: PropertyStatus }) {
  const config = STATUS_LABELS[status] || { label: status, color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' };
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

interface PropertyInfoSectionProps {
  property: PropertyDetail;
}

export function PropertyInfoSection({ property }: PropertyInfoSectionProps) {
  const price = property.price_byn ?? 0;
  const pricePerSqm = property.price_per_m2_byn ?? null;
  const rooms = property.rooms_count ?? property.rooms;
  const area = property.total_area ?? property.area;
  const floor = property.floor;
  const floorsTotal = property.total_floors ?? property.floors_total;

  return (
    <section className="bg-tg-bg rounded-2xl p-4 space-y-4">
      {/* Price and Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-tg-text font-bold text-3xl leading-none">
            {formatPriceByn(price, { compact: true })}
          </div>
          {pricePerSqm && (
            <div className="text-tg-hint text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {formatPricePerSqm(pricePerSqm)}
            </div>
          )}
        </div>
        <StatusBadge status={property.status} />
      </div>

      {/* Operation and Type */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
          backgroundColor: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
        }}>
          {property.operation_name || (property.operation === 'sale' ? 'Продажа' : property.operation === 'rent' ? 'Аренда' : property.operation)}
        </span>
        <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
        }}>
          {property.type_name || property.property_type}
        </span>
        {property.is_new_building && (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
            backgroundColor: 'rgba(47, 111, 237, 0.12)',
            color: '#2f6fed',
          }}>
            🏗️ Новостройка
          </span>
        )}
        {property.agency_id == null && (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
            backgroundColor: 'rgba(52, 199, 89, 0.12)',
            color: '#34c759',
          }}>
            🤝 Без посредников
          </span>
        )}
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3">
        {rooms && (
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ opacity: 0.7, color: 'var(--tg-theme-hint-color)' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <div>
              <div className="text-tg-text font-medium">{formatRooms(rooms)}</div>
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Комнаты</div>
            </div>
          </div>
        )}

        {area && (
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ opacity: 0.7, color: 'var(--tg-theme-hint-color)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            <div>
              <div className="text-tg-text font-medium">{formatArea(area)}</div>
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Площадь</div>
            </div>
          </div>
        )}

        {floor && floorsTotal && (
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ opacity: 0.7, color: 'var(--tg-theme-hint-color)' }}>
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="6" x2="22" y2="6" />
              <line x1="2" y1="18" x2="22" y2="18" />
            </svg>
            <div>
              <div className="text-tg-text font-medium">{formatFloor(floor, floorsTotal)}</div>
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Этаж</div>
            </div>
          </div>
        )}

        {property.build_year && (
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ opacity: 0.7, color: 'var(--tg-theme-hint-color)' }}>
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="12" y1="6" x2="12" y2="6" />
              <line x1="12" y1="10" x2="12" y2="10" />
              <line x1="12" y1="14" x2="12" y2="14" />
            </svg>
            <div>
              <div className="text-tg-text font-medium">{property.build_year} г.</div>
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Год постройки</div>
            </div>
          </div>
        )}
      </div>

      {/* Publish date */}
      {property.published_at && (
        <div className="text-tg-hint text-sm pt-1 border-t border-tg-hint" style={{
          color: 'var(--tg-theme-hint-color)',
          borderTopColor: 'var(--tg-theme-hint-color)',
          opacity: 0.5,
        }}>
          Опубликовано: {formatDate(property.published_at)}
        </div>
      )}
    </section>
  );
}