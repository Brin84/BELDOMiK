import { Building2, Heart, Map, Plus, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';

// Плавающая стеклянная капсула (glassmorphism) с приподнятой кнопкой «+».
// Порядок: Каталог · Карта · «+» · Избранное · Профиль.
interface NavItem {
  path: string;
  label: string;
  icon: typeof Building2;
}

const navItems: readonly NavItem[] = [
  { path: '/catalog', label: 'Каталог', icon: Building2 },
  { path: '/map', label: 'Карта', icon: Map },
  { path: '/create-listing', label: 'Подать', icon: Plus },
  { path: '/favorites', label: 'Избранное', icon: Heart },
  { path: '/profile', label: 'Профиль', icon: User },
];

const CREATE_INDEX = 2;
const ACTIVE_COLOR = '#3b82f6';
const INACTIVE_COLOR = '#94a3b8';

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

  const leftItems = navItems.slice(0, CREATE_INDEX);
  const rightItems = navItems.slice(CREATE_INDEX + 1);
  const createItem = navItems[CREATE_INDEX];

  const renderItem = (item: NavItem) => {
    const active = isPathActive(item.path, location.pathname);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className="flex min-w-[55px] flex-col items-center gap-1 text-[12px] font-medium"
        style={{ color: active ? ACTIVE_COLOR : INACTIVE_COLOR }}
        aria-current={active ? 'page' : undefined}
      >
        <item.icon size={25} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[540px] -translate-x-1/2 items-center justify-between rounded-[32px] border border-white/70 bg-white/85 px-5 py-3 shadow-[0_15px_45px_rgba(0,0,0,0.15)] backdrop-blur-xl"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Основная навигация"
    >
      {leftItems.map(renderItem)}

      {/* Приподнятая центральная кнопка «+» */}
      <button
        type="button"
        onClick={() => {
          trigger('light');
          navigate(createItem.path);
        }}
        aria-label="Подать объявление"
        className="relative -mt-12 flex h-[66px] w-[66px] items-center justify-center rounded-full border-[5px] border-white bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all active:scale-90"
      >
        <Plus size={34} strokeWidth={2.5} />
      </button>

      {rightItems.map(renderItem)}
    </nav>
  );
}