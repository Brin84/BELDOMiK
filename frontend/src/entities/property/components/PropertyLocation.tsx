import { MapPin } from 'lucide-react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyDetail } from '@/shared/api/types';

interface PropertyLocationProps {
  property: PropertyDetail;
}

/** Kufar-стиль: карта-превью с оверлеем «Посмотреть на карте» + адрес. */
export function PropertyLocation({ property }: PropertyLocationProps) {
  const { trigger } = useHaptics();
  const { openLink } = useTelegram();
  const { lat, lng } = property;
  const address = [property.city_name, property.district_name, property.street_name, property.address]
    .filter(Boolean)
    .join(', ');

  const hasCoords = lat != null && lng != null;
  const mapSrc = hasCoords
    ? `https://yandex.ru/map-widget/v1/?ll=${lng}%2C${lat}&z=16&pt=${lng}%2C${lat}%2Cpm2blm&lang=ru_RU`
    : null;

  const handleOpenMap = () => {
    trigger('light');
    if (mapSrc) {
      // SDK openLink принимает только http/https — Яндекс-карты открываются
      // во внешнем браузере, в WebView MiniApp они недоступны.
      openLink(mapSrc, { try_instant_view: false });
    }
  };

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
          <button
            type="button"
            className="property-location__overlay"
            onClick={handleOpenMap}
            aria-label="Посмотреть на карте"
          >
            <span className="property-location__overlay-btn">
              <MapPin size={18} />
              Посмотреть на карте
            </span>
          </button>
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