// ВРЕМЕННО ОТКЛЮЧЕНО от приложения: роут /mortgage и все точки входа
// убраны (см. App.tsx, CatalogPage.tsx, ProfilePage.tsx). Код сохранён
// (features/mortgage/** и MortgagePage) — для повторного включения верните
// импорт MortgagePage и маршрут /mortgage в App.tsx.
import { MortgageCalculator } from '@/features/mortgage';

export function MortgagePage() {
  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-tg-text text-2xl font-bold">🏦 Ипотечный калькулятор</h1>
        <p className="text-tg-hint text-sm mt-1" style={{ color: '#94a3b8' }}>
          Рассчитайте ежемесячный платёж и переплату по ипотеке
        </p>
      </div>
      <MortgageCalculator />
      <p className="text-center text-tg-hint text-sm pt-4" style={{ color: '#94a3b8' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}
