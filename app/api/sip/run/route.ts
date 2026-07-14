// POST /api/sip/run — check due schedules and create investment entries

import { prisma } from '@/lib/prisma'
import { addDays, addMonths, addQuarters, addYears } from 'date-fns'

function isDue(schedule: {
  frequency: string
  dayOfMonth: number
  startDate: Date
  lastRun: Date | null
  active: boolean
}): boolean {
  if (!schedule.active) return false

  const today = new Date()
  const todayDay = today.getDate()

  // Check if today is the trigger day (only for month/year based frequencies)
  if (['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(schedule.frequency)) {
    if (todayDay !== schedule.dayOfMonth) return false
  }

  const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : null

  // If never run, check if startDate is in the past
  if (!lastRun) {
    return new Date(schedule.startDate) <= today
  }

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

export async function POST() {
  try {
    const schedules = await prisma.recurringSchedule.findMany({
      where: { active: true },
    })

    const due = schedules.filter(isDue)
    if (due.length === 0) {
      return Response.json({ created: 0, message: 'No schedules due today' })
    }

    const today = new Date()
    const entries = await prisma.$transaction(
      due.map(s =>
        prisma.investmentEntry.create({
          data: {
            date:    today,
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

    // Update lastRun for all triggered schedules
    await prisma.$transaction(
      due.map(s =>
        prisma.recurringSchedule.update({
          where: { id: s.id },
          data: { lastRun: today },
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
