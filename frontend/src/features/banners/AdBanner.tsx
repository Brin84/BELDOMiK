import { useState, useEffect, useCallback, useRef } from 'react';

/** Карточка рекламного баннера с призывом к действию. */
interface AdBannerItem {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
}

// Альтернативные заглушки с плейсхолдерами
const AD_BANNERS: readonly AdBannerItem[] = [
  {
    id: 1,
    image: 'https://placehold.co/600x200/4c91ff/ffffff?text=Реклама+на+BELDOMiK&font=roboto',
    title: 'Реклама на BELDOMiK',
    subtitle: 'Покажите свой объект тысячам пользователей',
    cta: 'Разместить рекламу',
  },
  {
    id: 2,
    image: 'https://placehold.co/600x200/2171ee/ffffff?text=Ваше+объявление+здесь&font=roboto',
    title: 'Продвижение объявлений',
    subtitle: 'Больше просмотров - быстрее продажа',
    cta: 'Узнать больше',
  },
  {
    id: 3,
    image: 'https://placehold.co/600x200/10b981/ffffff?text=Промо+акции&font=roboto',
    title: 'Специальные предложения',
    subtitle: 'Акция для агентств недвижимости',
    cta: 'Подать заявку',
  },
  {
    id: 4,
    image: 'https://placehold.co/600x200/f59e0b/ffffff?text=BELDOMiK+PRO&font=roboto',
    title: 'PRO подписка',
    subtitle: 'Неограниченное количество объявлений',
    cta: 'Оформить PRO',
  },
  {
    id: 5,
    image: 'https://placehold.co/600x200/8b5cf6/ffffff?text=Сотрудничество&font=roboto',
    title: 'Партнерская программа',
    subtitle: 'Зарабатывайте с BELDOMiK',
    cta: 'Стать партнером',
  },
];

interface AdBannerProps {
  onBannerClick?: (bannerId: number) => void;
}

/** Рекламная карусель баннеров с автопрокруткой. */
export function AdBanner({ onBannerClick }: AdBannerProps) {
  // Позиция слайда + направление движения
  const [adPos, setAdPos] = useState({ index: 0, dir: 1 });
  const [dragX, setDragX] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number>(0);

  // Автопрокрутка
  useEffect(() => {
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= AD_BANNERS.length) {
          return { index: AD_BANNERS.length - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };

    timerRef.current = window.setInterval(autoplay, 4000);
    return () => window.clearInterval(timerRef.current);
  }, [AD_BANNERS.length]);

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
      setAdPos(({ index }) => ({ index: Math.min(index + 1, AD_BANNERS.length - 1), dir: 1 }));
    } else if (dx >= width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.max(index - 1, 0), dir: -1 }));
    }
    // Restart autoplay
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= AD_BANNERS.length) {
          return { index: AD_BANNERS.length - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };
    timerRef.current = window.setInterval(autoplay, 4000);
  }, []);

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
      setAdPos(({ index }) => ({ index: Math.min(index + 1, AD_BANNERS.length - 1), dir: 1 }));
    } else if (dx >= width * 0.2) {
      setAdPos(({ index }) => ({ index: Math.max(index - 1, 0), dir: -1 }));
    }
    // Restart autoplay
    const autoplay = () => {
      setAdPos(({ index, dir }) => {
        const next = index + dir;
        if (next >= AD_BANNERS.length) {
          return { index: AD_BANNERS.length - 1, dir: -1 };
        }
        if (next < 0) {
          return { index: 0, dir: 1 };
        }
        return { index: next, dir };
      });
    };
    timerRef.current = window.setInterval(autoplay, 4000);
  }, []);

  const handleBannerClick = (bannerId: number) => {
    onBannerClick?.(bannerId);
  };

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
        {AD_BANNERS.map((banner) => (
          <div
            key={banner.id}
            className="ad-banner__slide"
            onClick={() => handleBannerClick(banner.id)}
          >
            <img src={banner.image} alt={banner.title} className="ad-banner__image" />
            <div className="ad-banner__content">
              <h3 className="ad-banner__title">{banner.title}</h3>
              <p className="ad-banner__subtitle">{banner.subtitle}</p>
              <button className="ad-banner__cta">{banner.cta}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="ad-banner__dots">
        {AD_BANNERS.map((_, i) => (
          <span
            key={i}
            className={`ad-banner__dot${i === adPos.index ? ' ad-banner__dot--active' : ''}`}
          />
        ))}
      </div>
    </section>
  );
}
