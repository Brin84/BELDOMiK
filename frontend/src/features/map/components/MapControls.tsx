import { useHaptics } from '@/shared/lib/haptics';

interface MapControlsProps {
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
  onGeolocationClick: () => void;
  onFiltersClick: () => void;
  hasActiveFilters: boolean;
  userLocation: [number, number] | null;
  isGeolocationLoading: boolean;
  geolocationError: string | null;
}

export function MapControls({
  viewMode,
  onViewModeChange,
  onGeolocationClick,
  onFiltersClick,
  hasActiveFilters,
  userLocation,
  isGeolocationLoading,
  geolocationError,
}: MapControlsProps) {
  const { trigger } = useHaptics();

  return (
    <>
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        {/* View Mode Toggle */}
        <div className="flex rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: 'var(--tg-theme-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
          <button
            onClick={() => {
              trigger('light');
              onViewModeChange('map');
            }}
            className={`px-4 py-2.5 flex items-center gap-2 transition-colors ${
              viewMode === 'map'
                ? 'shadow-sm'
                : ''
            }`}
            style={{
              backgroundColor: viewMode === 'map'
                ? 'var(--tg-theme-button-color)'
                : 'transparent',
              color: viewMode === 'map'
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
              border: 'none',
            }}
            aria-pressed={viewMode === 'map'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline font-medium">Карта</span>
          </button>
          <button
            onClick={() => {
              trigger('light');
              onViewModeChange('list');
            }}
            className={`px-4 py-2.5 flex items-center gap-2 transition-colors ${
              viewMode === 'list'
                ? 'shadow-sm'
                : ''
            }`}
            style={{
              backgroundColor: viewMode === 'list'
                ? 'var(--tg-theme-button-color)'
                : 'transparent',
              color: viewMode === 'list'
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
              border: 'none',
            }}
            aria-pressed={viewMode === 'list'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="hidden sm:inline font-medium">Список</span>
          </button>
        </div>

        {/* Geolocation Button */}
        <button
          onClick={onGeolocationClick}
          disabled={isGeolocationLoading}
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-colors"
          style={{
            backgroundColor: userLocation
              ? 'var(--tg-theme-button-color)'
              : 'var(--tg-theme-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: userLocation
              ? 'var(--tg-theme-button-text-color)'
              : 'var(--tg-theme-text-color)',
            opacity: isGeolocationLoading ? 0.6 : 1,
          }}
          aria-label={userLocation ? 'Сбросить геолокацию' : 'Моя геопозиция'}
          aria-pressed={!!userLocation}
        >
          {isGeolocationLoading ? (
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r={userLocation ? 6 : 3} />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          )}
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-3">
        {/* Geolocation Error Toast */}
        {geolocationError && (
          <div
            className="mx-4 px-4 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-3"
            style={{
              backgroundColor: 'var(--tg-theme-destructive-color, #EF4444)',
              color: 'var(--tg-theme-destructive-text-color, white)',
            }}
            role="alert"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-sm flex-1">{geolocationError}</span>
            <button
              onClick={() => {
                trigger('light');
                // Error will be cleared by parent
              }}
              className="p-1 rounded-lg flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              aria-label="Закрыть"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters Button */}
        <button
          onClick={onFiltersClick}
          className="mx-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-colors"
          style={{
            backgroundColor: hasActiveFilters
              ? 'var(--tg-theme-button-color)'
              : 'var(--tg-theme-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: hasActiveFilters
              ? 'var(--tg-theme-button-text-color)'
              : 'var(--tg-theme-text-color)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="font-medium">Фильтры</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
              активны
            </span>
          )}
        </button>
      </div>

      {/* Safe area spacer */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </>
  );
}