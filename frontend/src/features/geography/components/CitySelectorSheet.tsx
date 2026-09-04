import { useEffect, useMemo, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked } from '@/shared/lib/backButton';
import { useGeographyStore } from '@/features/geography/geographyStore';
import type { City } from '@/shared/api/types';

export interface CitySelectorSheetProps {
  cities: City[];
  currentCityId?: number;
  onSelect: (cityId: number | undefined) => void;
  onClose: () => void;
}

export function CitySelectorSheet({ cities, currentCityId, onSelect, onClose }: CitySelectorSheetProps) {
  const { backButton } = useTelegram();
  const { trigger } = useHaptics();
  const addCity = useGeographyStore((s) => s.addCity);

  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return cities;
    const q = trimmedQuery.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, trimmedQuery]);

  const noMatches = trimmedQuery.length > 0 && filtered.length === 0;

  const handleAddCustom = async () => {
    if (noMatches && trimmedQuery) {
      setIsAdding(true);
      trigger('selection');
      const city = await addCity(trimmedQuery);
      setIsAdding(false);
      if (city) {
        trigger('success');
        onSelect(city.id);
      } else {
        trigger('error');
      }
    }
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

        {/* Search input */}
        <div className="px-4 pt-3">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 flex-shrink-0"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: 'var(--tg-theme-hint-color)' }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск города или деревни"
              className="w-full pl-11 pr-10 py-3 rounded-xl text-tg-text text-base"
              style={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                border: '1px solid var(--tg-theme-hint-color)',
                color: 'var(--tg-theme-text-color)',
              }}
              autoComplete="off"
              maxLength={100}
              aria-label="Поиск населённого пункта"
            />
            {query && (
              <button
                onClick={() => {
                  trigger('light');
                  setQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
                style={{ color: 'var(--tg-theme-hint-color)' }}
                aria-label="Очистить поиск"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* City list */}
        <div className="p-2 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 150px)' }}>
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

          {cities.length === 0 && !noMatches ? (
            <p className="px-4 py-4 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Загрузка городов...
            </p>
          ) : noMatches ? (
            <div className="px-2 py-2 text-center">
              <p className="px-4 py-2 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
                «{trimmedQuery}» нет в списке
              </p>
              <button
                onClick={handleAddCustom}
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium transition-colors active:opacity-80 disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                }}
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Добавляем...
                  </>
                ) : (
                  <>➕ Добавить «{trimmedQuery}»</>
                )}
              </button>
              <p className="px-4 pt-2 text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Деревня или город добавится в список
              </p>
            </div>
          ) : (
            filtered.map((city) => {
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