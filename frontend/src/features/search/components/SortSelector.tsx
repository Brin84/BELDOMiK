import { useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';

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
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Сортировка"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>{currentOption.label}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl"
            style={{ backgroundColor: 'var(--tg-theme-bg-color)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            role="listbox"
            aria-label="Выберите сортировку"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }} />
            </div>
            <div className="px-4 pb-3 border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
              <h3 className="text-tg-text text-lg font-semibold">Сортировка</h3>
            </div>
            <div className="p-4 pb-8 space-y-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors ${
                    currentSort === option.value ? 'shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: currentSort === option.value
                      ? 'var(--tg-theme-button-color)'
                      : 'var(--tg-theme-secondary-bg-color)',
                    color: currentSort === option.value
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                    border: currentSort !== option.value ? '1px solid var(--tg-theme-hint-color)' : 'none',
                  }}
                  role="option"
                  aria-selected={currentSort === option.value}
                >
                  <span className="font-medium">{option.label}</span>
                  {currentSort === option.value && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}