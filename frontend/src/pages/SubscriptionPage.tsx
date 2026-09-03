import { useEffect, useState } from 'react';
import { useHaptics } from '@/shared/lib/haptics';
import { useMonetizationStore } from '@/features/monetization';
import { useAgenciesStore } from '@/features/agencies';
import { useToast } from '@/shared/ui/Toast';
import { Skeleton } from '@/shared/ui';
import type { SubscriptionPlanInfo } from '@/shared/api/types';

function formatPrice(byn: number): string {
  return byn === 0 ? 'Бесплатно' : `${new Intl.NumberFormat('ru-RU').format(byn)} ₽`;
}

export function SubscriptionPage() {
  const { trigger } = useHaptics();
  const { showToast } = useToast();
  const { plans, fetchPlans, subscriptions, fetchSubscriptions, createSubscription, confirmPayment } = useMonetizationStore();
  const { myAgency, fetchMyAgency } = useAgenciesStore();
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{ plan: string; payment_id: number; amount_byn: number } | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
    fetchMyAgency();
  }, [fetchPlans, fetchSubscriptions, fetchMyAgency]);

  const activePlan = subscriptions[0]?.plan ?? null;

  const handleBuy = async (plan: SubscriptionPlanInfo) => {
    if (!myAgency) {
      showToast('Сначала создайте агентство', 'warning');
      return;
    }
    if (activePlan) {
      showToast('У вашего агентства уже есть активная подписка', 'warning');
      return;
    }
    trigger('light');
    setIsBuying(plan.plan);
    try {
      const result = await createSubscription(plan.plan, myAgency.id);
      if ('payment_id' in result) {
        setPendingCheckout({ plan: plan.plan, payment_id: result.payment_id, amount_byn: result.amount_byn });
      } else {
        showToast('Подписка активирована!', 'success');
        await fetchSubscriptions();
      }
    } catch (e) {
      showToast((e as Error).message || 'Ошибка оформления подписки', 'error');
    } finally {
      setIsBuying(null);
    }
  };

  const handleConfirm = async () => {
    if (!pendingCheckout) return;
    setIsBuying(pendingCheckout.plan);
    try {
      await confirmPayment(pendingCheckout.payment_id);
      showToast('Подписка активирована!', 'success');
      trigger('success');
      setPendingCheckout(null);
      await fetchSubscriptions();
    } catch (e) {
      showToast((e as Error).message || 'Ошибка оплаты', 'error');
    } finally {
      setIsBuying(null);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-tg-text text-xl font-bold">💎 Подписка</h1>
        <p className="text-tg-hint text-sm mt-1">Выберите тариф для вашего агентства</p>
      </div>

      {!myAgency && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.3)', color: '#ff9500' }}>
          Для оформления подписки необходимо создать агентство (в разделе «Моё агентство»).
        </div>
      )}

      {activePlan && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.3)', color: '#34c759' }}>
          ✅ Активный тариф: <b>{activePlan.toUpperCase()}</b>
        </div>
      )}

      {pendingCheckout && (
        <div className="p-4 rounded-2xl text-center space-y-3" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '0.5px solid var(--tg-theme-hint-color)' }}>
          <p className="text-tg-text font-bold text-2xl">{pendingCheckout.amount_byn} ₽</p>
          <p className="text-tg-hint text-sm">Оплата (тестовый режим)</p>
          <button
            onClick={handleConfirm}
            disabled={isBuying !== null}
            className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
          >
            {isBuying ? 'Оплата…' : `Оплатить ${pendingCheckout.amount_byn} ₽ (тест)`}
          </button>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const isCurrent = activePlan === plan.plan;
            return (
              <div
                key={plan.plan}
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  border: isCurrent ? '1.5px solid #34c759' : '0.5px solid var(--tg-theme-hint-color)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-tg-text font-bold text-lg">{plan.label}</h3>
                  <span className="text-tg-text font-bold">{formatPrice(plan.price_byn)}</span>
                </div>
                <p className="text-tg-hint text-xs mt-0.5">срок {plan.duration_days} дн.</p>

                <ul className="text-tg-hint text-sm mt-3 space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                  <li>• До {plan.max_properties} объявлений</li>
                  {plan.max_promotions > 0 && <li>• До {plan.max_promotions} продвижений</li>}
                  {plan.has_analytics && <li>• Аналитика</li>}
                  {plan.has_team && <li>• Команда до {plan.team_size} человек</li>}
                </ul>

                {!isCurrent && plan.price_byn > 0 && (
                  <button
                    onClick={() => handleBuy(plan)}
                    disabled={isBuying !== null || !myAgency}
                    className="w-full py-3 rounded-xl font-medium mt-4 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                  >
                    {isBuying === plan.plan ? 'Оформление…' : `Купить за ${plan.price_byn} ₽`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
