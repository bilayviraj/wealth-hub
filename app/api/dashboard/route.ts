// GET /api/dashboard — aggregated stats, uses DB-level groupBy — no full table scan

import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'

export async function GET() {
  try {
    const [loans, goals, salary] = await Promise.all([
      prisma.loan.findMany({ include: { emiSchedule: { orderBy: { month: 'asc' } } } }),
      prisma.goal.findMany({ orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }] }),
      prisma.salaryConfig.findFirst({ orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    ])

    // ── Investment aggregates via groupBy — no full row scan ───────────────────

    // Total invested (all-time)
    const totalAgg = await prisma.investmentEntry.aggregate({
      _sum: { amount: true },
    })
    const totalInvested = totalAgg._sum.amount ?? 0

    // By type (all-time)
    const byTypeRaw = await prisma.investmentEntry.groupBy({
      by: ['type'],
      _sum: { amount: true },
    })
    const investmentBreakdown = byTypeRaw.map(r => ({
      type:     r.type as string,
      invested: r._sum.amount ?? 0,
    }))

    // By year — groupBy returns one row per distinct date value, collapse by year
    const byDateRaw = await prisma.investmentEntry.groupBy({
      by: ['date'],
      _sum: { amount: true },
    })
    const byYearMap = new Map<number, number>()
    for (const row of byDateRaw) {
      const yr = new Date(row.date).getFullYear()
      byYearMap.set(yr, (byYearMap.get(yr) ?? 0) + (row._sum.amount ?? 0))
    }
    const byYear = Array.from(byYearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, invested]) => ({ year, invested }))

    // By account (all-time)
    const byAccountRaw = await prisma.investmentEntry.groupBy({
      by: ['account'],
      _sum: { amount: true },
    })
    const byAccount = byAccountRaw.map(r => ({
      account:  r.account ?? 'Other',
      invested: r._sum.amount ?? 0,
    }))

    // By owner (all-time)
    const byOwnerRaw = await prisma.investmentEntry.groupBy({
      by: ['owner'],
      _sum: { amount: true },
    })
    const byOwner = byOwnerRaw.map(r => ({
      owner:    r.owner ?? 'Unknown',
      invested: r._sum.amount ?? 0,
    }))

    // ── Loan totals ──────────────────────────────────────────────────────────
    const totalMonthlyEMI = loans.reduce((s, l) => {
      const hasUnpaid = l.emiSchedule.some(e => !e.isPaid)
      return hasUnpaid ? s + l.emiAmount : s
    }, 0)

    const totalLoanOutstanding = loans.reduce((s, l) => {
      const unpaid = l.emiSchedule.filter(e => !e.isPaid)
      return s + (unpaid.length > 0 ? unpaid[unpaid.length - 1].balance : 0)
    }, 0)

    // Upcoming EMIs (next 30 days)
    const upcomingEMIs = loans
      .flatMap(l => l.emiSchedule
        .filter(e => !e.isPaid && new Date(e.dueDate) <= addDays(new Date(), 30))
        .map(e => ({ ...e, loan: l }))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)

    // ── Net worth ─────────────────────────────────────────────────────────────
    const netWorth = totalInvested - totalLoanOutstanding

    return Response.json({
      totalInvested,
      totalLoanOutstanding,
      netWorth,
      investmentBreakdown,
      byYear,
      byAccount,
      byOwner,
      upcomingEMIs,
      topGoals: goals.slice(0, 4),
      monthlySalary: salary,
      totalMonthlyEMI,
    })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return Response.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
