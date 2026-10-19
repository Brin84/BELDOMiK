import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import './picker.css';

/**
 * Экран выбора в стиле «Вся Беларусь»: шапка, поиск и строки-карточки.
 * Используется для выбора типа недвижимости и ремонта из шторки
 * «Все фильтры». В режиме overlay рисуется поверх шторки (portal в body),
 * чтобы перекрыть её целиком.
 */
interface PickerScreenProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
  /** true — полноэкранный оверлей поверх шторки; false — обычная страница. */
  overlay?: boolean;
}

export function PickerScreen({
  title,
  subtitle,
  searchPlaceholder = 'Поиск',
  query,
  onQueryChange,
  onClose,
  children,
  overlay = true,
}: PickerScreenProps) {
  const content = (
    <div
      className={`picker-screen ${overlay ? 'picker-screen--overlay' : 'picker-screen--inline'}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="picker-screen__inner">
        {/* Шапка */}
        <div className="picker-header">
          <div className="picker-header__text">
            <h1 className="picker-header__title">{title}</h1>
            {subtitle && <p className="picker-header__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="picker-header__close"
            aria-label="Закрыть"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Поиск */}
        <div className="picker-search">
          <Search size={20} className="picker-search__icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="picker-search__input"
            autoComplete="off"
            enterKeyHint="search"
            aria-label={searchPlaceholder}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="picker-search__clear"
              aria-label="Очистить поиск"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  );

  if (!overlay) return content;

  // Оверлей рисуем порталом в body: он должен перекрыть шторку фильтров
  // (z-index 50) и нижнюю навигацию, а не вклиниваться внутрь шторки.
  return createPortal(content, document.body);
}

interface PickerRowProps {
  label: string;
  sub?: string;
  icon?: LucideIcon;
  active?: boolean;
  /** Счётчик справа от подписи (как число городов в области). */
  count?: number;
  /** Что показывать справа: галочка (выбрано), шеврон (переход) или ничего. */
  trailing?: 'check' | 'chevron' | 'none';
  onClick: () => void;
  ariaLabel?: string;
}

/** Строка-карточка выбора (та же вёрстка, что в «Вся Беларусь»). */
export function PickerRow({
  label,
  sub,
  icon: Icon,
  active = false,
  count,
  trailing = 'check',
  onClick,
  ariaLabel,
}: PickerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`picker-row ${active ? 'picker-row--active' : ''}`}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      <span className="picker-row__label">
        {Icon && <Icon size={18} className="picker-row__icon" />}
        {label}
        {sub && <span className="picker-row__sub">{sub}</span>}
      </span>
      <span className="picker-row__meta">
        {count !== undefined && count > 0 && <span className="picker-row__count">{count}</span>}
        {trailing === 'check' && active && <Check size={20} strokeWidth={2.5} />}
        {trailing === 'chevron' && <ChevronRight size={18} className="picker-row__chevron" />}
      </span>
    </button>
  );
}
