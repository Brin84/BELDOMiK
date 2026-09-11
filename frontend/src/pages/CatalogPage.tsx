import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Рекламные слайды карусели: 5 пастельных фонов под «место под рекламу». */
const AD_BANNER_BG: readonly string[] = [
  'linear-gradient(135deg, #eef4ff 0%, #dcebff 100%)',
  'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)',
  'linear-gradient(135deg, #f4f8ff 0%, #e9efff 100%)',
  'linear-gradient(135deg, #ecfdf5 0%, #d6f5e3 100%)',
  'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
];

export function CatalogPage() {
  const { trigger } = useHaptics();
  const { hapticFeedback } = useTelegram();
  const navigate = useNavigate();
  // Позиция слайда + направление движения. Автоскрол ходит туда-обратно
  // («влево-вправо»): дошёл до правого края → развернулся, затем к левому.
  const [adPos, setAdPos] = useState({ index: 0, dir: 1 });
  // Свайп: горизонтальный сдвиг ленты при перетаскивании пальцем (px).
  const [dragX, setDragX] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  // Тач-жест отслеживаем отдельно от мыши: идентификатор пальца + точка старта.
  const touchIdRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
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
    setLocalFavorite,
  } = usePropertiesStore();
  const {
    fetchRegions,
    fetchAllCities,
    fetchPropertyTypes,
    propertyTypes,
    getCityById,
  } = useGeographyStore();
  const { toggleFavorite, fetchFavoriteIds } = useFavoritesStore();

  // Initialize on mount
  useEffect(() => {
    fetchRegions();
    fetchPropertyTypes();
    // Синхронизируем набор избранного на входе: toggleFavorite определяет
    // направление по favoriteIds, и он должен совпадать с is_favorite карточек.
    fetchFavoriteIds();
    fetchProperties(true);
  }, [fetchRegions, fetchPropertyTypes, fetchFavoriteIds, fetchProperties]);

  // Автопрокрутка рекламной карусели: слайды едут влево и вправо —
  // на краях ленты направление разворачивается, 3.5s на баннер.
  // Таймер живёт в ref: ручной свайп перезапускает его — автоскрол
  // «не навязывается», но и не останавливается навсегда.
  const timerRef = useRef<number>(0);
  const restartAutoplay = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= AD_BANNER_BG.length) {
          return { index: AD_BANNER_BG.length - 2, dir: -1 };
        }
        if (next < 0) {
          return { index: 1, dir: 1 };
        }
        return { index: next, dir };
      });
    }, 3500);
  }, []);

  useEffect(() => {
    restartAutoplay();
    return () => window.clearInterval(timerRef.current);
  }, [restartAutoplay]);

  // Ручное переключение слайда (свайп). Направление автоскролла
  // выравнивается под движение пальца.
  const advance = useCallback((step: 1 | -1) => {
    setAdPos(({ index }) => {
      const next = index + step;
      if (next >= AD_BANNER_BG.length) {
        return { index: AD_BANNER_BG.length - 1, dir: -1 };
      }
      if (next < 0) {
        return { index: 0, dir: 1 };
      }
      return { index: next, dir: step };
    });
  }, []);

  // ----- Свайп пальцем (native touch) + drag мышью -----
  // Pointer events на части мобильных WebView ведут себя нестабильно
  // (жест отменяется, пока не установлен захват указателя), поэтому для
  // тача используем классические touch-события, для мыши — mouse.
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchIdRef.current = t.identifier;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    setDragX(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = Array.from(e.touches).find((t) => t.identifier === touchIdRef.current);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      // Вертикальный свайп — уступаем скроллу страницы.
      touchIdRef.current = null;
      touchStartRef.current = null;
      setDragX(null);
      return;
    }
    const width = e.currentTarget.clientWidth || 1;
    const limited = Math.max(-width * 0.4, Math.min(width * 0.4, dx));
    setDragX(limited);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchIdRef.current = null;
    touchStartRef.current = null;
    setDragX(null);
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - start.x : 0;
    const width = e.currentTarget.clientWidth || 1;
    if (dx <= -width * 0.2) advance(1);
    else if (dx >= width * 0.2) advance(-1);
    restartAutoplay();
  };

  // Мышь (desktop/тачпад): pointer-события не навешиваем, чтобы на телефонах
  // (там touch и pointer приходят вместе) жест не обрабатывался дважды.
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragX(0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const width = e.currentTarget.clientWidth || 1;
    const limited = Math.max(-width * 0.4, Math.min(width * 0.4, dx));
    setDragX(limited);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragX(null);
    if (!start) return;
    const dx = e.clientX - start.x;
    const width = e.currentTarget.clientWidth || 1;
    if (dx <= -width * 0.2) advance(1);
    else if (dx >= width * 0.2) advance(-1);
    restartAutoplay();
  };

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

        {/* BANNERS — автопрокручивающиеся рекламные баннеры */}
        <section className="catalog-banner" aria-label="Рекламные баннеры">
          <div
            className="catalog-banner__track"
            style={{
              transform:
                dragX === null
                  ? `translateX(-${adPos.index * 100}%)`
                  : `translateX(calc(-${adPos.index * 100}% + ${dragX}px))`,
              transition: dragX === null ? undefined : 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
                  i === adPos.index ? ' catalog-banner__dot--active' : ''
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