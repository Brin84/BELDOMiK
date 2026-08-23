import { useState, useCallback, useEffect, useRef } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyPhotoGalleryProps {
  photos: PropertyPhoto[];
  className?: string;
}

export function PropertyPhotoGallery({ photos, className = '' }: PropertyPhotoGalleryProps) {
  const { trigger } = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);
  const mainImageRef = useRef<HTMLDivElement>(null);

  const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  }, []);

  const handleImageError = useCallback((index: number) => {
    setFailedImages(prev => new Set([...prev, index]));
  }, []);

  const goToNext = useCallback(() => {
    if (sortedPhotos.length <= 1) return;
    trigger('light');
    setCurrentIndex(prev => (prev + 1) % sortedPhotos.length);
  }, [sortedPhotos.length, trigger]);

  const goToPrev = useCallback(() => {
    if (sortedPhotos.length <= 1) return;
    trigger('light');
    setCurrentIndex(prev => (prev - 1 + sortedPhotos.length) % sortedPhotos.length);
  }, [sortedPhotos.length, trigger]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (sortedPhotos.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  }, [sortedPhotos.length, goToNext, goToPrev]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [goToPrev, goToNext, isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, handleKeyDown]);

  if (sortedPhotos.length === 0) {
    return (
      <div
        className={`aspect-[4/3] bg-tg-secondary-bg rounded-2xl overflow-hidden flex items-center justify-center ${className}`}
        role="img"
        aria-label="Фотографий нет"
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.3 }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      </div>
    );
  }

  const currentPhoto = sortedPhotos[currentIndex];

  return (
    <div className={className}>
      {/* Main Photo */}
      <div
        ref={mainImageRef}
        className="relative aspect-[4/3] bg-tg-secondary-bg rounded-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => sortedPhotos.length > 1 && setIsFullscreen(true)}
        role="button"
        tabIndex={0}
        aria-label={sortedPhotos.length > 1 ? `Фото ${currentIndex + 1} из ${sortedPhotos.length}. Нажмите для полноэкранного просмотра` : 'Фотография объекта'}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && sortedPhotos.length > 1) {
            e.preventDefault();
            setIsFullscreen(true);
          }
        }}
      >
        {failedImages.has(currentIndex) ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-tg-hint" style={{ opacity: 0.3 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
        ) : (
          <>
            <img
              src={currentPhoto.url}
              alt={`Фото ${currentIndex + 1} из ${sortedPhotos.length}`}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                loadedImages.has(currentIndex) ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => handleImageLoad(currentIndex)}
              onError={() => handleImageError(currentIndex)}
            />
            {!loadedImages.has(currentIndex) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-tg-hint border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--tg-theme-hint-color)' }} />
              </div>
            )}
          </>
        )}

        {/* Photo counter */}
        {sortedPhotos.length > 1 && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
            }}
          >
            {currentIndex + 1} / {sortedPhotos.length}
          </div>
        )}

        {/* Navigation arrows for desktop */}
        {sortedPhotos.length > 1 && !isFullscreen && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                backdropFilter: 'blur(4px)',
              }}
              aria-label="Предыдущее фото"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                backdropFilter: 'blur(4px)',
              }}
              aria-label="Следующее фото"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}

        {/* Fullscreen navigation arrows */}
        {isFullscreen && sortedPhotos.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-50"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Предыдущее фото"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-50"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Следующее фото"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}

        {/* Close button in fullscreen */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              backdropFilter: 'blur(8px)',
            }}
            aria-label="Закрыть полноэкранный режим"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {sortedPhotos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Миниатюры фотографий">
          {sortedPhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => {
                trigger('light');
                setCurrentIndex(index);
              }}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                index === currentIndex
                  ? 'border-tg-button'
                  : 'border-transparent hover:border-tg-hint'
              }`}
              style={{
                borderColor: index === currentIndex ? 'var(--tg-theme-button-color)' : 'transparent',
              }}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Фото ${index + 1}`}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = photo.url;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}