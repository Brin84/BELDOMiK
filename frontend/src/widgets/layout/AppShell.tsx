import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col min-h-[100vh] min-h-[100dvh] safe-top safe-bottom">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-16" style={{ maxHeight: 'calc(var(--tg-viewport-stable-height, 100vh) - 56px)' }}>
        {children ?? <Outlet />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Telegram MainButton and BackButton are controlled by pages via context */}
    </div>
  );
}