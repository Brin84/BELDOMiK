import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { MONETIZATION_ENABLED } from '@/shared/lib/featureFlags';
import { AD_BANNERS, type AdBannerItem } from './banners';
import './AdBanner.css';

interface AdBannerProps {
  onBannerClick?: (bannerId: number) => void;
}

/** Слайды, доступные при текущих флагах: реклама BELDOMiK + (опционально) платные услуги. */
function visibleBanners(): AdBannerItem[] {
  return AD_BANNERS.filter((banner) => !banner.monetization || MONETIZATION_ENABLED);
}

/**
 * Карусель рекламных баннеров с автопрокруткой и свайпом.
 *
 * Слайд с картинкой (`banner.image`) рисует её фоном; если файл не загрузился,
 * показывается градиентная подложка с тем же текстом. Слайды с `overlay: false`
 * имеют текст, вшитый в картинку, — приложение его не дублирует.
 */
export function AdBanner({ onBannerClick }: AdBannerProps) {
  const { trigger } = useHaptics();
  const { openLink } = useTelegram();
  const navigate = useNavigate();

  const banners = visibleBanners();
  const count = banners.length;

  // Позиция слайда + направление движения
  const [adPos, setAdPos] = useState({ index: 0, dir: 1 });
  const [dragX, setDragX] = useState<number | null>(null);
  // Слайды, у которых картинка не загрузилась — рисуем градиент с текстом.
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number>(0);

  // Автопрокрутка
  useEffect(() => {
    if (count < 2) return;
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= count) {
          return { index: count - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };

    timerRef.current = window.setInterval(autoplay, 4000);
    return () => window.clearInterval(timerRef.current);
  }, [count]);

  // Свайп
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchIdRef.current = t.identifier;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    setDragX(0);
    window.clearInterval(timerRef.current);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;
    const touch = Array.from(e.touches).find((t) => t.identifier === touchIdRef.current);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      touchIdRef.current = null;
      touchStartRef.current = null;
      setDragX(null);
      return;
    }
    const width = e.currentTarget.clientWidth || 1;
    const limited = Math.max(-width * 0.4, Math.min(width * 0.4, dx));
    setDragX(limited);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchIdRef.current = null;
    touchStartRef.current = null;
    setDragX(null);
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - start.x : 0;
    const width = e.currentTarget.clientWidth || 1;
    if (dx <= -width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.min(index + 1, count - 1), dir: 1 }));
    } else if (dx >= width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.max(index - 1, 0), dir: -1 }));
    }
    // Restart autoplay
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= count) {
          return { index: count - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };
    timerRef.current = window.setInterval(autoplay, 4000);
  }, [count]);

  // Мышь
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragX(0);
    window.clearInterval(timerRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const width = e.currentTarget.clientWidth || 1;
    const limited = Math.max(-width * 0.4, Math.min(width * 0.4, dx));
    setDragX(limited);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragX(null);
    if (!start) return;
    const dx = e.clientX - start.x;
    const width = e.currentTarget.clientWidth || 1;
    if (dx <= -width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.min(index + 1, count - 1), dir: 1 }));
    } else if (dx >= width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.max(index - 1, 0), dir: -1 }));
    }
    // Restart autoplay
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= count) {
          return { index: count - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };
    timerRef.current = window.setInterval(autoplay, 4000);
  }, [count]);

  const handleImageError = useCallback((bannerId: number) => {
    setFailedImages((prev) => (prev[bannerId] ? prev : { ...prev, [bannerId]: true }));
  }, []);

  const handleBannerClick = (banner: AdBannerItem) => {
    trigger('light');
    onBannerClick?.(banner.id);
    if (!banner.href) return;
    // Внешняя ссылка (t.me/...) открывается через Telegram, внутренний путь —
    // через роутер приложения.
    if (banner.href.startsWith('http')) {
      openLink(banner.href);
    } else {
      navigate(banner.href);
    }
  };

  if (count === 0) return null;

  return (
    <section className="ad-banner" aria-label="Рекламные баннеры">
      <div
        className="ad-banner__track"
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
        {banners.map((banner) => {
          const showText = banner.overlay !== false || !banner.image || failedImages[banner.id];
          return (
            <div
              key={banner.id}
              className="ad-banner__slide"
              onClick={() => handleBannerClick(banner)}
            >
              {banner.image && !failedImages[banner.id] ? (
                <img
                  className="ad-banner__image"
                  src={banner.image}
                  alt={banner.title}
                  onError={() => handleImageError(banner.id)}
                />
              ) : (
                <div
                  className={`ad-banner__bg ad-banner__bg--${banner.gradient ?? 1}`}
                  aria-hidden="true"
                />
              )}
              {showText && (
                <div className="ad-banner__content">
                  <h3 className="ad-banner__title">{banner.title}</h3>
                  <p className="ad-banner__subtitle">{banner.subtitle}</p>
                  <button className="ad-banner__cta">{banner.cta}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="ad-banner__dots">
          {banners.map((banner, i) => (
            <span
              key={banner.id}
              className={`ad-banner__dot${i === adPos.index ? ' ad-banner__dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
