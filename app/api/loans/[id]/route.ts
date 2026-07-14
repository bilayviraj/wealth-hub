// GET/PUT/DELETE /api/loans/[id]

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  lenderName: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/loans/[id]'>
) {
  try {
    const { id } = await ctx.params
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { emiSchedule: { orderBy: { month: 'asc' } } },
    })
    if (!loan) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json(loan)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch loan' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/loans/[id]'>
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const loan = await prisma.loan.update({ where: { id }, data })
    return Response.json(loan)
  } catch (error) {
    return Response.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/loans/[id]'>
) {
  try {
    const { id } = await ctx.params
    await prisma.loan.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
