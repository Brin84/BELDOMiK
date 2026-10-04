import { InputHTMLAttributes, forwardRef } from 'react';

interface NeuInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const NeuInput = forwardRef<HTMLInputElement, NeuInputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-[#2d3748]">{label}</label>}
        <div
          className={`
            relative
            flex
            items-center
            rounded-xl
            transition-all
            duration-200
            ${error ? 'shadow-[inset_6px_6px_12px_#ffcdd2,inset_-6px_-6px_12px_#ef9a9a]' : ''}
          `}
          style={{
            backgroundColor: 'var(--bd-bg-base, #e0e5ec)',
            boxShadow: 'var(--bd-shadow-inset)',
          }}
        >
          {icon && <div className="pl-3 text-[#718096]">{icon}</div>}
          <input
            ref={ref}
            className={`
              flex-1
              bg-transparent
              px-4
              py-3
              text-[#2d3748]
              placeholder:text-[#718096]
              focus:outline-none
              ${icon ? 'pl-2' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-[#ef4444]">{error}</span>}
      </div>
    );
  }
);

NeuInput.displayName = 'NeuInput';
