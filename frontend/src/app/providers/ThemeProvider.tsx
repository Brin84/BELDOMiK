import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTelegram } from './TelegramProvider';

interface ThemeContextValue {
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string | number> | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themeParams, colorScheme, viewportStableHeight, contentSafeAreaInset } = useTelegram();

  useEffect(() => {
    const root = document.documentElement;

    // Apply Telegram theme parameters as CSS variables
    if (themeParams) {
      Object.entries(themeParams).forEach(([key, value]) => {
        // Convert camelCase to kebab-case for CSS variables
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        // Convert value to string for CSS variable
        root.style.setProperty(`--tg-theme-${cssKey}`, String(value));
      });
    }

    // Apply color scheme
    root.classList.remove('light', 'dark');
    root.classList.add(colorScheme);

    // Apply viewport stable height for fixed positioning
    if (viewportStableHeight) {
      root.style.setProperty('--tg-viewport-stable-height', `${viewportStableHeight}px`);
    }

    // Apply content safe area insets
    if (contentSafeAreaInset) {
      root.style.setProperty('--safe-top', `${contentSafeAreaInset.top}px`);
      root.style.setProperty('--safe-bottom', `${contentSafeAreaInset.bottom}px`);
      root.style.setProperty('--safe-left', `${contentSafeAreaInset.left}px`);
      root.style.setProperty('--safe-right', `${contentSafeAreaInset.right}px`);
    }
  }, [themeParams, colorScheme, viewportStableHeight, contentSafeAreaInset]);

  const value: ThemeContextValue = {
    colorScheme,
    themeParams,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}