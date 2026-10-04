import { useEffect } from 'react';
import { Building2, Heart, MessageCircle, Plus, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useChatStore } from '@/features/chat';
import { usePropertiesStore } from '@/features/properties/propertiesStore';

import './BottomNav.css';

// Компактная плавающая панель: Каталог · Избранное · «+» · Сообщения · Профиль.
// Ярко-синяя подсветка активного таба без анимации подложки.
// Центральная кнопка «+» поднята выше остальных табов на -16px.
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

  // Пульс бейджа «Сообщения»: обновляем счётчик при появлении на страницах.
  useEffect(() => {
    void fetchUnreadCount();
    const poll = window.setInterval(() => void fetchUnreadCount(), 15000);
    return () => window.clearInterval(poll);
  }, [fetchUnreadCount]);

  const handleTabClick = (path: string) => {
    // Повторный тап по уже активной вкладке «Каталог» страницу не
    // перемонтирует, поэтому фильтр категории снимаем здесь: «Каталог»
    // всегда показывает все объявления.
    if (path !== '/catalog' || !isPathActive(path, location.pathname)) return;
    trigger('light');
    if (usePropertiesStore.getState().filters.type_id !== undefined) {
      usePropertiesStore.getState().resetFilters();
    }
  };

  const renderItem = (item: NavItem) => {
    const active = isPathActive(item.path, location.pathname);
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => handleTabClick(item.path)}
      >
        <span className="bottom-nav__icon">
          <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
          {item.path === '/messages' && (unreadCount ?? 0) > 0 && (
            <span className="bottom-nav__badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <span className="bottom-nav__label">{item.label}</span>
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
            <Plus size={24} strokeWidth={2.5} />
          </button>
        ) : (
          renderItem(item)
        )
      )}
    </nav>
  );
}
