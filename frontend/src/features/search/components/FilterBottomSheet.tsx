import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyFilterParams } from '@/shared/api/types';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: PropertyFilterParams;
  onFiltersChange: (filters: Partial<PropertyFilterParams>) => void;
  propertyTypes: Array<{ id: number; name: string }>;
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

  // Handle back button in Telegram
  useEffect(() => {
    if (!isOpen) return;

    if (backButton) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        onClose();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
        backButton.hide();
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

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-bottom-sheet-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        style={{ opacity: 1 }}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl transition-transform duration-300"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          transform: 'translateY(0)',
          maxHeight: '85vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
          <h2 id="filter-bottom-sheet-title" className="text-tg-text text-xl font-semibold">
            Все фильтры
          </h2>
          <button
            onClick={() => {
              trigger('light');
              onClose();
            }}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--tg-theme-hint-color)' }}
            aria-label="Закрыть фильтры"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Property Type */}
          {propertyTypes.length > 0 && (
            <section>
              <h3 className="text-tg-text font-medium mb-3">Тип недвижимости</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTypeChange(undefined)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    filters.type_id === undefined
                      ? 'shadow-sm'
                      : ''
                  }`}
                  style={{
                    backgroundColor: filters.type_id === undefined
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: filters.type_id === undefined
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: filters.type_id !== undefined ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={filters.type_id === undefined}
                >
                  Любой
                </button>
                {propertyTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeChange(type.id)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                      filters.type_id === type.id
                        ? 'shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: filters.type_id === type.id
                        ? 'var(--tg-theme-button-color)'
                        : 'var(--tg-theme-secondary-bg-color)',
                      color: filters.type_id === type.id
                        ? 'var(--tg-theme-button-text-color)'
                        : 'var(--tg-theme-text-color)',
                      border: filters.type_id !== type.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
                    }}
                    aria-pressed={filters.type_id === type.id}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Floor */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Этаж</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="floor-min" className="block text-tg-hint text-sm mb-1">От</label>
                <input
                  id="floor-min"
                  type="number"
                  min="1"
                  max="100"
                  value={filters.floor_min ?? ''}
                  onChange={(e) => handleFloorChange('floor_min', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="1"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="floor-max" className="block text-tg-hint text-sm mb-1">До</label>
                <input
                  id="floor-max"
                  type="number"
                  min="1"
                  max="100"
                  value={filters.floor_max ?? ''}
                  onChange={(e) => handleFloorChange('floor_max', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="100"
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>

          {/* Total Floors */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Этажность</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="floors-total-min" className="block text-tg-hint text-sm mb-1">От</label>
                <input
                  id="floors-total-min"
                  type="number"
                  min="1"
                  max="100"
                  value={filters.total_floors_min ?? ''}
                  onChange={(e) => handleFloorsTotalChange('total_floors_min', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="1"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="floors-total-max" className="block text-tg-hint text-sm mb-1">До</label>
                <input
                  id="floors-total-max"
                  type="number"
                  min="1"
                  max="100"
                  value={filters.total_floors_max ?? ''}
                  onChange={(e) => handleFloorsTotalChange('total_floors_max', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="100"
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>

          {/* Build Year */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Год постройки</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="build-year-min" className="block text-tg-hint text-sm mb-1">От</label>
                <input
                  id="build-year-min"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear() + 5}
                  value={filters.build_year_min ?? ''}
                  onChange={(e) => handleBuildYearChange('build_year_min', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="1990"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="build-year-max" className="block text-tg-hint text-sm mb-1">До</label>
                <input
                  id="build-year-max"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear() + 5}
                  value={filters.build_year_max ?? ''}
                  onChange={(e) => handleBuildYearChange('build_year_max', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder={String(new Date().getFullYear())}
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>

          {/* Без посредников */}
          <section>
            <button
              onClick={() => handleBooleanFilterChange('is_direct_only', filters.is_direct_only ? undefined : true)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-colors"
              style={{
                backgroundColor: filters.is_direct_only
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: filters.is_direct_only
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                border: filters.is_direct_only ? 'none' : '1px solid var(--tg-theme-hint-color)',
              }}
              aria-pressed={filters.is_direct_only === true}
            >
              <span className="font-medium">🤝 Без посредников</span>
              <span className="text-sm" style={{ opacity: 0.7 }}>Только собственники</span>
            </button>
          </section>

          {/* Новостройки */}
          <section>
            <button
              onClick={() => handleBooleanFilterChange('new_building_only', filters.new_building_only ? undefined : true)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-colors"
              style={{
                backgroundColor: filters.new_building_only
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: filters.new_building_only
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
                border: filters.new_building_only ? 'none' : '1px solid var(--tg-theme-hint-color)',
              }}
              aria-pressed={filters.new_building_only === true}
            >
              <span className="font-medium">🏗️ Новостройки</span>
              <span className="text-sm" style={{ opacity: 0.7 }}>Квартиры от застройщиков</span>
            </button>
          </section>

          {/* Living Area */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Жилая площадь (м²)</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="living-area-min" className="block text-tg-hint text-sm mb-1">От</label>
                <input
                  id="living-area-min"
                  type="number"
                  min="0"
                  max="5000"
                  value={filters.living_area_min ?? ''}
                  onChange={(e) => handleAreaInputChange('living_area_min', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="living-area-max" className="block text-tg-hint text-sm mb-1">До</label>
                <input
                  id="living-area-max"
                  type="number"
                  min="0"
                  max="5000"
                  value={filters.living_area_max ?? ''}
                  onChange={(e) => handleAreaInputChange('living_area_max', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="100"
                  inputMode="decimal"
                />
              </div>
            </div>
          </section>

          {/* Kitchen Area */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Площадь кухни (м²)</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="kitchen-area-min" className="block text-tg-hint text-sm mb-1">От</label>
                <input
                  id="kitchen-area-min"
                  type="number"
                  min="0"
                  max="5000"
                  value={filters.kitchen_area_min ?? ''}
                  onChange={(e) => handleAreaInputChange('kitchen_area_min', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="kitchen-area-max" className="block text-tg-hint text-sm mb-1">До</label>
                <input
                  id="kitchen-area-max"
                  type="number"
                  min="0"
                  max="5000"
                  value={filters.kitchen_area_max ?? ''}
                  onChange={(e) => handleAreaInputChange('kitchen_area_max', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="20"
                  inputMode="decimal"
                />
              </div>
            </div>
          </section>

          {/* Renovation */}
          {renovationTypes.length > 0 && (
            <section>
              <h3 className="text-tg-text font-medium mb-3">Ремонт</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleRenovationChange(undefined)}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                    filters.renovation === undefined
                      ? 'shadow-sm'
                      : ''
                  }`}
                  style={{
                    backgroundColor: filters.renovation === undefined
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: filters.renovation === undefined
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: filters.renovation !== undefined ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  aria-pressed={filters.renovation === undefined}
                >
                  Любой
                </button>
                {renovationTypes.map((renovation) => (
                  <button
                    key={renovation}
                    onClick={() => handleRenovationChange(renovation)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                      filters.renovation === renovation
                        ? 'shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: filters.renovation === renovation
                        ? 'var(--tg-theme-button-color)'
                        : 'var(--tg-theme-secondary-bg-color)',
                      color: filters.renovation === renovation
                        ? 'var(--tg-theme-button-text-color)'
                        : 'var(--tg-theme-text-color)',
                      border: filters.renovation !== renovation ? '1px solid var(--tg-theme-hint-color)' : 'none',
                    }}
                    aria-pressed={filters.renovation === renovation}
                  >
                    {renovation}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Boolean features */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Дополнительно</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'furniture' as const, label: 'Мебель', icon: '🛋️' },
                { key: 'balcony' as const, label: 'Балкон', icon: '🏠' },
                { key: 'parking' as const, label: 'Парковка', icon: '🅿️' },
                { key: 'elevator' as const, label: 'Лифт', icon: '🛗' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => handleBooleanFilterChange(key, filters[key] ? undefined : true)}
                  className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl transition-colors ${
                    filters[key]
                      ? 'shadow-sm'
                      : ''
                  }`}
                  style={{
                    backgroundColor: filters[key]
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: filters[key]
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: filters[key] ? 'none' : '1px solid var(--tg-theme-hint-color)',
                    borderWidth: '0.5px',
                  }}
                  aria-pressed={filters[key] === true}
                >
                  <span style={{ fontSize: '24px' }}>{icon}</span>
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Metro Distance */}
          <section>
            <h3 className="text-tg-text font-medium mb-3">Расстояние до метро (м)</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="metro-distance" className="block text-tg-hint text-sm mb-1">Макс.</label>
                <input
                  id="metro-distance"
                  type="number"
                  min="0"
                  max="5000"
                  value={filters.metro_distance_max ?? ''}
                  onChange={(e) => handleMetroDistanceChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-tg-text text-base"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                    border: '1px solid var(--tg-theme-hint-color)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                  placeholder="1000"
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>

          {/* Reset & Apply */}
          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  trigger('medium');
                  onReset();
                }}
                className="flex-1 py-3.5 rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                }}
              >
                Сбросить все
              </button>
            )}
            <button
              onClick={() => {
                trigger('success');
                onClose();
              }}
              className="flex-1 py-3.5 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}