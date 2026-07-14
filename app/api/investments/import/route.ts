// POST /api/investments/import — bulk import from CSV rows

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TYPE_MAP: Record<string, string> = {
  equity: 'STOCKS',
  'gold coin': 'GOLD',
  'gold etf': 'GOLD',
  lic: 'POLICY',
  sbi: 'POLICY',
  bond: 'BONDS',
  bonds: 'BONDS',
  mf: 'MF',
  fd: 'FD',
  ppf: 'PPF',
  cash: 'CASH',
  policy: 'POLICY',
  stocks: 'STOCKS',
  gold: 'GOLD',
}

const VALID_TYPES = ['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']

function normalizeType(raw: string): string {
  const mapped = TYPE_MAP[raw.toLowerCase().trim()]
  if (mapped) return mapped
  const upper = raw.toUpperCase().trim()
  return VALID_TYPES.includes(upper) ? upper : 'MF'
}

function parseIndianDate(raw: string): Date | null {
  // Handles: "4-Sep-21", "19-Apr-22", "2021-09-04", "04/09/2021"
  const parts = raw.trim().split(/[-/]/)
  if (parts.length !== 3) return null
  const attempt = new Date(raw)
  if (!isNaN(attempt.getTime())) return attempt
  return null
}

const RowSchema = z.object({
  date:    z.string(),
  name:    z.string().min(1),
  type:    z.string(),
  account: z.string().optional().nullable(),
  owner:   z.string().optional().nullable(),
  amount:  z.union([z.string(), z.number()]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows: unknown[] = body.rows ?? []

    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'No rows provided' }, { status: 400 })
    }

    const entries = []
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const raw = RowSchema.parse(rows[i])
        const date = parseIndianDate(raw.date)
        if (!date) { errors.push(`Row ${i + 1}: invalid date "${raw.date}"`); continue }

        const amtRaw = typeof raw.amount === 'string'
          ? parseFloat(raw.amount.replace(/[,₹\s]/g, ''))
          : raw.amount
        if (isNaN(amtRaw) || amtRaw <= 0) { errors.push(`Row ${i + 1}: invalid amount`); continue }

        entries.push({
          date,
          name:    raw.name.trim(),
          type:    normalizeType(raw.type) as any,
          account: raw.account?.trim() || null,
          owner:   raw.owner?.trim() || null,
          amount:  amtRaw,
        })
      } catch {
        errors.push(`Row ${i + 1}: parse error`)
      }
    }

    if (entries.length === 0) {
      return Response.json({ error: 'No valid rows to import', errors }, { status: 400 })
    }

    const result = await prisma.investmentEntry.createMany({ data: entries })

    return Response.json({
      imported: result.count,
      skipped: rows.length - result.count,
      errors,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/investments/import]', error)
    return Response.json({ error: 'Import failed' }, { status: 500 })
  }
}
