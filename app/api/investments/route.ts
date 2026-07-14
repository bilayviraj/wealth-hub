// GET /api/investments — returns current-year entries + all-time aggregated summary
// POST /api/investments — create one entry

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const EntrySchema = z.object({
  date:    z.string().min(1, 'Date required'),
  name:    z.string().min(1, 'Name required'),
  type:    z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']),
  account: z.string().optional().nullable(),
  owner:   z.string().optional().nullable(),
  amount:  z.number().positive('Amount must be positive'),
  notes:   z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type    = searchParams.get('type')
    const owner   = searchParams.get('owner')
    const account = searchParams.get('account')
    const yearParam = searchParams.get('year')

    const now = new Date()
    const currentYear = now.getFullYear()

    // ── Determine date range for grid entries ──────────────────────────────────
    // Default to current year; pass year=all to skip date filter
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
        ...(type    ? { type: type as any } : {}),
        ...(owner   ? { owner }             : {}),
        ...(account ? { account }           : {}),
        ...dateFilter,
      },
      orderBy: { date: 'desc' },
    })

    // ── All-time aggregates via groupBy (no full table scan in JS) ─────────────

    // Total invested all-time
    const totalAgg = await prisma.investmentEntry.aggregate({
      _sum: { amount: true },
    })
    const totalAllTime = totalAgg._sum.amount ?? 0

    // By year (all years)
    const byYearRaw = await prisma.investmentEntry.groupBy({
      by: ['date'],
      _sum: { amount: true },
    })
    // Collapse by calendar year
    const byYearMap = new Map<number, number>()
    for (const row of byYearRaw) {
      const yr = new Date(row.date).getFullYear()
      byYearMap.set(yr, (byYearMap.get(yr) ?? 0) + (row._sum.amount ?? 0))
    }
    const byYear = Array.from(byYearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, invested]) => ({ year: String(year), invested }))

    // This year total
    const thisYearStart = new Date(`${currentYear}-01-01`)
    const thisYearEnd   = new Date(`${currentYear}-12-31`)
    const thisYearAgg = await prisma.investmentEntry.aggregate({
      where: { date: { gte: thisYearStart, lte: thisYearEnd } },
      _sum: { amount: true },
    })
    const totalThisYear = thisYearAgg._sum.amount ?? 0

    // This month total
    const thisMonthStart = new Date(currentYear, now.getMonth(), 1)
    const thisMonthEnd   = new Date(currentYear, now.getMonth() + 1, 0)
    const thisMonthAgg = await prisma.investmentEntry.aggregate({
      where: { date: { gte: thisMonthStart, lte: thisMonthEnd } },
      _sum: { amount: true },
    })
    const totalThisMonth = thisMonthAgg._sum.amount ?? 0

    // By type (all-time)
    const byTypeRaw = await prisma.investmentEntry.groupBy({
      by: ['type'],
      _sum: { amount: true },
    })
    const byType = byTypeRaw.map(r => ({
      type:     r.type as string,
      invested: r._sum.amount ?? 0,
    }))

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

    // All investment names (for autocomplete) — lightweight
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
