import { ReactNode, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '@/features/auth';
import { useTelegram } from '@/app/providers/TelegramProvider';

export function AppShell({ children }: { children?: ReactNode }) {
  const { initData } = useTelegram();
  const { accessToken, login, refresh } = useAuthStore();
  const authInitialized = useRef(false);

  // Bootstrap authentication on first mount
  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    const hasTokens = !!accessToken;
    if (hasTokens) {
      // Restoring session from persisted tokens
      refresh().catch(() => {});
    } else if (initData) {
      // No tokens but Telegram initData available — authenticate
      login(initData).catch(() => {});
    }
    // If no tokens and no initData — stay idle
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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