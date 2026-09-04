import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';

const ADD_COLUMN_WIDTH = 48; // px — колонка под центральную круглую кнопку «+»

const navItems: ReadonlyArray<{
  path: string;
  label: string;
  icon: ({ active }: { active: boolean }) => React.JSX.Element;
  isCreate?: boolean;
}> = [
  { path: '/catalog', label: 'Каталог', icon: HomeIcon },
  { path: '/map', label: 'Карта', icon: MapIcon },
  { path: '/create-listing', label: 'Добавить', icon: PlusIcon, isCreate: true },
  { path: '/favorites', label: 'Избранное', icon: HeartIcon },
  { path: '/profile', label: 'Профиль', icon: UserIcon },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="w-6 h-6">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const ACTIVE_GLOW: React.CSSProperties = { filter: 'drop-shadow(0 0 6px rgba(47, 111, 237, 0.55))' };

/** Общие стили индикатора (иконка + подпись) для плавающей панели. */
function navTabClassName(active: boolean): string {
  return `flex flex-col items-center justify-center h-full min-w-0 px-1 transition-colors duration-150 ${
    active ? 'text-tg-button' : 'text-tg-hint'
  }`;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trigger } = useHaptics();

  const isActive = (path: string, isCreate?: boolean) =>
    isCreate
      ? location.pathname === path
      : location.pathname === path || (path === '/catalog' && location.pathname.startsWith('/catalog'));

  // Центральный элемент — кнопка «+» (isCreate); вкладки слева и справа от неё.
  const createIdx = navItems.findIndex((item) => item.isCreate);
  const leftTabs = navItems.slice(0, createIdx);
  const rightTabs = navItems.slice(createIdx + 1);

  return (
    // Плавающая «стеклянная» капсула (стиль baraholka-belarus): не растянута на
    // всю ширину, равномерная grid-сетка 1fr 1fr 48px 1fr 1fr — расстояние
    // между иконками всегда одинаковое независимо от ширины иконки.
    <nav
      className="fixed z-50 grid items-center"
      style={{
        left: '50%',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        width: 'calc(100vw - 24px)',
        maxWidth: '520px',
        height: '60px',
        boxSizing: 'border-box',
        padding: '6px',
        gridTemplateColumns: `1fr 1fr ${ADD_COLUMN_WIDTH}px 1fr 1fr`,
        borderRadius: '26px',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backgroundImage: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 252, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.75)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
        backdropFilter: 'blur(22px) saturate(1.4)',
        boxShadow: '0 12px 30px rgba(10, 25, 60, 0.14), 0 4px 12px rgba(10, 25, 60, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      }}
      role="navigation"
      aria-label="Основная навигация"
    >
      {leftTabs.map((item) => {
        const active = isActive(item.path, item.isCreate);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={() => navTabClassName(active)}
            style={active ? ACTIVE_GLOW : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              <item.icon active={active} />
            </span>
            <span className="mt-0.5 text-[11px] font-medium leading-none whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}

      {/* Центральная круглая синяя кнопка «+» — визуальный центр панели */}
      <button
        key="/create-listing"
        type="button"
        onClick={() => { trigger('light'); navigate('/create-listing'); }}
        aria-label="Добавить объявление"
        className="w-11 h-11 rounded-full flex items-center justify-center mx-auto text-tg-button-text transition-transform duration-150 active:scale-90"
        style={{
          backgroundImage: 'linear-gradient(145deg, #5b93ff 0%, #1757d8 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 5px 14px rgba(47, 111, 237, 0.4), 0 10px 22px rgba(47, 111, 237, 0.22)',
        }}
      >
        <PlusIcon />
      </button>

      {rightTabs.map((item) => {
        const active = isActive(item.path, item.isCreate);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={() => navTabClassName(active)}
            style={active ? ACTIVE_GLOW : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              <item.icon active={active} />
            </span>
            <span className="mt-0.5 text-[11px] font-medium leading-none whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}