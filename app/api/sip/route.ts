// GET /api/sip — list all recurring schedules
// POST /api/sip — create recurring schedule

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ScheduleSchema = z.object({
  name:       z.string().min(1, 'Name required'),
  type:       z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']),
  account:    z.string().optional().nullable(),
  owner:      z.string().optional().nullable(),
  amount:     z.number().positive('Amount required'),
  frequency:  z.enum(['DAILY','WEEKLY','FIFTEEN_DAYS','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY']),
  dayOfMonth: z.number().int().min(1).max(28),
  startDate:  z.string().min(1),
  active:     z.boolean().optional().default(true),
  notes:      z.string().optional().nullable(),
})

export async function GET() {
  try {
    const schedules = await prisma.recurringSchedule.findMany({
      orderBy: { name: 'asc' },
    })
    return Response.json(schedules)
  } catch {
    return Response.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = ScheduleSchema.parse(body)

    const schedule = await prisma.recurringSchedule.create({
      data: {
        name:       data.name,
        type:       data.type,
        account:    data.account ?? null,
        owner:      data.owner ?? null,
        amount:     data.amount,
        frequency:  data.frequency,
        dayOfMonth: data.dayOfMonth,
        startDate:  new Date(data.startDate),
        active:     data.active ?? true,
        notes:      data.notes ?? null,
      },
    })

    return Response.json(schedule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
