// GET /api/investments — returns current-year entries + all-time aggregated summary
// POST /api/investments — create one entry

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const EntrySchema = z.object({
  date:    z.string().min(1, 'Date required'),
  name:    z.string().min(1, 'Name required'),
  type:    z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']),
  txnType: z.enum(['BUY','SELL']).default('BUY'),
  account: z.string().optional().nullable(),
  owner:   z.string().optional().nullable(),
  amount:  z.number().positive('Amount must be positive'),
  notes:   z.string().optional().nullable(),
})

// Helper: compute net = sum(BUY) - sum(SELL) from two aggregate results
function netAmount(buySum: number, sellSum: number) {
  return buySum - sellSum
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type    = searchParams.get('type')
    const owner   = searchParams.get('owner')
    const account = searchParams.get('account')
    const txnType = searchParams.get('txnType')
    const yearParam = searchParams.get('year')

    const now = new Date()
    const currentYear = now.getFullYear()

    // ── Determine date range for grid entries ──────────────────────────────────
    const dateFilter = yearParam === 'all'
      ? {}
      : {
          date: {
            gte: new Date(`${yearParam ?? currentYear}-01-01`),
            lte: new Date(`${yearParam ?? currentYear}-12-31`),
          },
        }

    // ── Fetch filtered entries for the grid ────────────────────────────────────
    const entries = await prisma.investmentEntry.findMany({
      where: {
        ...(type    ? { type: type as any }       : {}),
        ...(owner   ? { owner }                   : {}),
        ...(account ? { account }                 : {}),
        ...(txnType ? { txnType: txnType as any } : {}),
        ...dateFilter,
      },
      orderBy: { date: 'desc' },
    })

    // ── All-time NET aggregates (BUY - SELL) ───────────────────────────────────

    const [buyTotalAgg, sellTotalAgg] = await Promise.all([
      prisma.investmentEntry.aggregate({ where: { txnType: 'BUY' }, _sum: { amount: true } }),
      prisma.investmentEntry.aggregate({ where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const totalAllTime = netAmount(buyTotalAgg._sum.amount ?? 0, sellTotalAgg._sum.amount ?? 0)

    // By year — group by date+txnType, then net per year
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
      .map(([year, invested]) => ({ year: String(year), invested }))

    // This year net
    const thisYearStart = new Date(`${currentYear}-01-01`)
    const thisYearEnd   = new Date(`${currentYear}-12-31`)
    const [buyYearAgg, sellYearAgg] = await Promise.all([
      prisma.investmentEntry.aggregate({ where: { txnType: 'BUY', date: { gte: thisYearStart, lte: thisYearEnd } }, _sum: { amount: true } }),
      prisma.investmentEntry.aggregate({ where: { txnType: 'SELL', date: { gte: thisYearStart, lte: thisYearEnd } }, _sum: { amount: true } }),
    ])
    const totalThisYear = netAmount(buyYearAgg._sum.amount ?? 0, sellYearAgg._sum.amount ?? 0)

    // This month net
    const thisMonthStart = new Date(currentYear, now.getMonth(), 1)
    const thisMonthEnd   = new Date(currentYear, now.getMonth() + 1, 0)
    const [buyMonthAgg, sellMonthAgg] = await Promise.all([
      prisma.investmentEntry.aggregate({ where: { txnType: 'BUY', date: { gte: thisMonthStart, lte: thisMonthEnd } }, _sum: { amount: true } }),
      prisma.investmentEntry.aggregate({ where: { txnType: 'SELL', date: { gte: thisMonthStart, lte: thisMonthEnd } }, _sum: { amount: true } }),
    ])
    const totalThisMonth = netAmount(buyMonthAgg._sum.amount ?? 0, sellMonthAgg._sum.amount ?? 0)

    // By type — net per type
    const [byTypeBuy, byTypeSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['type'], where: { txnType: 'BUY' }, _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['type'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByTypeMap = new Map(byTypeSell.map(r => [r.type, r._sum.amount ?? 0]))
    const byType = byTypeBuy.map(r => ({
      type:     r.type as string,
      invested: netAmount(r._sum.amount ?? 0, sellByTypeMap.get(r.type) ?? 0),
    })).filter(r => r.invested > 0)

    // By account — net per account
    const [byAccountBuy, byAccountSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['account'], where: { txnType: 'BUY' }, _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['account'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByAccountMap = new Map(byAccountSell.map(r => [r.account, r._sum.amount ?? 0]))
    const byAccount = byAccountBuy.map(r => ({
      account:  r.account ?? 'Other',
      invested: netAmount(r._sum.amount ?? 0, sellByAccountMap.get(r.account) ?? 0),
    }))

    // By owner — net per owner
    const [byOwnerBuy, byOwnerSell] = await Promise.all([
      prisma.investmentEntry.groupBy({ by: ['owner'], where: { txnType: 'BUY' }, _sum: { amount: true } }),
      prisma.investmentEntry.groupBy({ by: ['owner'], where: { txnType: 'SELL' }, _sum: { amount: true } }),
    ])
    const sellByOwnerMap = new Map(byOwnerSell.map(r => [r.owner, r._sum.amount ?? 0]))
    const byOwner = byOwnerBuy.map(r => ({
      owner:    r.owner ?? 'Unknown',
      invested: netAmount(r._sum.amount ?? 0, sellByOwnerMap.get(r.owner) ?? 0),
    }))

    // All investment names (for autocomplete)
    const allNames = await prisma.investmentEntry.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    })
    const uniqueNames = allNames.map(e => e.name)

    return Response.json({
      entries,
      summary: {
        totalAllTime,
        totalThisYear,
        totalThisMonth,
        byYear,
        byType,
        byAccount,
        byOwner,
        uniqueNames,
      },
    })
  } catch (error) {
    console.error('[GET /api/investments]', error)
    return Response.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = EntrySchema.parse(body)

    const entry = await prisma.investmentEntry.create({
      data: {
        date:    new Date(data.date),
        name:    data.name,
        type:    data.type,
        txnType: data.txnType,
        account: data.account ?? null,
        owner:   data.owner ?? null,
        amount:  data.amount,
        notes:   data.notes ?? null,
      },
    })

    return Response.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('[POST /api/investments]', error)
    return Response.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
