import { useMemo, useState } from 'react';
import { SelectListRowView } from './SelectList';
import { useHaptics } from '@/shared/lib/haptics';

export interface ExpandableOption<T> {
  value: T;
  icon?: string;
  title: string;
  subtitle?: string;
}

interface ExpandablePickerProps<T> {
  label: string;
  placeholder: string;
  selected: T | null;
  options: ExpandableOption<T>[];
  onSelect: (value: T) => void;
  /** Открыта ли плитка. Один открытый пикер на экран — состояние извне. */
  open: boolean;
  onToggle: () => void;
  /** Включить поиск по опциям (фильтрация по title). */
  searchable?: boolean;
  /** Плейсхолдер для строки поиска. */
  searchPlaceholder?: string;
  /** Элемент «Добавить …» в конце списка, если ничего не найдено. */
  addOption?: {
    label: string;
    onAdd: (query: string) => Promise<void>;
    isAdding?: boolean;
  };
}

/**
 * Сворачиваемый вертикальный список: в свёрнутом виде — компактный триггер
 * с заголовком и текущим значением, по нажатию плавно «выплывает»
 * столбик вариантов (grid-template-rows 0fr → 1fr). Используется в шаге 1
 * и шаге 2 визарда подачи.
 */
export function ExpandablePicker<T>({
  label,
  placeholder,
  selected,
  options,
  onSelect,
  open,
  onToggle,
  searchable = false,
  searchPlaceholder = 'Поиск…',
  addOption,
}: ExpandablePickerProps<T>) {
  const { trigger } = useHaptics();
  const [query, setQuery] = useState('');
  const selectedOption = options.find((o) => o.value === selected) ?? null;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.title.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const noResults = searchable && query.trim().length > 0 && filtered.length === 0;

  const handleSelect = (value: T) => {
    trigger('selection');
    onSelect(value);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow"
      style={{
        backgroundColor: '#ffffff',
        border: open ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
        boxShadow: open ? '0 8px 24px rgba(2, 6, 23, 0.06)' : 'none',
      }}
    >
      {/* Триггер */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-opacity active:opacity-80"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] leading-tight" style={{ color: '#94a3b8' }}>{label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {selectedOption?.icon && <span className="text-xl leading-none">{selectedOption.icon}</span>}
            <span
              className="text-[17px] font-semibold truncate"
              style={{ color: selectedOption ? '#0f172a' : '#94a3b8' }}
            >
              {selectedOption ? selectedOption.title : placeholder}
            </span>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: '#94a3b8' }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Раскрывающийся столбик вариантов */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pt-1 pb-2" style={{ borderTop: '1px solid #f1f5f9' }}>
            {/* Поиск */}
            {searchable && (
              <div className="px-3 pb-2">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ color: '#94a3b8' }}
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#0f172a',
                    }}
                    autoComplete="off"
                    maxLength={100}
                  />
                  {query && (
                    <button
                      onClick={() => {
                        trigger('light');
                        setQuery('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full"
                      style={{ color: '#94a3b8' }}
                      aria-label="Очистить поиск"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Список опций */}
            {filtered.map((option: ExpandableOption<T>, index: number) => (
              <SelectListRowView<ExpandableOption<T>>
                key={`${String(option.value)}-${index}`}
                row={{
                  value: option,
                  label: option.title,
                  hint: option.subtitle,
                  icon: option.icon,
                }}
                isSelected={option.value === selected}
                onSelect={() => handleSelect(option.value)}
                showDivider={index < filtered.length - 1 || !!(noResults && addOption)}
              />
            ))}

            {/* Ничего не найдено — кнопка «Добавить» */}
            {noResults && addOption && (
              <div className="px-3 py-3 text-center">
                <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>
                  «{query.trim()}» нет в списке
                </p>
                <button
                  onClick={() => addOption.onAdd(query.trim())}
                  disabled={addOption.isAdding}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors active:opacity-80 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color)',
                    color: 'var(--tg-theme-button-text-color)',
                  }}
                >
                  {addOption.isAdding ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Добавляем…
                    </>
                  ) : (
                    <>➕ Добавить «{query.trim()}»</>
                  )}
                </button>
                <p className="pt-1.5 text-xs" style={{ color: '#94a3b8' }}>
                  Деревня добавится в список
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
