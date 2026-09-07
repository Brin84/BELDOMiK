import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyFilterParams } from '@/shared/api/types';
import './search-form.css';

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
    <div className="qf" role="group" aria-label="Быстрые фильтры">
      {/* Rooms */}
      <select
        value={filters.rooms_count ?? ''}
        onChange={handleRoomsChange}
        className="qf__select"
        aria-label="Комнаты"
      >
        {ROOMS_OPTIONS.map((opt) => (
          <option key={opt.value ?? 'any'} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Price */}
      <div className="qf__field">
        <input
          type="number"
          placeholder="От"
          value={filters.price_byn_min ?? ''}
          onChange={handlePriceMinChange}
          className="qf__input qf__input--wide"
          inputMode="numeric"
          aria-label="Цена от"
        />
        <span className="qf__field-dash">—</span>
        <input
          type="number"
          placeholder="До"
          value={filters.price_byn_max ?? ''}
          onChange={handlePriceMaxChange}
          className="qf__input qf__input--wide"
          inputMode="numeric"
          aria-label="Цена до"
        />
      </div>

      {/* Area */}
      <div className="qf__field">
        <input
          type="number"
          placeholder="От"
          value={filters.total_area_min ?? ''}
          onChange={handleAreaMinChange}
          className="qf__input"
          inputMode="numeric"
          aria-label="Площадь от"
        />
        <span className="qf__field-dash">—</span>
        <input
          type="number"
          placeholder="До"
          value={filters.total_area_max ?? ''}
          onChange={handleAreaMaxChange}
          className="qf__input"
          inputMode="numeric"
          aria-label="Площадь до"
        />
      </div>

      {/* More Filters Button */}
      <button onClick={handleMoreFiltersClick} className="qf__more">
        Ещё фильтры
      </button>
    </div>
  );
}