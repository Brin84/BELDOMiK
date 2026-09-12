import { useState, useCallback, useRef, useEffect } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyHeroGalleryProps {
  photos: PropertyPhoto[];
}

/** Полноширинная галерея в стиле Krisha: фото на весь экран по ширине,
 *  счётчик «N / M», стрелки на десктопе, свайп и полноэкранный просмотр. */
export function PropertyHeroGallery({ photos }: PropertyHeroGalleryProps) {
  const { trigger } = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(0);

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const count = sorted.length;

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setCurrentIndex((p) => (p + 1) % count);
  }, [count, trigger]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setCurrentIndex((p) => (p - 1 + count) % count);
  }, [count, trigger]);

  // Сброс состояния при смене фото
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [currentIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (count <= 1) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToNext();
        else goToPrev();
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
    return (
      <img
        src={current.url}
        alt={`Фото ${currentIndex + 1} из ${count}`}
        className={fullscreen ? 'property-fullscreen__img' : 'property-gallery__img'}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    );
  };

  return (
    <>
      <div
        className="property-gallery"
        onTouchStart={handleTouchStart}
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

      {/* Полноэкранный просмотр */}
      {isFullscreen && (
        <div
          className="property-fullscreen"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Полноэкранный просмотр фото"
        >
          {renderImage(true)}
          {count > 1 && (
            <div className="property-gallery__counter" style={{ top: 'auto', bottom: 20, right: '50%', transform: 'translateX(50%)' }}>
              {currentIndex + 1} / {count}
            </div>
          )}
          <button
            type="button"
            className="property-fullscreen__close"
            aria-label="Закрыть"
            onClick={() => setIsFullscreen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
        </div>
      )}
    </>
  );
}
