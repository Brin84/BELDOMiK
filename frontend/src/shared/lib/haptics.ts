import { useTelegram } from '@/app/providers/TelegramProvider';
import WebApp from '@twa-dev/sdk';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function useHaptics() {
  const { hapticFeedback } = useTelegram();

  const trigger = (type: HapticType = 'light') => {
    try {
      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy':
          hapticFeedback.impactOccurred(type);
          break;
        case 'success':
        case 'warning':
        case 'error':
          hapticFeedback.notificationOccurred(type);
          break;
        case 'selection':
          hapticFeedback.selectionChanged();
          break;
      }
    } catch {
      // Haptics not available, silently ignore
    }
  };

  return { trigger };
}

function getHapticFeedback() {
  try {
    return WebApp.HapticFeedback;
  } catch {
    return null;
  }
}

export function hapticLight() {
  try {
    const haptic = getHapticFeedback();
    haptic?.impactOccurred('light');
  } catch {}
}

export function hapticMedium() {
  try {
    const haptic = getHapticFeedback();
    haptic?.impactOccurred('medium');
  } catch {}
}

export function hapticHeavy() {
  try {
    const haptic = getHapticFeedback();
    haptic?.impactOccurred('heavy');
  } catch {}
}

export function hapticSuccess() {
  try {
    const haptic = getHapticFeedback();
    haptic?.notificationOccurred('success');
  } catch {}
}

export function hapticError() {
  try {
    const haptic = getHapticFeedback();
    haptic?.notificationOccurred('error');
  } catch {}
}

export function hapticSelection() {
  try {
    const haptic = getHapticFeedback();
    haptic?.selectionChanged();
  } catch {}
}