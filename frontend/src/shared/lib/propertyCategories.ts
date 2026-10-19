import {
  Building2,
  Home,
  Fence,
  Store,
  CarFront,
  Trees,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropertyCategory } from '@/shared/api/types';

/**
 * Категории недвижимости: единый источник правды для иконок и подписей.
 * Используется в каталоге (кнопки категорий) и в полноэкранных выборах
 * типа недвижимости из шторки «Все фильтры».
 */
export interface PropertyCategoryConfig {
  key: PropertyCategory;
  title: string;
  icon: LucideIcon;
}

export const CATEGORIES: readonly PropertyCategoryConfig[] = [
  { key: 'apartment', title: 'Квартиры', icon: Building2 },
  { key: 'house', title: 'Дома', icon: Home },
  { key: 'land', title: 'Участки', icon: Fence },
  { key: 'commercial', title: 'Коммерческая', icon: Store },
  { key: 'garage', title: 'Гаражи', icon: CarFront },
  { key: 'dacha', title: 'Дачи', icon: Trees },
];

/** Иконка категории по её ключу (например, 'apartment' → Building2). */
export function getCategoryIcon(category: PropertyCategory | undefined): LucideIcon | undefined {
  if (!category) return undefined;
  return CATEGORIES.find((c) => c.key === category)?.icon;
}
