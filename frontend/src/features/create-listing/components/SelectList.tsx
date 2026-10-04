import { useMemo, useState } from 'react';

/**
 * Вертикальный список выбора (столбик) — как в барахолке, но в дизайне BELDOMiK.
 *
 * Полноширинные строки: метка слева, чек справа при выборе, подсветка
 * выбранной строки синим. Необязательно: строка-«Любой/Не указан» для сброса,
 * поиск, прокрутка при большом списке, футер (например, «добавить город»).
 */
export interface SelectListRow<T> {
  value: T;
  label: string;
  hint?: string;
  icon?: string;
}

interface SelectListProps<T> {
  rows: SelectListRow<T>[];
  selected: T | null;
  onSelect: (value: T | null) => void;
  /** Показывает строку-«Любой/Не указан» (value → null) для сброса. */
  clearLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchEmpty?: string;
  /** Максимальная высота списка с прокруткой. */
  maxHeight?: string;
  emptyText?: string;
  footer?: React.ReactNode;
}

/**
 * Одна строка-кнопка. Переиспользуется как внутри SelectList,
 * так и в ExpandablePicker для единообразия.
 */
export function SelectListRowView<T>({
  row,
  isSelected,
  onSelect,
  showDivider,
}: {
  row: SelectListRow<T>;
  isSelected: boolean;
  onSelect: () => void;
  showDivider: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:opacity-80"
      style={{
        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'var(--bd-bg-base)',
        borderBottom: showDivider ? '1px solid rgba(255,255,255,0.6)' : 'none',
        boxShadow: isSelected ? 'var(--bd-shadow-raised)' : '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)',
      }}
    >
      {row.icon && <span className="text-2xl leading-none flex-shrink-0">{row.icon}</span>}
      <span className="min-w-0 flex-1">
        <span
          className="block text-[16px] font-medium leading-tight truncate"
          style={{ color: isSelected ? 'var(--bd-accent-primary)' : 'var(--bd-text-primary)' }}
        >
          {row.label}
        </span>
        {row.hint && (
          <span className="block text-xs mt-0.5" style={{ color: 'var(--bd-text-secondary)' }}>
            {row.hint}
          </span>
        )}
      </span>
      {isSelected && (
        <span
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full"
          style={{ backgroundColor: 'var(--bd-accent-primary)' }}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

export function SelectList<T>({
  rows,
  selected,
  onSelect,
  clearLabel,
  searchable,
  searchPlaceholder,
  searchEmpty,
  maxHeight,
  emptyText,
  footer,
}: SelectListProps<T>) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows),
    [rows, q],
  );

  const showClear = Boolean(clearLabel) && selected !== null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--bd-bg-base)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '6px 6px 12px var(--bd-raise-dark), -6px -6px 12px var(--bd-raise-light)' }}
    >
      {searchable && (
        <div className="px-3 pt-3 pb-2" style={{ borderBottom: filtered.length > 0 || showClear ? '1px solid rgba(255,255,255,0.6)' : 'none' }}>
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: 'var(--bd-text-secondary)' }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? 'Поиск'}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-[15px] outline-none"
              style={{
                backgroundColor: 'var(--bd-bg-base)',
                color: 'var(--bd-text-primary)',
                border: '1px solid transparent',
                boxShadow: 'inset 2px 2px 5px var(--bd-raise-dark), inset -2px -2px 5px var(--bd-raise-light)',
              }}
              autoComplete="off"
            />
          </div>
        </div>
      )}

      <div style={{ maxHeight: maxHeight ?? 'none', overflowY: maxHeight ? 'auto' : 'visible' }}>
        {showClear && (
          <SelectListRowView<T>
            row={{ value: null as unknown as T, label: clearLabel! }}
            isSelected={selected === null}
            onSelect={() => onSelect(null)}
            showDivider={filtered.length > 0}
          />
        )}

        {filtered.map((row, index) => (
          <SelectListRowView<T>
            key={`${String(row.value)}-${index}`}
            row={row}
            isSelected={row.value === selected}
            onSelect={() => onSelect(row.value)}
            showDivider={showClear ? true : index < filtered.length - 1}
          />
        ))}

        {filtered.length === 0 && !showClear && (
          <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--bd-text-secondary)' }}>
            {searchEmpty ?? emptyText ?? 'Ничего не найдено'}
          </div>
        )}
      </div>

      {footer && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.6)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
