import { ReactNode } from 'react';

interface NeuCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function NeuCard({ children, className = '', padding = 'medium' }: NeuCardProps) {
  const paddingClass = {
    none: '',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-5',
  }[padding];

  return (
    <div
      className={`rounded-xl bg-[#e0e5ec] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] ${paddingClass} ${className}`}
      style={{
        backgroundColor: 'var(--bd-bg-card, #e0e5ec)',
        boxShadow: 'var(--bd-shadow-card)',
        borderRadius: 'var(--bd-radius-card, 16px)',
      }}
    >
      {children}
    </div>
  );
}
