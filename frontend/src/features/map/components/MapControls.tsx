import { useHaptics } from '@/shared/lib/haptics';
import './map.css';

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
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <div className="mctl">
          {/* View Mode Toggle */}
          <div className="mctl__seg" role="group" aria-label="Режим отображения">
            <button
              onClick={() => {
                trigger('light');
                onViewModeChange('map');
              }}
              className={`mctl__seg-btn ${viewMode === 'map' ? 'mctl__seg-btn--active' : ''}`}
              aria-pressed={viewMode === 'map'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
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
              className={`mctl__seg-btn ${viewMode === 'list' ? 'mctl__seg-btn--active' : ''}`}
              aria-pressed={viewMode === 'list'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
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
            className={`mctl__geo ${userLocation ? 'mctl__geo--active' : ''}`}
            aria-label={userLocation ? 'Сбросить геолокацию' : 'Моя геопозиция'}
            aria-pressed={!!userLocation}
          >
            {isGeolocationLoading ? (
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r={userLocation ? 6 : 3} />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex flex-col gap-3">
        {/* Geolocation Error Toast */}
        {geolocationError && (
          <div className="mctl__toast" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="mctl__toast-msg">{geolocationError}</span>
            <button
              onClick={() => {
                trigger('light');
                // Error will be cleared by parent
              }}
              className="mctl__toast-close"
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters Button */}
        <div className="flex justify-center">
          <button
            onClick={onFiltersClick}
            className={`mctl__filters ${hasActiveFilters ? 'mctl__filters--active' : 'mctl__filters--idle'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="font-medium">Фильтры</span>
            {hasActiveFilters && (
              <span className="mctl__badge">активны</span>
            )}
          </button>
        </div>
      </div>

      {/* Safe area spacer */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </>
  );
}