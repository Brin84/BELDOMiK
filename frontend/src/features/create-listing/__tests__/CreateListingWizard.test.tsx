import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateListingWizard } from '../components/CreateListingWizard';
import { useAuthStore } from '@/features/auth';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useCreateListingStore } from '../createListingStore';
import type { OperationTypeData, PropertyType, Region, User } from '@/shared/api/types';

// TelegramProvider замокан лёгким фейком: визарду нужны backButton.show/hide/onClick/offClick
// и hapticFeedback (через useHaptics). Нативную MainButton здесь никто не трогает.
vi.mock('@/app/providers/TelegramProvider', () => {
  const makeButton = () => ({
    show: vi.fn(),
    hide: vi.fn(),
    setParams: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  });
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
      hapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
      mainButton: makeButton(),
      backButton: makeButton(),
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

const mockUser: User = {
  id: 1,
  telegram_id: 123,
  username: 'test',
  first_name: 'Test',
  role: 'user',
  is_admin: false,
  is_moderator: false,
  is_verified: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockOperationTypes: OperationTypeData[] = [
  { id: 1, name: 'sale', name_en: 'sale', name_plural: 'Продажа', sort_order: 1, is_active: true },
  { id: 2, name: 'rent', name_en: 'rent', name_plural: 'Аренда', sort_order: 2, is_active: true },
];

// Иконки — как в проде: БД отдаёт АНГЛИЙСКИЕ слаги (apartment, house, …),
// фронтенд маппит их в эмодзи. Раньше слаги выводились как есть — в
// интерфейсе появлялись английские слова.
const mockPropertyTypes: PropertyType[] = [
  { id: 1, name: 'Квартира', name_en: 'apartment', name_plural: 'Квартиры', category: 'apartment', icon: 'apartment', sort_order: 1, is_active: true },
  { id: 2, name: 'Дом', name_en: 'house', name_plural: 'Дома', category: 'house', icon: 'house', sort_order: 2, is_active: true },
];

const mockRegion: Region = {
  id: 1,
  name: 'Минская',
  name_en: 'minskaya',
  country_id: 1,
  center_city_id: 1,
  is_active: true,
};

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/create-listing']}>
      <CreateListingWizard />
    </MemoryRouter>,
  );
}

// Выбор типа недвижимости через свёрнутую плитку: сначала раскрываем,
// потом кликаем по варианту.
async function pickPropertyType(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByText('Тип недвижимости'));
  await user.click(screen.getByText(name));
}

describe('CreateListingWizard — кнопка «Далее»', () => {
  beforeEach(() => {
    // Авторизация
    useAuthStore.setState({ status: 'authenticated', accessToken: 't', refreshToken: 'r', user: mockUser });

    // Гео: типы сделок/недвижимости загружены (чтобы Step1 не ходил в API),
    // регионов/городов нет — Step2 смонтируется без фетчей (loadedRegions=true).
    useGeographyStore.setState({
      regions: [mockRegion],
      cities: [],
      districts: [],
      neighborhoods: [],
      streets: [],
      metroLines: [],
      metroStations: [],
      propertyTypes: mockPropertyTypes,
      operationTypes: mockOperationTypes,
      loadedRegions: true,
      loadedCities: false,
      loadedAllCities: false,
      loadedDistricts: false,
      loadedNeighborhoods: false,
      loadedStreets: false,
      loadedMetro: false,
      loadedPropertyTypes: true,
      loadedOperationTypes: true,
    });

    // Сброс визарда к дефолтам (property_type_id = 0 → шаг 1 невалиден)
    useCreateListingStore.getState().reset();
  });

  it('на шаге 1: кнопка disabled → выбор типа недвижимости → enabled; «Далее» ведёт на шаг 2, панель остаётся в DOM', async () => {
    const user = userEvent.setup();
    renderWizard();

    // Изначально property_type_id = 0, валидация шага 1 падает → кнопка заблокирована,
    // даже несмотря на выбранную операцию «sale» (валидна).
    const nextBtn = screen.getByRole('button', { name: 'Далее' });
    expect(nextBtn).toBeDisabled();

    // Тип сделки — свёрнутая плитка. Раскрываем и выбираем «Аренду».
    await user.click(screen.getByText('Тип сделки'));
    await user.click(screen.getByText('Аренда'));
    expect(useCreateListingStore.getState().formData.operation).toBe('rent');
    // Тип недвижимости всё ещё не выбран → кнопка остаётся заблокированной.
    expect(nextBtn).toBeDisabled();

    // Тип недвижимости: раскрываем плитку, выбираем «Квартиру» → property_type_id = 1,
    // canProceed вычисляется «живо» → enabled.
    await user.click(screen.getByText('Тип недвижимости'));
    await user.click(screen.getByText('Квартира'));
    expect(nextBtn).toBeEnabled();

    // Клик «Далее» → следующий шаг. На шаге 2 виден заголовок «Область».
    await user.click(nextBtn);
    expect(await screen.findByText('Область')).toBeInTheDocument();

    // Нижняя панель не исчезла: кнопка «Далее» всё ещё в DOM (панель статичная, без unmount).
    expect(screen.getByRole('button', { name: 'Далее' })).toBeInTheDocument();
  });

  it('регрессия: повторное обновление formData не «замораживает» доступность (геттер-снапшот Zustand v5)', async () => {
    const user = userEvent.setup();
    renderWizard();

    const nextBtn = screen.getByRole('button', { name: 'Далее' });
    expect(nextBtn).toBeDisabled();

    // Первый set(): выбор типа → кнопка активна. В старой реализации именно
    // на первом set() геттер canProceed замораживался в false навсегда.
    await pickPropertyType(user, 'Дом');
    expect(nextBtn).toBeEnabled();

    // Повторные мутации store должны мгновенно отражаться на доступности.
    act(() => {
      useCreateListingStore.getState().updateFormData({ price_byn: 5000 });
    });
    expect(nextBtn).toBeEnabled();

    // Возврат к невалидному типу (property_type_id = 0) → снова disabled.
    act(() => {
      useCreateListingStore.getState().updateFormData({ property_type_id: 0 });
    });
    expect(nextBtn).toBeDisabled();

    // И снова enabled после валидного выбора — доступность не «застревает».
    await pickPropertyType(user, 'Квартира');
    expect(nextBtn).toBeEnabled();
  });

  it('прогресс-бар: 0% на незаполненном шаге 1 → 20% после валидного выбора типа', async () => {
    const user = userEvent.setup();
    renderWizard();

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '0');

    await pickPropertyType(user, 'Квартира');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
  });

  it('типы недвижимости: английские слаги из БД выводятся как эмодзи, без английских слов', async () => {
    const user = userEvent.setup();
    renderWizard();

    // Раскрываем плитку «Тип недвижимости».
    await user.click(screen.getByText('Тип недвижимости'));

    // В списке не должно быть английских слагов (apartment/house/…).
    expect(screen.queryByText(/apartment|house|land|commercial|garage|dacha/i)).toBeNull();

    // Варианты отображаются русскими названиями.
    expect(screen.getByText('Квартира')).toBeInTheDocument();
    expect(screen.getByText('Дом')).toBeInTheDocument();
  });
});