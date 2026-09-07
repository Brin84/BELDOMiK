import type { OperationTypeData } from '@/shared/api/types';

/**
 * Маппинг ключей сделки ↔ русских имён из БД.
 *
 * Бэкенд хранит OperationType.name по-русски («Продажа», «Аренда»,
 * «Посуточная аренда», «Обмен»), а форма работает с английскими ключами
 * (sale, rent, daily_rent, exchange). Здесь связываем оба варианта.
 */
export type OperationKey = 'sale' | 'rent' | 'daily_rent' | 'exchange';

const NAME_TO_KEY: Record<string, OperationKey> = {
  sale: 'sale',
  'Продажа': 'sale',
  rent: 'rent',
  'Аренда': 'rent',
  daily_rent: 'daily_rent',
  'Посуточная аренда': 'daily_rent',
  exchange: 'exchange',
  'Обмен': 'exchange',
};

/** Слаг-имя из БД (или ключ) → ключ сделки. */
export function toOperationKey(name: string | null | undefined): OperationKey | null {
  if (!name) return null;
  return NAME_TO_KEY[name] ?? null;
}

/** Найти тип сделки из гео-стора по ключу формы (sale/rent/…). */
export function findOperationType(
  operationTypes: OperationTypeData[],
  key: string | null | undefined,
): OperationTypeData | null {
  if (!key) return null;
  return (
    operationTypes.find((o) => toOperationKey(o.name) === key) ??
    operationTypes.find((o) => o.name_en?.toLowerCase() === key.toLowerCase()) ??
    null
  );
}

export const OPERATION_META: Record<OperationKey, { icon: string; subtitle: string }> = {
  sale: { icon: '💰', subtitle: 'Продажа недвижимости' },
  rent: { icon: '🏠', subtitle: 'Долгосрочная аренда' },
  daily_rent: { icon: '🏨', subtitle: 'Посуточная аренда' },
  exchange: { icon: '🔄', subtitle: 'Обмен недвижимости' },
};
