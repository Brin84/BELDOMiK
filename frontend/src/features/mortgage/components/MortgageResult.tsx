import type { MortgageInput } from '../mortgageStore';

interface MortgageResultProps {
  monthlyPayment: number;
  totalPayment: number;
  overpayment: number;
  loanAmount: number;
  input: MortgageInput;
}

function formatByn(amount: number): string {
  return amount.toLocaleString('ru-BY', { style: 'currency', currency: 'BYN', maximumFractionDigits: 0 });
}

export function MortgageResult({ monthlyPayment, totalPayment, overpayment, loanAmount, input }: MortgageResultProps) {
  const loanYears = Math.floor(input.loanTermMonths / 12);
  const loanMonths = input.loanTermMonths % 12;

  return (
    <section className="bg-tg-bg rounded-2xl p-4 space-y-4">
      <h2 className="text-tg-text text-lg font-semibold">Результат расчёта</h2>

      {/* Monthly payment — hero number */}
      <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="text-tg-hint text-sm mb-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Ежемесячный платёж
        </div>
        <div className="text-tg-text font-bold text-3xl">
          {formatByn(monthlyPayment)}
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCell label="Сумма кредита" value={formatByn(loanAmount)} />
        <SummaryCell label="Переплата" value={formatByn(overpayment)} color="#ff3b30" />
        <SummaryCell label="Итого выплата" value={formatByn(totalPayment)} />
        <SummaryCell
          label="Срок"
          value={loanYears > 0 ? `${loanYears} лет ${loanMonths > 0 ? loanMonths + ' мес.' : ''}`.trim() : `${loanMonths} мес.`}
        />
      </div>

      {/* Detail row */}
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm" style={{ color: '#ff3b30' }}>
          Переплата составит {Math.round((overpayment / loanAmount) * 100)}% от суммы кредита
        </span>
      </div>
    </section>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
      <div className="text-tg-hint text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</div>
      <div className="text-tg-text text-sm font-semibold mt-0.5" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
