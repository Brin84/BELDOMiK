/** Тесты полноэкранных выборов «Тип недвижимости» и «Ремонт».

 * В шторке «Все фильтры» эти фильтры открываются отдельным экраном в стиле
 * «Вся Беларусь»: шапка, поиск, строки-карточки с галочкой. Выбор
 * применяется к фильтрам, экран закрывается.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBottomSheet } from '../components/FilterBottomSheet';
import type { PropertyFilterParams, PropertyType } from '@/shared/api/types';

vi.mock('@/app/providers/TelegramProvider', () => {
  const makeButton = () => ({
    isVisible: false,
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

const propertyTypes: PropertyType[] = [
  { id: 1, category: 'apartment', name: 'Квартира', name_en: 'Apartment', name_plural: 'Квартиры', icon: 'apartment', sort_order: 1, is_active: true },
  { id: 2, category: 'house', name: 'Дом', name_en: 'House', name_plural: 'Дома', icon: 'house', sort_order: 2, is_active: true },
  { id: 3, category: 'land', name: 'Земельный участок', name_en: 'Land', name_plural: 'Земельные участки', icon: 'land', sort_order: 3, is_active: true },
];

const renovationTypes = ['Без ремонта', 'Косметический', 'Евроремонт'];

const baseFilters: PropertyFilterParams = {
  page: 1,
  page_size: 20,
};

function renderSheet(overrides: Partial<PropertyFilterParams> = {}) {
  const onFiltersChange = vi.fn();
  const onClose = vi.fn();
  render(
    <FilterBottomSheet
      isOpen
      onClose={onClose}
      filters={{ ...baseFilters, ...overrides }}
      onFiltersChange={onFiltersChange}
      propertyTypes={propertyTypes}
      renovationTypes={renovationTypes}
      onReset={vi.fn()}
      hasActiveFilters
    />,
  );
  return { onFiltersChange, onClose };
}

describe('FilterBottomSheet — полноэкранные выборы', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('тип недвижимости: в шторке вместо чипов — строка-селектор', () => {
    renderSheet();

    // Чипов со списком типов в шторке больше нет.
    expect(screen.queryByRole('button', { name: 'Земельный участок' })).toBeNull();

    const opener = screen.getByRole('button', { name: /Тип недвижимости/ });
    expect(opener).toBeInTheDocument();
  });

  it('тип недвижимости: открывается полноэкранный выбор со списком типов', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Тип недвижимости/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Тип недвижимости' });
    expect(within(dialog).getByText('Квартира')).toBeInTheDocument();
    expect(within(dialog).getByText('Дом')).toBeInTheDocument();
    expect(within(dialog).getByText('Земельный участок')).toBeInTheDocument();
    // «Любой тип» — сброс фильтра.
    expect(within(dialog).getByText('Любой тип')).toBeInTheDocument();
  });

  it('тип недвижимости: выбор применяет фильтр и закрывает экран', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderSheet();

    await user.click(screen.getByRole('button', { name: /Тип недвижимости/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Тип недвижимости' });
    await user.click(within(dialog).getByText('Дом'));

    expect(onFiltersChange).toHaveBeenCalledWith({ type_id: 2 });
    expect(screen.queryByRole('dialog', { name: 'Тип недвижимости' })).toBeNull();
  });

  it('тип недвижимости: поиск фильтрует список', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Тип недвижимости/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Тип недвижимости' });

    await user.type(within(dialog).getByLabelText('Поиск типа недвижимости'), 'дом');

    expect(within(dialog).getByText('Дом')).toBeInTheDocument();
    expect(within(dialog).queryByText('Квартира')).toBeNull();
  });

  it('тип недвижимости: выбранный тип отмечен галочкой', async () => {
    const user = userEvent.setup();
    renderSheet({ type_id: 1 });

    await user.click(screen.getByRole('button', { name: /Тип недвижимости/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Тип недвижимости' });

    const apartmentRow = within(dialog).getByText('Квартира').closest('button');
    expect(apartmentRow).toHaveAttribute('aria-pressed', 'true');
  });

  it('ремонт: открывается полноэкранный выбор со списком видов ремонта', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /^Ремонт/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Ремонт' });
    expect(within(dialog).getByText('Без ремонта')).toBeInTheDocument();
    expect(within(dialog).getByText('Евроремонт')).toBeInTheDocument();
    expect(within(dialog).getByText('Любой ремонт')).toBeInTheDocument();
  });

  it('ремонт: выбор применяет фильтр и закрывает экран', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderSheet();

    await user.click(screen.getByRole('button', { name: /^Ремонт/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Ремонт' });
    await user.click(within(dialog).getByText('Евроремонт'));

    expect(onFiltersChange).toHaveBeenCalledWith({ renovation: 'Евроремонт' });
    expect(screen.queryByRole('dialog', { name: 'Ремонт' })).toBeNull();
  });

  it('ремонт: в шторке видно текущее значение', () => {
    renderSheet({ renovation: 'Косметический' });

    const row = screen.getByRole('button', { name: /^Ремонт/ });
    expect(row).toHaveTextContent('Косметический');
  });
});
