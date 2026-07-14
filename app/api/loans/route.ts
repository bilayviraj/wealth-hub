// GET /api/loans — list all loans
// POST /api/loans — create new loan + generate EMI schedule

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAmortization } from '@/lib/calculations'
import { z } from 'zod'
import { addMonths } from 'date-fns'

const LoanSchema = z.object({
  type: z.enum(['HOME', 'GOLD', 'PERSONAL', 'CAR', 'OTHER']),
  lenderName: z.string().min(1),
  principalAmount: z.number().positive(),
  interestRate: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  startDate: z.string(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { emiSchedule: { orderBy: { month: 'asc' } } },
    })
    return Response.json(loans)
  } catch (error) {
    console.error('[GET /api/loans]', error)
    return Response.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = LoanSchema.parse(body)
    const startDate = new Date(data.startDate)

    const { emi, amortization } = generateAmortization(
      data.principalAmount,
      data.interestRate,
      data.tenureMonths,
      startDate
    )

    const loan = await prisma.loan.create({
      data: {
        type: data.type,
        lenderName: data.lenderName,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenureMonths: data.tenureMonths,
        startDate,
        emiAmount: emi,
        notes: data.notes,
        emiSchedule: {
          create: amortization.map((row, idx) => ({
            month: row.month,
            dueDate: addMonths(startDate, idx + 1),
            principal: row.principal,
            interest: row.interest,
            balance: row.balance,
            isPaid: false,
          })),
        },
      },
      include: { emiSchedule: { orderBy: { month: 'asc' } } },
    })

    return Response.json(loan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('[POST /api/loans]', error)
    return Response.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
