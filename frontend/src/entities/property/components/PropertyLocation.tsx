import type { PropertyDetail } from '@/shared/api/types';

interface PropertyLocationProps {
  property: PropertyDetail;
}

export function PropertyLocation({ property }: PropertyLocationProps) {
  // Build location chain: Belarus → region → city → district → neighborhood → street
  const locationParts: { label: string; value: string }[] = [];

  // Country (Belarus)
  locationParts.push({ label: 'Страна', value: 'Беларусь' });

  // Region - from property.region_id (we need to map it somehow, for now use city_name if available)
  // Since backend doesn't return region directly in PropertyDetail, we'll show what's available
  if (property.city_name) {
    locationParts.push({ label: 'Город', value: property.city_name });
  }

  if (property.district_name) {
    locationParts.push({ label: 'Район', value: property.district_name });
  }

  if (property.neighborhood_name) {
    locationParts.push({ label: 'Микрорайон', value: property.neighborhood_name });
  }

  if (property.street_name) {
    locationParts.push({ label: 'Улица', value: property.street_name });
  }

  // Metro
  if (property.metro_station_name) {
    const distance = property.metro_distance ? ` (${property.metro_distance} м)` : '';
    locationParts.push({ label: 'Метро', value: `${property.metro_station_name}${distance}` });
  }

  if (locationParts.length <= 1) {
    return null;
  }

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-3">Расположение</h2>
      <div className="space-y-3">
        {locationParts.map((part, index) => (
          <div key={part.label} className="flex items-center gap-3">
            {index > 0 && (
              <div className="flex-shrink-0 w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.3 }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {part.label}
              </div>
              <div className="text-tg-text text-sm font-medium truncate">{part.value}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Map placeholder */}
      {(property.latitude && property.longitude) && (
        <div className="mt-4 aspect-[4/3] bg-tg-secondary-bg rounded-xl overflow-hidden flex items-center justify-center"
          style={{ border: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}
        >
          <div className="text-center px-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-2 text-tg-hint" style={{ opacity: 0.5 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Карта (координаты: {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)})
            </div>
          </div>
        </div>
      )}
    </section>
  );
}