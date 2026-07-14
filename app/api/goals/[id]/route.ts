// GET/PUT/DELETE /api/goals/[id]

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  color: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/goals/[id]'>
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    })
    return Response.json(goal)
  } catch (error) {
    return Response.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/goals/[id]'>
) {
  try {
    const { id } = await ctx.params
    await prisma.goal.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
