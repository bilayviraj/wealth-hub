// POST /api/sip/run — check due schedules and create investment entries

import { prisma } from '@/lib/prisma'
import { addDays, addMonths, addQuarters, addYears, isSameDay } from 'date-fns'

function isDue(schedule: {
  frequency: string
  dayOfMonth: number
  startDate: Date
  lastRun: Date | null
  active: boolean
}): boolean {
  if (!schedule.active) return false

  const today = new Date()
  today.setHours(23, 59, 59, 999) // compare up to end of today

  const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : null

  // Check if today is the trigger day (only for month/year based frequencies)
  if (['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(schedule.frequency)) {
    const todayDay = new Date().getDate()
    if (todayDay !== schedule.dayOfMonth) return false
  }

  // If never run, check if startDate has arrived
  if (!lastRun) {
    return new Date(schedule.startDate) <= today
  }

  // Prevent duplicate run on same calendar day
  if (isSameDay(lastRun, new Date())) return false

  // Check if enough time has passed since last run based on frequency
  const lastRunDate = new Date(lastRun)
  switch (schedule.frequency) {
    case 'DAILY':
      return addDays(lastRunDate, 1) <= today
    case 'WEEKLY':
      return addDays(lastRunDate, 7) <= today
    case 'FIFTEEN_DAYS':
      return addDays(lastRunDate, 15) <= today
    case 'MONTHLY':
      return addMonths(lastRunDate, 1) <= today
    case 'QUARTERLY':
      return addQuarters(lastRunDate, 1) <= today
    case 'HALF_YEARLY':
      return addMonths(lastRunDate, 6) <= today
    case 'YEARLY':
      return addYears(lastRunDate, 1) <= today
    default:
      return false
  }
}

/** Returns the date the entry *should* be recorded on (the due date, not today). */
function entryDate(schedule: {
  frequency: string
  startDate: Date
  lastRun: Date | null
}): Date {
  const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : null

  // First ever run — use the start date as the entry date
  if (!lastRun) {
    return new Date(schedule.startDate)
  }

  // Subsequent runs — compute the next due date from last run
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

export async function POST() {
  try {
    const schedules = await prisma.recurringSchedule.findMany({
      where: { active: true },
    })

    const due = schedules.filter(isDue)
    if (due.length === 0) {
      return Response.json({ created: 0, message: 'No schedules due today' })
    }

    const entries = await prisma.$transaction(
      due.map(s =>
        prisma.investmentEntry.create({
          data: {
            date:    entryDate(s),   // use the scheduled due date, not today
            name:    s.name,
            type:    s.type,
            account: s.account,
            owner:   s.owner,
            amount:  s.amount,
            notes:   `Auto-created by recurring schedule`,
          },
        })
      )
    )

    // Update lastRun to the entry due date (preserves cadence based on startDate)
    await prisma.$transaction(
      due.map(s =>
        prisma.recurringSchedule.update({
          where: { id: s.id },
          data: { lastRun: entryDate(s) },  // KEY FIX: store due date, not today
        })
      )
    )

    return Response.json({
      created: entries.length,
      entries: entries.map(e => ({ id: e.id, name: e.name, amount: e.amount })),
    })
  } catch (error) {
    console.error('[POST /api/sip/run]', error)
    return Response.json({ error: 'Failed to run schedules' }, { status: 500 })
  }
}
