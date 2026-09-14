import type { PropertyShort } from '@/shared/api/types';
import { HotPropertyCard } from './HotPropertyCard';

interface PropertyCardProps {
  property: PropertyShort;
  onFavoriteToggle?: (propertyId: number, isFavorite: boolean) => void;
  /** Принимается для совместимости; в этой раскладке кнопка сравнения не выводится. */
  showComparisonButton?: boolean;
  className?: string;
}

/**
 * Общая карточка объявления в списках (поиск, избранное, карта, агентство,
 * подборки). Единый горизонтальный макет «фото слева, описание справа» —
 * как на главной странице (HotPropertyCard). Тонкая обёртка: страницы не
 * меняются, а вид карточек приведён к единому образцу каталога.
 */
export function PropertyCard({
  property,
  onFavoriteToggle,
  className,
}: PropertyCardProps) {
  return (
    <div className={className}>
      <HotPropertyCard property={property} onFavoriteToggle={onFavoriteToggle} />
    </div>
  );
}