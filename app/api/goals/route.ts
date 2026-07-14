// GET /api/goals — list all
// POST /api/goals — create new

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const GoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string(),
  priority: z.number().int().min(1).max(5).optional(),
  color: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }],
    })
    return Response.json(goals)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = GoalSchema.parse(body)
    const goal = await prisma.goal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount ?? 0,
        targetDate: new Date(data.targetDate),
        priority: data.priority ?? 1,
        color: data.color,
        notes: data.notes,
      },
    })
    return Response.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
