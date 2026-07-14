// GET /api/salary — get current month salary
// POST /api/salary — upsert salary config

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SalarySchema = z.object({
  monthlyGross: z.number().positive(),
  monthlyNet: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
})

export async function GET() {
  try {
    const now = new Date()
    let salary = await prisma.salaryConfig.findFirst({
      where: { month: now.getMonth() + 1, year: now.getFullYear() },
    })
    if (!salary) {
      salary = await prisma.salaryConfig.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
    }
    return Response.json(salary)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch salary' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = SalarySchema.parse(body)

    const salary = await prisma.salaryConfig.upsert({
      where: { month_year: { month: data.month, year: data.year } },
      create: data,
      update: { monthlyGross: data.monthlyGross, monthlyNet: data.monthlyNet },
    })

    return Response.json(salary, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to save salary' }, { status: 500 })
  }
}
