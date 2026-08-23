import { EmptyState } from '@/shared/ui';

export function MapPage() {
  return (
    <div className="p-4 space-y-6 pb-20 min-h-[calc(100vh-120px)] min-h-[calc(100dvh-120px)]">
      {/* Map Placeholder */}
      <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState
            title="Карта недвижимости"
            description="Интерактивная карта с кластеризацией объявлений появится здесь на следующем этапе"
            icon={
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
        </div>

        {/* Map controls placeholder */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors"
            style={{
              backgroundColor: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            disabled
            aria-label="Моя локация"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </button>
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors"
            style={{
              backgroundColor: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            disabled
            aria-label="Слои карты"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </button>
        </div>

        {/* Filter bar placeholder */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="rounded-xl px-4 py-3 shadow-lg flex items-center gap-3" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ color: 'var(--tg-theme-hint-color)' }}>Фильтры карты будут доступны в следующей версии</span>
          </div>
        </div>
      </div>

      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}