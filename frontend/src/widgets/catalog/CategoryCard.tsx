import {
  Building2,
  Car,
  ChevronRight,
  Calculator,
  House,
  MapPin,
  Percent,
  Store,
  Trees,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { PropertyCategory } from '@/shared/api/types';

// Градиентные плитки категорий с Unsplash-фото — дизайн BELDOMiK.
// Каждая категория: градиент, иконка в «морозном» стекле, название + подпись,
// фотография в правом нижнем углу.
interface CategoryConfig {
  key: PropertyCategory;
  title: string;
  gradient: string;
  icon: ReactNode;
  image: string;
}

export const CATEGORIES: readonly CategoryConfig[] = [
  {
    key: 'apartment',
    title: 'Квартиры',
    gradient: 'from-blue-500 to-blue-600',
    icon: <Building2 size={28} />,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500',
  },
  {
    key: 'house',
    title: 'Дома',
    gradient: 'from-green-400 to-emerald-500',
    icon: <House size={28} />,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500',
  },
  {
    key: 'land',
    title: 'Земельные участки',
    gradient: 'from-cyan-400 to-cyan-500',
    icon: <MapPin size={28} />,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=500',
  },
  {
    key: 'commercial',
    title: 'Коммерческая недвижимость',
    gradient: 'from-purple-500 to-violet-500',
    icon: <Store size={28} />,
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
  },
  {
    key: 'garage',
    title: 'Гаражи/машиноместа',
    gradient: 'from-slate-500 to-slate-600',
    icon: <Car size={28} />,
    image: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=500',
  },
  {
    key: 'dacha',
    title: 'Дачи',
    gradient: 'from-orange-400 to-orange-500',
    icon: <Trees size={28} />,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
  },
];

interface CategoryCardProps {
  title: string;
  subtitle: string;
  gradient: string;
  icon: ReactNode;
  image: string;
  onClick?: () => void;
}

export function CategoryCard({
  title,
  subtitle,
  gradient,
  icon,
  image,
  onClick,
}: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={[
        'relative min-h-[165px] overflow-hidden rounded-[28px] p-5 text-left text-white',
        'bg-gradient-to-br',
        gradient,
        'shadow-[0_12px_30px_rgba(0,0,0,0.15)]',
        'transition-all duration-200 active:scale-[0.97]',
      ].join(' ')}
    >
      {/* Декоративное свечение */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      {/* Морозная иконка */}
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/30 bg-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,.4)] backdrop-blur-md">
        {icon}
      </div>

      {/* Текст */}
      <div className="relative z-10 mt-3 max-w-[65%]">
        <h3 className="text-[21px] font-bold leading-[1.05]">{title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[16px] font-medium text-white/85">
          {subtitle}
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Фото */}
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute bottom-[-5px] right-[-12px] h-[115px] w-[145px] rounded-tl-[45px] object-cover object-center shadow-[-10px_-5px_25px_rgba(0,0,0,.12)] [mask-image:linear-gradient(to_bottom,transparent_0%,black_30%)]"
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
      className="relative mt-5 flex min-h-[145px] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-left text-white shadow-[0_15px_35px_rgba(37,99,235,.3)] transition-all active:scale-[0.98]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/20 backdrop-blur-md">
        <Percent size={28} />
      </div>

      <div className="ml-4">
        <h2 className="text-[21px] font-bold">Ипотечный калькулятор</h2>
        <p className="mt-2 max-w-[230px] text-[16px] leading-snug text-white/80">
          Рассчитайте платежи и подберите лучшие условия
        </p>
      </div>

      <Calculator
        className="absolute bottom-[-10px] right-[45px] rotate-[-8deg] text-white/20"
        size={100}
      />

      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2" size={28} />
    </button>
  );
}