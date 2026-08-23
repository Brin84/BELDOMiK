import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import WebApp from '@twa-dev/sdk';

interface TelegramContextValue {
  webApp: typeof WebApp;
  initData: string | null;
  themeParams: Record<string, string | number> | null;
  colorScheme: 'light' | 'dark';
  isReady: boolean;
  isExpanded: boolean;
  isClosingConfirmationEnabled: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  contentSafeAreaInset: { top: number; bottom: number; left: number; right: number } | null;
  hapticFeedback: typeof WebApp.HapticFeedback;
  mainButton: typeof WebApp.MainButton;
  backButton: typeof WebApp.BackButton;
  setClosingConfirmation: (enabled: boolean) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  close: () => void;
  expand: () => void;
  ready: () => void;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [themeParams, setThemeParams] = useState<Record<string, string | number> | null>(null);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosingConfirmationEnabled, setIsClosingConfirmationEnabled] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportStableHeight, setViewportStableHeight] = useState(0);
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<{
    top: number; bottom: number; left: number; right: number;
  } | null>(null);
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    const webApp = WebApp;

    // Initialize Telegram WebApp
    webApp.ready();
    setIsReady(true);

    // Expand to full height
    webApp.expand();
    setIsExpanded(true);

    // Get initData
    if (webApp.initData) {
      setInitData(webApp.initData);
    }

    // Get theme params
    if (webApp.themeParams) {
      // Convert ThemeParams (which has specific keys) to Record<string, string | number>
      const params: Record<string, string | number> = {};
      Object.entries(webApp.themeParams).forEach(([key, value]) => {
        params[key] = value;
      });
      setThemeParams(params);
    }

    // Get color scheme
    setColorScheme(webApp.colorScheme || 'light');

    // Viewport info
    setViewportHeight(webApp.viewportHeight || window.innerHeight);
    setViewportStableHeight(webApp.viewportStableHeight || window.innerHeight);

    // Content safe area inset
    if (webApp.contentSafeAreaInset) {
      setContentSafeAreaInset({
        top: webApp.contentSafeAreaInset.top,
        bottom: webApp.contentSafeAreaInset.bottom,
        left: webApp.contentSafeAreaInset.left,
        right: webApp.contentSafeAreaInset.right,
      });
    }

    // Listen for theme changes
    const handleThemeChange = () => {
      if (webApp.themeParams) {
        // Convert ThemeParams to Record<string, string | number>
        const params: Record<string, string | number> = {};
        Object.entries(webApp.themeParams).forEach(([key, value]) => {
          params[key] = value;
        });
        setThemeParams(params);
      }
      setColorScheme(webApp.colorScheme || 'light');
    };

    webApp.onEvent('themeChanged', handleThemeChange);

    // Listen for viewport changes
    const handleViewportChange = () => {
      setViewportHeight(webApp.viewportHeight || window.innerHeight);
      setViewportStableHeight(webApp.viewportStableHeight || window.innerHeight);
      if (webApp.contentSafeAreaInset) {
        setContentSafeAreaInset({
          top: webApp.contentSafeAreaInset.top,
          bottom: webApp.contentSafeAreaInset.bottom,
          left: webApp.contentSafeAreaInset.left,
          right: webApp.contentSafeAreaInset.right,
        });
      }
    };

    webApp.onEvent('viewportChanged', handleViewportChange);

    // Listen for safe area changes
    const handleSafeAreaChange = () => {
      if (webApp.contentSafeAreaInset) {
        setContentSafeAreaInset({
          top: webApp.contentSafeAreaInset.top,
          bottom: webApp.contentSafeAreaInset.bottom,
          left: webApp.contentSafeAreaInset.left,
          right: webApp.contentSafeAreaInset.right,
        });
      }
    };

    webApp.onEvent('safeAreaChanged', handleSafeAreaChange);

    // Cleanup
    return () => {
      webApp.offEvent('themeChanged', handleThemeChange);
      webApp.offEvent('viewportChanged', handleViewportChange);
      webApp.offEvent('safeAreaChanged', handleSafeAreaChange);
    };
  }, []);

  const setClosingConfirmation = (enabled: boolean) => {
    if (enabled) {
      WebApp.enableClosingConfirmation();
    } else {
      WebApp.disableClosingConfirmation();
    }
    setIsClosingConfirmationEnabled(enabled);
  };

  const openLink = (url: string, options?: { try_instant_view?: boolean }) => {
    // Pass options directly with snake_case, ensuring required boolean
    WebApp.openLink(url, { try_instant_view: options?.try_instant_view ?? false });
  };

  const openTelegramLink = (url: string) => {
    WebApp.openTelegramLink(url);
  };

  const close = () => {
    WebApp.close();
  };

  const expand = () => {
    WebApp.expand();
    setIsExpanded(true);
  };

  const ready = () => {
    WebApp.ready();
    setIsReady(true);
  };

  const value: TelegramContextValue = {
    webApp: WebApp,
    initData,
    themeParams,
    colorScheme,
    isReady,
    isExpanded,
    isClosingConfirmationEnabled,
    viewportHeight,
    viewportStableHeight,
    contentSafeAreaInset,
    hapticFeedback: WebApp.HapticFeedback,
    mainButton: WebApp.MainButton,
    backButton: WebApp.BackButton,
    setClosingConfirmation,
    openLink,
    openTelegramLink,
    close,
    expand,
    ready,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}