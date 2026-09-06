import { Percent } from 'lucide-react';
import type { PropertyCategory } from '@/shared/api/types';
import { BynSymbol } from '@/shared/ui';

import apartmentsImg from '@/assets/categories/apartments.webp';
import housesImg from '@/assets/categories/houses.webp';
import landImg from '@/assets/categories/land.webp';
import commercialImg from '@/assets/categories/commercial.webp';
import garageImg from '@/assets/categories/garage.webp';
import dachaImg from '@/assets/categories/dacha.webp';

// Карточки категорий — готовые иллюстрации с градиентной подложкой,
// названием и подписью внутри самой картинки. Текст дублируется в
// aria-label для доступности и в подпись под карточкой.
interface CategoryConfig {
  key: PropertyCategory;
  title: string;
  image: string;
}

export const CATEGORIES: readonly CategoryConfig[] = [
  { key: 'apartment', title: 'Квартиры', image: apartmentsImg },
  { key: 'house', title: 'Дома', image: housesImg },
  { key: 'land', title: 'Земельные участки', image: landImg },
  { key: 'commercial', title: 'Коммерческая недвижимость', image: commercialImg },
  { key: 'garage', title: 'Гаражи/машиноместа', image: garageImg },
  { key: 'dacha', title: 'Дачи', image: dachaImg },
];

interface CategoryCardProps {
  title: string;
  image: string;
  onClick?: () => void;
}

export function CategoryCard({ title, image, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className="category-card"
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="category-card__image"
      />
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
          892 <BynSymbol className="w-[0.85em] h-[0.85em]" />
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