// WealthHub Shared TypeScript Types

export type InvestmentType = 'FD' | 'MF' | 'STOCKS' | 'GOLD' | 'BONDS' | 'POLICY' | 'PPF' | 'CASH'
export type TransactionType = 'BUY' | 'SELL'
export type LoanType = 'HOME' | 'GOLD' | 'PERSONAL' | 'CAR' | 'OTHER'
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'FIFTEEN_DAYS' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY'

// ─── Investment Entry (flat, one row per transaction) ─────────────────────────

export interface InvestmentEntry {
  id: string
  date: string
  name: string
  type: InvestmentType
  txnType: TransactionType
  account?: string | null   // Platform: Zerodha Coin, Zerodha, Upstox, ICICI, LIC
  owner?: string | null     // Person: Viraj, Prachi, Joint
  amount: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Recurring Schedule (SIP / Policy / PPF) ──────────────────────────────────

export interface RecurringSchedule {
  id: string
  name: string
  type: InvestmentType
  account?: string | null
  owner?: string | null
  amount: number
  frequency: ScheduleFrequency
  dayOfMonth: number
  active: boolean
  startDate: string
  lastRun?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Loan ─────────────────────────────────────────────────────────────────────

export interface EMIPayment {
  id: string
  loanId: string
  month: number
  dueDate: string
  principal: number
  interest: number
  balance: number
  isPaid: boolean
  paidDate?: string | null
}

export interface Loan {
  id: string
  type: LoanType
  lenderName: string
  principalAmount: number
  interestRate: number
  tenureMonths: number
  startDate: string
  emiAmount: number
  notes?: string | null
  emiSchedule?: EMIPayment[]
  createdAt: string
  updatedAt: string
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  priority: number
  color?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Salary ───────────────────────────────────────────────────────────────────

export interface SalaryConfig {
  id: string
  monthlyGross: number
  monthlyNet: number
  month: number
  year: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalInvested: number
  totalLoanOutstanding: number
  netWorth: number
  upcomingEMIs: (EMIPayment & { loan: Loan })[]
  topGoals: Goal[]
  investmentBreakdown: { type: InvestmentType; invested: number }[]
  byYear: { year: number; invested: number }[]
  byAccount: { account: string; invested: number }[]
  byOwner: { owner: string; invested: number }[]
  monthlySalary: SalaryConfig | null
  totalMonthlyEMI: number
}

// ─── Calculator ───────────────────────────────────────────────────────────────

export interface AmortizationRow {
  month: number
  emi: number
  principal: number
  interest: number
  balance: number
}

export interface LoanCalculationResult {
  emi: number
  totalPayment: number
  totalInterest: number
  amortization: AmortizationRow[]
}
