import { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { EmptyState } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useHaptics, hapticMedium } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { SavedSearchList } from '@/features/saved-searches/components';
import { useCollectionsStore } from '@/features/collections';
import { useAdminStore } from '@/features/admin';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort, UserRole } from '@/shared/api';

export function ProfilePage() {
  const { user, status, error, logout, login } = useAuthStore();
  const { mainButton, initData } = useTelegram();
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  const isAuthenticated = status === 'authenticated' && user;

  const { collections, fetchCollections } = useCollectionsStore();
  const { fetchDashboard } = useAdminStore();
  const [myListingsCount, setMyListingsCount] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
      api.get<PropertyShort[]>(API_ENDPOINTS.properties.myProperties)
        .then(items => setMyListingsCount(items.length))
        .catch(() => {});
    }
  }, [isAuthenticated, fetchCollections]);

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
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
          {/* Fallback: initials, видимы пока аватар не загрузился/отсутствует */}
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            {initials}
          </div>
          {/* Аватар Telegram поверх инициалов. Если URL не отдаёт картинку
              (блокировка Referer и т.п.) — img прячется, остаются инициалы. */}
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => e.currentTarget.remove()}
            />
          )}
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
              <span className="text-xs" style={{ color: '#94a3b8' }}>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--tg-theme-text-color)' }}>Все мои объявления</span>
            {myListingsCount !== null && myListingsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
                {myListingsCount}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-tg-text text-lg font-semibold mb-3">Настройки приложения</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/settings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Профиль и настройки</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>❤️ Избранное</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--tg-theme-text-color)' }}>Все подборки</span>
            {collections.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
                {collections.length}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Входящие заявки</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
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
        <h2 className="text-tg-text text-lg font-semibold mb-3">Сервисы</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/comparison');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <polyline points="4 14 10 20 20 4" />
              <line x1="14" y1="4" x2="14" y2="20" />
              <line x1="4" y1="10" x2="4" y2="20" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Сравнение объявлений</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/mortgage');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <line x1="19" y1="5" x2="5" y2="19" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Ипотечный калькулятор</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Аналитика рынка</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
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
            onClick={() => {
              trigger('light');
              // Поддержка ведётся в личных сообщениях Telegram-бота
              window.open('https://t.me/beldomik_bot', '_blank', 'noopener,noreferrer');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#94a3b8' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span style={{ color: 'var(--tg-theme-text-color)' }}>Написать в поддержку</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <div className="pt-8 text-center text-tg-hint text-sm" style={{ color: '#94a3b8' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси<br />
        v0.1.0
      </div>
    </div>
  );
}