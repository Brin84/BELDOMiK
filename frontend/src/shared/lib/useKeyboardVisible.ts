import { useEffect, useState } from 'react';

/**
 * Определяет, видна ли виртуальная клавиатура в Telegram WebApp.
 * Использует visualViewport API: при открытии клавиатуры высота
 * viewport уменьшается (на Android/iOS Telegram WebApp это работает).
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;

    const baseHeight = vp.height;
    const handleResize = () => {
      // Клавиатура открыта, если высота viewport уменьшилась на >150px
      setVisible(baseHeight - vp.height > 150);
    };

    vp.addEventListener('resize', handleResize);
    return () => vp.removeEventListener('resize', handleResize);
  }, []);

  return visible;
}
