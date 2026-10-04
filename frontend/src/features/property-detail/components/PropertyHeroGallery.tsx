import { useState, useCallback, useRef, useEffect } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyHeroGalleryProps {
  photos: PropertyPhoto[];
}

/** Галерея фотографий с настоящим скроллом (как в Baraholka Apple Беларусь).
 *  Использует CSS scroll-snap для плавного перелистывания.
 *  В обычном режиме: только скролл, стрелок нет.
 *  В полноэкранном режиме: скролл + стрелки + миниатюры внизу. */
export function PropertyHeroGallery({ photos }: PropertyHeroGalleryProps) {
  const { trigger } = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const count = sorted.length;

  const goToIndex = useCallback(
    (index: number) => {
      if (count <= 1) return;
      trigger('light');
      setCurrentIndex(index);
      // Делаем scroll к нужной картинке
      setTimeout(() => {
        if (galleryRef.current) {
          galleryRef.current.scrollTo({
            left: index * galleryRef.current.offsetWidth,
            behavior: 'smooth',
          });
        }
      }, 50);
    },
    [count, trigger]
  );

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    const newIndex = (currentIndex + 1) % count;
    goToIndex(newIndex);
  }, [count, currentIndex, trigger, goToIndex]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    const newIndex = (currentIndex - 1 + count) % count;
    goToIndex(newIndex);
  }, [count, currentIndex, trigger, goToIndex]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [currentIndex]);

  // Синхронизация currentIndex с scroll позицией
  useEffect(() => {
    if (!galleryRef.current || isScrolling.current) return;
    const { offsetWidth } = galleryRef.current;
    const scrollIndex = Math.round(galleryRef.current.scrollLeft / offsetWidth);
    if (scrollIndex !== currentIndex) {
      setCurrentIndex(scrollIndex);
    }
  }, [currentIndex]);

  const handleScroll = useCallback(() => {
    if (!galleryRef.current) return;
    isScrolling.current = true;
    setTimeout(() => {
      isScrolling.current = false;
    }, 100);
  }, []);

  const handleImageLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setFailed(true);
  }, []);

  const handleSwipeClick = useCallback(
    (e: React.MouseEvent) => {
      if (count <= 1) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      if (clickX < width / 3) {
        goToPrev();
      } else if (clickX > (width / 3) * 2) {
        goToNext();
      }
    },
    [count, goToNext, goToPrev]
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

  return (
    <>
      {/* Обычный режим — скролл, без стрелок */}
      <div
        ref={galleryRef}
        className="property-gallery"
        onScroll={handleScroll}
        onClick={handleSwipeClick}
        role="group"
        aria-label={`Фото ${currentIndex + 1} из ${count}`}
      >
        <div className="property-gallery__track">
          {sorted.map((photo, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={photo.id}
                className="property-gallery__slide"
                aria-hidden={!isActive}
              >
                {failed ? (
                  <div className="property-gallery__placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={photo.url}
                    alt={`Фото ${index + 1} из ${count}`}
                    className="property-gallery__img"
                    style={{ opacity: loaded ? 1 : 0 }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                )}
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <div className="property-gallery__counter">
            {currentIndex + 1} / {count}
          </div>
        )}
      </div>

      {/* Полноэкранный просмотр с миниатюрами внизу */}
      {isFullscreen && (
        <div
          className="property-fullscreen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Полноэкранный просмотр фото"
        >
          <div
            ref={galleryRef}
            className="property-fullscreen__track"
            onScroll={handleScroll}
            onClick={handleSwipeClick}
          >
            {sorted.map((photo, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={photo.id}
                  className="property-fullscreen__slide"
                  aria-hidden={!isActive}
                >
                  {failed ? (
                    <div className="property-gallery__placeholder">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={photo.url}
                      alt={`Фото ${index + 1} из ${count}`}
                      className="property-fullscreen__img"
                      style={{ opacity: loaded ? 1 : 0 }}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  )}
                </div>
              );
            })}
          </div>

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

          {/* Стрелки навигации в полноэкранном режиме */}
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
