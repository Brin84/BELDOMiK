import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTelegram } from './TelegramProvider';
import { useAuthStore } from '@/features/auth';

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
  const { themeParams, colorScheme: tgColorScheme, viewportStableHeight, contentSafeAreaInset } = useTelegram();
  const userTheme = useAuthStore((s) => s.user?.settings?.theme);

  // user setting overrides Telegram scheme only when explicitly set
  const effectiveScheme = userTheme && userTheme !== 'system' ? userTheme : tgColorScheme;

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

    // Apply color scheme — both class (legacy) and data-attribute (for CSS [data-theme])
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveScheme);
    root.setAttribute('data-theme', effectiveScheme);

    // Set Telegram header color for unified solid look in dark theme.
    // In dark mode use a solid dark color; in light/system let Telegram decide.
    if (effectiveScheme === 'dark') {
      // Solid dark background — same as --bd-bg-base in dark theme
      const darkHeader = '#1e2130';
      try {
        (window as unknown as Record<string, unknown>).Telegram?.WebApp?.setHeaderColor(darkHeader);
      } catch {}
    } else {
      try {
        (window as unknown as Record<string, unknown>).Telegram?.WebApp?.setHeaderColor('bg_color');
      } catch {}
    }

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
  }, [themeParams, effectiveScheme, viewportStableHeight, contentSafeAreaInset]);

  const value: ThemeContextValue = {
    colorScheme: effectiveScheme as 'light' | 'dark',
    themeParams,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}