import { useEffect } from 'react';
import { usePropertiesStore } from '@/features/properties/propertiesStore';
import { useAnalyticsStore } from '../analyticsStore';
import type { PropertyPrice } from '@/shared/api/types';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' BYN';
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PriceHistoryView() {
  // propertyDetail comes from the store already loaded by the parent
  // PropertyDetailPage. Do NOT re-fetch it here — that would toggle
  // isLoadingDetail, bounce the page back to its skeleton, unmount this
  // component, and re-fetch forever (an infinite request loop).
  const { propertyDetail } = usePropertiesStore();
  const { priceDistribution, fetchPriceDistribution } = useAnalyticsStore();

  useEffect(() => {
    if (propertyDetail?.city) {
      // city is a string ID in PropertyDetail, parse it
      const cityId = parseInt(propertyDetail.city, 10);
      const typeId = propertyDetail.property_type ? parseInt(propertyDetail.property_type, 10) : undefined;
      if (!isNaN(cityId)) {
        fetchPriceDistribution(cityId, typeId);
      }
    }
  }, [fetchPriceDistribution, propertyDetail?.city, propertyDetail?.property_type]);

  const priceHistory: PropertyPrice[] = propertyDetail?.price_history || [];
  const sortedHistory = [...priceHistory].sort((a, b) =>
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  const calculateChangePercent = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 border-b" style={{ backgroundColor: 'var(--tg-theme-bg-color)', borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
        <h1 className="text-tg-text text-xl font-bold">История цен</h1>
        {propertyDetail?.title && (
          <p className="text-tg-hint text-sm mt-1">{propertyDetail.title}</p>
        )}
      </div>

      <div className="p-4 space-y-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
        
        {sortedHistory.length === 0 ? (
          <div className="py-8 text-center text-tg-hint">
            История изменений цены отсутствует
          </div>
        ) : (
          <>
            {/* Current price card */}
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
              <div className="text-tg-hint text-sm">Текущая цена</div>
              <div className="text-2xl font-bold text-tg-text mt-1">
                {formatPrice(sortedHistory[0].price_byn)}
              </div>
              {sortedHistory.length > 1 && (
                <div className="mt-2 text-sm">
                  <span
                    className="font-medium"
                    style={{
                      color: sortedHistory[0].price_byn <= sortedHistory[1].price_byn
                        ? 'var(--tg-theme-button-color)'
                        : '#ff3b30',
                    }}
                  >
                    {formatPercent(calculateChangePercent(sortedHistory[0].price_byn, sortedHistory[1].price_byn))}
                  </span>
                  <span className="text-tg-hint"> с прошлого изменения</span>
                </div>
              )}
              {sortedHistory[0].price_per_m2_byn && (
                <div className="text-tg-hint text-xs mt-1">
                  {formatPrice(sortedHistory[0].price_per_m2_byn)} / м²
                </div>
              )}
            </div>

            {/* Price change timeline */}
            <div className="space-y-3">
              {sortedHistory.map((price, index) => {
                const previousPrice = index < sortedHistory.length - 1 ? sortedHistory[index + 1] : null;
                const changePercent = previousPrice
                  ? calculateChangePercent(price.price_byn, previousPrice.price_byn)
                  : 0;
                const isDecrease = changePercent < 0;

                return (
                  <div
                    key={price.id}
                    className="flex items-start gap-4 p-4 rounded-2xl"
                    style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}
                  >
                    <div className="flex-1">
                      <div className="text-tg-text font-medium">{formatPrice(price.price_byn)}</div>
                      {price.price_per_m2_byn && (
                        <div className="text-tg-hint text-xs mt-0.5">
                          {formatPrice(price.price_per_m2_byn)} / м²
                        </div>
                      )}
                      <div className="text-tg-hint text-xs mt-1">{formatDate(price.changed_at)}</div>
                      {price.change_reason && (
                        <div className="text-tg-hint text-xs mt-1">
                          Причина: {price.change_reason}
                        </div>
                      )}
                    </div>
                    {previousPrice && (
                      <div
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: isDecrease ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                          color: isDecrease ? '#34c759' : '#ff3b30',
                        }}
                      >
                        {formatPercent(changePercent)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Market comparison */}
            {priceDistribution && priceDistribution.count > 0 && (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
                <h2 className="text-tg-text font-bold mb-3">Рыночное сравнение</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Минимум рынка</span>
                    <span className="text-tg-text">{formatPrice(priceDistribution.min)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Средняя цена</span>
                    <span className="text-tg-text">{formatPrice(priceDistribution.avg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tg-hint">Максимум рынка</span>
                    <span className="text-tg-text">{formatPrice(priceDistribution.max)}</span>
                  </div>
                  {sortedHistory[0] && (
                    <div className="pt-2 border-t mt-2" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                      <div className="flex justify-between">
                        <span className="text-tg-hint">Ваше объявление</span>
                        <span
                          className="font-medium"
                          style={{
                            color: sortedHistory[0].price_byn <= priceDistribution.avg
                              ? '#34c759'
                              : '#ff3b30',
                          }}
                        >
                          {sortedHistory[0].price_byn <= priceDistribution.avg ? 'Ниже средней' : 'Выше средней'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
