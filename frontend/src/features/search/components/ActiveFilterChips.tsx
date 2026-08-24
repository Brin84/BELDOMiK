import { useHaptics } from '@/shared/lib/haptics';
import type { PropertyFilterParams } from '@/shared/api/types';

interface ActiveFilterChipsProps {
  filters: PropertyFilterParams;
  onRemoveFilter: (key: keyof PropertyFilterParams) => void;
  getFilterLabel: (key: keyof PropertyFilterParams, value: unknown) => string | null;
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  getFilterLabel,
}: ActiveFilterChipsProps) {
  const { trigger } = useHaptics();

  // Build array of active filters
  const activeFilters: Array<{ key: keyof PropertyFilterParams; label: string }> = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Skip pagination and sort params
      if (['page', 'page_size', 'sort_by', 'sort_order', 'with_photos_only', 'is_favorite_only'].includes(key)) {
        return;
      }

      const label = getFilterLabel(key as keyof PropertyFilterParams, value);
      if (label) {
        activeFilters.push({ key: key as keyof PropertyFilterParams, label });
      }
    }
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Активные фильтры">
      {activeFilters.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => {
            trigger('light');
            onRemoveFilter(key);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
          aria-label={`Удалить фильтр: ${label}`}
        >
          <span>{label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ))}
    </div>
  );
}