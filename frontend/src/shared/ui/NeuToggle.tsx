import { ReactNode } from 'react';

interface NeuToggleProps {
  activeIndex: number;
  options: { label: string; value: number }[];
  onChange: (index: number) => void;
}

export function NeuToggle({ activeIndex, options, onChange }: NeuToggleProps) {
  return (
    <div
      className="flex h-[50px] w-full items-center justify-between rounded-xl px-1"
      style={{
        backgroundColor: 'var(--bd-bg-base, #e0e5ec)',
        boxShadow: 'var(--bd-shadow-inset)',
      }}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(index)}
          className={`
            relative
            flex-1
            h-full
            flex
            items-center
            justify-center
            rounded-lg
            text-sm
            font-medium
            transition-all
            duration-200
            ${activeIndex === index ? 'text-white' : 'text-[#718096]'}
          `}
          style={{
            backgroundColor: activeIndex === index ? 'var(--bd-accent-primary, #2563eb)' : 'transparent',
            boxShadow: activeIndex === index
              ? 'var(--bd-shadow-raised)'
              : 'var(--bd-shadow-raised)',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
