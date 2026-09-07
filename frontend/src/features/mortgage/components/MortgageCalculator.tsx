import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMortgageStore } from '../mortgageStore';
import { MortgageResult as MortgageResultDisplay } from './MortgageResult';
import { AmortizationSchedule } from './AmortizationSchedule';
import { useTelegram } from '@/app/providers/TelegramProvider';
import { BynSymbol } from '@/shared/ui';

function formatByn(amount: number): ReactNode {
  return (
    <>
      {amount.toLocaleString('ru-RU')} <BynSymbol />
    </>
  );
}

const TERM_PRESETS = [
  { label: '5 лет', months: 60 },
  { label: '10 лет', months: 120 },
  { label: '15 лет', months: 180 },
  { label: '20 лет', months: 240 },
  { label: '25 лет', months: 300 },
  { label: '30 лет', months: 360 },
];

const RATE_PRESETS = [8, 10, 12, 14, 16, 18, 20];

export function MortgageCalculator() {
  const { input, result, schedule, setInput, calculate } = useMortgageStore();
  const { mainButton } = useTelegram();

  // Calculate on mount and whenever input changes
  useEffect(() => {
    calculate();
  }, [input, calculate]);

  // Show save button via Telegram MainButton when user is logged in
  useEffect(() => {
    if (!mainButton) return;
    const token = localStorage.getItem('access_token');
    if (!token) { mainButton.hide(); return; }

    mainButton.setParams({
      text: '💾 Сохранить расчёт',
      is_visible: true,
      is_active: !!result,
    });
    mainButton.show();

    const handler = async () => {
      try {
        const resp = await fetch('/api/v1/mortgage/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            property_price: input.propertyPrice,
            down_payment_percent: input.downPaymentPercent,
            annual_rate: input.annualRate,
            loan_term_months: input.loanTermMonths,
          }),
        });
        if (resp.ok) {
          // @ts-expect-error Telegram WebApp SDK
          window.Telegram?.WebApp?.showAlert?.('Расчёт сохранён');
        }
      } catch { /* silent */ }
    };
    mainButton.onClick(handler);

    return () => {
      mainButton.hide();
      mainButton.offClick(handler);
    };
  }, [mainButton, result, input]);

  return (
    <div className="space-y-4">
      {/* Input: Price */}
      <InputSection
        label="Стоимость недвижимости"
        value={input.propertyPrice}
        onChange={(v) => setInput({ propertyPrice: v })}
        min={1000}
        max={5000000}
        step={1000}
        prefix={<BynSymbol />}
      />

      {/* Input: Down Payment */}
      <section className="bg-tg-bg rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-tg-text text-sm font-medium">Первоначальный взнос</label>
          <span className="text-tg-text text-sm font-semibold">{input.downPaymentPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={input.downPaymentPercent}
          onChange={(e) => setInput({ downPaymentPercent: Number(e.target.value) })}
          className="w-full accent-blue-500"
          style={{ accentColor: 'var(--tg-theme-button-color)' }}
        />
        <div className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
          <span>0%</span>
          <span className="font-medium text-tg-text">
            {formatByn(input.propertyPrice * input.downPaymentPercent / 100)}
          </span>
          <span>100%</span>
        </div>
      </section>

      {/* Input: Rate */}
      <section className="bg-tg-bg rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-tg-text text-sm font-medium">Процентная ставка</label>
          <span className="text-tg-text text-sm font-semibold">{input.annualRate}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={0.5}
          value={input.annualRate}
          onChange={(e) => setInput({ annualRate: Number(e.target.value) })}
          className="w-full"
          style={{ accentColor: 'var(--tg-theme-button-color)' }}
        />
        <div className="flex gap-2 flex-wrap">
          {RATE_PRESETS.map((rate) => (
            <button
              key={rate}
              onClick={() => setInput({ annualRate: rate })}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: input.annualRate === rate
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: input.annualRate === rate
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
              }}
            >
              {rate}%
            </button>
          ))}
        </div>
      </section>

      {/* Input: Loan Term */}
      <section className="bg-tg-bg rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-tg-text text-sm font-medium">Срок кредита</label>
          <span className="text-tg-text text-sm font-semibold">
            {Math.floor(input.loanTermMonths / 12)} лет {input.loanTermMonths % 12 > 0 ? `${input.loanTermMonths % 12} мес.` : ''}
          </span>
        </div>
        <input
          type="range"
          min={6}
          max={360}
          step={6}
          value={input.loanTermMonths}
          onChange={(e) => setInput({ loanTermMonths: Number(e.target.value) })}
          className="w-full"
          style={{ accentColor: 'var(--tg-theme-button-color)' }}
        />
        <div className="flex gap-2 flex-wrap">
          {TERM_PRESETS.map((preset) => (
            <button
              key={preset.months}
              onClick={() => setInput({ loanTermMonths: preset.months })}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: input.loanTermMonths === preset.months
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: input.loanTermMonths === preset.months
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      {result && (
        <MortgageResultDisplay
          monthlyPayment={result.monthlyPayment}
          totalPayment={result.totalPayment}
          overpayment={result.overpayment}
          loanAmount={result.loanAmount}
          input={input}
        />
      )}

      {/* Amortization Schedule */}
      {result && <AmortizationSchedule rows={schedule} />}
    </div>
  );
}

/* ─── Reusable numeric input with slider ──────────────────────── */

function InputSection({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: ReactNode;
}) {
  // Локальное строковое значение: позволяет полностью стереть поле
  // («») и вводить число свободно; в стор попадает только валидное число.
  const [text, setText] = useState(String(value));

  // Синхронизация с внешними изменениями (слайдер, пресеты, история) —
  // только когда value изменился извне и отличается от текущего поля,
  // чтобы не затирать пользовательский ввод (в т.ч. пустую строку).
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (value !== prevValueRef.current) {
      const fieldNum = text === '' ? 0 : Number(text);
      if (fieldNum !== value) {
        setText(String(value));
      }
      prevValueRef.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleTextChange = (raw: string) => {
    // Разрешаем пустое поле и промежуточные состояния (точка, минус и т.п.)
    setText(raw);
    if (raw === '') return; // пустое поле — пока просто пусто, store не трогаем
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    if (v < min || v > max) {
      // Не выходим за границы — но текстовое поле оставляем как есть,
      // чтобы пользователь мог продолжить ввод.
      return;
    }
    onChange(v);
  };

  return (
    <section className="bg-tg-bg rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-tg-text text-sm font-medium">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="0"
            className="w-28 text-right text-sm font-semibold bg-transparent border-b outline-none text-tg-text"
            style={{ borderColor: 'var(--tg-theme-hint-color)' }}
          />
          {prefix && (
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>{prefix}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--tg-theme-button-color)' }}
      />
      <div className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
        <span>{min.toLocaleString('ru-BY')}</span>
        <span>{max.toLocaleString('ru-BY')}</span>
      </div>
    </section>
  );
}
