import { useEffect, useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { CitySelectorSheet } from '@/features/geography/components/CitySelectorSheet';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import type { PropertyCategory } from '@/shared/api/types';

// Krisha-стиль: категории — цветные градиентные плитки с SVG-иконками
// (вместо плоских белых плиток с эмодзи). Иконки рисуем сами — у нас нет
// фотосета под каждую категорию.
interface CategoryVisual {
  icon: ReactNode;
  from: string;
  to: string;
}

const CATEGORY_VISUAL: Record<PropertyCategory, CategoryVisual> = {
  apartment: {
    from: '#4f7dff',
    to: '#2563eb',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <path d="M5 10h14" />
        <path d="M9.5 3v7" />
        <path d="M14.5 3v7" />
        <path d="M9.5 13.5h.01M14.5 13.5h.01M9.5 16.5h.01M14.5 16.5h.01" />
      </svg>
    ),
  },
  house: {
    from: '#34c78b',
    to: '#1da57a',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
  land: {
    from: '#22b8cf',
    to: '#0f8fa8',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 15.5 8.5 10l5 5 7-7" />
        <circle cx="16.5" cy="7" r="1.4" />
      </svg>
    ),
  },
  commercial: {
    from: '#8b7bff',
    to: '#6a5ae0',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M3 9 5 5h14l2 4" />
        <path d="M3 9v10h18V9" />
        <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      </svg>
    ),
  },
  garage: {
    from: '#64748b',
    to: '#475569',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 11h18" />
        <path d="M9 20v-4h6v4" />
      </svg>
    ),
  },
  dacha: {
    from: '#f5a352',
    to: '#e07b1f',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="m3 11 9-7 9 7" />
        <path d="M5 9v10h14V9" />
        <path d="M9 19v-5h6v5" />
        <path d="M18 5.5V4h2" />
      </svg>
    ),
  },
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

// Утилитарная строка меню с цветной SVG-иконкой в чипе (ипотека, подборки,
// агентства). Чип-«картинка» вместо эмодзи — Krisha-стиль.
function UtilityRow({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors active:opacity-80"
      style={{
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        border: '1px solid var(--tg-theme-hint-color)',
      }}
      aria-label={title}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: '#fff', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)' }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
          {title}
        </span>
        <span className="block text-xs truncate" style={{ color: 'var(--tg-theme-hint-color)' }}>
          {subtitle}
        </span>
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--tg-theme-hint-color)' }}>
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>
  );
}

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

      {/* Category Grid — цветные плитки с иконками (Krisha-стиль) */}
      {propertyTypes.length > 0 && (
        <div className="grid grid-cols-2 gap-3" role="list" aria-label="Категории недвижимости">
          {HOME_CATEGORIES.map((category) => {
            const type = propertyTypes.find((t) => t.category === category);
            if (!type) return null;
            const isActive = filters.type_id === type.id;
            const visual = CATEGORY_VISUAL[category];
            return (
              <button
                key={type.id}
                role="listitem"
                onClick={() => handleCategoryClick(type.id)}
                className="relative flex flex-col justify-between items-start p-3.5 rounded-2xl text-left overflow-hidden min-h-[104px] transition-all duration-200 active:opacity-80"
                style={{
                  background: `linear-gradient(135deg, ${visual.from}, ${visual.to})`,
                  boxShadow: isActive
                    ? 'inset 0 0 0 2.5px rgba(255,255,255,0.95), 0 4px 14px rgba(10,25,60,0.18)'
                    : '0 4px 14px rgba(10,25,60,0.10)',
                }}
                aria-pressed={isActive}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.22)', color: '#fff' }}
                >
                  {visual.icon}
                </span>
                <span className="flex flex-col items-start mt-2">
                  <span className="font-semibold text-[15px] leading-tight text-white">
                    {type.name_plural || type.name}
                  </span>
                  <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    {currentOperationId === 1 ? 'Покупка' : 'Аренда'}
                  </span>
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
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 21h16" />
            <path d="M6 21V7l6-4 6 4v14" />
            <path d="M6 10h12" />
            <path d="M12 7v14" />
            <path d="M9 13h2v2H9zM13 13h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2z" />
          </svg>
        </span>
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
      <UtilityRow
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        }
        iconBg="linear-gradient(135deg, #5b93ff, #2f6fed)"
        title="Ипотечный калькулятор"
        subtitle="Рассчитайте платёж и переплату"
        onClick={() => { trigger('light'); navigate('/mortgage'); }}
      />

      {/* Collections — utility tile */}
      <UtilityRow
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        }
        iconBg="linear-gradient(135deg, #8b7bff, #6a5ae0)"
        title="Мои подборки"
        subtitle="Группируйте понравившиеся объекты"
        onClick={() => { trigger('light'); navigate('/collections'); }}
      />

      {/* Agencies — utility tile */}
      <UtilityRow
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <rect x="4" y="3" width="16" height="18" rx="1.5" />
            <path d="M4 9h16" />
            <path d="M9 3v6" />
            <path d="M15 3v6" />
            <path d="M9 13.5h.01M15 13.5h.01M9 17h.01M15 17h.01" />
          </svg>
        }
        iconBg="linear-gradient(135deg, #34c78b, #1da57a)"
        title="Агентства"
        subtitle="Проверенные компании и агенты"
        onClick={() => { trigger('light'); navigate('/agencies'); }}
      />

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

