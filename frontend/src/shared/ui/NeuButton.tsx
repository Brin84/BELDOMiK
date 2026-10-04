import { ReactNode } from 'react';

type ButtonVariant = 'default' | 'primary' | 'ghost';

interface NeuButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function NeuButton({
  children,
  variant = 'default',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: NeuButtonProps) {
  const variants = {
    default: {
      base: 'bg-[#e0e5ec] text-[#2d3748]',
      shadow: 'shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]',
      shadowHover: 'shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]',
      shadowActive: 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]',
    },
    primary: {
      base: 'bg-[#2563eb] text-white',
      shadow: 'shadow-[0_4px_12px_rgba(37,99,235,0.3)]',
      shadowHover: 'shadow-[0_6px_16px_rgba(37,99,235,0.4)]',
      shadowActive: 'shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.1)]',
    },
    ghost: {
      base: 'bg-transparent text-[#2563eb]',
      shadow: '',
      shadowHover: 'shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]',
      shadowActive: 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]',
    },
  };

  const style = variants[variant];
  const disabledStyle = variant === 'primary' ? 'opacity-50 cursor-not-allowed' : 'opacity-70 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative
        flex
        items-center
        justify-center
        rounded-lg
        font-medium
        transition-all
        duration-150
        active:translate-y-[1px]
        focus:outline-none
        focus:ring-2
        focus:ring-[#2563eb]/30
        disabled:cursor-not-allowed
        ${disabled ? disabledStyle : ''}
        ${style.base}
        ${style.shadow}
        ${style.shadowHover}
        ${style.shadowActive}
        ${className}
      `}
      style={{
        padding: 'var(--bd-padding-btn, 12px 24px)',
        borderRadius: 'var(--bd-radius-btn, 12px)',
        boxShadow: 'var(--bd-shadow-raised)',
      }}
    >
      {children}
    </button>
  );
}
