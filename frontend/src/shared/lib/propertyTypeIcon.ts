/**
 * Эмодзи-иконка типа недвижимости.
 *
 * Бэкенд в поле PropertyType.icon хранит АНГЛИЙСКИЕ слаг-имена
 * (apartment, house, land, commercial, garage, dacha), а не эмодзи.
 * Фронтенд выводил их как есть — в интерфейсе появлялись английские слова.
 * Здесь маппим слаг → эмодзи в стиле Куфара (крупные иконки типов объекта).
 */
const PROPERTY_ICON_BY_SLUG: Record<string, string> = {
  apartment: '🏢',
  house: '🏠',
  land: '🌱',
  commercial: '🏬',
  garage: '🚗',
  dacha: '🏡',
  room: '🚪',
};

/** Вернуть эмодзи-иконку для слага из БД (по умолчанию — квартира). */
export function propertyTypeIcon(slug: string | null | undefined): string {
  if (!slug) return '🏢';
  return PROPERTY_ICON_BY_SLUG[slug] ?? '🏢';
}
