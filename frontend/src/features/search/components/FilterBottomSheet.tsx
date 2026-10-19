import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked, pickerOverlayOpen } from '@/shared/lib/backButton';
import { PropertyTypePicker } from './PropertyTypePicker';
import { RenovationPicker } from './RenovationPicker';
import type { PropertyFilterParams, PropertyType } from '@/shared/api/types';
import './search-form.css';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PropertyFilterParams;
  onFiltersChange: (filters: Partial<PropertyFilterParams>) => void;
  propertyTypes: PropertyType[];
  renovationTypes: string[];
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  propertyTypes,
  renovationTypes,
  onReset,
  hasActiveFilters,
}: FilterBottomSheetProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();

  // Полноэкранные выборы (тип недвижимости / ремонт) поверх шторки.
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [renovationPickerOpen, setRenovationPickerOpen] = useState(false);

  // Handle back button in Telegram — modal takes over, blocks AppShell's handler
  useEffect(() => {
    if (!isOpen) return;

    if (backButton) {
      const wasVisible = backButton.isVisible;
      backHandlerBlocked.current = true;
      backButton.show();
      const handleBack = () => {
        // Пока открыт полноэкранный выбор, «Назад» закрывает его — шторка
        // остаётся открытой. Обработчик выбора снимает флаг pickerOverlayOpen.
        if (pickerOverlayOpen.current) return;
        trigger('light');
        onClose();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
        if (wasVisible) backButton.show();
        else backButton.hide();
        backHandlerBlocked.current = false;
      };
    }
  }, [isOpen, onClose, trigger, backButton]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      trigger('light');
      onClose();
    }
  };

  const handleFloorChange = (field: 'floor_min' | 'floor_max', value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    if (num !== undefined && (num < 1 || num > 100)) return;
    trigger('selection');
    onFiltersChange({ [field]: num });
  };

  const handleFloorsTotalChange = (field: 'total_floors_min' | 'total_floors_max', value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    if (num !== undefined && (num < 1 || num > 100)) return;
    trigger('selection');
    onFiltersChange({ [field]: num });
  };

  const handleBuildYearChange = (field: 'build_year_min' | 'build_year_max', value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (num !== undefined && (num < 1800 || num > currentYear + 5)) return;
    trigger('selection');
    onFiltersChange({ [field]: num });
  };

  const handleMetroDistanceChange = (value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    if (num !== undefined && (num < 0 || num > 5000)) return;
    trigger('selection');
    onFiltersChange({ metro_distance_max: num });
  };

  const handleAreaInputChange = (
    field: 'living_area_min' | 'living_area_max' | 'kitchen_area_min' | 'kitchen_area_max',
    value: string,
  ) => {
    const num = value === '' ? undefined : parseFloat(value);
    if (num !== undefined && (num < 0 || num > 5000)) return;
    trigger('selection');
    onFiltersChange({ [field]: num });
  };

  const handleBooleanFilterChange = (field: keyof PropertyFilterParams, value: boolean | undefined) => {
    trigger('selection');
    onFiltersChange({ [field]: value });
  };

  const handleTypeChange = (typeId: number | undefined) => {
    trigger('selection');
    onFiltersChange({ type_id: typeId });
  };

  const handleRenovationChange = (renovation: string | undefined) => {
    trigger('selection');
    onFiltersChange({ renovation });
  };

  const selectedType = propertyTypes.find((t) => t.id === filters.type_id);
  const selectedRenovation = filters.renovation;

  const sectionTitle = (text: string) => <h3 className="fbs__title-sm">{text}</h3>;

  // Строка-селектор, открывающая полноэкранный выбор (в стиле «Вся Беларусь»).
  const pickerRow = (
    label: string,
    value: string | undefined,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="fbs__row"
      aria-haspopup="dialog"
    >
      <span className="fbs__row-main">{label}</span>
      <span className="fbs__row-select">
        <span className={`fbs__row-value ${value ? '' : 'fbs__row-value--muted'}`}>
          {value || 'Любой'}
        </span>
        <ChevronRight size={18} className="fbs__row-chevron" />
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-bottom-sheet-title"
    >
      {/* Bottom Sheet */}
      <div className="fbs">
        {/* Handle */}
        <div className="fbs__grabber" />

        {/* Header */}
        <div className="fbs__head">
          <h2 id="filter-bottom-sheet-title" className="fbs__title">
            Все фильтры
          </h2>
          <button
            onClick={() => {
              trigger('light');
              onClose();
            }}
            className="fbs__close"
            aria-label="Закрыть фильтры"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="fbs__body">
          {/* Property Type — открывает полноэкранный выбор в стиле «Вся Беларусь» */}
          {propertyTypes.length > 0 && (
            <section className="fbs__section fbs__section--first">
              {sectionTitle('Тип недвижимости')}
              {pickerRow(
                'Тип недвижимости',
                selectedType?.name,
                () => {
                  trigger('light');
                  setTypePickerOpen(true);
                },
              )}
            </section>
          )}

          {/* Floor */}
          <section className="fbs__section">
            {sectionTitle('Этаж')}
            <div className="fbs__pair">
              <div className="fbs__unit">
                <label htmlFor="floor-min" className="fbs__label">
                  От
                </label>
                <div className="fbs__field">
                  <input
                    id="floor-min"
                    type="number"
                    min="1"
                    max="100"
                    value={filters.floor_min ?? ''}
                    onChange={(e) => handleFloorChange('floor_min', e.target.value)}
                    placeholder="1"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="fbs__unit">
                <label htmlFor="floor-max" className="fbs__label">
                  До
                </label>
                <div className="fbs__field">
                  <input
                    id="floor-max"
                    type="number"
                    min="1"
                    max="100"
                    value={filters.floor_max ?? ''}
                    onChange={(e) => handleFloorChange('floor_max', e.target.value)}
                    placeholder="100"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Total Floors */}
          <section className="fbs__section">
            {sectionTitle('Этажность')}
            <div className="fbs__pair">
              <div className="fbs__unit">
                <label htmlFor="floors-total-min" className="fbs__label">
                  От
                </label>
                <div className="fbs__field">
                  <input
                    id="floors-total-min"
                    type="number"
                    min="1"
                    max="100"
                    value={filters.total_floors_min ?? ''}
                    onChange={(e) => handleFloorsTotalChange('total_floors_min', e.target.value)}
                    placeholder="1"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="fbs__unit">
                <label htmlFor="floors-total-max" className="fbs__label">
                  До
                </label>
                <div className="fbs__field">
                  <input
                    id="floors-total-max"
                    type="number"
                    min="1"
                    max="100"
                    value={filters.total_floors_max ?? ''}
                    onChange={(e) => handleFloorsTotalChange('total_floors_max', e.target.value)}
                    placeholder="100"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Build Year */}
          <section className="fbs__section">
            {sectionTitle('Год постройки')}
            <div className="fbs__pair">
              <div className="fbs__unit">
                <label htmlFor="build-year-min" className="fbs__label">
                  От
                </label>
                <div className="fbs__field">
                  <input
                    id="build-year-min"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear() + 5}
                    value={filters.build_year_min ?? ''}
                    onChange={(e) => handleBuildYearChange('build_year_min', e.target.value)}
                    placeholder="1990"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="fbs__unit">
                <label htmlFor="build-year-max" className="fbs__label">
                  До
                </label>
                <div className="fbs__field">
                  <input
                    id="build-year-max"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear() + 5}
                    value={filters.build_year_max ?? ''}
                    onChange={(e) => handleBuildYearChange('build_year_max', e.target.value)}
                    placeholder={String(new Date().getFullYear())}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Без посредников */}
          <section className="fbs__section">
            <button
              onClick={() => handleBooleanFilterChange('is_direct_only', filters.is_direct_only ? undefined : true)}
              className={`fbs__row ${filters.is_direct_only ? 'fbs__row--active' : ''}`}
              aria-pressed={filters.is_direct_only === true}
            >
              <span className="fbs__row-main">🤝 Без посредников</span>
              <span className="fbs__row-sub">Только собственники</span>
            </button>
          </section>

          {/* Новостройки */}
          <section className="fbs__section">
            <button
              onClick={() => handleBooleanFilterChange('new_building_only', filters.new_building_only ? undefined : true)}
              className={`fbs__row ${filters.new_building_only ? 'fbs__row--active' : ''}`}
              aria-pressed={filters.new_building_only === true}
            >
              <span className="fbs__row-main">🏗️ Новостройки</span>
              <span className="fbs__row-sub">Квартиры от застройщиков</span>
            </button>
          </section>

          {/* Living Area */}
          <section className="fbs__section">
            {sectionTitle('Жилая площадь (м²)')}
            <div className="fbs__pair">
              <div className="fbs__unit">
                <label htmlFor="living-area-min" className="fbs__label">
                  От
                </label>
                <div className="fbs__field">
                  <input
                    id="living-area-min"
                    type="number"
                    min="0"
                    max="5000"
                    value={filters.living_area_min ?? ''}
                    onChange={(e) => handleAreaInputChange('living_area_min', e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="fbs__unit">
                <label htmlFor="living-area-max" className="fbs__label">
                  До
                </label>
                <div className="fbs__field">
                  <input
                    id="living-area-max"
                    type="number"
                    min="0"
                    max="5000"
                    value={filters.living_area_max ?? ''}
                    onChange={(e) => handleAreaInputChange('living_area_max', e.target.value)}
                    placeholder="100"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Kitchen Area */}
          <section className="fbs__section">
            {sectionTitle('Площадь кухни (м²)')}
            <div className="fbs__pair">
              <div className="fbs__unit">
                <label htmlFor="kitchen-area-min" className="fbs__label">
                  От
                </label>
                <div className="fbs__field">
                  <input
                    id="kitchen-area-min"
                    type="number"
                    min="0"
                    max="5000"
                    value={filters.kitchen_area_min ?? ''}
                    onChange={(e) => handleAreaInputChange('kitchen_area_min', e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="fbs__unit">
                <label htmlFor="kitchen-area-max" className="fbs__label">
                  До
                </label>
                <div className="fbs__field">
                  <input
                    id="kitchen-area-max"
                    type="number"
                    min="0"
                    max="5000"
                    value={filters.kitchen_area_max ?? ''}
                    onChange={(e) => handleAreaInputChange('kitchen_area_max', e.target.value)}
                    placeholder="20"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Renovation — открывает полноэкранный выбор в стиле «Вся Беларусь» */}
          {renovationTypes.length > 0 && (
            <section className="fbs__section">
              {sectionTitle('Ремонт')}
              {pickerRow(
                'Ремонт',
                selectedRenovation,
                () => {
                  trigger('light');
                  setRenovationPickerOpen(true);
                },
              )}
            </section>
          )}

          {/* Boolean features */}
          <section className="fbs__section">
            {sectionTitle('Дополнительно')}
            <div className="fbs__grid">
              {[
                { key: 'furniture' as const, label: 'Мебель', icon: '🛋️' },
                { key: 'balcony' as const, label: 'Балкон', icon: '🏠' },
                { key: 'parking' as const, label: 'Парковка', icon: '🅿️' },
                { key: 'elevator' as const, label: 'Лифт', icon: '🛗' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => handleBooleanFilterChange(key, filters[key] ? undefined : true)}
                  className={`fbs__cell ${filters[key] ? 'fbs__cell--active' : ''}`}
                  aria-pressed={filters[key] === true}
                >
                  <span className="fbs__cell-icon">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Metro Distance */}
          <section className="fbs__section">
            {sectionTitle('Расстояние до метро (м)')}
            <label htmlFor="metro-distance" className="fbs__label">
              Макс.
            </label>
            <div className="fbs__field">
              <input
                id="metro-distance"
                type="number"
                min="0"
                max="5000"
                value={filters.metro_distance_max ?? ''}
                onChange={(e) => handleMetroDistanceChange(e.target.value)}
                placeholder="1000"
                inputMode="numeric"
              />
            </div>
          </section>

          {/* Reset & Apply */}
          <div className="fbs__footer">
            {hasActiveFilters && (
              <button
                onClick={() => {
                  trigger('medium');
                  onReset();
                }}
                className="fbs__btn fbs__btn--reset"
              >
                Сбросить все
              </button>
            )}
            <button
              onClick={() => {
                trigger('success');
                onClose();
              }}
              className="fbs__btn fbs__btn--apply"
            >
              Применить
            </button>
          </div>
        </div>
      </div>

      {/* Полноэкранные выборы поверх шторки (portal в body) */}
      <PropertyTypePicker
        isOpen={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        selectedTypeId={filters.type_id}
        propertyTypes={propertyTypes}
        onSelect={handleTypeChange}
      />
      <RenovationPicker
        isOpen={renovationPickerOpen}
        onClose={() => setRenovationPickerOpen(false)}
        selected={selectedRenovation}
        renovationTypes={renovationTypes}
        onSelect={handleRenovationChange}
      />
    </div>
  );
}
