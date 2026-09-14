import { ChevronRight } from 'lucide-react';
import type { PropertyOwner as PropertyOwnerType, PropertyDetail } from '@/shared/api/types';

interface PropertyOwnerProps {
  owner: PropertyOwnerType | null;
  property: PropertyDetail;
  /** Контактный номер для показа. Отображается голубым как ссылка канала. */
  phone?: string | null;
  /** Вызывается по тапу на номер (открывает лист звонка). */
  onCall?: () => void;
}

/** Карточка продавца: имя из Kufar-контакта (contact_name), иначе — аккаунт. */
export function PropertyOwner({ owner, property, phone, onCall }: PropertyOwnerProps) {
  const displayName = property.contact_name || owner?.name || property.owner_name || 'Частное лицо';
  const displayIsAgency = owner?.is_agency ?? (property.agency_id != null);
  const displayAgencyName = owner?.agency_name || property.agency_name;
  const displayVerified = owner?.phone_verified ?? owner?.telegram_verified ?? property.is_verified ?? false;
  const displayLogo = owner?.agency_name ? undefined : property.agency_logo_url;

  return (
    <section className="property-section">
      <div className="agent-card">
        <div className="agent-card__avatar">
          {displayLogo ? (
            <img src={displayLogo} alt="" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="agent-card__body">
          <div className="agent-card__name">
            <span className="agent-card__name-text">{displayName}</span>
            {displayVerified && (
              <span className="agent-card__verified" title="Подтверждено">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>
          <div className="agent-card__type">
            {displayIsAgency ? 'Агентство недвижимости' : 'Частное лицо'}
          </div>
          {displayAgencyName && (
            <div className="agent-card__company">
              <span className="agent-card__company-name">{displayAgencyName}</span>
            </div>
          )}
        </div>

        <ChevronRight size={20} className="agent-card__chevron" />
      </div>

      {phone && onCall && (
        <button
          type="button"
          className="agent-card__phone"
          onClick={onCall}
          aria-label={`Позвонить по номеру ${phone}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {phone}
        </button>
      )}
    </section>
  );
}
