import { useHaptics } from '@/shared/lib/haptics';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function ErrorState({ message = 'Что-то пошло не так', onRetry, className = '', icon }: ErrorStateProps) {
  const { trigger } = useHaptics();

  const handleRetry = () => {
    trigger('light');
    onRetry?.();
  };

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="alert"
    >
      {icon || (
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 opacity-50"
          style={{ color: 'var(--tg-theme-hint-color)' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      <p className="text-tg-text mb-2 text-base font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={handleRetry}
          className="mt-4 px-6 py-2.5 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Попробовать снова
        </button>
      )}
    </div>
  );
}

export function InlineError({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        border: '1px solid rgba(255, 59, 48, 0.3)',
      }}
      role="alert"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0" style={{ color: '#ff3b30' }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto p-1 rounded-lg flex-shrink-0"
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: '#ff3b30' }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}