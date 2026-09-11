import { useEffect, useCallback, useState } from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useFavoritesStore } from '@/features/favorites';
import { HotPropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import { CATEGORIES, CategoryCard, MortgageCard } from '@/widgets/catalog/CategoryCard';

import beldomikAvatar from '@/assets/beldomik-avatar.webp';

import './CatalogPage/CatalogPage.css';

/** Рекламные слайды: фон меняется, надпись неизменна — «место под рекламу». */
const AD_BANNER_BG: readonly string[] = [
  'linear-gradient(135deg, #eef4ff 0%, #dcebff 100%)',
  'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)',
  'linear-gradient(135deg, #f4f8ff 0%, #e9efff 100%)',
];

export function CatalogPage() {
  const { trigger } = useHaptics();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const [adIndex, setAdIndex] = useState(0);
  const {
    properties,
    hotProperties,
    isLoading,
    error,
    total,
    filters,
    fetchProperties,
    setOperation,
    refresh,
    clearError,
  } = usePropertiesStore();
  const {
    fetchRegions,
    fetchAllCities,
    fetchPropertyTypes,
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

  // Автопрокрутка рекламных баннеров (цикл по слайдам).
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAdIndex((i) => (i + 1) % AD_BANNER_BG.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

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

  // If a city filter is already active (e.g. returning from /search), make sure
  // the city name resolves and the selector can render it.
  useEffect(() => {
    if (filters.city_id) {
      fetchAllCities();
    }
  }, [filters.city_id, fetchAllCities]);

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
              <img
                src={beldomikAvatar}
                alt="BELDOMiK"
                className="catalog-header__avatar"
                draggable={false}
              />
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

        {/* BANNERS — автопрокручивающиеся рекламные баннеры */}
        <section className="catalog-banner" aria-label="Рекламные баннеры">
          <div
            className="catalog-banner__track"
            style={{ transform: `translateX(-${adIndex * 100}%)` }}
          >
            {AD_BANNER_BG.map((bg, i) => (
              <div key={i} className="catalog-banner__slide" style={{ background: bg }}>
                <span className="catalog-banner__label">Здесь может быть Ваша реклама</span>
              </div>
            ))}
          </div>
          <div className="catalog-banner__dots">
            {AD_BANNER_BG.map((_, i) => (
              <span
                key={i}
                className={`catalog-banner__dot${
                  i === adIndex ? ' catalog-banner__dot--active' : ''
                }`}
              />
            ))}
          </div>
        </section>

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
              navigate('/regions');
            }}
            className="catalog-city"
            aria-label="Выбрать область и город"
          >
            <Globe size={20} className="catalog-city__icon" />
          </button>
        </div>

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