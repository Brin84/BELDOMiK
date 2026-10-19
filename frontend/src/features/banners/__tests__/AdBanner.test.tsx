/** Тесты рекламных баннеров главного экрана.
 *
 * Промо-баннеры BELDOMiK показываются всегда, платные (продвижение, PRO) —
 * только при включённой монетизации.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdBanner } from '../AdBanner';

const openLink = vi.fn();

vi.mock('@/app/providers/TelegramProvider', () => ({
  useTelegram: () => ({
    webApp: {},
    initData: 'test',
    themeParams: null,
    colorScheme: 'light',
    isReady: true,
    isExpanded: true,
    isClosingConfirmationEnabled: false,
    viewportHeight: 800,
    viewportStableHeight: 800,
    contentSafeAreaInset: null,
    hapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    mainButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    backButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    setClosingConfirmation: vi.fn(),
    openLink: (url: string) => openLink(url),
    openTelegramLink: vi.fn(),
    close: vi.fn(),
    expand: vi.fn(),
    ready: vi.fn(),
  }),
  TelegramProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/shared/lib/haptics', () => ({
  useHaptics: () => ({ trigger: vi.fn() }),
}));

function renderBanner() {
  return render(
    <MemoryRouter initialEntries={['/catalog']}>
      <Routes>
        <Route path="/catalog" element={<AdBanner />} />
        <Route path="/search" element={<div>Экран поиска</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('показывает промо-баннеры BELDOMiK', () => {
    renderBanner();
    expect(screen.getByRole('img', { name: /BELDOMiK — недвижимость/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Разместите объявление/ })).toBeInTheDocument();
  });

  it('не показывает баннеры платных услуг при выключенной монетизации', () => {
    renderBanner();
    expect(screen.queryByText('Продвижение объявлений')).toBeNull();
    expect(screen.queryByText('PRO подписка')).toBeNull();
  });

  it('тап по баннеру с внутренним путём ведёт на нужный экран', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('img', { name: /BELDOMiK — недвижимость/ }));

    expect(await screen.findByText('Экран поиска')).toBeInTheDocument();
  });

  it('тап по баннеру с внешней ссылкой открывает её через Telegram', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('img', { name: /Новые объявления/ }));

    await waitFor(() => {
      expect(openLink).toHaveBeenCalledWith('https://t.me/beldomik_by');
    });
  });

  it('если картинка не загрузилась, показывается градиент с текстом', async () => {
    renderBanner();

    const image = screen.getByRole('img', { name: /BELDOMiK — недвижимость/ });
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /BELDOMiK — недвижимость/ })).toBeNull();
    });
    expect(screen.getByText('BELDOMiK — недвижимость Беларуси')).toBeInTheDocument();
  });
});
