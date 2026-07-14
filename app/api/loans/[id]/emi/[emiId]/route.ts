// PATCH /api/loans/[id]/emi/[emiId] — toggle EMI paid status

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/loans/[id]/emi/[emiId]'>
) {
  try {
    const { emiId } = await ctx.params
    const body = await request.json()
    const { isPaid } = body

    const emi = await prisma.eMIPayment.update({
      where: { id: emiId },
      data: {
        isPaid,
        paidDate: isPaid ? new Date() : null,
      },
    })

    return Response.json(emi)
  } catch (error) {
    console.error('[PATCH /api/loans/[id]/emi/[emiId]]', error)
    return Response.json({ error: 'Failed to update EMI' }, { status: 500 })
  }
}
