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
  columns?: 1 | 2;
}

/**
 * Сворачиваемая плитка выбора: в свёрнутом виде — компактный триггер
 * с заголовком и текущим значением, по нажатию плавно «выплывает»
 * сетка вариантов (grid-template-rows 0fr → 1fr). Используется в шаге 1
 * визарда подачи для типа сделки и типа недвижимости, чтобы выбор
 * занимал меньше места и делался в два тапа.
 */
export function ExpandablePicker<T>({
  label,
  placeholder,
  selected,
  options,
  onSelect,
  open,
  onToggle,
  columns = 2,
}: ExpandablePickerProps<T>) {
  const selectedOption = options.find((o) => o.value === selected) ?? null;

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

      {/* Раскрывающаяся сетка вариантов */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-3 pb-3 pt-1">
            <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {options.map((option: ExpandableOption<T>, index: number) => {
                const isSelected = option.value === selected;
                return (
                  <button
                    key={`${String(option.value)}-${index}`}
                    type="button"
                    onClick={() => onSelect(option.value)}
                    aria-pressed={isSelected}
                    className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-colors active:opacity-80"
                    style={{
                      backgroundColor: isSelected ? '#2171ee' : '#eef1f6',
                      color: isSelected ? '#ffffff' : '#0f172a',
                    }}
                  >
                    {option.icon && <span className="text-2xl leading-none flex-shrink-0">{option.icon}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium leading-tight">{option.title}</span>
                      {option.subtitle && (
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: isSelected ? 'rgba(255,255,255,0.85)' : '#94a3b8' }}
                        >
                          {option.subtitle}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        className="flex-shrink-0"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}