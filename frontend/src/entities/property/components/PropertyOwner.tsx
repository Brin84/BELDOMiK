import { ChevronRight } from 'lucide-react';
import type { PropertyOwner as PropertyOwnerType, PropertyDetail } from '@/shared/api/types';

interface PropertyOwnerProps {
  owner: PropertyOwnerType | null;
  property: PropertyDetail;
}

/** Карточка продавца: имя из Kufar-контакта (contact_name), иначе — аккаунт. */
export function PropertyOwner({ owner, property }: PropertyOwnerProps) {
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
    </section>
  );
}
