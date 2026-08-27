import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useDebounce } from '@/shared/lib/hooks';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import { FilterBottomSheet, ActiveFilterChips, SortSelector, QuickFilters } from '@/features/search/components';
import { SavedSearchForm } from '@/features/saved-searches/components';
import { formatPriceByn, formatArea } from '@/shared/lib/format';
import type { PropertyFilterParams } from '@/shared/api/types';

const OPERATION_OPTIONS = [
  { id: 1, label: 'Купить' },
  { id: 2, label: 'Снять' },
];

export function SearchPage() {
  const { trigger } = useHaptics();
  const { backButton, mainButton, hapticFeedback /*, themeParams */ } = useTelegram();
  const {
    properties,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    filters,
    loadMore,
    setFilters,
    resetFilters,
    setOperation,
    refresh,
    clearError,
    // fetchProperties is available but not used directly - filters trigger auto-fetch
  } = usePropertiesStore();
  const { toggleFavorite } = useFavoritesStore();
  const {
    regions,
    neighborhoods,
    streets,
    propertyTypes,
    operationTypes,
    fetchRegions,
    fetchCities,
    fetchDistricts,
    fetchNeighborhoods,
    fetchStreets,
    fetchMetroLines,
    fetchPropertyTypes,
    fetchOperationTypes,
    getCityById,
    getDistrictById,
    getPropertyTypeById,
    getMetroStationById,
  } = useGeographyStore();

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [filterBottomSheetOpen, setFilterBottomSheetOpen] = useState(false);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);

  // Apply saved search filters from sessionStorage on mount
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('applySavedSearchFilters');
    const editSavedSearch = sessionStorage.getItem('editSavedSearch');

    if (savedFilters) {
      try {
        const filtersObj = JSON.parse(savedFilters);
        setFilters(filtersObj);
        trigger('selection');
      } catch {
        console.error('Failed to parse saved search filters');
      } finally {
        sessionStorage.removeItem('applySavedSearchFilters');
      }
    }

    if (editSavedSearch) {
      try {
        const savedSearch = JSON.parse(editSavedSearch);
        const filtersObj = JSON.parse(savedSearch.filters_json);
        setFilters(filtersObj);
        setSaveSearchModalOpen(true);
        trigger('selection');
      } catch {
        console.error('Failed to parse edit saved search');
      } finally {
        sessionStorage.removeItem('editSavedSearch');
      }
    }
  }, [setFilters, trigger]);

  // Load geography data on mount
  useEffect(() => {
    backButton.hide();
    mainButton.hide();
    fetchRegions();
    fetchPropertyTypes();
    fetchOperationTypes();
  }, [fetchRegions, fetchPropertyTypes, fetchOperationTypes]);

  // Load cities when region changes (using store filters as source of truth)
  useEffect(() => {
    if (filters.region_id) {
      fetchCities(filters.region_id);
    }
  }, [filters.region_id, fetchCities]);

  // Load districts, neighborhoods, streets, metro when city changes (using store filters)
  useEffect(() => {
    if (filters.city_id) {
      fetchDistricts(filters.city_id);
      fetchNeighborhoods(filters.city_id);
      fetchStreets(filters.city_id);
      fetchMetroLines(filters.city_id);
    }
  }, [filters.city_id, fetchDistricts, fetchNeighborhoods, fetchStreets, fetchMetroLines]);

  // Update propertiesStore filters when local filter state changes
  const updateFilters = useCallback(
    (newFilters: Partial<PropertyFilterParams>) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // Handle operation change
  const handleOperationChange = useCallback(
    (operationId: number | undefined) => {
      trigger('selection');
      setOperation(operationId);
    },
    [trigger, setOperation]
  );

  // Handle rooms change
  const handleRoomsChange = useCallback(
    (roomsCount: number | undefined) => {
      trigger('selection');
      setFilters({ rooms_count: roomsCount });
    },
    [trigger, setFilters]
  );

  // Handle price range change
  const handlePriceChange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      trigger('selection');
      setFilters({
        price_byn_min: min,
        price_byn_max: max,
      });
    },
    [trigger, setFilters]
  );

  // Handle area range change
  const handleAreaChange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      trigger('selection');
      setFilters({
        total_area_min: min,
        total_area_max: max,
      });
    },
    [trigger, setFilters]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: string) => {
      trigger('selection');
      setFilters({ sort_by: sortBy as PropertyFilterParams['sort_by'] });
    },
    [trigger, setFilters]
  );

  // Handle search query change
  useEffect(() => {
    if (debouncedSearchQuery !== undefined) {
      // TODO: Backend doesn't currently support text search parameter (no 'q'/'search' in PropertyFilterParams)
      // When backend adds support, implement via setFilters({ search: debouncedSearchQuery || undefined })
    }
  }, [debouncedSearchQuery, setFilters]);

  // Reset all filters
  const handleResetAll = useCallback(() => {
    trigger('medium');
    setSearchQuery('');
    resetFilters();
  }, [trigger, resetFilters]);

  // Get active filter labels for chips
  const getFilterLabel = useCallback(
    (key: keyof PropertyFilterParams, value: unknown): string | null => {
      if (value === undefined || value === null || value === '') return null;

      switch (key) {
        case 'operation_id': {
          const op = operationTypes.find((o) => o.id === value);
          return op ? op.name : null;
        }
        case 'type_id': {
          const type = getPropertyTypeById(value as number);
          return type ? type.name : null;
        }
        case 'region_id': {
          const region = regions.find((r) => r.id === value);
          return region ? `Область: ${region.name}` : null;
        }
        case 'city_id': {
          const city = getCityById(value as number);
          return city ? `Город: ${city.name}` : null;
        }
        case 'district_id': {
          const district = getDistrictById(value as number);
          return district ? `Район: ${district.name}` : null;
        }
        case 'neighborhood_id': {
          const neighborhood = neighborhoods.find((n) => n.id === value);
          return neighborhood ? `Микрорайон: ${neighborhood.name}` : null;
        }
        case 'street_id': {
          const street = streets.find((s) => s.id === value);
          return street ? `Улица: ${street.name}` : null;
        }
        case 'metro_station_id': {
          const station = getMetroStationById(value as number);
          return station ? `Метро: ${station.name}` : null;
        }
        case 'rooms_count':
          return value === 5 ? '5+ комнат' : `${value} комн.`;
        case 'price_byn_min':
          return `От ${formatPriceByn(value as number, { compact: true })}`;
        case 'price_byn_max':
          return `До ${formatPriceByn(value as number, { compact: true })}`;
        case 'total_area_min':
          return `От ${formatArea(value as number)}`;
        case 'total_area_max':
          return `До ${formatArea(value as number)}`;
        case 'floor_min':
          return `Этаж от ${value}`;
        case 'floor_max':
          return `Этаж до ${value}`;
        case 'total_floors_min':
          return `Этажность от ${value}`;
        case 'total_floors_max':
          return `Этажность до ${value}`;
        case 'build_year_min':
          return `Год от ${value}`;
        case 'build_year_max':
          return `Год до ${value}`;
        case 'renovation':
          return `Ремонт: ${value}`;
        case 'furniture':
          return 'Мебель';
        case 'balcony':
          return 'Балкон';
        case 'parking':
          return 'Парковка';
        case 'elevator':
          return 'Лифт';
        case 'metro_distance_max':
          return `Метро до ${value} м`;
        default:
          return null;
      }
    },
    [operationTypes, regions, neighborhoods, streets, getCityById, getDistrictById, getPropertyTypeById, getMetroStationById]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (['page', 'page_size', 'sort_by', 'sort_order', 'with_photos_only', 'is_favorite_only'].includes(key)) {
        return false;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [filters]);

  // Extract unique renovation types from property types or use common ones
  const renovationTypes = useMemo(() => {
    // These would ideally come from backend, using common values for now
    return ['Без ремонта', 'Косметический', 'Евроремонт', 'Дизайнерский', 'Требует ремонта'];
  }, []);

  // Transform property types for filter UI
  const propertyTypesForFilter = useMemo(() => {
    return propertyTypes.map((t) => ({ id: t.id, name: t.name }));
  }, [propertyTypes]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(
    async (propertyId: number, _isFavorite: boolean) => {
      trigger('light');
      try {
        await toggleFavorite(propertyId);
        // Note: properties store will auto-refresh on filter changes,
        // or user can pull-to-refresh
      } catch {
        // Error already handled in store
      }
    },
    [trigger, toggleFavorite]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    hapticFeedback?.impactOccurred('light');
    loadMore();
  }, [loadMore, hapticFeedback]);

  // Handle retry
  const handleRetry = useCallback(() => {
    clearError();
    refresh();
  }, [clearError, refresh]);

  // Update main button when properties exist
  useEffect(() => {
    if (properties.length > 0) {
      mainButton.setParams({
        text: `Показать ещё ${Math.min(20, total - properties.length)} из ${total}`,
        is_visible: true,
        is_active: hasMore,
      });
      mainButton.show();
    } else {
      mainButton.hide();
    }
  }, [properties.length, total, hasMore, mainButton]);

  // Main button click handler
  const handleMainButtonClick = useCallback(() => {
    hapticFeedback?.impactOccurred('light');
    loadMore();
  }, [loadMore, hapticFeedback]);

  useEffect(() => {
    if (mainButton) {
      mainButton.onClick(handleMainButtonClick);
      return () => {
        mainButton.offClick(handleMainButtonClick);
      };
    }
  }, [mainButton, handleMainButtonClick]);

  // Current location display
  const currentCity = filters.city_id ? getCityById(filters.city_id) : null;
  const currentRegion = filters.region_id ? regions.find((r) => r.id === filters.region_id) : null;

  return (
    <div className="p-4 space-y-4 pb-24" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
      {/* Search Bar */}
      <div className="sticky top-4 z-10">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 flex-shrink-0"
            width="20"
            height="20"
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Что ищете?"
            className="w-full pl-12 pr-4 py-3 rounded-xl text-tg-text text-base"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              color: 'var(--tg-theme-text-color)',
            }}
            inputMode="search"
            autoComplete="off"
            aria-label="Поиск недвижимости"
          />
          {searchQuery && (
            <button
              onClick={() => {
                trigger('light');
                setSearchQuery('');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full flex-shrink-0"
              style={{ color: 'var(--tg-theme-hint-color)' }}
              aria-label="Очистить поиск"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Operation Toggle */}
      <div className="flex gap-2" role="group" aria-label="Тип сделки">
        {OPERATION_OPTIONS.map((op) => (
          <button
            key={op.id}
            onClick={() => handleOperationChange(op.id)}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
              filters.operation_id === op.id ? 'shadow-sm' : ''
            }`}
            style={{
              backgroundColor: filters.operation_id === op.id
                ? 'var(--tg-theme-button-color)'
                : 'var(--tg-theme-secondary-bg-color)',
              color: filters.operation_id === op.id
                ? 'var(--tg-theme-button-text-color)'
                : 'var(--tg-theme-text-color)',
              border: filters.operation_id !== op.id ? '1px solid var(--tg-theme-hint-color)' : 'none',
            }}
            aria-pressed={filters.operation_id === op.id}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Location Selector */}
      <button
        onClick={() => {
          trigger('light');
          setFilterBottomSheetOpen(true);
        }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          border: '1px solid var(--tg-theme-hint-color)',
        }}
        aria-haspopup="dialog"
        aria-label="Выбрать локацию"
      >
        <span style={{ color: 'var(--tg-theme-text-color)' }}>
          📍 {currentCity?.name || currentRegion?.name || 'Все Беларусь'}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Property Type Selector */}
      {propertyTypes.length > 0 && (
        <button
          onClick={() => {
            trigger('light');
            setFilterBottomSheetOpen(true);
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
          }}
          aria-haspopup="dialog"
          aria-label="Выбрать тип недвижимости"
        >
          <span style={{ color: 'var(--tg-theme-text-color)' }}>
            🏠 {filters.type_id ? getPropertyTypeById(filters.type_id)?.name || 'Тип недвижимости' : 'Тип недвижимости'}
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--tg-theme-hint-color)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Quick Filters */}
      <QuickFilters
        filters={filters}
        onRoomsChange={handleRoomsChange}
        onPriceChange={handlePriceChange}
        onAreaChange={handleAreaChange}
        onMoreFiltersClick={() => setFilterBottomSheetOpen(true)}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={(key) => {
          trigger('light');
          updateFilters({ [key]: undefined });
        }}
        getFilterLabel={getFilterLabel}
      />

      {/* Save Search Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            trigger('light');
            setSaveSearchModalOpen(true);
          }}
          className="w-full py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            border: '1px solid var(--tg-theme-hint-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Сохранить текущий поиск
        </button>
      </div>

      {/* Error State */}
      {error && <InlineError message={error} onDismiss={clearError} />}

      {/* Sort Selector & Result Count */}
      <div className="flex items-center justify-between">
        <span className="text-tg-text text-lg font-semibold">
          {total > 0 ? `Найдено: ${total}` : 'Результаты поиска'}
        </span>
        <SortSelector currentSort={filters.sort_by || 'created_at_desc'} onChange={handleSortChange} />
      </div>

      {/* Results */}
      {isLoading && properties.length === 0 ? (
        <ListSkeleton count={5} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="4" y1="4" x2="7.5" y2="7.5" />
            </svg>
          }
          title={searchQuery ? 'Ничего не найдено' : 'Настройте фильтры для поиска'}
          description={
            searchQuery
              ? (
                <>
                  По запросу «{searchQuery}» результатов нет.
                  <br />
                  Попробуйте изменить фильтры или поисковый запрос.
                </>
              )
              : (
                <>
                  Выберите параметры поиска и начните подбор недвижимости.
                  <br />
                  <span className="text-xs">
                    {currentCity?.name || currentRegion?.name || 'Все Беларусь'}, {filters.operation_id === 1 ? 'покупка' : 'аренда'}
                  </span>
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
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>

          {/* Load More / Pagination */}
          {hasMore && (
            <div className="pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                {isLoadingMore ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Загрузка...
                  </>
                ) : (
                  `Показать ещё ${Math.min(20, total - properties.length)} из ${total}`
                )}
              </button>
            </div>
          )}

          {!hasMore && properties.length > 0 && (
            <p className="text-center text-tg-hint text-sm py-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Все {total} объявлений загружены
            </p>
          )}
        </>
      )}

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterBottomSheetOpen}
        onClose={() => setFilterBottomSheetOpen(false)}
        filters={filters}
        onFiltersChange={updateFilters}
        propertyTypes={propertyTypesForFilter}
        renovationTypes={renovationTypes}
        onReset={handleResetAll}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Save Search Modal */}
      {saveSearchModalOpen && (
        <SavedSearchForm
          onClose={() => setSaveSearchModalOpen(false)}
          onSuccess={() => setSaveSearchModalOpen(false)}
        />
      )}

      {/* Footer info */}
      <p className="text-center text-tg-hint text-sm pt-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}
