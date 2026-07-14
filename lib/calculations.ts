import type { AmortizationRow, LoanCalculationResult } from '@/types'
import { differenceInMonths, addMonths, format } from 'date-fns'

// ─── EMI Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate EMI using standard formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const r = annualRate / 12 / 100
  if (r === 0) return principal / tenureMonths
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
  return Math.round(emi * 100) / 100
}

/**
 * Generate full amortization schedule
 */
export function generateAmortization(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date
): LoanCalculationResult {
  const emi = calculateEMI(principal, annualRate, tenureMonths)
  const r = annualRate / 12 / 100
  const amortization: AmortizationRow[] = []

  let balance = principal

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = Math.round(balance * r * 100) / 100
    const principalPaid = Math.round((emi - interest) * 100) / 100
    balance = Math.round((balance - principalPaid) * 100) / 100
    if (balance < 0) balance = 0

    amortization.push({
      month,
      emi,
      principal: principalPaid,
      interest,
      balance,
    })
  }

  const totalPayment = Math.round(emi * tenureMonths * 100) / 100
  const totalInterest = Math.round((totalPayment - principal) * 100) / 100

  return { emi, totalPayment, totalInterest, amortization }
}

// ─── Goal Calculations ────────────────────────────────────────────────────────

/**
 * Calculate monthly savings needed to reach a goal
 */
export function monthlySavingsNeeded(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date
): number {
  const monthsLeft = differenceInMonths(targetDate, new Date())
  if (monthsLeft <= 0) return 0
  const remaining = Math.max(0, targetAmount - currentAmount)
  return Math.round((remaining / monthsLeft) * 100) / 100
}

/**
 * Calculate goal completion percentage
 */
export function goalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0
  return Math.min(100, Math.round((currentAmount / targetAmount) * 10000) / 100)
}

/**
 * Months remaining until target date
 */
export function monthsRemaining(targetDate: Date): number {
  return Math.max(0, differenceInMonths(targetDate, new Date()))
}

// ─── Investment Calculations ──────────────────────────────────────────────────

/**
 * Calculate P&L and return %
 */
export function calculatePnL(
  investedAmount: number,
  currentValue: number
): { pnl: number; pnlPercent: number } {
  const pnl = Math.round((currentValue - investedAmount) * 100) / 100
  const pnlPercent =
    investedAmount > 0 ? Math.round((pnl / investedAmount) * 10000) / 100 : 0
  return { pnl, pnlPercent }
}

// ─── Gold Loan Calculation ────────────────────────────────────────────────────

/**
 * Calculate eligible gold loan amount
 */
export function calculateGoldLoanAmount(
  weightGrams: number,
  purityKarat: number,
  goldRatePerGram: number,
  ltvPercent: number
): number {
  const purityFactor = purityKarat / 24
  const goldValue = weightGrams * purityFactor * goldRatePerGram
  return Math.round(goldValue * (ltvPercent / 100) * 100) / 100
}
