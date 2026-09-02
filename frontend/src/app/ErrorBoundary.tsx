import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Catches render errors so the app shows a recoverable message instead of
 * a blank/black screen. In Telegram WebView a React crash otherwise renders
 * nothing (the theme background), which looks like a broken app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error) {
    // Surface for diagnostics; never blocks the UI.
    console.error('[ErrorBoundary]', error);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100vh] px-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-tg-text text-lg font-semibold mb-2">Что-то пошло не так</h1>
          <p className="text-tg-hint text-sm mb-6 max-w-xs break-words" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {this.state.message || 'Произошла непредвиденная ошибка.'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 rounded-xl font-medium"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
