import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PropertyDetailPage } from '../components/PropertyDetailPage';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import type { PropertyDetail } from '@/shared/api/types';

// TelegramProvider замокан: странице нужны useTelegram().openLink (карта)
// и hapticFeedback (useHaptics). Нативного Telegram WebApp в jsdom нет.
vi.mock('@/app/providers/TelegramProvider', () => {
  const haptic = {
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
  };
  return {
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
      hapticFeedback: haptic,
      mainButton: {},
      backButton: {},
      setClosingConfirmation: vi.fn(),
      openLink: vi.fn(),
      openTelegramLink: vi.fn(),
      close: vi.fn(),
      expand: vi.fn(),
      ready: vi.fn(),
    }),
    TelegramProvider: ({ children }: { children: unknown }) => children,
  };
});

vi.mock('@/features/favorites', () => ({
  useFavoritesStore: () => ({ toggleFavorite: vi.fn() }),
}));
vi.mock('@/features/chat', () => ({
  useChatStore: () => ({ startChat: vi.fn() }),
}));
vi.mock('@/shared/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const basePhoto = {
  id: 27,
  property_id: 27,
  url: 'https://images.unsplash.com/photo-1?w=1200&q=80',
  thumbnail_url: 'https://images.unsplash.com/photo-1?w=400&q=60',
  webp_url: null,
  avif_url: null,
  sort_order: 0,
  width: 1200,
  height: 800,
  file_size: null,
  mime_type: 'image/jpeg',
  created_at: '2026-08-30T14:25:36.457485',
};

function makeDetail(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    id: 27,
    type_id: 1,
    operation_id: 1,
    city_id: 1,
    district_id: null,
    neighborhood_id: null,
    street_id: null,
    metro_station_id: null,
    metro_distance: 250,
    address: 'BELDOMiK test: Квартира в Минск (5)',
    lat: 54.1545,
    lng: 27.7615,
    floor: 11,
    total_floors: 18,
    build_year: 2021,
    total_area: 78,
    living_area: 56,
    kitchen_area: 13,
    rooms_count: 3,
    renovation: 'designer',
    furniture: true,
    balcony: true,
    balcony_count: 1,
    loggia_count: null,
    parking: false,
    elevator: true,
    is_new_building: false,
    description: 'Просторная квартира в новом доме. BELDOMiK test',
    contact_name: null,
    // ТЕЛЕФОНА НЕТ — объявление робота-теста; именно этот кейс крашил
    // страницу через null.replace() в callHref (ErrorBoundary «Что-то пошло»).
    contact_phone: null,
    show_phone: false,
    is_negotiable: false,
    status: 'published',
    views_count: 1,
    favorites_count: 0,
    created_at: '2026-08-30T14:25:36',
    updated_at: '2026-08-30T14:25:36',
    price_byn: 342000,
    price_usd: 106875,
    price_per_m2_byn: 4384,
    price_per_m2_usd: null,
    photo_url: basePhoto.url,
    photo_count: 1,
    city_name: 'Минск',
    district_name: null,
    neighborhood_name: null,
    street_name: null,
    metro_station_name: 'Уручье',
    type_name: 'Квартира',
    operation_name: 'Продажа',
    owner_id: 2,
    owner_name: null,
    is_favorite: false,
    is_direct: true,
    agency_id: null,
    is_promoted: false,
    promotion_type: null,
    photos: [basePhoto],
    features: [],
    price_history: [],
    published_at: '2026-08-30T14:25:36',
    ...overrides,
  };
}

function seedStore(detail: PropertyDetail) {
  usePropertiesStore.setState({
    propertyDetail: detail,
    isLoadingDetail: false,
    errorDetail: null,
    // no-op: данные уже в сторе, сетевых запросов не делаем
    fetchPropertyDetail: vi.fn().mockResolvedValue(undefined),
    clearPropertyDetail: vi.fn(),
    setLocalFavorite: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/property/27']}>
      <Routes>
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PropertyDetailPage', () => {
  it('рендерит объявление БЕЗ телефона без краша (регрессия null.replace в callHref)', () => {
    seedStore(makeDetail());
    renderPage();

    // Страница отрисовывается.
    expect(screen.getByText('Написать')).toBeInTheDocument();
    expect(screen.getByText('Расположение')).toBeInTheDocument();

    // ErrorBoundary НЕ сработал.
    expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument();

    // Телефона нет → кнопки «Позвонить» нет.
    expect(screen.queryByText('Позвонить')).not.toBeInTheDocument();
  });

  it('рендерит «Позвонить», когда телефон задан', () => {
    seedStore(
      makeDetail({
        contact_phone: '+375291234567',
        owner_phone: '+375291234567',
        show_phone: true,
      })
    );
    renderPage();

    expect(screen.getByText('Позвонить')).toBeInTheDocument();
    // Ошибка рендера не возникла.
    expect(screen.queryByText('Что-то пошло не так')).not.toBeInTheDocument();
  });
});