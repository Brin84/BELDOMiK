import { ListSkeleton } from '@/shared/ui';

export function CatalogPage() {

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Search Bar */}
      <div className="sticky top-4 z-10">
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
          <span style={{ color: 'var(--tg-theme-hint-color)' }}>Что ищете?</span>
        </button>
      </div>

      {/* Operation Toggle */}
      <div className="flex gap-2">
        <button
          className="flex-1 py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Купить
        </button>
        <button
          className="flex-1 py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        >
          Снять
        </button>
      </div>

      {/* Location */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      >
        <span style={{ color: 'var(--tg-theme-text-color)' }}>📍 Минск</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Hot Offers Section */}
      <section>
        <h2 className="text-tg-text text-xl font-bold mb-4">🔥 Горячие предложения</h2>
        <ListSkeleton count={3} />
      </section>

      {/* New Listings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-tg-text text-xl font-bold">🆕 Новые объявления</h2>
        </div>
        <ListSkeleton count={5} />
      </section>

      {/* Footer info */}
      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}