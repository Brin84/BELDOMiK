import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useHaptics, hapticMedium } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { SavedSearchList } from '@/features/saved-searches/components';
import { useCollectionsStore } from '@/features/collections';
import type { UserRole } from '@/shared/api';
import { useAdminStore } from '@/features/admin';

export function ProfilePage() {
  const { user, status, error, logout, login } = useAuthStore();
  const { mainButton, initData } = useTelegram();
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const isAuthenticated = status === 'authenticated' && user;

  const { collections, fetchCollections } = useCollectionsStore();
  const { fetchDashboard } = useAdminStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
    }
  }, [isAuthenticated, fetchCollections]);

  // Show main button with logout when authenticated.
  // Hidden on unmount so it doesn't linger on other pages (SPA navigation).
  // Deps must stay stable (module-level hapticMedium, not the per-render
  // `trigger` from useHaptics) — an unstable dep re-runs the effect on every
  // render, so cleanup hide() races the show() and the button flickers/never
  // stays visible.
  useEffect(() => {
    if (!mainButton || !isAuthenticated) return;

    const handleLogout = () => {
      hapticMedium();
      logout();
    };

    mainButton.setParams({
      text: 'Выйти',
      is_visible: true,
      // Telegram MainButton accepts only hex color strings, not CSS var()
      color: '#ff3b30',
      text_color: '#ffffff',
    });
    mainButton.onClick(handleLogout);
    mainButton.show();

    return () => {
      mainButton.offClick(handleLogout);
      mainButton.hide();
    };
  }, [mainButton, isAuthenticated, logout]);

  const handleApplySavedSearch = (filtersJson: string) => {
    trigger('selection');
    // Navigate to search page with filters applied
    // We'll encode the filters in the URL or use sessionStorage
    sessionStorage.setItem('applySavedSearchFilters', filtersJson);
    navigate('/search');
  };

  const handleEditSavedSearch = (savedSearch: { id: number; name: string | null; filters_json: string; notify_frequency: string }) => {
    trigger('light');
    // For now, we'll navigate to search page with the filters pre-filled
    // A more complete implementation would open a modal
    sessionStorage.setItem('editSavedSearch', JSON.stringify(savedSearch));
    navigate('/search');
  };

  if (!isAuthenticated) {
    const isAuthenticating = status === 'authenticating';
    return (
      <div className="p-4 space-y-6 pb-20">
        <EmptyState
          title="Войдите в профиль"
          description="Авторизуйтесь через Telegram, чтобы управлять объявлениями, избранным и настройками"
          action={{
            label: isAuthenticating ? 'Входим…' : 'Войти',
            onClick: () => {
              if (!initData || isAuthenticating) return;
              trigger('medium');
              login(initData).catch(() => trigger('error'));
            },
          }}
        />
        {status === 'error' && (
          <p
            className="text-center text-sm px-4"
            style={{ color: 'var(--tg-theme-destructive-color, #ff3b30)' }}
          >
            Не удалось войти: {error || 'попробуйте ещё раз'}
          </p>
        )}
      </div>
    );
  }

  const initials = user.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : user.username
      ? user.username[0].toUpperCase()
      : '?';

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return '👑 Администратор';
      case 'moderator': return '🛡️ Модератор';
      case 'agency_admin': return '🏢 Админ агентства';
      case 'agent': return '🤝 Агент';
      case 'owner': return '👤 Владелец';
      default: return '👤 Пользователь';
    }
  };

  const getRoleColors = (role: UserRole) => {
    switch (role) {
      case 'admin':
      case 'moderator':
        return { bg: 'rgba(255, 149, 0, 0.2)', color: '#ff9500' };
      case 'agent':
      case 'agency_admin':
        return { bg: 'rgba(0, 122, 255, 0.2)', color: '#007aff' };
      default:
        return { bg: 'rgba(52, 199, 89, 0.2)', color: '#34c759' };
    }
  };

  const roleColors = getRoleColors(user.role as UserRole);

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-tg-text text-xl font-bold truncate">
            {user.first_name || ''} {user.last_name || ''}
          </h1>
          {user.username && (
            <p className="text-tg-hint text-sm truncate">@{user.username}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: roleColors.bg,
                color: roleColors.color,
              }}
            >
              {getRoleLabel(user.role as UserRole)}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Panel tile — only for admin/moderator */}
      {(user.role === 'admin' || user.role === 'moderator') && (
        <section>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(255,149,0,0.15) 0%, rgba(255,59,48,0.1) 100%)',
              border: '1px solid rgba(255,149,0,0.3)',
            }}
            onClick={() => {
              trigger('medium');
              fetchDashboard();
              navigate('/admin');
            }}
          >
            <span className="text-2xl">👑</span>
            <div className="flex-1">
              <span className="font-semibold block" style={{ color: '#ff9500' }}>Админ-панель</span>
              <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Управление платформой, модерация, пользователи
              </span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#ff9500' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </section>
      )}

      {/* Menu Sections */}
      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">Мои объявления</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/my-listings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Все мои объявления</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '2px dashed var(--tg-theme-hint-color)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/create-listing');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-button-color)' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ color: 'var(--tg-theme-button-color)' }}>Создать объявление</span>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">🏢 Агентство</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/agencies/me');
            }}
          >
            <span className="text-2xl flex-shrink-0">🏢</span>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Моё агентство</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/subscription');
            }}
          >
            <span className="text-2xl flex-shrink-0">💎</span>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Подписка</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">Избранное и поиск</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/favorites');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>❤️ Избранное</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">📁 Подборки</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/collections');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--tg-theme-text-color)' }}>Все подборки</span>
            {collections.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
                {collections.length}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">📅 Записи на осмотр</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/viewings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Входящие заявки</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">🔔 Сохранённые поиски</h2>
        <SavedSearchList
          onApplySearch={handleApplySavedSearch}
          onEditSearch={handleEditSavedSearch}
        />
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">Настройки</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/analytics');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>📊 Аналитика рынка</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Уведомления</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Приватность</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Тема приложения</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">Поддержка</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Помощь и FAQ</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Написать в поддержку</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => trigger('light')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>О приложении</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <div className="pt-8 text-center text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси<br />
        v0.1.0
      </div>
    </div>
  );
}