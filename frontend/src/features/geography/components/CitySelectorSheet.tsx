import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { backHandlerBlocked } from '@/shared/lib/backButton';

export interface CitySelectorSheetProps {
  cities: Array<{ id: number; name: string; region_id: number }>;
  currentCityId?: number;
  onSelect: (cityId: number | undefined) => void;
  onClose: () => void;
}

export function CitySelectorSheet({ cities, currentCityId, onSelect, onClose }: CitySelectorSheetProps) {
  const { backButton } = useTelegram();

  useEffect(() => {
    if (backButton) {
      backHandlerBlocked.current = true;
      backButton.show();
      const handleBack = () => onClose();
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
        backButton.hide();
        backHandlerBlocked.current = false;
      };
    }
  }, [onClose, backButton]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Выбор города"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" style={{ opacity: 1 }} aria-hidden="true" />

      {/* Bottom Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl transition-transform duration-300"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          transform: 'translateY(0)',
          maxHeight: '85vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
          <h2 className="text-tg-text text-xl font-semibold">Город</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--tg-theme-hint-color)' }}
            aria-label="Закрыть выбор города"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* City list */}
        <div className="p-2 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          <button
            onClick={() => onSelect(undefined)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors active:opacity-70"
            style={{
              backgroundColor: currentCityId === undefined
                ? 'var(--tg-theme-button-color)'
                : 'transparent',
              color: currentCityId === undefined
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
            }}
            aria-pressed={currentCityId === undefined}
          >
            <span className="font-medium">📍 Вся Беларусь</span>
            {currentCityId === undefined && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {cities.length === 0 ? (
            <p className="px-4 py-4 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Загрузка городов...
            </p>
          ) : (
            cities.map((city) => {
              const isSelected = currentCityId === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => onSelect(city.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors active:opacity-70"
                  style={{
                    backgroundColor: isSelected ? 'var(--tg-theme-button-color)' : 'transparent',
                    color: isSelected ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
                  }}
                  aria-pressed={isSelected}
                >
                  <span className="font-medium">{city.name}</span>
                  {isSelected && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
