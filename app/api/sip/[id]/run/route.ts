// POST /api/sip/[id]/run — force-run a single schedule immediately (bypasses isDue check)

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Returns the date the entry should be recorded on. */
function entryDate(schedule: {
  frequency: string
  startDate: Date
  lastRun: Date | null
}): Date {
  const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : null

  // First ever run — use startDate
  if (!lastRun) return new Date(schedule.startDate)

  // Subsequent runs — next due date from lastRun
  const d = new Date(lastRun)
  switch (schedule.frequency) {
    case 'DAILY':        d.setDate(d.getDate() + 1); break
    case 'WEEKLY':       d.setDate(d.getDate() + 7); break
    case 'FIFTEEN_DAYS': d.setDate(d.getDate() + 15); break
    case 'MONTHLY':      d.setMonth(d.getMonth() + 1); break
    case 'QUARTERLY':    d.setMonth(d.getMonth() + 3); break
    case 'HALF_YEARLY':  d.setMonth(d.getMonth() + 6); break
    case 'YEARLY':       d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/sip/[id]/run'>
) {
  try {
    const { id } = await ctx.params

    const schedule = await prisma.recurringSchedule.findUnique({ where: { id } })
    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const due = entryDate(schedule)

    const entry = await prisma.investmentEntry.create({
      data: {
        date:    due,
        name:    schedule.name,
        type:    schedule.type,
        account: schedule.account,
        owner:   schedule.owner,
        amount:  schedule.amount,
        notes:   `Auto-created by recurring schedule (manual run)`,
      },
    })

    // Update lastRun to the scheduled due date to preserve cadence
    await prisma.recurringSchedule.update({
      where: { id },
      data:  { lastRun: due },
    })

    return Response.json({ created: 1, entry: { id: entry.id, name: entry.name, amount: entry.amount } })
  } catch (error) {
    console.error('[POST /api/sip/[id]/run]', error)
    return Response.json({ error: 'Failed to run schedule' }, { status: 500 })
  }
}
