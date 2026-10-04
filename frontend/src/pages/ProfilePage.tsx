import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { EmptyState, NeuCard } from '@/shared/ui';
import { useAuthStore } from '@/features/auth';
import { useHaptics } from '@/shared/lib/haptics';
import { useNavigate } from 'react-router-dom';
import { SavedSearchList } from '@/features/saved-searches/components';
import { useCollectionsStore } from '@/features/collections';
import { useAdminStore } from '@/features/admin';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort, SellerSummary, UserRole } from '@/shared/api';

export function ProfilePage() {
  const { user, status, error, login } = useAuthStore();
  const { initData } = useTelegram();
  const { trigger } = useHaptics();
  const navigate = useNavigate();
  // status не персистируется (см. authStore.partialize): после перезагрузки
  // MiniApp он снова 'idle' до завершения refresh(), и профиль успевал
  // показать «Войдите в профиль» уже авторизованному пользователю.
  // Признак живой сессии — сохранённый user, а не только status.
  const isAuthenticated = Boolean(user) && status !== 'error';

  const { collections, fetchCollections } = useCollectionsStore();
  const { fetchDashboard } = useAdminStore();
  const [myListingsCount, setMyListingsCount] = useState<number | null>(null);
  // Сводка соц-метрик (рейтинг/отзывы/сделки/подписчики) — Барахолка-модель,
  // из GET /users/{id}; показывает рейтинг прямо в шапке профиля.
  const [sellerSummary, setSellerSummary] = useState<SellerSummary | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCollections();
      api.get<PropertyShort[]>(API_ENDPOINTS.properties.myProperties)
        .then(items => setMyListingsCount(items.length))
        .catch(() => {});
    }
  }, [isAuthenticated, fetchCollections]);

  useEffect(() => {
    if (user) {
      api.get<SellerSummary>(API_ENDPOINTS.users.summary(user.id))
        .then(setSellerSummary)
        .catch(() => {});
    }
  }, [user]);

  // Выход из аккаунта только в «Настройках» (/settings) — здесь намеренно ничего нет.

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

  if (!user) {
    const isAuthenticating = status === 'authenticating';
    return (
      <div className="p-4 space-y-6 pb-90" style={{ backgroundColor: 'var(--bd-bg-base)', color: 'var(--bd-text-primary)' }}>
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
            style={{ color: '#ef4444' }}
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
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' };
      case 'agent':
      case 'agency_admin':
        return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' };
    }
  };

  const roleColors = getRoleColors(user.role as UserRole);
  // Роль-бейдж в шапке для admin/moderator работает как вход в админ-панель.
  const isAdminOrModerator = user.role === 'admin' || user.role === 'moderator';

  return (
    <div className="p-4 space-y-6 pb-90" style={{ backgroundColor: 'var(--bd-bg-base)', color: 'var(--bd-text-primary)' }}>
      {/* Profile Header */}
      <NeuCard padding="none">
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]">
            {/* Fallback: initials */}
            <div
              className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
              style={{
                backgroundColor: 'var(--bd-accent-primary)',
                color: '#ffffff',
              }}
            >
              {initials}
            </div>
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
            <h1 className="text-xl font-bold truncate">{user.first_name || ''} {user.last_name || ''}</h1>
            {user.username && (
              <p className="text-sm truncate" style={{ color: 'var(--bd-text-secondary)' }}>@{user.username}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {isAdminOrModerator ? (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded-full text-xs font-medium transition-opacity active:opacity-60 shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{
                    backgroundColor: roleColors.bg,
                    color: roleColors.color,
                  }}
                  onClick={() => {
                    trigger('medium');
                    fetchDashboard();
                    navigate('/admin');
                  }}
                >
                  {getRoleLabel(user.role as UserRole)} →
                </button>
              ) : (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{
                    backgroundColor: roleColors.bg,
                    color: roleColors.color,
                  }}
                >
                  {getRoleLabel(user.role as UserRole)}
                </span>
              )}
            </div>
            {sellerSummary && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm" style={{ color: 'var(--bd-text-secondary)' }}>
                <span className="inline-flex items-center gap-1">
                  <Star size={14} strokeWidth={0} fill="#f59e0b" />
                  <b style={{ color: 'var(--bd-text-primary)' }}>{sellerSummary.rating.toFixed(1)}</b>
                </span>
                <span>{sellerSummary.reviews_count} отзывов</span>
                {sellerSummary.deals_count > 0 && <span>{sellerSummary.deals_count} сделок</span>}
                {sellerSummary.followers_count > 0 && <span>{sellerSummary.followers_count} подписчиков</span>}
              </div>
            )}
          </div>
        </div>
      </NeuCard>

      {/* Вход в админ-панель — бейдж роли в шапке выше; отдельной плитки нет,
          чтобы не дублировать одно действие двумя кнопками. */}

      {/* Menu Sections */}
      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">Мои объявления</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/my-listings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--bd-text-primary)' }}>Все мои объявления</span>
            {myListingsCount !== null && myListingsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
                {myListingsCount}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
              border: '2px dashed rgba(113, 128, 150, 0.5)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/create-listing');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-accent-primary)' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ color: 'var(--bd-accent-primary)' }}>Создать объявление</span>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">⭐ Рейтинг и отзывы</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/reviews');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" className="flex-shrink-0">
              <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5l-6.2 4.5 2.4-7.3L2 9.2h7.6z" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--bd-text-primary)' }}>Мои отзывы</span>
            {sellerSummary && sellerSummary.reviews_count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
                {sellerSummary.reviews_count}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">🏢 Агентство</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/agencies/me');
            }}
          >
            <span className="text-2xl flex-shrink-0">🏢</span>
            <span style={{ color: 'var(--bd-text-primary)' }}>Моё агентство</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/subscription');
            }}
          >
            <span className="text-2xl flex-shrink-0">💎</span>
            <span style={{ color: 'var(--bd-text-primary)' }}>Подписка</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">Настройки приложения</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('medium');
              navigate('/settings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>Профиль и настройки</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">Избранное и поиск</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/favorites');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>❤️ Избранное</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-semibold mb-3">📁 Подборки</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{
              backgroundColor: 'var(--bd-bg-base)',
              boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
            }}
            onClick={() => {
              trigger('light');
              navigate('/collections');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="flex-1" style={{ color: 'var(--bd-text-primary)' }}>Все подборки</span>
            {collections.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}>
                {collections.length}
              </span>
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-bold px-1">📅 Записи на осмотр</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ backgroundColor: 'var(--bd-bg-base)', boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)' }}
            onClick={() => {
              trigger('light');
              navigate('/viewings');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>Входящие заявки</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-bold px-1">🔔 Сохранённые поиски</h2>
        <SavedSearchList
          onApplySearch={handleApplySavedSearch}
          onEditSearch={handleEditSavedSearch}
        />
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-bold px-1">Сервисы</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ backgroundColor: 'var(--bd-bg-base)', boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)' }}
            onClick={() => {
              trigger('light');
              navigate('/comparison');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="4 14 10 20 20 4" />
              <line x1="14" y1="4" x2="14" y2="20" />
              <line x1="4" y1="10" x2="4" y2="20" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>Сравнение объявлений</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ backgroundColor: 'var(--bd-bg-base)', boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)' }}
            onClick={() => {
              trigger('light');
              navigate('/analytics');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>Аналитика рынка</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[var(--bd-text-primary)] text-lg font-bold px-1">Поддержка</h2>
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ backgroundColor: 'var(--bd-bg-base)', boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)' }}
            onClick={() => {
              trigger('light');
              window.open('https://t.me/beldomik_bot', '_blank', 'noopener,noreferrer');
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span style={{ color: 'var(--bd-text-primary)' }}>Написать в поддержку</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="ml-auto flex-shrink-0" style={{ color: 'var(--bd-text-secondary)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <p className="pt-8 text-center text-sm" style={{ color: 'var(--bd-text-secondary)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси<br />
        v0.1.0
      </p>
    </div>
  );
}
