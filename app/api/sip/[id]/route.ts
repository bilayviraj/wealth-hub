// PUT /api/sip/[id] — update schedule
// DELETE /api/sip/[id] — delete schedule

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  name:       z.string().min(1).optional(),
  type:       z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']).optional(),
  account:    z.string().optional().nullable(),
  owner:      z.string().optional().nullable(),
  amount:     z.number().positive().optional(),
  frequency:  z.enum(['DAILY','WEEKLY','FIFTEEN_DAYS','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY']).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  startDate:  z.string().optional(),
  lastRun:    z.string().nullable().optional(),
  active:     z.boolean().optional(),
  notes:      z.string().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/sip/[id]'>
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    // Convert date strings → Date objects for Prisma
    const prismaData = {
      ...data,
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      // lastRun: null resets the cadence so schedule restarts from startDate
      ...('lastRun' in data ? { lastRun: data.lastRun ? new Date(data.lastRun) : null } : {}),
    }

    const schedule = await prisma.recurringSchedule.update({
      where: { id },
      data: prismaData,
    })

    return Response.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/sip/[id]'>
) {
  try {
    const { id } = await ctx.params
    await prisma.recurringSchedule.delete({ where: { id } })
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
