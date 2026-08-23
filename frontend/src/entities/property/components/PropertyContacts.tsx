import { useHaptics } from '@/shared/lib/haptics';

interface PropertyContactsProps {
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  onCallClick?: (phone: string) => void;
  onTelegramClick?: (username: string) => void;
}

export function PropertyContacts({
  phone,
  email,
  telegram,
  onCallClick,
  onTelegramClick,
}: PropertyContactsProps) {
  const { trigger } = useHaptics();

  const contacts = [
    phone && {
      type: 'phone' as const,
      label: 'Телефон',
      value: phone,
      href: `tel:${phone.replace(/[^\d+]/g, '')}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    email && {
      type: 'email' as const,
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    telegram && {
      type: 'telegram' as const,
      label: 'Telegram',
      value: telegram.startsWith('@') ? telegram : `@${telegram}`,
      href: `https://t.me/${telegram.replace('@', '')}`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
  ].filter(Boolean) as Array<{
    type: 'phone' | 'email' | 'telegram';
    label: string;
    value: string;
    href: string;
    icon: React.ReactNode;
  }>;

  if (contacts.length === 0) {
    return null;
  }

  return (
    <section className="bg-tg-bg rounded-2xl p-4">
      <h2 className="text-tg-text text-lg font-semibold mb-3">Контакты</h2>
      <div className="space-y-2">
        {contacts.map((contact) => (
          <a
            key={contact.type}
            href={contact.href}
            onClick={(e) => {
              if (contact.type === 'phone' && onCallClick) {
                e.preventDefault();
                trigger('light');
                onCallClick(contact.value);
              } else if (contact.type === 'telegram' && onTelegramClick) {
                e.preventDefault();
                trigger('light');
                onTelegramClick(contact.value.replace('@', ''));
              }
            }}
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              borderWidth: '0.5px',
            }}
            target={contact.type === 'email' || contact.type === 'telegram' ? '_blank' : '_self'}
            rel={contact.type === 'email' || contact.type === 'telegram' ? 'noopener noreferrer' : undefined}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--tg-theme-button-color)', opacity: 0.15 }}
            >
              <span style={{ color: 'var(--tg-theme-button-color)' }}>{contact.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {contact.label}
              </div>
              <div className="text-tg-text text-sm font-medium truncate">{contact.value}</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)', opacity: 0.5 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        ))}
      </div>
    </section>
  );
}