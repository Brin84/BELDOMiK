import { useEffect } from 'react';
import { Building2, Heart, MessageCircle, Plus, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useChatStore } from '@/features/chat';

import './BottomNav.css';

// Плавающая панель с grid-раскладкой: Каталог · Избранное · «+» · Сообщения · Профиль.
// Активная вкладка подсвечивается синей плашкой — стиль Baraholka.
// Поиск вынесен на главную страницу (кнопка над баннерами); отдельной вкладки
// в нижней навигации больше нет.
interface NavItem {
  path: string;
  label: string;
  icon: typeof Building2;
}

const navItems: readonly NavItem[] = [
  { path: '/catalog', label: 'Каталог', icon: Building2 },
  { path: '/favorites', label: 'Избранное', icon: Heart },
  { path: '/create-listing', label: 'Подать', icon: Plus },
  { path: '/messages', label: 'Сообщения', icon: MessageCircle },
  { path: '/profile', label: 'Профиль', icon: User },
];

function isPathActive(path: string, locationPath: string): boolean {
  if (path === '/catalog') {
    return locationPath === '/' || locationPath.startsWith('/catalog');
  }
  return locationPath === path || locationPath.startsWith(`${path}/`);
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trigger } = useHaptics();
  const unreadCount = useChatStore((s) => s.unreadCount);
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount);

  // Пульс бейджа «Сообщения»: обновляем счётчик при появлении на страницах,
  // а затем опрашиваем не слишком часто (чаты работают в фоне).
  useEffect(() => {
    void fetchUnreadCount();
    const poll = window.setInterval(() => void fetchUnreadCount(), 15000);
    return () => window.clearInterval(poll);
  }, [fetchUnreadCount]);

  const renderItem = (item: NavItem) => {
    const active = isPathActive(item.path, location.pathname);
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}
        style={{ color: active ? '#2171ee' : '#64748b' }}
        aria-current={active ? 'page' : undefined}
      >
        <span className="bottom-nav__icon">
          <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
          {item.path === '/messages' && (unreadCount ?? 0) > 0 && (
            <span className="bottom-nav__badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const handleCreate = () => {
    trigger('light');
    navigate('/create-listing');
  };

  return (
    <nav
      className="bottom-nav"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Основная навигация"
    >
      {navItems.map((item) =>
        item.path === '/create-listing' ? (
          <button
            key={item.path}
            type="button"
            onClick={handleCreate}
            aria-label={item.label}
            className="bottom-nav__create"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        ) : (
          renderItem(item)
        )
      )}
    </nav>
  );
}