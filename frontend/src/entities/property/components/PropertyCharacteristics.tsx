import type { PropertyDetail } from '@/shared/api/types';
import { formatArea } from '@/shared/lib/format';

interface PropertyCharacteristicsProps {
  property: PropertyDetail;
}

type Characteristic = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

export function PropertyCharacteristics({ property }: PropertyCharacteristicsProps) {
  const characteristics: Characteristic[] = [];

  // Rooms
  const rooms = property.rooms_count ?? property.rooms;
  if (rooms) {
    characteristics.push({
      label: 'Комнаты',
      value: `${rooms}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    });
  }

  // Total area
  const area = property.total_area ?? property.area;
  if (area) {
    characteristics.push({
      label: 'Общая площадь',
      value: formatArea(area),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    });
  }

  // Living area
  if (property.living_area) {
    characteristics.push({
      label: 'Жилая площадь',
      value: formatArea(property.living_area),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    });
  }

  // Kitchen area
  if (property.kitchen_area) {
    characteristics.push({
      label: 'Площадь кухни',
      value: formatArea(property.kitchen_area),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <path d="M6 14h12" />
        </svg>
      ),
    });
  }

  // Floor
  if (property.floor && property.total_floors) {
    characteristics.push({
      label: 'Этаж',
      value: `${property.floor} / ${property.total_floors}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="6" x2="22" y2="6" />
          <line x1="2" y1="18" x2="22" y2="18" />
        </svg>
      ),
    });
  } else if (property.floor) {
    characteristics.push({
      label: 'Этаж',
      value: `${property.floor}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      ),
    });
  }

  // Build year
  if (property.build_year) {
    characteristics.push({
      label: 'Год постройки',
      value: `${property.build_year}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="12" y1="6" x2="12" y2="6" />
          <line x1="12" y1="10" x2="12" y2="10" />
          <line x1="12" y1="14" x2="12" y2="14" />
        </svg>
      ),
    });
  }

  // Renovation
  if (property.renovation) {
    characteristics.push({
      label: 'Ремонт',
      value: property.renovation,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 18 2 12 8 6" />
        </svg>
      ),
    });
  }

  // Boolean features
  if (property.furniture) {
    characteristics.push({
      label: 'Мебель',
      value: 'Есть',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
          <rect x="2" y="15" width="20" height="7" rx="1" />
          <line x1="6" y1="19" x2="6.01" y2="19" />
          <line x1="10" y1="19" x2="10.01" y2="19" />
          <line x1="14" y1="19" x2="14.01" y2="19" />
          <line x1="18" y1="19" x2="18.01" y2="19" />
        </svg>
      ),
    });
  }

  if (property.balcony) {
    characteristics.push({
      label: 'Балкон / Лоджия',
      value: 'Есть',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      ),
    });
  }

  if (property.parking) {
    characteristics.push({
      label: 'Парковка',
      value: 'Есть',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="1" y="3" width="22" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      ),
    });
  }

  if (property.elevator) {
    characteristics.push({
      label: 'Лифт',
      value: 'Есть',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
        </svg>
      ),
    });
  }

  // Metro
  if (property.metro_station_name) {
    const distance = property.metro_distance ? `, ${property.metro_distance} м` : '';
    characteristics.push({
      label: 'Метро',
      value: `${property.metro_station_name}${distance}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    });
  }

  if (characteristics.length === 0) {
    return null;
  }

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-3">Характеристики</h2>
      <div className="grid grid-cols-2 gap-3">
        {characteristics.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              borderWidth: '0.5px',
            }}
          >
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--tg-theme-button-color)', opacity: 0.15 }}
            >
              <span style={{ color: 'var(--tg-theme-button-color)' }}>{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {item.label}
              </div>
              <div className="text-tg-text text-sm font-medium truncate">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}