import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyFilterParams } from '@/shared/api/types';

interface QuickFiltersProps {
  filters: PropertyFilterParams;
  onRoomsChange: (roomsCount: number | undefined) => void;
  onPriceChange: (min: number | undefined, max: number | undefined) => void;
  onAreaChange: (min: number | undefined, max: number | undefined) => void;
  onMoreFiltersClick: () => void;
}

const ROOMS_OPTIONS = [
  { value: undefined, label: 'Любые' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5+' },
] as const;

export function QuickFilters({
  filters,
  onRoomsChange,
  onPriceChange,
  onAreaChange,
  onMoreFiltersClick,
}: QuickFiltersProps) {
  const { trigger } = useHaptics();

  const handleRoomsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    trigger('selection');
    onRoomsChange(value);
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    if (val !== undefined && (val < 0 || val > 100_000_000)) return;
    trigger('selection');
    onPriceChange(val, filters.price_byn_max);
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    if (val !== undefined && (val < 0 || val > 100_000_000)) return;
    trigger('selection');
    onPriceChange(filters.price_byn_min, val);
  };

  const handleAreaMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    if (val !== undefined && (val < 0 || val > 10_000)) return;
    trigger('selection');
    onAreaChange(val, filters.total_area_max);
  };

  const handleAreaMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
    if (val !== undefined && (val < 0 || val > 10_000)) return;
    trigger('selection');
    onAreaChange(filters.total_area_min, val);
  };

  const handleMoreFiltersClick = () => {
    trigger('light');
    onMoreFiltersClick();
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Быстрые фильтры">
      {/* Rooms */}
      <select
        value={filters.rooms_count ?? ''}
        onChange={handleRoomsChange}
        className="px-4 py-2 rounded-xl font-medium whitespace-nowrap flex-shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
          appearance: 'none',
        }}
        aria-label="Комнаты"
      >
        {ROOMS_OPTIONS.map((opt) => (
          <option key={opt.value ?? 'any'} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Price */}
      <div className="flex gap-1 whitespace-nowrap flex-shrink-0">
        <input
          type="number"
          placeholder="От"
          value={filters.price_byn_min ?? ''}
          onChange={handlePriceMinChange}
          className="w-24 px-3 py-2 rounded-xl text-tg-text text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          inputMode="numeric"
          aria-label="Цена от"
        />
        <span style={{ color: 'var(--tg-theme-hint-color)', alignSelf: 'center' }}>—</span>
        <input
          type="number"
          placeholder="До"
          value={filters.price_byn_max ?? ''}
          onChange={handlePriceMaxChange}
          className="w-24 px-3 py-2 rounded-xl text-tg-text text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          inputMode="numeric"
          aria-label="Цена до"
        />
      </div>

      {/* Area */}
      <div className="flex gap-1 whitespace-nowrap flex-shrink-0">
        <input
          type="number"
          placeholder="От"
          value={filters.total_area_min ?? ''}
          onChange={handleAreaMinChange}
          className="w-20 px-3 py-2 rounded-xl text-tg-text text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          inputMode="numeric"
          aria-label="Площадь от"
        />
        <span style={{ color: 'var(--tg-theme-hint-color)', alignSelf: 'center' }}>—</span>
        <input
          type="number"
          placeholder="До"
          value={filters.total_area_max ?? ''}
          onChange={handleAreaMaxChange}
          className="w-20 px-3 py-2 rounded-xl text-tg-text text-sm"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
          inputMode="numeric"
          aria-label="Площадь до"
        />
      </div>

      {/* More Filters Button */}
      <button
        onClick={handleMoreFiltersClick}
        className="px-4 py-2 rounded-xl font-medium whitespace-nowrap flex-shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      >
        Ещё фильтры
      </button>
    </div>
  );
}