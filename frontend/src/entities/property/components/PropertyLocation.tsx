import { MapPin } from 'lucide-react';
import type { PropertyDetail } from '@/shared/api/types';

interface PropertyLocationProps {
  property: PropertyDetail;
}

/** Полноценная карта (Yandex Map Widget) + адрес объекта. */
export function PropertyLocation({ property }: PropertyLocationProps) {
  const { lat, lng } = property;
  const address = [property.city_name, property.district_name, property.street_name, property.address]
    .filter(Boolean)
    .join(', ');

  const hasCoords = lat != null && lng != null;
  const mapSrc = hasCoords
    ? `https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=16&pt=${lng}%2C${lat}%2Cpm2blm&lang=ru_RU`
    : null;

  if (!hasCoords && !address) {
    return null;
  }

  return (
    <section className="property-section">
      <h2 className="property-section__title">Расположение</h2>

      {mapSrc && (
        <div className="property-location__map-wrap">
          <iframe
            src={mapSrc}
            title="Карта расположения"
            className="property-location__map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}

      {address && (
        <div className="property-location__address">
          <MapPin size={16} className="property-location__address-icon" />
          <span className="property-location__address-text">{address}</span>
        </div>
      )}
    </section>
  );
}
