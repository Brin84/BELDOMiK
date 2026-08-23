import type { PropertyOwner as PropertyOwnerType, PropertyDetail } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/format';

interface PropertyOwnerProps {
  owner: PropertyOwnerType | null;
  property: PropertyDetail;
}

export function PropertyOwner({ owner, property }: PropertyOwnerProps) {
  // If we don't have detailed owner info, fall back to property owner fields
  const displayName = owner?.name || property.owner_name || 'Неизвестный';
  const displayUsername = owner?.username;
  const displayIsAgency = owner?.is_agency ?? false;
  const displayAgencyName = owner?.agency_name;
  const displayListingsCount = owner?.listings_count ?? 1;
  const displayMemberSince = owner?.member_since || property.created_at;
  const displayPhoneVerified = owner?.phone_verified ?? false;
  const displayTelegramVerified = owner?.telegram_verified ?? false;

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-3">Владелец</h2>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 relative">
          <div className="w-16 h-16 rounded-full bg-tg-secondary-bg flex items-center justify-center overflow-hidden"
            style={{ border: '1px solid var(--tg-theme-hint-color)', borderWidth: '0.5px' }}
          >
            {owner?.id && (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ color: 'var(--tg-theme-button-color)' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Verification badges */}
          {(displayPhoneVerified || displayTelegramVerified) && (
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              {displayPhoneVerified && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                  title="Телефон подтвержден"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
              )}
              {displayTelegramVerified && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                  title="Telegram подтвержден"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Owner info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-tg-text font-semibold text-base truncate">{displayName}</span>
            {displayUsername && (
              <span className="text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
                @{displayUsername}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-2 py-1 rounded text-xs font-medium" style={{
              backgroundColor: displayIsAgency ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: displayIsAgency ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
            }}>
              {displayIsAgency ? 'Агентство' : 'Частное лицо'}
            </span>
            {displayAgencyName && (
              <span className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {displayAgencyName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>{displayListingsCount} объявл.</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>С {formatDate(displayMemberSince)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}