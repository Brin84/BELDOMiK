import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '@/features/auth';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { backHandlerBlocked } from '@/shared/lib/backButton';

export function AppShell({ children }: { children?: ReactNode }) {
  const { initData, backButton } = useTelegram();
  const { accessToken, login, refresh } = useAuthStore();
  const authAttempted = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Bootstrap authentication on mount. TelegramProvider fills initData
  // asynchronously, so re-run until it's available. Runs at most once a page
  // lifetime (authAttempted) so logout() is not immediately overridden.
  useEffect(() => {
    if (authAttempted.current) return;

    const hasTokens = !!accessToken;
    if (hasTokens) {
      // Restoring session from persisted tokens; if the refresh token
      // expired, fall back to a fresh login with Telegram initData.
      authAttempted.current = true;
      refresh().then((ok) => {
        if (!ok && initData) {
          login(initData).catch(() => {});
        }
      });
    } else if (initData) {
      // No tokens but Telegram initData available — authenticate
      authAttempted.current = true;
      login(initData).catch(() => {});
    }
    // If no tokens and initData not ready yet — re-run when initData arrives
  }, [initData, accessToken, login, refresh]);

  // Centralized BackButton control: show ← on all pages except main (/catalog)
  const handleBack = useCallback(() => {
    // Skip when a modal is open — the modal's own handler controls BackButton
    if (backHandlerBlocked.current) return;
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    if (!backButton) return;

    const isMainPage = location.pathname === '/' || location.pathname === '/catalog';
    // Wizard manages its own BackButton for step navigation
    const isWizard = location.pathname === '/create-listing';

    if (isMainPage) {
      // Hide back button → Telegram shows ✕ close
      backButton.hide();
      backButton.offClick(handleBack);
    } else if (!isWizard) {
      // Show back button → ← arrow
      backButton.show();
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
      };
    }
    // isWizard: skip — the step components register their own handlers
  }, [backButton, location.pathname, handleBack]);

  return (
    <div className="flex flex-col min-h-[100vh] min-h-[100dvh] safe-top safe-bottom">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-28" style={{ maxHeight: 'calc(var(--tg-viewport-stable-height, 100vh) - 56px)' }}>
        {children ?? <Outlet />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}