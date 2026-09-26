import { useCallback, useEffect, useMemo } from 'react';
import { ChevronRight, Globe, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useGeographyStore } from '@/features/geography/geographyStore';
import { useFavoritesStore } from '@/features/favorites';
import { HotPropertyCard } from '@/entities/property';
import { ListSkeleton, EmptyState, InlineError } from '@/shared/ui';
import { CATEGORIES, CategoryCard } from '@/widgets/catalog/CategoryCard';
import { AdBanner } from '@/features/banners/AdBanner';

import beldomikAvatar from '@/assets/beldomik-avatar.webp';

import './CatalogPage/CatalogPage.css';

// Популярные города под кнопками категорий. id подставляются из загруженного
// справочника городов (fetchAllCities) по названию — хардкода идентификаторов нет.
const POPULAR_CITIES = ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв'] as const;

export function CatalogPage() {
  const { trigger } = useHaptics();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  const {
    properties,
    hotProperties,
    isLoading,
    error,
    total,
    filters,
    setOperation,
    setFilters,
    refresh,
    clearError,
    setLocalFavorite,
    resetFilters,
  } = usePropertiesStore();
  const {
    fetchRegions,
    fetchAllCities,
    fetchPropertyTypes,
    propertyTypes,
    cities,
    getCityById,
  } = useGeographyStore();
  const { toggleFavorite, fetchFavoriteIds } = useFavoritesStore();

  // Initialize on mount
  useEffect(() => {
    fetchRegions();
    fetchPropertyTypes();
    // Города нужны для блока популярных городов — тот же кэш, что и шторка
    // выбора города (guard в store пропускает повторную загрузку).
    fetchAllCities();
    // Синхронизируем набор избранного на входе: toggleFavorite определяет
    // направление по favoriteIds, и он должен совпадать с is_favorite карточек.
    fetchFavoriteIds();
    // Сброс фильтров при входе в каталог. resetFilters() сам вызывает
    // fetchProperties(true); отдельный вызов здесь давал два параллельных
    // запроса — первый абортился и сбрасывал isLoading у второго, из-за чего
    // каталог успевал отрисовать «Объявлений не найдено» вместо списка.
    resetFilters();
  }, [fetchRegions, fetchAllCities, fetchPropertyTypes, fetchFavoriteIds, resetFilters]);

  // Категория фильтрует выдачу на месте, не уводя со страницы: редирект
  // '/' → '/catalog' перемонтировал каталог, и resetFilters() на монтировании
  // стирал выбранную категорию. Повторный тап по активной категории снимает
  // фильтр и снова показывает все объявления.
  const handleCategoryClick = useCallback(
    (typeId: number) => {
      trigger('light');
      setFilters({ type_id: filters.type_id === typeId ? undefined : typeId });
    },
    [trigger, setFilters, filters.type_id]
  );

  // Популярные города фильтруют по city_id тем же механизмом, что и шторка
  // выбора города: повторный тап по активному городу снимает фильтр.
  const handleCityClick = useCallback(
    (cityId: number) => {
      trigger('light');
      setFilters({ city_id: filters.city_id === cityId ? undefined : cityId });
    },
    [trigger, setFilters, filters.city_id]
  );

  // id популярных городов из загруженного справочника. Город, которого нет в
  // списке (справочник ещё не загружен), просто не рисуем.
  const popularCities = useMemo(
    () =>
      POPULAR_CITIES.map((name) => cities.find((city) => city.name === name)).filter(
        (city): city is NonNullable<typeof city> => city !== undefined
      ),
    [cities]
  );

  // If a city filter is already active (e.g. returning from /), make sure
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

  // Активная категория — по type_id в фильтрах. Проверка на undefined нужна:
  // без неё совпадение с id первой категории подсветило бы её, пока типы
  // ещё не загружены и все id равны undefined.
  const activeCategory =
    filters.type_id === undefined
      ? undefined
      : CATEGORIES.find(
          (category) =>
            propertyTypes.find((type) => type.category === category.key)?.id ===
            filters.type_id
        );

  const categoriesClassName = 'catalog-categories';

  const defaultSectionTitle =
    currentOperationId === 1
      ? 'Квартиры и дома на продажу'
      : 'Квартиры и дома в аренду';
  const sectionTitle = activeCategory ? activeCategory.title : defaultSectionTitle;

  const cityLabel = currentCity ? currentCity.name : 'все города';
  const selectionLabel = activeCategory
    ? activeCategory.title + ', ' + cityLabel + ', ' + operationLabel.toLowerCase()
    : cityLabel + ', ' + operationLabel.toLowerCase();

  const handleFavoriteToggle = useCallback(
    async (propertyId: number) => {
      trigger('light');
      // Направление считаем по favoriteIds — тому же источнику, что читает
      // toggleFavorite: карточка рисует по property.is_favorite, и эти два
      // источника должны совпадать, чтобы сердце не «съезжало».
      const wasFavorite = useFavoritesStore.getState().favoriteIds.has(propertyId);
      try {
        await toggleFavorite(propertyId);
        // Обновляем флаг локально, без перезагрузки всего каталога:
        // fetchProperties(true) раньше обнулял список и мигал скелетоном.
        setLocalFavorite(propertyId, !wasFavorite);
      } catch {
        // Error already handled in store
      }
    },
    [trigger, toggleFavorite, setLocalFavorite]
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

        {/* SEARCH — вход в поиск с главной страницы (над баннерами).
            В нижней навигации отдельной вкладки «Поиск» больше нет. */}
        <button
          type="button"
          onClick={() => {
            trigger('light');
            navigate('/');
          }}
          className="catalog-search"
          aria-label="Поиск по каталогу"
        >
          <Search size={18} className="catalog-search__icon" />
          <span className="catalog-search__placeholder">Поиск: город, метро, цена…</span>
        </button>

        {/* BANNERS — рекламные баннеры */}
        <AdBanner />

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

        {/* CATEGORIES — квадратные кнопки с иконками */}
        <section className={categoriesClassName} aria-label="Категории недвижимости">
          {CATEGORIES.map((category) => {
            const type = propertyTypes.find((t) => t.category === category.key);
            const isActive = activeCategory?.key === category.key;
            return (
              <CategoryCard
                key={category.key}
                title={category.title}
                icon={category.icon}
                active={isActive}
                onClick={() => {
                  if (type) handleCategoryClick(type.id);
                  else trigger('light');
                }}
              />
            );
          })}
        </section>

        {/* POPULAR CITIES — популярные города под категориями */}
        {popularCities.length > 0 && (
          <section className="catalog-cities" aria-label="Популярные города">
            {popularCities.map((city) => {
              const isActive = filters.city_id === city.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCityClick(city.id)}
                  className={`city-chip${isActive ? ' city-chip--active' : ''}`}
                  aria-pressed={isActive}
                >
                  {city.name}
                </button>
              );
            })}
          </section>
        )}

        {/* HOT OFFERS */}
        {hotProperties.length > 0 && (
          <section className="catalog-section">
            <div className="catalog-section__head">
              <h2 className="catalog-section__title">Горячие предложения</h2>
              <button
                type="button"
                onClick={() => {
                  trigger('light');
                  resetFilters();
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
            <h2 className="catalog-section__title">{sectionTitle}</h2>
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
                    <span className="text-xs">Выбрано: {selectionLabel}</span>
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
