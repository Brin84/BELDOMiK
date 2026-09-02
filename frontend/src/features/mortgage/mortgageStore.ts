import { create } from 'zustand';

/** Frontend-only computation — mirrors backend MortgageService.save(). */
function computeMortgage(price: number, downPct: number, annualRate: number, months: number) {
  const downAmount = price * (downPct / 100);
  const principal = price - downAmount;
  const monthlyRate = annualRate / 100 / 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / months;
  } else {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }

  const totalPayment = monthlyPayment * months;
  const overpayment = totalPayment - principal;

  return {
    downPaymentAmount: Math.round(downAmount * 100) / 100,
    loanAmount: Math.round(principal * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    overpayment: Math.round(overpayment * 100) / 100,
  };
}

export interface MortgageInput {
  propertyPrice: number;
  downPaymentPercent: number;
  annualRate: number;
  loanTermMonths: number;
}

interface MortgageResult {
  downPaymentAmount: number;
  loanAmount: number;
  monthlyPayment: number;
  totalPayment: number;
  overpayment: number;
}

interface AmortizationRow {
  month: number;
  payment: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

function buildAmortization(loanAmount: number, monthlyRate: number, months: number, monthlyPayment: number): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = loanAmount;

  for (let i = 1; i <= months; i++) {
    const interestPart = balance * monthlyRate;
    const principalPart = Math.min(monthlyPayment - interestPart, balance);
    balance = Math.max(0, balance - principalPart);

    rows.push({
      month: i,
      payment: Math.round((principalPart + interestPart) * 100) / 100,
      principalPart: Math.round(principalPart * 100) / 100,
      interestPart: Math.round(interestPart * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }
  return rows;
}

interface MortgageState {
  // Input
  input: MortgageInput;
  // Computed result
  result: MortgageResult | null;
  // Amortization schedule
  schedule: AmortizationRow[];
  // History (from backend)
  history: Array<{
    id: number;
    property_price: number;
    down_payment_percent: number;
    annual_rate: number;
    loan_term_months: number;
    monthly_payment: number;
    total_payment: number;
    overpayment: number;
    created_at: string;
  }>;
  isLoadingHistory: boolean;

  // Actions
  setInput: (patch: Partial<MortgageInput>) => void;
  calculate: () => void;
  loadHistory: () => Promise<void>;
  applyFromHistory: (item: { property_price: number; down_payment_percent: number; annual_rate: number; loan_term_months: number }) => void;
}

export const useMortgageStore = create<MortgageState>((set, get) => ({
  input: {
    propertyPrice: 100000,
    downPaymentPercent: 20,
    annualRate: 12,
    loanTermMonths: 240,
  },
  result: null,
  schedule: [],
  history: [],
  isLoadingHistory: false,

  setInput: (patch) => {
    set((state) => ({ input: { ...state.input, ...patch } }));
  },

  calculate: () => {
    const { input } = get();
    const result = computeMortgage(input.propertyPrice, input.downPaymentPercent, input.annualRate, input.loanTermMonths);

    const monthlyRate = input.annualRate / 100 / 12;
    const schedule = monthlyRate === 0
      ? Array.from({ length: input.loanTermMonths }, (_, i) => ({
          month: i + 1,
          payment: Math.round((result.loanAmount / input.loanTermMonths) * 100) / 100,
          principalPart: Math.round((result.loanAmount / input.loanTermMonths) * 100) / 100,
          interestPart: 0,
          balance: Math.round((result.loanAmount * (1 - (i + 1) / input.loanTermMonths)) * 100) / 100,
        }))
      : buildAmortization(result.loanAmount, monthlyRate, input.loanTermMonths, result.monthlyPayment);

    set({ result, schedule });
  },

  loadHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { set({ history: [], isLoadingHistory: false }); return; }

      const resp = await fetch('/api/v1/mortgage/history?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) { set({ history: [], isLoadingHistory: false }); return; }
      const data = await resp.json();
      set({ history: data, isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  applyFromHistory: (item) => {
    set({
      input: {
        propertyPrice: item.property_price,
        downPaymentPercent: item.down_payment_percent,
        annualRate: item.annual_rate,
        loanTermMonths: item.loan_term_months,
      },
    });
    get().calculate();
  },
}));
