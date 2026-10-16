import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { useTelegram } from '@/app/providers/TelegramProvider';

interface PublishedSuccessProps {
  onClose: () => void;
}

export function PublishedSuccess({ onClose }: PublishedSuccessProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { expand } = useTelegram();
  const [copied, setCopied] = useState(false);

  const userId = user?.id;
  const botUsername = import.meta.env.VITE_TG_BOT_USERNAME || 'beldomik_bot';
  const referralLink = userId
    ? `https://t.me/${botUsername}?startapp=referral_${userId}`
    : null;

  const handleShare = () => {
    if (!referralLink) return;
    const shareText =
      '🏠 BELDOMiK — недвижимость Беларуси\n' +
      'Нашёл отличное приложение для поиска квартир, домов и участков!\n\n' +
      referralLink;

    if (navigator.share) {
      navigator
        .share({ title: 'BELDOMiK', text: shareText, url: referralLink })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
    onClose();
  };

  const handleGoToChannel = () => {
    expand();
    window.open('https://t.me/beldomik_by', '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'var(--bd-bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        overflowY: 'auto',
      }}
    >
      {/* Checkmark circle */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          backgroundColor: 'var(--bd-bg-base)',
          boxShadow:
            '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bd-accent-primary)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--bd-text-primary)',
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Объявление отправлено!
      </h2>
      <p
        style={{
          fontSize: 14,
          color: 'var(--bd-text-secondary)',
          textAlign: 'center',
          lineHeight: 1.5,
          marginBottom: 24,
        }}
      >
        Мы проверим объявление и опубликуем его в ближайшее время.
      </p>

      {/* Referral section */}
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 20,
          backgroundColor: 'var(--bd-bg-base)',
          boxShadow:
            '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
          padding: '20px 20px 16px',
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: 'var(--bd-text-secondary)',
            textAlign: 'center',
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Пригласите друзей — пусть они тоже найдут жильё через BELDOMiK!
        </p>

        {referralLink && (
          <>
            <button
              onClick={handleShare}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 14,
                backgroundColor: 'var(--bd-accent-primary)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: 'none',
                boxShadow: '0 4px 12px var(--bd-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'transform 0.12s ease',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(1px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = '';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {copied ? 'Скопировано!' : 'Пригласить друга'}
            </button>

            <p
              style={{
                fontSize: 11,
                color: 'var(--bd-text-secondary)',
                textAlign: 'center',
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              Друг увидит вашу реферальную ссылку и ваше объявление в ленте
            </p>
          </>
        )}
      </div>

      {/* Channel subscription */}
      <button
        onClick={handleGoToChannel}
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '13px 20px',
          borderRadius: 14,
          backgroundColor: 'var(--bd-bg-base)',
          color: 'var(--bd-text-primary)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          border: 'none',
          boxShadow:
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 12,
          transition: 'box-shadow 0.12s ease, transform 0.12s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(1px)';
          e.currentTarget.style.boxShadow =
            'inset 2px 2px 4px var(--bd-raise-dark), inset -2px -2px 4px var(--bd-raise-light)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow =
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow =
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)';
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ color: 'var(--bd-accent-primary)' }}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.2-.04-.28-.02-.12.02-1.96 1.25-5.55 3.69-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.26-1.5-.4-1.44-.84.03-.25.38-.51 1.07-.77 4.52-1.82 7.57-2.95 9.08-3.24 3.92-.72 4.73-.28 5.42-.17.69.11.94.4 1.11.89.18.49.14 1.27.07 1.99z" />
        </svg>
        Подписаться на канал BELDOMiK
      </button>

      {/* Back to profile */}
      <button
        onClick={handleGoToProfile}
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '13px 20px',
          borderRadius: 14,
          backgroundColor: 'var(--bd-bg-base)',
          color: 'var(--bd-text-secondary)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          border: 'none',
          boxShadow:
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)',
          transition: 'box-shadow 0.12s ease, transform 0.12s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(1px)';
          e.currentTarget.style.boxShadow =
            'inset 2px 2px 4px var(--bd-raise-dark), inset -2px -2px 4px var(--bd-raise-light)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow =
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow =
            '4px 4px 8px var(--bd-raise-dark), -4px -4px 8px var(--bd-raise-light)';
        }}
      >
        К моим объявлениям
      </button>
    </div>
  );
}
