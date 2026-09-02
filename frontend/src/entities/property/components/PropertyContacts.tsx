import { useHaptics } from '@/shared/lib/haptics';

interface PropertyContactsProps {
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  // Owner contact channels, derived from the User relation (see PropertyDetailPage).
  ownerUsername?: string | null;
  ownerPhone?: string | null;
  onCallClick?: (phone: string) => void;
  onTelegramClick?: (username: string) => void;
}

function cleanPhone(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

function telegramHref(username: string): string {
  // tg://resolve opens the chat directly inside the Telegram mini-app when
  // available; https://t.me is a universal fallback for other browsers.
  const clean = username.replace('@', '');
  return `https://t.me/${clean}`;
}

export function PropertyContacts({
  phone,
  email,
  telegram,
  ownerUsername,
  ownerPhone,
  onCallClick,
  onTelegramClick,
}: PropertyContactsProps) {
  const { trigger } = useHaptics();

  // Prefer explicit property-level contact fields, then fall back to the
  // owner's profile channels. Telegram is the primary channel in a mini-app.
  const effectiveTelegram = telegram || ownerUsername || null;
  const effectivePhone = phone || ownerPhone || null;

  if (!effectiveTelegram && !effectivePhone && !email) {
    return null;
  }

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-3">Связаться с продавцом</h2>

      <div className="space-y-2">
        {effectiveTelegram && (
          <a
            href={telegramHref(effectiveTelegram)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              trigger('light');
              if (onTelegramClick) {
                onTelegramClick(effectiveTelegram.replace('@', ''));
              } else {
                window.open(telegramHref(effectiveTelegram), '_blank');
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Написать в Telegram
          </a>
        )}

        {effectivePhone && (
          <a
            href={`tel:${cleanPhone(effectivePhone)}`}
            onClick={(e) => {
              e.preventDefault();
              trigger('light');
              if (onCallClick) {
                onCallClick(effectivePhone);
              } else {
                window.location.href = `tel:${cleanPhone(effectivePhone)}`;
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-base"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Позвонить
          </a>
        )}

        {email && (
          <a
            href={`mailto:${email}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trigger('light')}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              borderWidth: '0.5px',
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--tg-theme-button-color)', opacity: 0.15 }}
            >
              <span style={{ color: 'var(--tg-theme-button-color)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Email
              </div>
              <div className="text-tg-text text-sm font-medium truncate">{email}</div>
            </div>
          </a>
        )}
      </div>
    </section>
  );
}
