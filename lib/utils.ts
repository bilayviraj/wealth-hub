// ─── Currency Formatter ───────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_00_00_000) {
      return `₹${(value / 1_00_00_000).toFixed(2)}Cr`
    }
    if (Math.abs(value) >= 1_00_000) {
      return `₹${(value / 1_00_000).toFixed(2)}L`
    }
    if (Math.abs(value) >= 1_000) {
      return `₹${(value / 1_000).toFixed(1)}K`
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Date Formatters ──────────────────────────────────────────────────────────

export function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateInput(dateStr: string | Date): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

// ─── Number Formatters ────────────────────────────────────────────────────────

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

export function getPnLColor(value: number): string {
  if (value > 0) return 'var(--color-success)'
  if (value < 0) return 'var(--color-danger)'
  return 'var(--color-text-secondary)'
}

export function getInvestmentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    FD:     '#6366f1',
    MF:     '#8b5cf6',
    STOCKS: '#10b981',
    GOLD:   '#f59e0b',
    BONDS:  '#3b82f6',
    POLICY: '#ec4899',
    PPF:    '#14b8a6',
    CASH:   '#64748b',
  }
  return colors[type] ?? '#64748b'
}

export function getInvestmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FD:     'Fixed Deposit',
    MF:     'Mutual Fund',
    STOCKS: 'Stocks',
    GOLD:   'Gold',
    BONDS:  'Bonds',
    POLICY: 'Policy / Insurance',
    PPF:    'PPF',
    CASH:   'Cash',
  }
  return labels[type] ?? type
}

export function getFrequencyLabel(freq: string): string {
  const labels: Record<string, string> = {
    DAILY:      'Daily',
    WEEKLY:     'Weekly',
    FIFTEEN_DAYS:'15-days',
    MONTHLY:    'Monthly',
    QUARTERLY:  'Quarterly',
    HALF_YEARLY:'Half-Yearly',
    YEARLY:     'Yearly',
  }
  return labels[freq] ?? freq
}

// Returns activity status based on most recent investment date
export type ActivityStatus = 'last_month' | 'last_3m' | 'last_year' | 'inactive'

export function getActivityStatus(lastDate: string | Date | null | undefined): ActivityStatus {
  if (!lastDate) return 'inactive'
  const days = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 30)  return 'last_month'
  if (days <= 90)  return 'last_3m'
  if (days <= 365) return 'last_year'
  return 'inactive'
}

export function getActivityBadge(status: ActivityStatus): { label: string; color: string } {
  switch (status) {
    case 'last_month': return { label: 'Last Month',   color: 'var(--color-success)' }
    case 'last_3m':    return { label: 'Last 3 Months', color: 'var(--color-warning)' }
    case 'last_year':  return { label: 'Last Year',    color: '#f97316' }
    case 'inactive':   return { label: 'Inactive',     color: 'var(--color-danger)' }
  }
}

export function getLoanTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    HOME: 'Home Loan',
    GOLD: 'Gold Loan',
    PERSONAL: 'Personal Loan',
    CAR: 'Car Loan',
    OTHER: 'Other Loan',
  }
  return labels[type] ?? type
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error ?? 'Request failed')
  }
  return res.json()
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
