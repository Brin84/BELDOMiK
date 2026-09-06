import { useEffect, useCallback, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, House, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { CitySelectorSheet } from '@/features/geography/components/CitySelectorSheet';
import { useFavoritesStore } from '@/features/favorites';
import { HotPropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import { CATEGORIES, CategoryCard, MortgageCard } from '@/widgets/catalog/CategoryCard';

import './CatalogPage/CatalogPage.css';

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
    <div className="catalog-page">
      <main className="catalog-page__inner">
        {/* HEADER */}
        <header className="catalog-header">
          <div className="catalog-header__brand">
            <div className="catalog-header__logo">
              <House size={21} />
            </div>
            <div>
              <h1 className="catalog-header__title">BELDOMiK</h1>
              <p className="catalog-header__subtitle">Мини-приложение</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              trigger('light');
              navigate('/profile');
            }}
            aria-label="Меню"
            className="catalog-header__menu"
          >
            •••
          </button>
        </header>

        {/* SEARCH — настоящее поле ввода с кнопкой фильтров */}
        <form onSubmit={handleSearchSubmit} className="catalog-search">
          <div className="catalog-search__box">
            <Search size={22} className="catalog-search__icon" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Что ищете?"
              enterKeyHint="search"
              className="catalog-search__input"
            />
            <div className="catalog-search__divider" />
            <button
              type="button"
              onClick={() => navigateWithFilters({})}
              aria-label="Фильтры"
              className="catalog-search__filter"
            >
              <SlidersHorizontal size={19} />
            </button>
          </div>
        </form>

        {/* OPERATION + LOCATION */}
        <div className="catalog-location">
          <div className="catalog-operation" role="group" aria-label="Тип сделки">
            <button
              type="button"
              onClick={() => handleOperationChange(1)}
              className={`catalog-operation__btn ${
                currentOperationId === 1 ? 'catalog-operation__btn--active' : ''
              }`}
              aria-pressed={currentOperationId === 1}
            >
              Купить
            </button>
            <button
              type="button"
              onClick={() => handleOperationChange(2)}
              className={`catalog-operation__btn ${
                currentOperationId === 2 ? 'catalog-operation__btn--active' : ''
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
            className="catalog-city"
            aria-label="Выбрать город"
          >
            <MapPin size={16} className="catalog-city__icon" />
            <span className="catalog-city__name">{currentCity?.name || 'Все Беларусь'}</span>
            <ChevronDown size={14} className="catalog-city__chevron" />
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
        <section className="catalog-categories" role="list" aria-label="Категории недвижимости">
          {CATEGORIES.map((category) => {
            const type = propertyTypes.find((t) => t.category === category.key);
            return (
              <CategoryCard
                key={category.key}
                title={category.title}
                image={category.image}
                onClick={() => {
                  if (type) handleCategoryClick(type.id);
                  else trigger('light');
                }}
              />
            );
          })}
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
          <section className="catalog-section">
            <div className="catalog-section__head">
              <h2 className="catalog-section__title">Горячие предложения</h2>
              <button
                type="button"
                onClick={() => {
                  trigger('light');
                  navigateWithFilters({});
                }}
                className="catalog-section__link"
              >
                Все
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="catalog-section__list">
              {hotProperties.map((property) => (
                <HotPropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteToggle={handleFavoriteToggle}
                  showTime
                />
              ))}
            </div>
          </section>
        )}

        {/* MAIN LISTINGS */}
        <section className="catalog-section">
          <div className="catalog-section__head">
            <h2 className="catalog-section__title">
              {currentOperationId === 1 ? 'Квартиры и дома на продажу' : 'Квартиры и дома в аренду'}
            </h2>
            {total > 0 && (
              <span className="catalog-section__count">{total} объявлений</span>
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
              <div className="catalog-section__list">
                {properties.map((property) => (
                  <HotPropertyCard
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
        <p className="catalog-footer">
          BELDOMiK 🇧🇾 — недвижимость Беларуси
        </p>
      </main>
    </div>
  );
}