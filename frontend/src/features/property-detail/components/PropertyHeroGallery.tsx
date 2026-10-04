import { useState, useCallback, useRef, useEffect } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyHeroGalleryProps {
  photos: PropertyPhoto[];
}

/** Галерея фотографий с настоящим скроллом (как в Baraholka Apple Беларусь).
 *  Использует CSS scroll-snap для плавного перелистывания.
 *  В обычном режиме: только скролл, стрелок нет.
 *  В полноэкранном режиме: только скролл, миниатюры реагируют на скролл, стрелок нет. */
export function PropertyHeroGallery({ photos }: PropertyHeroGalleryProps) {
  const { trigger } = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const count = sorted.length;

  const goToIndex = useCallback(
    (index: number, scrollRef?: React.RefObject<HTMLDivElement>) => {
      if (count <= 1) return;
      trigger('light');
      setCurrentIndex(index);
      const ref = scrollRef || galleryRef;
      if (ref.current) {
        ref.current.scrollTo({
          left: index * ref.current.offsetWidth,
          behavior: 'smooth',
        });
      }
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

  // Сбрасываем состояние ошибки при смене фото
  useEffect(() => {
    setFailed(false);
  }, [currentIndex]);

  // Синхронизация при скролле в обычном режиме (Gallery)
  useEffect(() => {
    if (!galleryRef.current) return;

    const handleGalleryScroll = () => {
      const { offsetWidth, scrollLeft } = galleryRef.current!;
      const scrollIndex = Math.round(scrollLeft / offsetWidth);
      // Обновляем только если индекс изменился
      if (scrollIndex !== currentIndex) {
        setCurrentIndex(scrollIndex);
      }
    };

    const ref = galleryRef.current;
    ref.addEventListener('scroll', handleGalleryScroll, { passive: true });
    return () => ref.removeEventListener('scroll', handleGalleryScroll);
  }, []);

  // Синхронизация при скролле в полноэкранном режиме (Fullscreen)
  useEffect(() => {
    if (!isFullscreen || !fullscreenRef.current) return;

    const handleFullscreenScroll = () => {
      const { offsetWidth, scrollLeft } = fullscreenRef.current!;
      const scrollIndex = Math.round(scrollLeft / offsetWidth);
      // Обновляем только если индекс изменился
      if (scrollIndex !== currentIndex) {
        setCurrentIndex(scrollIndex);
      }
    };

    const ref = fullscreenRef.current;
    ref.addEventListener('scroll', handleFullscreenScroll, { passive: true });
    return () => ref.removeEventListener('scroll', handleFullscreenScroll);
  }, [isFullscreen]);

  // handleScroll удалён - слушатели добавляются через useEffect

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
        onClick={() => {
          trigger('light');
          setIsFullscreen(true);
        }}
        role="button"
        tabIndex={0}
        aria-label={`Фото ${currentIndex + 1} из ${count}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFullscreen(true);
          }
        }}
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
            ref={fullscreenRef}
            className="property-fullscreen__track"
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
            <div className="property-fullscreen__counter">
              {currentIndex + 1} / {count}
            </div>
          )}

          {/* Миниатюры внизу */}
          {count > 1 && (
            <div className="property-fullscreen__thumbnails" role="tablist" aria-label="Миниатюры фотографий">
              {sorted.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToIndex(index, fullscreenRef);
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
