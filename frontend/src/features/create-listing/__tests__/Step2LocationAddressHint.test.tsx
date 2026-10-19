/** Тесты подсказок точного адреса на шаге 2 «Расположение».

Только у квартиры адрес включает номер квартиры. Для дома, участка, дачи,
гаража и коммерческой недвижимости указывают адрес здания (улица, дом,
корпус) — иначе подсказка обещает поле, которого в объявлении нет.
*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Step2Location } from '../components/steps/Step2Location';
import { useAuthStore } from '@/features/auth';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useCreateListingStore } from '../createListingStore';
import type { OperationTypeData, PropertyType, Region, User } from '@/shared/api/types';

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

// Все категории из БД: адрес зависит от category, а не от текста названия.
const mockPropertyTypes: PropertyType[] = [
  { id: 1, name: 'Квартира', name_en: 'apartment', name_plural: 'Квартиры', category: 'apartment', icon: 'apartment', sort_order: 1, is_active: true },
  { id: 2, name: 'Дом', name_en: 'house', name_plural: 'Дома', category: 'house', icon: 'house', sort_order: 2, is_active: true },
  { id: 3, name: 'Земельный участок', name_en: 'land', name_plural: 'Земельные участки', category: 'land', icon: 'land', sort_order: 3, is_active: true },
  { id: 4, name: 'Коммерческая недвижимость', name_en: 'commercial', name_plural: 'Коммерческая недвижимость', category: 'commercial', icon: 'commercial', sort_order: 4, is_active: true },
  { id: 5, name: 'Гараж/машиноместо', name_en: 'garage', name_plural: 'Гаражи/машиноместа', category: 'garage', icon: 'garage', sort_order: 5, is_active: true },
  { id: 6, name: 'Дача', name_en: 'dacha', name_plural: 'Дачи', category: 'dacha', icon: 'dacha', sort_order: 6, is_active: true },
];

const mockRegion: Region = {
  id: 1,
  name: 'Минская',
  name_en: 'minskaya',
  country_id: 1,
  center_city_id: 1,
  is_active: true,
};

const APARTMENT_HINT = 'Укажите номер дома, корпуса и квартиры для точного расположения на карте';
const BUILDING_HINT = 'Укажите название улицы и номер дома для точного расположения на карте';

function renderStep2() {
  return render(
    <MemoryRouter initialEntries={['/create-listing']}>
      <Step2Location />
    </MemoryRouter>,
  );
}

describe('Step2Location — подсказки точного адреса', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 't',
      refreshToken: 'r',
      user: mockUser,
    });

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

    useCreateListingStore.getState().reset();
  });

  it('квартира: подсказка про дом, корпус и квартиру + пример с кв.', () => {
    useCreateListingStore.getState().updateFormData({ property_type_id: 1 });
    renderStep2();

    expect(screen.getByText(APARTMENT_HINT)).toBeInTheDocument();
    expect(screen.queryByText(BUILDING_HINT)).toBeNull();
    expect(screen.getByPlaceholderText('ул. Ленина, д. 10, кв. 5')).toBeInTheDocument();
  });

  it.each([
    ['Дом', 2],
    ['Земельный участок', 3],
    ['Коммерческая недвижимость', 4],
    ['Гараж/машиноместо', 5],
    ['Дача', 6],
  ])('%s: подсказка про адрес здания, без номера квартиры', (_name, typeId) => {
    useCreateListingStore.getState().updateFormData({ property_type_id: typeId });
    renderStep2();

    expect(screen.getByText(BUILDING_HINT)).toBeInTheDocument();
    expect(screen.queryByText(APARTMENT_HINT)).toBeNull();
    expect(screen.getByPlaceholderText('ул. Ленина, д. 10')).toBeInTheDocument();
    expect(screen.getByText('Точный адрес (улица, номер дома, корпус)')).toBeInTheDocument();
  });
});
