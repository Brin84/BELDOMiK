import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import './search-form.css';

interface SortOption {
  value: string;
  label: string;
}

interface SortSelectorProps {
  currentSort: string;
  onChange: (sort: string) => void;
  options?: SortOption[];
}

const defaultSortOptions: SortOption[] = [
  { value: 'created_at_desc', label: 'Новые' },
  { value: 'price_byn', label: 'Сначала дешевле' },
  { value: 'price_byn_desc', label: 'Сначала дороже' },
  { value: 'total_area', label: 'По площади (↑)' },
  { value: 'total_area_desc', label: 'По площади (↓)' },
  { value: 'created_at', label: 'Старые' },
];

export function SortSelector({
  currentSort,
  onChange,
  options = defaultSortOptions,
}: SortSelectorProps) {
  const { trigger } = useHaptics();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    trigger('selection');
    onChange(value);
    setIsOpen(false);
  };

  const currentOption = options.find((o) => o.value === currentSort) || options[0];

  return (
    <div className="relative">
      <button
        onClick={() => {
          trigger('light');
          setIsOpen(!isOpen);
        }}
        className="search-sort"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Сортировка"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="search-sort__icon">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="search-sort__label">{currentOption.label}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="search-sort__chevron">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="sort-sheet"
            role="listbox"
            aria-label="Выберите сортировку"
          >
            <div className="sort-sheet__grabber" />
            <div className="sort-sheet__head">
              <h3 className="sort-sheet__title">Сортировка</h3>
            </div>
            <div className="sort-sheet__body">
              {options.map((option) => {
                const isActive = currentSort === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`sort-sheet__option ${isActive ? 'sort-sheet__option--active' : ''}`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span className="font-medium">{option.label}</span>
                    {isActive && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}