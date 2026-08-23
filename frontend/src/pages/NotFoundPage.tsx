import { NavLink } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';

export function NotFoundPage() {
  const { trigger } = useHaptics();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] min-h-[100dvh] p-4 safe-top safe-bottom">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tg-theme-button-color)', opacity: 0.1 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--tg-theme-button-color)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-tg-text text-3xl font-bold">404</h1>
        <p className="text-tg-text text-lg">Страница не найдена</p>
        <p className="text-tg-hint text-base" style={{ color: 'var(--tg-theme-hint-color)' }}>
          К сожалению, такой страницы не существует или она была перемещена.
        </p>

        <NavLink
          to="/catalog"
          onClick={() => trigger('light')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Перейти в каталог
        </NavLink>

        <p className="pt-8 text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
          BELDOMiK 🇧🇾 — недвижимость Беларуси
        </p>
      </div>
    </div>
  );
}