import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '@/features/auth';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { backHandlerBlocked } from '@/shared/lib/backButton';

export function AppShell({ children }: { children?: ReactNode }) {
  const { initData, backButton, close } = useTelegram();
  const { accessToken, login, refresh, status: authStatus } = useAuthStore();
  // hadToken защищает logout(): как только пользователь хоть раз был
  // авторизован за эту страницу, эффект больше не ре-входит автоматически
  // (иначе logout() → accessToken=null → эффект вызвал login() заново).
  const hadToken = useRef(false);
  // Bootstrap-вход при транзиентных сбоях (сеть, 500 на бэкенде) ре-пытается,
  // но не бесконечно — пришёл когда из канала, где авторизация не всегда готова.
  const authRetries = useRef(0);
  const MAX_AUTH_RETRIES = 3;
  const location = useLocation();
  const navigate = useNavigate();
  // На детальной странице объявления нижнюю навигацию заменяет свой липкий
  // контактный бар «Написать / Позвонить» (стиль Krisha) — см. PropertyDetailPage.
  // На визарде подачи объявления нижнюю навигацию заменяет собственная панель
  // действий «Назад / Далее» (см. CreateListingWizard) — чтобы она не сталкивалась
  // с плавающей панелью вкладов.
  const isPropertyDetail = /^\/property\/\d+/.test(location.pathname);
  const isWizard = location.pathname === '/create-listing';
  // Окно переписки — полноэкранная под-страница (как карточка объявления):
  // нижняя навигация скрыта, поле ввода прижато к низу экрана.
  const isChat = /^\/messages\/\d+/.test(location.pathname);
  const hideBottomNav = isPropertyDetail || isWizard || isChat;

  // Bootstrap authentication on mount. TelegramProvider fills initData
  // asynchronously, so the effect re-runs until it's available. On transient
  // failures (network, backend 500) it retries up to MAX_AUTH_RETRIES with a
  // falling cadence, instead of giving up after a single attempt.
  useEffect(() => {
    if (hadToken.current) return;
    if (authRetries.current >= MAX_AUTH_RETRIES) return;
    // Другой вход уже идёт — дождёмся его (эффект перезапустится, когда
    // authStatus выйдет из 'authenticating' с токеном или без него).
    if (authStatus === 'authenticating') return;

    if (accessToken) {
      // Токен уже был — фиксируем сессию, чтобы logout() не перезаписывался.
      hadToken.current = true;
      authRetries.current += 1;
      // Restoring session from persisted tokens; if the refresh token
      // expired, fall back to a fresh login with Telegram initData.
      refresh().then((ok) => {
        if (!ok && initData) {
          login(initData).catch(() => {});
        }
      });
    } else if (initData) {
      // No tokens but Telegram initData available — authenticate.
      authRetries.current += 1;
      login(initData).catch(() => {});
    }
    // If no tokens and initData not ready yet — re-run when initData arrives
  }, [initData, accessToken, authStatus, login, refresh]);

  // Centralized BackButton control: show ← on all pages except main (/catalog)
  const handleBack = useCallback(() => {
    // Skip when a modal is open — the modal's own handler controls BackButton
    if (backHandlerBlocked.current) return;
    // Глубокая ссылка из канала/бота открывает страницу через
    // navigate(..., { replace: true }) — react-router кладёт в
    // window.history.state.idx индекс записи в истории приложения; idx = 0
    // значит «мы на корне истории MiniApp» и navigate(-1) никуда не ведёт
    // (кнопка «Назад» «не работает»). Тогда закрываем MiniApp, как это делает
    // Telegram на главном экране. window.history.length для этого не годится:
    // в WebView он включает навигацию, произошедшую ДО загрузки MiniApp,
    // поэтому всегда кажется, что «есть куда идти».
    const st = window.history.state as { idx?: number } | null;
    if (typeof st?.idx === 'number') {
      if (st.idx <= 0) {
        close();
      } else {
        navigate(-1);
      }
      return;
    }
    // Фолбэк для сред без idx (react-router v6 пишет его всегда, но если вдруг
    // нет — прежняя эвристика по длине истории).
    if (window.history.length <= 1) {
      close();
      return;
    }
    navigate(-1);
  }, [navigate, close]);

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
      <main
        className={`flex-1 overflow-y-auto ${hideBottomNav ? 'pb-0' : 'pb-36'}`}
        style={{ maxHeight: 'calc(var(--tg-viewport-stable-height, 100vh) - 56px)' }}
      >
        {children ?? <Outlet />}
      </main>

      {/* Bottom Navigation — скрыта на странице деталей объявления и в визарде подачи */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}