/**
 * Синтез заголовка объявления по аналогии с `Property.title` на бэкенде:
 * «[тип], [N]-комн., [площадь] м², [город]».
 *
 * В БД у объявления нет колонки title — заголовок всегда собирается из
 * параметров. Используется в карточках объявлений и в визарде при загрузке
 * черновика.
 */
export function buildPropertyTitle(data: {
  type_name?: string | null;
  rooms_count?: number | null;
  total_area?: number | null;
  city_name?: string | null;
}): string {
  const parts: string[] = [];
  if (data.type_name) parts.push(data.type_name);
  if (data.rooms_count) parts.push(`${data.rooms_count}-комн.`);
  if (data.total_area) parts.push(`${data.total_area} м²`);
  if (data.city_name) parts.push(data.city_name);
  return parts.join(', ') || 'Объявление';
}