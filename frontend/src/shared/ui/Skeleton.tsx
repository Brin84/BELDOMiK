import { useTelegram } from '@/app/providers/TelegramProvider';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const { themeParams } = useTelegram();

  const baseStyles = {
    backgroundColor: themeParams?.sectionBgColor
      ? 'var(--tg-theme-section-bg-color)'
      : 'var(--tg-theme-secondary-bg-color)',
    animation: 'pulse 1.5s ease-in-out infinite',
    borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '8px',
    width: width || '100%',
    height: height || (variant === 'text' ? '16px' : variant === 'circular' ? '48px' : '120px'),
  };

  return (
    <div
      className={className}
      style={baseStyles}
      aria-hidden="true"
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="bg-tg-bg rounded-xl overflow-hidden">
      <Skeleton variant="rectangular" height={200} width="100%" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="30%" height={20} className="text-right" />
        </div>
        <Skeleton variant="text" width="80%" height={16} />
        <Skeleton variant="text" width="60%" height={14} />
        <div className="flex gap-2">
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="text" width="40%" height={14} />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}