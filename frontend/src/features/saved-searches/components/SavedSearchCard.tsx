import { useHaptics } from '@/shared/lib/haptics';
import { useSavedSearchesStore } from '../savedSearchesStore';
import type { SavedSearch } from '@/shared/api/types';

interface SavedSearchCardProps {
  savedSearch: SavedSearch;
  onApply: (filtersJson: string) => void;
  onEdit: (savedSearch: SavedSearch) => void;
}

const FREQUENCY_LABELS: Record<SavedSearch['notify_frequency'], string> = {
  immediate: '🔔 Мгновенно',
  daily: '📅 Ежедневно',
  weekly: '📅 Еженедельно',
  disabled: '🔕 Отключено',
};

const FREQUENCY_COLORS: Record<SavedSearch['notify_frequency'], { bg: string; color: string }> = {
  immediate: { bg: 'rgba(255, 59, 48, 0.15)', color: '#ff3b30' },
  daily: { bg: 'rgba(0, 122, 255, 0.15)', color: '#007aff' },
  weekly: { bg: 'rgba(52, 199, 89, 0.15)', color: '#34c759' },
  disabled: { bg: 'rgba(142, 142, 147, 0.15)', color: '#8e8e93' },
};

export function SavedSearchCard({ savedSearch, onApply, onEdit }: SavedSearchCardProps) {
  const { trigger } = useHaptics();
  const { deleteSavedSearch, toggleNotifications, isLoading } = useSavedSearchesStore();

  const frequency = savedSearch.notify_frequency;
  const freqColors = FREQUENCY_COLORS[frequency];
  const isActive = savedSearch.is_active;

  const formatFilters = (filtersJson: string): string => {
    try {
      const filters = JSON.parse(filtersJson);
      const parts: string[] = [];

      if (filters.operation_id) {
        parts.push(filters.operation_id === 1 ? '🏠 Купить' : '🏠 Снять');
      }
      if (filters.type_id) {
        parts.push(`Тип: ${filters.type_id}`);
      }
      if (filters.city_id) {
        parts.push(`Город: ${filters.city_id}`);
      }
      if (filters.region_id) {
        parts.push(`Область: ${filters.region_id}`);
      }
      if (filters.rooms_count) {
        parts.push(`${filters.rooms_count === 5 ? '5+' : filters.rooms_count} комн.`);
      }
      if (filters.price_byn_min || filters.price_byn_max) {
        const min = filters.price_byn_min ? `от ${filters.price_byn_min.toLocaleString()}` : '';
        const max = filters.price_byn_max ? `до ${filters.price_byn_max.toLocaleString()}` : '';
        parts.push(`Цена: ${min} ${max}`.trim());
      }
      if (filters.total_area_min || filters.total_area_max) {
        const min = filters.total_area_min ? `от ${filters.total_area_min}` : '';
        const max = filters.total_area_max ? `до ${filters.total_area_max}` : '';
        parts.push(`Площадь: ${min} ${max}`.trim());
      }
      if (filters.renovation) {
        parts.push(`Ремонт: ${filters.renovation}`);
      }
      if (filters.furniture) parts.push('Мебель');
      if (filters.balcony) parts.push('Балкон');
      if (filters.parking) parts.push('Парковка');
      if (filters.elevator) parts.push('Лифт');

      return parts.length > 0 ? parts.slice(0, 4).join(' • ') : 'Без фильтров';
    } catch {
      return 'Некорректные фильтры';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить сохранённый поиск «${savedSearch.name || 'Без имени'}»?`)) return;

    trigger('medium');
    try {
      await deleteSavedSearch(savedSearch.id);
    } catch {
      // Error handled in store
    }
  };

  const handleToggleNotify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    try {
      await toggleNotifications(savedSearch.id);
    } catch {
      // Error handled in store
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('light');
    onEdit(savedSearch);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger('selection');
    onApply(savedSearch.filters_json);
  };

  return (
    <div
      className="group relative bg-tg-secondary-bg rounded-xl overflow-hidden transition-all duration-200"
      style={{
        border: '1px solid var(--tg-theme-hint-color)',
        opacity: isActive ? 1 : 0.6,
      }}
    >
      {/* Main content */}
      <div className="p-4">
        {/* Header with name and active badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-tg-text font-semibold text-base truncate">
              {savedSearch.name || 'Без имени'}
            </h3>
            <p className="text-tg-hint text-xs mt-1 truncate" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {formatFilters(savedSearch.filters_json)}
            </p>
          </div>
          {!isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'rgba(142, 142, 147, 0.2)', color: '#8e8e93' }}>
              Неактивно
            </span>
          )}
        </div>

        {/* Frequency badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
            style={{ backgroundColor: freqColors.bg, color: freqColors.color }}
          >
            {FREQUENCY_LABELS[frequency]}
          </span>
          {isActive && frequency !== 'disabled' && (
            <span className="text-tg-hint text-xs flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {savedSearch.last_notified_at
                ? `Последнее уведомление: ${new Date(savedSearch.last_notified_at).toLocaleDateString('ru-RU')}`
                : 'Уведомлений пока не было'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
            aria-label="Применить поиск"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Применить
          </button>

          <button
            onClick={handleEdit}
            disabled={isLoading}
            className="p-2.5 rounded-xl transition-colors flex-shrink-0"
            style={{
              backgroundColor: 'var(--tg-theme-tertiary-bg-color, var(--tg-theme-secondary-bg-color))',
              color: 'var(--tg-theme-text-color)',
            }}
            aria-label="Редактировать"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            onClick={handleToggleNotify}
            disabled={isLoading}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${isActive ? 'active' : ''}`}
            style={{
              backgroundColor: isActive
                ? 'rgba(0, 122, 255, 0.15)'
                : 'var(--tg-theme-tertiary-bg-color, var(--tg-theme-secondary-bg-color))',
              color: isActive ? '#007aff' : 'var(--tg-theme-text-color)',
            }}
            aria-label={isActive ? 'Отключить уведомления' : 'Включить уведомления'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {isActive ? (
                <>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </>
              ) : (
                <>
                  <path d="M6 8a6 6 0 0 1 12 0c0 7-3 9-3 9h18" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
          </button>

          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="p-2.5 rounded-xl transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30' }}
            aria-label="Удалить"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}