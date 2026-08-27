import { useEffect } from 'react';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { useHaptics } from '@/shared/lib/haptics';
import { useAnalyticsStore } from '../analyticsStore';
import type { CityStats, PopularProperty } from '../analyticsStore';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' BYN';
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num);
}

interface AnalyticsDashboardProps {
  initialCityId?: number;
}

export function AnalyticsDashboard({ initialCityId }: AnalyticsDashboardProps) {
  const { trigger } = useHaptics();
  const { backButton } = useTelegram();
  const {
    marketOverview,
    cityStats,
    popularProperties,
    priceDistribution,
    typeDistribution,
    isLoading,
    error,
    fetchMarketOverview,
    fetchCityStats,
    fetchPopularProperties,
    fetchPriceDistribution,
    fetchTypeDistribution,
  } = useAnalyticsStore();

  useEffect(() => {
    fetchMarketOverview();
    fetchCityStats(initialCityId);
    fetchPopularProperties(10, 30);
    fetchPriceDistribution(initialCityId);
    fetchTypeDistribution();
  }, [
    fetchMarketOverview,
    fetchCityStats,
    fetchPopularProperties,
    fetchPriceDistribution,
    fetchTypeDistribution,
    initialCityId,
  ]);

  useEffect(() => {
    if (backButton) {
      backButton.show();
      const handleBack = () => {
        trigger('light');
        window.history.back();
      };
      backButton.onClick(handleBack);
      return () => {
        backButton.hide();
        backButton.offClick(handleBack);
      };
    }
  }, [backButton, trigger]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 border-b" style={{ backgroundColor: 'var(--tg-theme-bg-color)', borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
        <h1 className="text-tg-text text-xl font-bold">Аналитика рынка</h1>
        <p className="text-tg-hint text-sm mt-1">Статистика и тренды недвижимости</p>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30' }}>
          {error}
        </div>
      )}

      <div className="p-4 space-y-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
        {/* Market Overview Cards */}
        {marketOverview && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Всего объявлений"
              value={formatNumber(marketOverview.total_properties)}
              icon="🏠"
            />
            <StatCard
              title="На продажу"
              value={formatNumber(marketOverview.for_sale)}
              icon="💰"
            />
            <StatCard
              title="В аренду"
              value={formatNumber(marketOverview.for_rent)}
              icon="🏠"
            />
            <StatCard
              title="Средняя цена"
              value={formatPrice(marketOverview.avg_price_byn)}
              icon="📊"
            />
          </div>
        )}

        {/* Type Distribution */}
        {typeDistribution.length > 0 && (
          <section>
            <h2 className="text-tg-text text-lg font-bold mb-3">Распределение по типам</h2>
            <div className="space-y-2">
              {typeDistribution.map((type) => (
                <TypeStatRow
                  key={type.type_id}
                  name={type.type_name}
                  count={type.count}
                  total={typeDistribution.reduce((sum, t) => sum + t.count, 0)}
                />
              ))}
            </div>
          </section>
        )}

        {/* City Stats */}
        {cityStats.length > 0 && (
          <section>
            <h2 className="text-tg-text text-lg font-bold mb-3">По городам</h2>
            <div className="space-y-2">
              {cityStats.map((city) => (
                <CityStatRow key={city.city_id} city={city} />
              ))}
            </div>
          </section>
        )}

        {/* Popular Properties */}
        {popularProperties.length > 0 && (
          <section>
            <h2 className="text-tg-text text-lg font-bold mb-3">Популярные объявления (30 дней)</h2>
            <div className="space-y-2">
              {popularProperties.map((prop, index) => (
                <PopularPropertyRow key={prop.property_id} property={prop} rank={index + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Price Distribution */}
        {priceDistribution && priceDistribution.count > 0 && (
          <section>
            <h2 className="text-tg-text text-lg font-bold mb-3">Распределение цен</h2>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-tg-hint text-sm">Минимум</div>
                  <div className="text-tg-text font-bold text-lg">{formatPrice(priceDistribution.min)}</div>
                </div>
                <div>
                  <div className="text-tg-hint text-sm">Средняя</div>
                  <div className="text-tg-text font-bold text-lg">{formatPrice(priceDistribution.avg)}</div>
                </div>
                <div>
                  <div className="text-tg-hint text-sm">Максимум</div>
                  <div className="text-tg-text font-bold text-lg">{formatPrice(priceDistribution.max)}</div>
                </div>
                <div>
                  <div className="text-tg-hint text-sm">Объявлений</div>
                  <div className="text-tg-text font-bold text-lg">{formatNumber(priceDistribution.count)}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {isLoading && (
          <div className="py-8 text-center text-tg-hint">
            Загрузка аналитики...
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="p-4 rounded-2xl text-center" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-tg-text font-bold text-lg">{value}</div>
      <div className="text-tg-hint text-xs mt-1">{title}</div>
    </div>
  );
}

function TypeStatRow({ name, count, total }: { name: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-tg-text font-medium">{name}</span>
        <span className="text-tg-hint text-sm">{formatNumber(count)} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tg-theme-tertiary-bg-color, var(--tg-theme-secondary-bg-color))' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: 'var(--tg-theme-button-color)',
          }}
        />
      </div>
    </div>
  );
}

function CityStatRow({ city }: { city: CityStats }) {
  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
      <div className="flex justify-between items-center">
        <div>
          <div className="text-tg-text font-medium">{city.city_name}</div>
          <div className="text-tg-hint text-xs">{formatNumber(city.property_count)} объявлений</div>
        </div>
        <div className="text-right">
          <div className="text-tg-text font-bold">{formatPrice(city.avg_price_byn)}</div>
          <div className="text-tg-hint text-xs">средняя цена</div>
        </div>
      </div>
    </div>
  );
}

function PopularPropertyRow({ property, rank }: { property: PopularProperty; rank: number }) {
  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', border: '1px solid var(--tg-theme-hint-color)' }}>
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-tg-text font-medium truncate">{property.title || 'Без названия'}</div>
          <div className="text-tg-hint text-xs">{formatNumber(property.view_count)} просмотров</div>
        </div>
      </div>
    </div>
  );
}