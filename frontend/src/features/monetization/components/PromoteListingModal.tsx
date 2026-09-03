import { useEffect, useState } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { backHandlerBlocked } from '@/shared/lib/backButton';
import { useMonetizationStore } from '@/features/monetization';
import { useToast } from '@/shared/ui/Toast';

interface PromoteListingModalProps {
  propertyId: number;
  isOpen: boolean;
  onClose: () => void;
  onPromoted?: () => void;
}

export function PromoteListingModal({ propertyId, isOpen, onClose, onPromoted }: PromoteListingModalProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const { showToast } = useToast();
  const {
    promotions,
    fetchPromotions,
    promoteProperty,
    confirmPayment,
  } = useMonetizationStore();

  const [selected, setSelected] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ payment_id: number; amount_byn: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchPromotions();
  }, [isOpen, fetchPromotions]);

  // Telegram BackButton — modal takes over while open
  useEffect(() => {
    if (backButton && isOpen) {
      backHandlerBlocked.current = true;
      backButton.show();
      const handleBack = () => onClose();
      backButton.onClick(handleBack);
      return () => {
        backButton.offClick(handleBack);
        backButton.hide();
        backHandlerBlocked.current = false;
      };
    }
  }, [backButton, isOpen, onClose]);

  // Reset state each open
  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setCheckout(null);
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSelect = (type: string) => {
    trigger('light');
    setSelected(type);
  };

  const handleInitiate = async () => {
    if (!selected) return;
    setIsLoading(true);
    try {
      const result = await promoteProperty(propertyId, selected);
      setCheckout({ payment_id: result.payment_id, amount_byn: result.amount_byn });
    } catch (e) {
      showToast((e as Error).message || 'Не удалось оформить продвижение', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!checkout) return;
    setIsLoading(true);
    try {
      await confirmPayment(checkout.payment_id);
      showToast('Объявление продвинуто!', 'success');
      trigger('success');
      onPromoted?.();
      onClose();
    } catch (e) {
      showToast((e as Error).message || 'Ошибка оплаты', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Продвинуть объявление">
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--tg-theme-hint-color)', opacity: 0.4 }} />
        </div>

        <div className="px-4 py-3">
          <h2 className="text-tg-text text-lg font-bold">⭐ Продвинуть объявление</h2>
          <p className="text-tg-hint text-sm mt-1">Повысьте заметность в выдаче</p>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {!checkout ? (
            <>
              {promotions.map((p) => (
                <button
                  key={p.type}
                  onClick={() => handleSelect(p.type)}
                  className="w-full p-3 rounded-2xl text-left transition-all"
                  style={{
                    backgroundColor: selected === p.type
                      ? `${p.badge_color}22`
                      : 'var(--tg-theme-secondary-bg-color)',
                    border: `1.5px solid ${selected === p.type ? p.badge_color : 'var(--tg-theme-hint-color)'}`,
                    borderWidth: selected === p.type ? 1.5 : 0.5,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-tg-text font-semibold" style={{ color: p.badge_color }}>
                      {p.label}
                    </span>
                    <span className="text-tg-text font-bold">{p.price_byn} ₽</span>
                  </div>
                  <div className="text-tg-hint text-xs mt-1">{p.duration_days} дн.</div>
                  <ul className="text-tg-hint text-xs mt-2 space-y-0.5">
                    {p.features.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                </button>
              ))}

              <button
                onClick={handleInitiate}
                disabled={!selected || isLoading}
                className="w-full py-3 rounded-xl font-medium mt-2 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                }}
              >
                {isLoading ? 'Оформление…' : selected ? 'Продолжить' : 'Выберите тип продвижения'}
              </button>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div>
                <p className="text-tg-text font-bold text-2xl">{checkout.amount_byn} ₽</p>
                <p className="text-tg-hint text-sm mt-1">Оплата (тестовый режим)</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                }}
              >
                {isLoading ? 'Оплата…' : `Оплатить ${checkout.amount_byn} ₽ (тест)`}
              </button>
              <button
                onClick={() => setCheckout(null)}
                className="w-full py-3 rounded-xl font-medium text-tg-hint"
              >
                Назад
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
