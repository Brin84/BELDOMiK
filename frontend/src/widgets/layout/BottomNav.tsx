import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHaptics } from '@/shared/lib/haptics';

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trigger } = useHaptics();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 safe-bottom"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        boxShadow: '0 -2px 12px rgba(10, 25, 60, 0.07)',
      }}
      role="navigation"
      aria-label="Основная навигация"
    >
      {navItems.map((item) => {
        const isActive = item.isCreate
          ? location.pathname === item.path
          : location.pathname === item.path || (item.path === '/catalog' && location.pathname.startsWith('/catalog'));
        const isCreate = 'isCreate' in item && item.isCreate;

        if (isCreate) {
          return (
            <button
              key={item.path}
              onClick={() => { trigger('light'); navigate(item.path); }}
              className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors duration-150"
              aria-label="Добавить объявление"
            >
              <span
                className="flex items-center justify-center w-11 h-11 rounded-full text-tg-button-text"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%, rgba(10,25,60,0.12))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(10,25,60,0.18), 0 3px 8px rgba(47,111,237,0.35), 0 8px 18px rgba(47,111,237,0.22)',
                }}
              >
                <PlusIcon />
              </span>
              <span className="text-[10px] font-medium text-tg-button">{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive: active }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors duration-150 ${
                active
                  ? 'text-tg-button'
                  : 'text-tg-hint'
              }`
            }
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon active={isActive} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
