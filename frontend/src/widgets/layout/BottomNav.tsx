import { useEffect, useRef } from 'react';
import { Building2, Heart, MessageCircle, Plus, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';
import { useChatStore } from '@/features/chat';
import { usePropertiesStore } from '@/features/properties/propertiesStore';

import './BottomNav.css';

// Компактная плавающая панель: Каталог · Избранное · «+» · Сообщения · Профиль.
// Ярко-синяя подсветка активного таба с плавной анимацией перехода.
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

  const navRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  // Анимация перехода подложки при смене таба
  useEffect(() => {
    if (!navRef.current || !pillRef.current) return;

    // Находим активный таб и вычисляем его позицию
    const activeItem = Array.from(navRef.current.children).find(
      (child) => child.classList.contains('bottom-nav__item--active')
    ) as HTMLElement;

    if (activeItem) {
      const rect = activeItem.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();

      // Вычисляем позицию подложки относительно навигации
      const left = rect.left - navRect.left + rect.width / 2 - 24; // 24px половина ширины подложки
      const width = rect.width;

      pillRef.current.style.left = `${left}px`;
      pillRef.current.style.width = `${width}px`;
    }
  }, [location.pathname]);

  const handleTabClick = (item: NavItem) => {
    // Обновляем позицию подложки сразу после клика
    if (pillRef.current && navRef.current) {
      const activeItem = itemRefs.current[item.path];
      if (activeItem) {
        const rect = activeItem.getBoundingClientRect();
        const navRect = navRef.current.getBoundingClientRect();
        const left = rect.left - navRect.left + rect.width / 2 - 24;
        const width = rect.width;
        pillRef.current.style.left = `${left}px`;
        pillRef.current.style.width = `${width}px`;
      }
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
        ref={(el) => {
          itemRefs.current[item.path] = el;
        }}
        onClick={() => {
          handleTabClick(item);
          // Повторный тап по уже активной вкладке «Каталог» страницу не
          // перемонтирует, поэтому фильтр категории снимаем здесь: «Каталог»
          // всегда показывает все объявления.
          if (item.path !== '/catalog' || !active) return;
          trigger('light');
          if (usePropertiesStore.getState().filters.type_id !== undefined) {
            usePropertiesStore.getState().resetFilters();
          }
        }}
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
      ref={navRef}
      className="bottom-nav"
      role="navigation"
      aria-label="Основная навигация"
    >
      {/* Плавающая подложка активного таба для анимации перехода */}
      <div className="bottom-nav__pill" ref={pillRef} />

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
