import { Building2, Heart, Plus, Search, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';

// Плавающая панель с grid-раскладкой: Каталог · Поиск · «+» · Избранное · Профиль.
// Активная вкладка подсвечивается синей плашкой — стиль Baraholka.
interface NavItem {
  path: string;
  label: string;
  icon: typeof Building2;
}

const navItems: readonly NavItem[] = [
  { path: '/catalog', label: 'Каталог', icon: Building2 },
  { path: '/search', label: 'Поиск', icon: Search },
  { path: '/create-listing', label: 'Подать', icon: Plus },
  { path: '/favorites', label: 'Избранное', icon: Heart },
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
        <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
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