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

    // ── Investment aggregates — NET = BUY - SELL ────────────────────────────────

    const [buyTotalAgg, sellTotalAgg] = await Promise.all([
      prisma.investmentEntry.aggregate({ where: { txnType: 'BUY' },  _sum: { amount: true } }),
      prisma.investmentEntry.aggregate({ where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const totalInvested = (buyTotalAgg._sum.amount ?? 0) - (sellTotalAgg._sum.amount ?? 0)

    // By type — net per type (for Portfolio Allocation)
    const [byTypeBuy, byTypeSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['type'], where: { txnType: 'BUY' },  _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['type'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByTypeMap = new Map(byTypeSell.map(r => [r.type, r._sum.amount ?? 0]))
    const investmentBreakdown = byTypeBuy
      .map(r => ({
        type:     r.type as string,
        invested: (r._sum.amount ?? 0) - (sellByTypeMap.get(r.type) ?? 0),
      }))
      .filter(r => r.invested > 0)

    // By year — net invested per year
    const byDateRaw = await prisma.investmentEntry.groupBy({
      by: ['date', 'txnType'],
      _sum: { amount: true },
    })
    const byYearMap = new Map<number, number>()
    for (const row of byDateRaw) {
      const yr = new Date(row.date).getFullYear()
      const sign = row.txnType === 'SELL' ? -1 : 1
      byYearMap.set(yr, (byYearMap.get(yr) ?? 0) + sign * (row._sum.amount ?? 0))
    }
    const byYear = Array.from(byYearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, invested]) => ({ year, invested }))

    // By account — net per account
    const [byAccountBuy, byAccountSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['account'], where: { txnType: 'BUY' },  _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['account'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByAccountMap = new Map(byAccountSell.map(r => [r.account, r._sum.amount ?? 0]))
    const byAccount = byAccountBuy.map(r => ({
      account:  r.account ?? 'Other',
      invested: (r._sum.amount ?? 0) - (sellByAccountMap.get(r.account) ?? 0),
    }))

    // By owner — net per owner
    const [byOwnerBuy, byOwnerSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['owner'], where: { txnType: 'BUY' },  _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['owner'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByOwnerMap = new Map(byOwnerSell.map(r => [r.owner, r._sum.amount ?? 0]))
    const byOwner = byOwnerBuy.map(r => ({
      owner:    r.owner ?? 'Unknown',
      invested: (r._sum.amount ?? 0) - (sellByOwnerMap.get(r.owner) ?? 0),
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
