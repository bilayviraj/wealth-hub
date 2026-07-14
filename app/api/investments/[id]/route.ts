// PUT /api/investments/[id] — update entry
// DELETE /api/investments/[id] — delete entry

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  date:    z.string().optional(),
  name:    z.string().min(1).optional(),
  type:    z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']).optional(),
  account: z.string().optional().nullable(),
  owner:   z.string().optional().nullable(),
  amount:  z.number().positive().optional(),
  notes:   z.string().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/investments/[id]'>
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    const entry = await prisma.investmentEntry.update({
      where: { id },
      data: {
        ...(data.date    ? { date: new Date(data.date) } : {}),
        ...(data.name    !== undefined ? { name: data.name }       : {}),
        ...(data.type    !== undefined ? { type: data.type }       : {}),
        ...(data.account !== undefined ? { account: data.account } : {}),
        ...(data.owner   !== undefined ? { owner: data.owner }     : {}),
        ...(data.amount  !== undefined ? { amount: data.amount }   : {}),
        ...(data.notes   !== undefined ? { notes: data.notes }     : {}),
      },
    })

    return Response.json(entry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/investments/[id]'>
) {
  try {
    const { id } = await ctx.params
    await prisma.investmentEntry.delete({ where: { id } })
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
