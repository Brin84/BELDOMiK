/**
 * Данные рекламных баннеров главного экрана.
 *
 * Баннеры делятся на два типа:
 *
 * 1. `image` — собственный промо-ролик BELDOMiK с картинкой. Показывается
 *    всегда, монетизацией не связан. Картинки лежат в `public/banners/`
 *    (публичная папка — файлы не хешируются, версия обновляется параметром
 *    `?v=` в поле `image`).
 * 2. `monetization: true` — реклама платных услуг (продвижение, PRO-подписка,
 *    партнёрская программа). Показывается только при включённой монетизации
 *    (`MONETIZATION_ENABLED`), весь код при этом остаётся на месте.
 *
 * `overlay: false` — текст вшит в картинку, приложение его не рисует.
 * Если картинка не загрузилась (файла нет), приложение всё равно покажет
 * градиент с текстом — см. AdBanner.tsx.
 */
export interface AdBannerItem {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  /** Путь к фоновой картинке слайда относительно public/. */
  image?: string;
  /** Рисовать текстовый блок поверх картинки. */
  overlay?: boolean;
  /** Куда ведёт тап: внутренний маршрут ('/search') или внешняя ссылка. */
  href?: string;
  /** Вариант градиентной подложки (запасной фон, если картинки нет). */
  gradient?: 1 | 2 | 3 | 4 | 5;
  /** Баннер платной услуги — только при включённой монетизации. */
  monetization?: boolean;
}

/** Версия картинок баннеров. Увеличьте, если замените файлы в public/banners/. */
export const BANNERS_VERSION = 1;

const v = BANNERS_VERSION;

export const AD_BANNERS: readonly AdBannerItem[] = [
  {
    id: 1,
    title: 'BELDOMiK — недвижимость Беларуси',
    subtitle: 'Квартиры, дома, участки и коммерция',
    cta: 'Смотреть объявления',
    image: `/banners/beldomik-promo-1.webp?v=${v}`,
    overlay: false,
    href: '/search',
    gradient: 1,
  },
  {
    id: 2,
    title: 'Разместите объявление',
    subtitle: 'Бесплатно и за пару минут',
    cta: 'Добавить объявление',
    image: `/banners/beldomik-promo-2.webp?v=${v}`,
    overlay: false,
    href: '/create-listing',
    gradient: 3,
  },
  {
    id: 3,
    title: 'Новые объявления каждый день',
    subtitle: 'Подпишитесь на канал BELDOMiK',
    cta: 'Открыть канал',
    image: `/banners/beldomik-promo-3.webp?v=${v}`,
    overlay: false,
    href: 'https://t.me/beldomik_by',
    gradient: 4,
  },

  // ─── Платные услуги. Показываются только при MONETIZATION_ENABLED ───
  {
    id: 4,
    title: 'Реклама на BELDOMiK',
    subtitle: 'Покажите свой объект тысячам пользователей',
    cta: 'Разместить рекламу',
    gradient: 1,
    monetization: true,
  },
  {
    id: 5,
    title: 'Продвижение объявлений',
    subtitle: 'Больше просмотров - быстрее продажа',
    cta: 'Узнать больше',
    gradient: 2,
    monetization: true,
  },
  {
    id: 6,
    title: 'Специальные предложения',
    subtitle: 'Акция для агентств недвижимости',
    cta: 'Подать заявку',
    gradient: 3,
    monetization: true,
  },
  {
    id: 7,
    title: 'PRO подписка',
    subtitle: 'Неограниченное количество объявлений',
    cta: 'Оформить PRO',
    gradient: 4,
    monetization: true,
  },
  {
    id: 8,
    title: 'Партнерская программа',
    subtitle: 'Зарабатывайте с BELDOMiK',
    cta: 'Стать партнером',
    gradient: 5,
    monetization: true,
  },
];
