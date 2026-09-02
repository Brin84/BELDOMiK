import { ReactNode, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '@/features/auth';
import { useTelegram } from '@/app/providers/TelegramProvider';

export function AppShell({ children }: { children?: ReactNode }) {
  const { initData } = useTelegram();
  const { accessToken, login, refresh } = useAuthStore();
  const authAttempted = useRef(false);

  // Bootstrap authentication on mount. TelegramProvider fills initData
  // asynchronously, so re-run until it's available. Runs at most once a page
  // lifetime (authAttempted) so logout() is not immediately overridden.
  useEffect(() => {
    if (authAttempted.current) return;

    const hasTokens = !!accessToken;
    if (hasTokens) {
      // Restoring session from persisted tokens
      authAttempted.current = true;
      refresh().catch(() => {});
    } else if (initData) {
      // No tokens but Telegram initData available — authenticate
      authAttempted.current = true;
      login(initData).catch(() => {});
    }
    // If no tokens and initData not ready yet — re-run when initData arrives
  }, [initData, accessToken, login, refresh]);

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