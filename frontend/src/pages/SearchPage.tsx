import { EmptyState } from '@/shared/ui';

export function SearchPage() {

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Search Header */}
      <div className="sticky top-4 z-10 space-y-4">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
          }}
          disabled
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ color: 'var(--tg-theme-hint-color)' }}>Поиск недвижимости...</span>
        </button>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Область', 'Город', 'Район', 'Метро', 'Тип', 'Цена', 'Комнаты'].map((filter) => (
            <button
              key={filter}
              className="px-4 py-2 rounded-full font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                border: '1px solid var(--tg-theme-hint-color)',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Results placeholder */}
      <EmptyState
        title="Результаты поиска"
        description="Настройте фильтры и начните поиск недвижимости в Беларуси"
        icon={
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="4" y1="4" x2="7.5" y2="7.5" />
          </svg>
        }
      />

      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}