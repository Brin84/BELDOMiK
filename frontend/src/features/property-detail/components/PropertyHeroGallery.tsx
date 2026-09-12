import { useState, useCallback, useRef, useEffect } from 'react';
import type { PropertyPhoto } from '@/shared/api/types';
import { useHaptics } from '@/shared/lib/haptics';

interface PropertyHeroGalleryProps {
  photos: PropertyPhoto[];
}

/** Kufar-стиль: сетка 3×2 с ключевым фото на весь ряд + полноэкранный просмотр. */
export function PropertyHeroGallery({ photos }: PropertyHeroGalleryProps) {
  const { trigger } = useHaptics();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsIndex, setFsIndex] = useState(0);
  const [failedSet, setFailedSet] = useState<Set<number>>(new Set());
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const count = sorted.length;

  const markFailed = useCallback((i: number) => {
    setFailedSet((prev) => new Set(prev).add(i));
  }, []);

  const markLoaded = useCallback((i: number) => {
    setLoadedSet((prev) => new Set(prev).add(i));
  }, []);

  // Сброс состояний при смене фото в фуллскрине
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isFullscreen]);

  const goToNext = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setFsIndex((p) => (p + 1) % count);
  }, [count, trigger]);

  const goToPrev = useCallback(() => {
    if (count <= 1) return;
    trigger('light');
    setFsIndex((p) => (p - 1 + count) % count);
  }, [count, trigger]);

  const openFs = useCallback((idx: number) => {
    trigger('light');
    setFsIndex(idx);
    setIsFullscreen(true);
  }, [trigger]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isFullscreen, goToNext, goToPrev]);

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

  // ─── Пустая галерея ────────────────────────────────────────
  if (count === 0) {
    return (
      <div className="kg-gallery" role="img" aria-label="Фотографий нет">
        <div className="kg-gallery__placeholder">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
      </div>
    );
  }

  // ─── Ключевое фото (первое) — занимает весь верхний ряд ──────
  const heroPhoto = sorted[0];
  const restPhotos = sorted.slice(1, 7); // максимум 5 остальных → сетка 2+3

  return (
    <>
      <div className="kg-gallery">
        {/* Ключевое фото */}
        <div
          className="kg-gallery__hero"
          onClick={() => openFs(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFs(0); } }}
          aria-label={`Открыть фото 1 из ${count}`}
        >
          {failedSet.has(0) ? (
            <div className="kg-gallery__placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
          ) : (
            <img
              src={heroPhoto.url}
              alt="Фото 1"
              className="kg-gallery__img"
              style={{ opacity: loadedSet.has(0) ? 1 : 0 }}
              onLoad={() => markLoaded(0)}
              onError={() => markFailed(0)}
            />
          )}
          {count > 1 && (
            <span className="kg-gallery__counter">{count} фото</span>
          )}
        </div>

        {/* Сетка остальных фото */}
        {restPhotos.length > 0 && (
          <div className="kg-gallery__grid">
            {restPhotos.map((photo, i) => {
              const idx = i + 1;
              const isLast = i === restPhotos.length - 1 && count > 6;
              return (
                <div
                  key={photo.id}
                  className="kg-gallery__cell"
                  onClick={() => openFs(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFs(idx); } }}
                >
                  {failedSet.has(idx) ? (
                    <div className="kg-gallery__placeholder kg-gallery__placeholder--sm">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={photo.url}
                      alt={`Фото ${idx + 1}`}
                      className="kg-gallery__img"
                      style={{ opacity: loadedSet.has(idx) ? 1 : 0 }}
                      onLoad={() => markLoaded(idx)}
                      onError={() => markFailed(idx)}
                    />
                  )}
                  {isLast && count > 6 && (
                    <span className="kg-gallery__more">+{count - 6}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Полноэкранный просмотр */}
      {isFullscreen && (
        <div
          className="kg-fs"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Полноэкранный просмотр фото"
        >
          {failedSet.has(fsIndex) ? (
            <div className="kg-fs__placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
          ) : (
            <img
              src={sorted[fsIndex].url}
              alt={`Фото ${fsIndex + 1}`}
              className="kg-fs__img"
            />
          )}

          <button
            type="button"
            className="kg-fs__close"
            aria-label="Закрыть"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {count > 1 && (
            <div className="kg-fs__counter">{fsIndex + 1} / {count}</div>
          )}

          {count > 1 && (
            <>
              <button
                type="button"
                className="kg-fs__arrow kg-fs__arrow--prev"
                aria-label="Предыдущее фото"
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="kg-fs__arrow kg-fs__arrow--next"
                aria-label="Следующее фото"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
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
