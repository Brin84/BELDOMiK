import { useState, useCallback, useRef, useEffect } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyHeroGalleryProps {
  photos: PropertyPhoto[];
}

/** Полноширинная галерея в стиле Krisha: фото на весь экран по ширине,
 *  счётчик «N / M», стрелки на десктопе, свайп и полноэкранный просмотр.
 *  В полноэкранном режиме внизу — миниатюры всех фото, активное подсвечено. */
export function PropertyHeroGallery({ photos }: PropertyHeroGalleryProps) {
  const { trigger } = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<0 | 1 | -1>(0);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeOffset = useRef(0);

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const count = sorted.length;

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setSwipeDirection(1);
    setSwipeProgress(1);
    setTimeout(() => {
      setCurrentIndex((p) => (p + 1) % count);
      setSwipeProgress(0);
      setSwipeDirection(0);
    }, 200);
  }, [count, trigger]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setSwipeDirection(-1);
    setSwipeProgress(-1);
    setTimeout(() => {
      setCurrentIndex((p) => (p - 1 + count) % count);
      setSwipeProgress(0);
      setSwipeDirection(0);
    }, 200);
  }, [count, trigger]);

  const goToIndex = useCallback(
    (index: number) => {
      if (count <= 1) return;
      trigger('light');
      setCurrentIndex(index);
    },
    [count, trigger]
  );

  // Сброс состояния при смене фото
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setSwipeProgress(0);
    setSwipeDirection(0);
  }, [currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isFullscreen || count <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeOffset.current = 0;
    setSwiping(true);
  }, [isFullscreen, count]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isFullscreen || count <= 1 || !swiping) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;
    // Если движение в основном горизонтальное — блокируем вертикальную прокрутку
    if (Math.abs(diffX) > Math.abs(diffY)) {
      e.preventDefault();
      const progress = Math.max(-1, Math.min(1, diffX / 150));
      setSwipeProgress(progress);
      setSwipeDirection(progress > 0 ? 1 : -1);
    }
  }, [isFullscreen, count, swiping]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isFullscreen || count <= 1 || !swiping) return;
      setSwiping(false);
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      // Если свайп достаточно значимый — перелистываем
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 2) {
        if (diffX > 0) goToNext();
        else goToPrev();
      } else {
        // Возвращаем в нулевое положение
        setSwipeProgress(0);
        setSwipeDirection(0);
      }
    },
    [isFullscreen, count, goToNext, goToPrev, swiping]
  );

  const handleSwipeClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isFullscreen || count <= 1) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      if (clickX < width / 3) {
        goToPrev();
      } else if (clickX > (width / 3) * 2) {
        goToNext();
      }
    },
    [isFullscreen, count, goToNext, goToPrev]
  );

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, goToNext, goToPrev]);

  if (count === 0) {
    return (
      <div className="property-gallery" role="img" aria-label="Фотографий нет">
        <div className="property-gallery__placeholder">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
      </div>
    );
  }

  const current = sorted[currentIndex];

  const renderImage = (fullscreen: boolean) => {
    if (failed) {
      return (
        <div className="property-gallery__placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
      );
    }

    // Анимация свайпа для полноэкранного режима
    let transformStyle = '';
    if (fullscreen && swipeDirection !== 0) {
      const translateX = swipeProgress * (swipeDirection > 0 ? -100 : 100);
      transformStyle = `translateX(${translateX}%)`;
    }

    return (
      <img
        src={current.url}
        alt={`Фото ${currentIndex + 1} из ${count}`}
        className={fullscreen ? 'property-fullscreen__img' : 'property-gallery__img'}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
          transform: transformStyle,
          transitionDuration: swipeDirection !== 0 ? '0ms' : '250ms',
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    );
  };

  return (
    <>
      {/* Обычный режим */}
      <div
        className="property-gallery"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          trigger('light');
          setIsFullscreen(true);
        }}
        role="button"
        tabIndex={0}
        aria-label={count > 1 ? `Фото ${currentIndex + 1} из ${count}` : 'Фотография объекта'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFullscreen(true);
          }
        }}
      >
        {renderImage(false)}

        {count > 1 && (
          <div className="property-gallery__counter">
            {currentIndex + 1} / {count}
          </div>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              className="property-gallery__arrow property-gallery__arrow--prev"
              aria-label="Предыдущее фото"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="property-gallery__arrow property-gallery__arrow--next"
              aria-label="Следующее фото"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Полноэкранный просмотр с миниатюрами внизу */}
      {isFullscreen && (
        <div
          className="property-fullscreen"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleSwipeClick}
          role="dialog"
          aria-modal="true"
          aria-label="Полноэкранный просмотр фото"
        >
          {renderImage(true)}

          {/* Кнопка закрытия */}
          <button
            type="button"
            className="property-fullscreen__close"
            aria-label="Закрыть"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(false);
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Счётчик */}
          {count > 1 && (
            <div className="property-gallery__counter" style={{ top: 'auto', bottom: 20, right: '50%', transform: 'translateX(50%)' }}>
              {currentIndex + 1} / {count}
            </div>
          )}

          {/* Стрелки навигации */}
          {count > 1 && (
            <>
              <button
                type="button"
                className="property-fullscreen__arrow property-fullscreen__arrow--prev"
                aria-label="Предыдущее фото"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="property-fullscreen__arrow property-fullscreen__arrow--next"
                aria-label="Следующее фото"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>
            </>
          )}

          {/* Миниатюры внизу */}
          {count > 1 && (
            <div className="property-fullscreen__thumbnails" role="tablist" aria-label="Миниатюры фотографий">
              {sorted.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToIndex(index);
                  }}
                  className={`property-fullscreen__thumbnail ${
                    index === currentIndex ? 'property-fullscreen__thumbnail--active' : ''
                  }`}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Фото ${index + 1}`}
                >
                  <img
                    src={photo.thumbnail_url || photo.url}
                    alt=""
                    loading="lazy"
                    className="property-fullscreen__thumbnail-img"
                    onError={(e) => {
                      e.currentTarget.src = photo.url;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
