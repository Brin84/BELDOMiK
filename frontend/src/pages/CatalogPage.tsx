import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked } from '@/shared/lib/backButton';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import type { PropertyCategory } from '@/shared/api/types';

// Krisha-style: текстовые ключи иконок в БД не являются эмодзи, поэтому
// маппим категорию → эмодзи явно для плиток каталога.
const CATEGORY_EMOJI: Record<PropertyCategory, string> = {
  apartment: '🏢',
  house: '🏡',
  land: '🌳',
  commercial: '🏬',
  garage: '🚗',
  dacha: '🏠',
};

// Категории, показываемые на главной (порядок Krisha-подобный).
const HOME_CATEGORIES: PropertyCategory[] = [
  'apartment',
  'house',
  'land',
  'commercial',
  'garage',
  'dacha',
];

export function CatalogPage() {
  const { trigger } = useHaptics();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false);
  const {
    properties,
    hotProperties,
    isLoading,
    error,
    total,
    filters,
    fetchProperties,
    setOperation,
    setCity,
    refresh,
    clearError,
  } = usePropertiesStore();
  const {
    fetchRegions,
    fetchAllCities,
    fetchPropertyTypes,
    cities,
    propertyTypes,
    getCityById,
  } = useGeographyStore();
  const { toggleFavorite } = useFavoritesStore();

  // Initialize on mount
  useEffect(() => {
    // Load geography data
    fetchRegions();
    fetchPropertyTypes();
    // Load initial properties
    fetchProperties(true);
  }, [fetchRegions, fetchPropertyTypes, fetchProperties]);

  // Переход на поиск с предзаполненными фильтрами (категория/новостройки).
  // SearchPage применяет сохранённые фильтры через sessionStorage-механизм
  // applySavedSearchFilters на монтировании.
  const navigateWithFilters = useCallback(
    (filters: Record<string, unknown>) => {
      trigger('light');
      sessionStorage.setItem('applySavedSearchFilters', JSON.stringify(filters));
      navigate('/search');
    },
    [trigger, navigate]
  );

  const handleCategoryClick = useCallback(
    (typeId: number) => {
      navigateWithFilters({
        type_id: typeId,
        operation_id: filters.operation_id,
      });
    },
    [navigateWithFilters, filters.operation_id]
  );

  const handleNewBuildingsClick = useCallback(() => {
    navigateWithFilters({
      new_building_only: true,
      operation_id: filters.operation_id,
    });
  }, [navigateWithFilters, filters.operation_id]);

  // If a city filter is already active (e.g. returning from /search), make sure
  // the city name resolves and the selector can render it.
  useEffect(() => {
    if (filters.city_id) {
      fetchAllCities();
    }
  }, [filters.city_id, fetchAllCities]);

  // Load all cities when the city selector opens
  useEffect(() => {
    if (isCitySheetOpen) {
      fetchAllCities();
    }
  }, [isCitySheetOpen, fetchAllCities]);

  const handleOperationChange = useCallback((operationId: number) => {
    hapticFeedback?.impactOccurred('light');
    setOperation(operationId);
  }, [setOperation, hapticFeedback]);

  const handleRetry = useCallback(() => {
    clearError();
    refresh();
  }, [clearError, refresh]);

  const currentCity = filters.city_id ? getCityById(filters.city_id) : null;
  const currentOperationId = filters.operation_id ?? 1; // 1 = sale, 2 = rent

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Search Bar */}
      <div className="sticky top-4 z-10">
        <button
          onClick={() => {
            trigger('light');
            navigate('/search');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:opacity-70"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ color: 'var(--tg-theme-hint-color)' }}>Что ищете?</span>
        </button>
      </div>

      {/* Category Grid (Krisha-style home navigation) */}
      {propertyTypes.length > 0 && (
        <div className="grid grid-cols-2 gap-2" role="list" aria-label="Категории недвижимости">
          {HOME_CATEGORIES.map((category) => {
            const type = propertyTypes.find((t) => t.category === category);
            if (!type) return null;
            const isActive = filters.type_id === type.id;
            return (
              <button
                key={type.id}
                role="listitem"
                onClick={() => handleCategoryClick(type.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors active:opacity-70"
                style={{
                  backgroundColor: isActive
                    ? 'var(--tg-theme-button-color)'
                    : 'var(--tg-theme-secondary-bg-color)',
                  border: `1px solid ${isActive ? 'transparent' : 'var(--tg-theme-hint-color)'}`,
                }}
                aria-pressed={isActive}
              >
                <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[category]}</span>
                <span
                  className="font-medium text-sm leading-tight"
                  style={{
                    color: isActive
                      ? 'var(--tg-theme-button-text-color)'
                      : 'var(--tg-theme-text-color)',
                  }}
                >
                  {type.name_plural || type.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* New Buildings (новостройки) — отдельный раздел Krisha-style */}
      <button
        onClick={handleNewBuildingsClick}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-colors active:opacity-80 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, var(--tg-theme-button-color), #2f6fed)',
        }}
        aria-label="Новостройки"
      >
        <span className="text-3xl">🏗️</span>
        <span className="flex-1">
          <span className="block font-bold" style={{ color: 'var(--tg-theme-button-text-color)' }}>
            Новостройки
          </span>
          <span className="block text-sm" style={{ color: 'var(--tg-theme-button-text-color)', opacity: 0.85 }}>
            Квартиры в новых домах от застройщиков
          </span>
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--tg-theme-button-text-color)' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Mortgage Calculator — utility tile */}
      <button
        onClick={() => { trigger('light'); navigate('/mortgage'); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors active:opacity-80"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
        aria-label="Ипотечный калькулятор"
      >
        <span className="text-2xl flex-shrink-0">🏦</span>
        <span className="flex-1">
          <span className="block font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
            Ипотечный калькулятор
          </span>
          <span className="block text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Рассчитайте платёж и переплату
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Collections — utility tile */}
      <button
        onClick={() => { trigger('light'); navigate('/collections'); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors active:opacity-80"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
        aria-label="Мои подборки"
      >
        <span className="text-2xl flex-shrink-0">📁</span>
        <span className="flex-1">
          <span className="block font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
            Мои подборки
          </span>
          <span className="block text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Группируйте понравившиеся объекты
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Agencies — utility tile */}
      <button
        onClick={() => { trigger('light'); navigate('/agencies'); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors active:opacity-80"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
        aria-label="Агентства недвижимости"
      >
        <span className="text-2xl flex-shrink-0">🏢</span>
        <span className="flex-1">
          <span className="block font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
            Агентства
          </span>
          <span className="block text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Проверенные компании и агенты
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </button>

      {/* Operation Toggle */}
      <div className="flex gap-2" role="group" aria-label="Тип сделки">
        <button
          onClick={() => handleOperationChange(1)}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            currentOperationId === 1
              ? 'shadow-sm'
              : ''
          }`}
          style={{
            backgroundColor: currentOperationId === 1
              ? 'var(--tg-theme-button-color)'
              : 'var(--tg-theme-secondary-bg-color)',
            color: currentOperationId === 1
              ? 'var(--tg-theme-button-text-color)'
              : 'var(--tg-theme-text-color)',
            border: currentOperationId !== 1 ? '1px solid var(--tg-theme-hint-color)' : 'none',
          }}
          aria-pressed={currentOperationId === 1}
        >
          Купить
        </button>
        <button
          onClick={() => handleOperationChange(2)}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            currentOperationId === 2
              ? 'shadow-sm'
              : ''
          }`}
          style={{
            backgroundColor: currentOperationId === 2
              ? 'var(--tg-theme-button-color)'
              : 'var(--tg-theme-secondary-bg-color)',
            color: currentOperationId === 2
              ? 'var(--tg-theme-button-text-color)'
              : 'var(--tg-theme-text-color)',
            border: currentOperationId !== 2 ? '1px solid var(--tg-theme-hint-color)' : 'none',
          }}
          aria-pressed={currentOperationId === 2}
        >
          Снять
        </button>
      </div>

      {/* Location Selector */}
      <button
        onClick={() => {
          hapticFeedback?.impactOccurred('light');
          setIsCitySheetOpen(true);
        }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors active:opacity-70"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
      >
        <span style={{ color: 'var(--tg-theme-text-color)' }}>
          📍 {currentCity?.name || 'Все Беларусь'}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* City Selector Bottom Sheet */}
      {isCitySheetOpen && (
        <CitySelectorSheet
          cities={cities}
          currentCityId={filters.city_id}
          onSelect={(cityId) => {
            trigger('light');
            setCity(cityId);
            setIsCitySheetOpen(false);
          }}
          onClose={() => {
            trigger('light');
            setIsCitySheetOpen(false);
          }}
        />
      )}

      {/* Error State */}
      {error && (
        <InlineError message={error} onDismiss={clearError} />
      )}

      {/* Hot Offers Section */}
      {hotProperties.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-tg-text text-xl font-bold">🔥 Горячие предложения</h2>
          </div>
          <div className="space-y-3">
            {hotProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onFavoriteToggle={async (propertyId) => {
                  trigger('light');
                  try {
                    await toggleFavorite(propertyId);
                    // Refresh properties store to update is_favorite there too
                    await fetchProperties(true);
                  } catch {
                    // Error already handled in store
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Listings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-tg-text text-xl font-bold">
            {currentOperationId === 1 ? '🏠 Квартиры и дома на продажу' : '🔑 Квартиры и дома в аренду'}
          </h2>
          {total > 0 && (
            <span className="text-tg-hint text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {total} объявлений
            </span>
          )}
        </div>

        {isLoading && properties.length === 0 ? (
          <ListSkeleton count={5} />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            }
            title="Объявлений не найдено"
            description={
              error ? null : (
                <>
                  Попробуйте изменить фильтры или расширить поиск.
                  <br />
                  <span className="text-xs">Выбрано: {currentCity?.name || 'все города'}, {currentOperationId === 1 ? 'покупка' : 'аренда'}</span>
                </>
              )
            }
            action={error ? { label: 'Повторить', onClick: handleRetry } : undefined}
          />
        ) : (
          <>
            <div className="space-y-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteToggle={async (propertyId) => {
                    trigger('light');
                    try {
                      await toggleFavorite(propertyId);
                      // Refresh properties store to update is_favorite there too
                      await fetchProperties(true);
                    } catch {
                      // Error already handled in store
                    }
                  }}
                />
              ))}
            </div>

            {properties.length > 0 && (
              <p className="text-center text-tg-hint text-sm py-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Все {total} объявлений загружены
              </p>
            )}
          </>
        )}
      </section>

      {/* Footer info */}
      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}

interface CitySelectorSheetProps {
  cities: Array<{ id: number; name: string; region_id: number }>;
  currentCityId?: number;
  onSelect: (cityId: number | undefined) => void;
  onClose: () => void;
}

function CitySelectorSheet({ cities, currentCityId, onSelect, onClose }: CitySelectorSheetProps) {
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