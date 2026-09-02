import { useState } from 'react';

interface AmortizationRow {
  month: number;
  payment: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

interface AmortizationScheduleProps {
  rows: AmortizationRow[];
}

function formatByn(amount: number): string {
  return amount.toLocaleString('ru-BY', { maximumFractionDigits: 0 });
}

export function AmortizationSchedule({ rows }: AmortizationScheduleProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 12);

  if (rows.length === 0) return null;

  const totalPrincipal = rows.reduce((s, r) => s + r.principalPart, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interestPart, 0);

  return (
    <section className="bg-tg-bg rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-tg-text text-lg font-semibold">График платежей</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          {expanded ? 'Свернуть' : 'Все месяцы'}
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Основной долг</div>
          <div className="text-tg-text text-sm font-semibold">{formatByn(totalPrincipal)}</div>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Проценты</div>
          <div className="text-sm font-semibold" style={{ color: '#ff3b30' }}>{formatByn(totalInterest)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--tg-theme-hint-color)' }}>
              <th className="text-left py-2 pr-3 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>Месяц</th>
              <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>Платёж</th>
              <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>Долг</th>
              <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>Проценты</th>
              <th className="text-right py-2 pl-3 font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>Остаток</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.month} className="border-b" style={{ borderColor: 'var(--tg-theme-hint-color)', borderWidth: '0.5px' }}>
                <td className="py-2 pr-3 text-tg-text">{row.month}</td>
                <td className="py-2 px-3 text-right text-tg-text font-medium">{formatByn(row.payment)}</td>
                <td className="py-2 px-3 text-right text-tg-text">{formatByn(row.principalPart)}</td>
                <td className="py-2 px-3 text-right" style={{ color: '#ff3b30' }}>{formatByn(row.interestPart)}</td>
                <td className="py-2 pl-3 text-right text-tg-text">{formatByn(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!expanded && rows.length > 12 && (
        <p className="text-center text-xs py-2" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Показаны первые 12 из {rows.length} месяцев
        </p>
      )}
    </section>
  );
}
