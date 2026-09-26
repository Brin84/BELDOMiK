import {
  Building2,
  Home,
  Fence,
  Store,
  CarFront,
  Trees,
  Percent,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropertyCategory } from '@/shared/api/types';
import { BynSymbol } from '@/shared/ui';

// Прямоугольные кнопки категорий: иконка + подпись. Функционал прежний —
// клик фильтрует каталог по type_id, повторный клик по активной снимает
// фильтр. Активная кнопка заливается синим (как «Купить»/«Снять»);
// неактивная — чёрная контурная иконка, рамка в цвете приложения.
interface CategoryConfig {
  key: PropertyCategory;
  title: string;
  icon: LucideIcon;
}

export const CATEGORIES: readonly CategoryConfig[] = [
  { key: 'apartment', title: 'Квартиры', icon: Building2 },
  { key: 'house', title: 'Дома', icon: Home },
  { key: 'land', title: 'Участки', icon: Fence },
  { key: 'commercial', title: 'Коммерческая', icon: Store },
  { key: 'garage', title: 'Гаражи', icon: CarFront },
  { key: 'dacha', title: 'Дачи', icon: Trees },
];

interface CategoryCardProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  /** Категория выбрана — каталог отфильтрован по ней. */
  active?: boolean;
}

export function CategoryCard({ title, icon: Icon, onClick, active = false }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      className={`category-card${active ? ' category-card--active' : ''}`}
    >
      <span className="category-card__icon">
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <span className="category-card__title">{title}</span>
    </button>
  );
}

interface MortgageCardProps {
  onClick?: () => void;
}

export function MortgageCard({ onClick }: MortgageCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ипотечный калькулятор"
      className="mortgage-card"
    >
      <div className="mortgage-card__icon">
        <Percent size={22} />
      </div>

      <div className="mortgage-card__content">
        <h2 className="mortgage-card__title">Ипотечный калькулятор</h2>
        <p className="mortgage-card__text">
          Рассчитайте платежи и подберите лучшие условия
        </p>
      </div>

      {/* Мини-калькулятор (CSS-рисунок) */}
      <div className="mortgage-card__calc" aria-hidden="true">
        <div className="mortgage-card__calc-head">
          <span>5.8%</span>
          <span className="mortgage-card__calc-home">🏠</span>
        </div>
        <div className="mortgage-card__calc-display">
          892 <BynSymbol />
          <small>в месяц</small>
        </div>
        <div className="mortgage-card__calc-keypad">
          <span className="mortgage-card__calc-key">7</span>
          <span className="mortgage-card__calc-key">8</span>
          <span className="mortgage-card__calc-key">9</span>
          <span className="mortgage-card__calc-key">4</span>
          <span className="mortgage-card__calc-key">5</span>
          <span className="mortgage-card__calc-key">6</span>
          <span className="mortgage-card__calc-key">1</span>
          <span className="mortgage-card__calc-key">2</span>
          <span className="mortgage-card__calc-key">3</span>
          <span className="mortgage-card__calc-key mortgage-card__calc-key--zero">0</span>
          <span className="mortgage-card__calc-key">=</span>
        </div>
      </div>
    </button>
  );
}