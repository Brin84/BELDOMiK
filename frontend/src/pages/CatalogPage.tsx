import { useEffect, useCallback, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, House, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { CitySelectorSheet } from '@/features/geography/components/CitySelectorSheet';
import { useFavoritesStore } from '@/features/favorites';
import { PropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import { CATEGORIES, CategoryCard, MortgageCard } from '@/widgets/catalog/CategoryCard';

export function CatalogPage() {
  const { trigger } = useHaptics();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
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
    fetchRegions();
    fetchPropertyTypes();
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

  // Поиск по тексту — отправка введённого запроса на страницу поиска.
  const handleSearchSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      navigateWithFilters(q ? { q } : {});
    },
    [searchValue, navigateWithFilters]
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
  const operationLabel = currentOperationId === 1 ? 'Покупка' : 'Аренда';

  const handleFavoriteToggle = useCallback(
    async (propertyId: number) => {
      trigger('light');
      try {
        await toggleFavorite(propertyId);
        await fetchProperties(true);
      } catch {
        // Error already handled in store
      }
    },
    [trigger, toggleFavorite, fetchProperties]
  );

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <main className="mx-auto w-full max-w-[600px] px-5 pt-5">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg">
                <House size={25} />
              </div>
              <h1 className="text-[28px] font-extrabold tracking-tight">BELDOMiK</h1>
            </div>
            <p className="ml-1 mt-1 text-[15px] text-slate-400">Мини-приложение</p>
          </div>

          <button
            type="button"
            onClick={() => {
              trigger('light');
              navigate('/profile');
            }}
            aria-label="Меню"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
          >
            <span className="tracking-[0.15em] text-[18px] leading-none">•••</span>
          </button>
        </header>

        {/* SEARCH — настоящее поле ввода */}
        <form onSubmit={handleSearchSubmit} className="mt-6">
          <div
            className="flex h-[62px] items-center gap-4 rounded-[24px] border border-slate-200 bg-white px-5 shadow-[0_8px_25px_rgba(0,0,0,.05)]"
          >
            <Search size={27} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Что ищете?"
              enterKeyHint="search"
              className="w-full bg-transparent text-[18px] outline-none placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* OPERATION + LOCATION */}
        <div className="mt-6 flex items-center gap-3">
          <div
            className="flex flex-1 min-w-0 rounded-[24px] border border-slate-200 bg-white p-1.5 shadow-[0_8px_25px_rgba(0,0,0,.05)]"
            role="group"
            aria-label="Тип сделки"
          >
            <button
              type="button"
              onClick={() => handleOperationChange(1)}
              className={`flex-1 rounded-[18px] px-4 py-2.5 text-[15px] font-semibold transition-all ${
                currentOperationId === 1
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-500'
              }`}
              aria-pressed={currentOperationId === 1}
            >
              Купить
            </button>
            <button
              type="button"
              onClick={() => handleOperationChange(2)}
              className={`flex-1 rounded-[18px] px-4 py-2.5 text-[15px] font-semibold transition-all ${
                currentOperationId === 2
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-500'
              }`}
              aria-pressed={currentOperationId === 2}
            >
              Снять
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticFeedback?.impactOccurred('light');
              setIsCitySheetOpen(true);
            }}
            className="flex max-w-[40%] min-w-0 items-center gap-1.5 rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 text-[14px] font-medium text-slate-700 shadow-[0_8px_25px_rgba(0,0,0,.05)]"
            aria-label="Выбрать город"
          >
            <MapPin size={18} className="shrink-0 text-blue-500" />
            <span className="truncate">{currentCity?.name || 'Все Беларусь'}</span>
            <ChevronDown size={16} className="shrink-0 text-slate-400" />
          </button>
        </div>

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
        {error && <InlineError message={error} onDismiss={clearError} />}

        {/* CATEGORIES */}
        <section className="mt-5">
          <div className="grid grid-cols-2 gap-4" role="list" aria-label="Категории недвижимости">
            {CATEGORIES.map((category) => {
              const type = propertyTypes.find((t) => t.category === category.key);
              return (
                <CategoryCard
                  key={category.key}
                  title={category.title}
                  subtitle={operationLabel}
                  gradient={category.gradient}
                  icon={category.icon}
                  image={category.image}
                  onClick={() => {
                    if (type) handleCategoryClick(type.id);
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* MORTGAGE */}
        <MortgageCard
          onClick={() => {
            trigger('light');
            navigate('/mortgage');
          }}
        />

        {/* HOT OFFERS */}
        {hotProperties.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[23px] font-bold">Горячие предложения</h2>
              <button
                type="button"
                onClick={() => {
                  trigger('light');
                  navigateWithFilters({});
                }}
                className="flex items-center gap-1 text-blue-500"
              >
                Все
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {hotProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </section>
        )}

        {/* MAIN LISTINGS */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[23px] font-bold">
              {currentOperationId === 1 ? 'Квартиры и дома на продажу' : 'Квартиры и дома в аренду'}
            </h2>
            {total > 0 && (
              <span className="text-[15px] text-slate-400">{total} объявлений</span>
            )}
          </div>

          {isLoading && properties.length === 0 ? (
            <ListSkeleton count={5} />
          ) : properties.length === 0 ? (
            <EmptyState
              icon={
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-slate-400" style={{ opacity: 0.5 }}>
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
                    <span className="text-xs">Выбрано: {currentCity?.name || 'все города'}, {operationLabel.toLowerCase()}</span>
                  </>
                )
              }
              action={error ? { label: 'Повторить', onClick: handleRetry } : undefined}
            />
          ) : (
            <>
              <div className="space-y-4">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {properties.length > 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  Все {total} объявлений загружены
                </p>
              )}
            </>
          )}
        </section>

        {/* Footer info */}
        <p className="pt-8 text-center text-sm text-slate-400">
          BELDOMiK 🇧🇾 — недвижимость Беларуси
        </p>
      </main>
    </div>
  );
}