import { MortgageCalculator } from '@/features/mortgage';

export function MortgagePage() {
  return (
    <div className="p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-tg-text text-2xl font-bold">🏦 Ипотечный калькулятор</h1>
        <p className="text-tg-hint text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Рассчитайте ежемесячный платёж и переплату по ипотеке
        </p>
      </div>
      <MortgageCalculator />
      <p className="text-center text-tg-hint text-sm pt-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
        BELDOMiK 🇧🇾 — недвижимость Беларуси
      </p>
    </div>
  );
}
