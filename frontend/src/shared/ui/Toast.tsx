import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type'], duration?: number) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { hapticFeedback } = useTelegram();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Trigger haptic feedback based on type
    try {
      switch (type) {
        case 'success':
          hapticFeedback.notificationOccurred('success');
          break;
        case 'warning':
          hapticFeedback.notificationOccurred('warning');
          break;
        case 'error':
          hapticFeedback.notificationOccurred('error');
          break;
        default:
          hapticFeedback.impactOccurred('light');
      }
    } catch {
      // Haptics not available, silently ignore
    }

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, [hapticFeedback]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getToastStyles = (type: Toast['type']) => {
    const base = 'px-4 py-3 rounded-xl shadow-lg animate-slide-in';
    switch (type) {
      case 'success':
        return `${base} bg-green-500 text-white`;
      case 'warning':
        return `${base} bg-yellow-500 text-white`;
      case 'error':
        return `${base} bg-red-500 text-white`;
      default:
        return `${base} bg-tg-secondary-bg text-tg-text border border-tg-hint`;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '400px', margin: '0 auto' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${getToastStyles(toast.type)} pointer-events-auto`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm">{toast.message}</span>
              <button
                onClick={() => hideToast(toast.id)}
                className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Закрыть"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Add keyframes for animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out forwards;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}