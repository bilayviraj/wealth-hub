'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calculateGoldLoanAmount, calculateEMI } from '@/lib/calculations'
import { formatCurrency } from '@/lib/utils'
import { Coins } from 'lucide-react'

const schema = z.object({
  weightGrams: z.number().positive('Enter gold weight'),
  purityKarat: z.number().min(1).max(24),
  goldRatePerGram: z.number().positive('Enter gold rate'),
  ltvPercent: z.number().positive().max(100),
  interestRate: z.number().positive().max(50),
  tenureMonths: z.number().int().positive().max(240),
})

type FormData = z.infer<typeof schema>

export default function GoldLoanCalculator() {
  const [result, setResult] = useState<{ eligible: number; emi: number; totalPayment: number; totalInterest: number } | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { purityKarat: 22, ltvPercent: 75, interestRate: 12, tenureMonths: 12, goldRatePerGram: 7500 },
  })

  const onSubmit = (data: FormData) => {
    const eligible = calculateGoldLoanAmount(data.weightGrams, data.purityKarat, data.goldRatePerGram, data.ltvPercent)
    const emi = calculateEMI(eligible, data.interestRate, data.tenureMonths)
    setResult({
      eligible,
      emi,
      totalPayment: emi * data.tenureMonths,
      totalInterest: emi * data.tenureMonths - eligible,
    })
  }

  return (
    <div>
      <div style={{ marginTop: '0.5rem' }}></div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Input */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Gold Details</span>
            <Coins size={16} style={{ color: 'var(--color-warning)' }} />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} id="gold-loan-calc-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Gold Weight (grams)</label>
                <input className={`input ${errors.weightGrams ? 'error' : ''}`} type="number" step="0.001" placeholder="e.g. 50"
                  {...register('weightGrams', { valueAsNumber: true })} />
                {errors.weightGrams && <span className="input-error">{errors.weightGrams.message}</span>}
              </div>
              <div className="input-group">
                <label className="input-label">Purity (karats)</label>
                <select className="select" {...register('purityKarat', { valueAsNumber: true })}>
                  <option value={24}>24K (Pure Gold)</option>
                  <option value={22}>22K</option>
                  <option value={18}>18K</option>
                  <option value={14}>14K</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Gold Rate per gram (₹)</label>
                <input className="input" type="number" step="1"
                  {...register('goldRatePerGram', { valueAsNumber: true })} />
              </div>
              <div className="input-group">
                <label className="input-label">LTV % (Loan-to-Value)</label>
                <input className="input" type="number" step="1" placeholder="75"
                  {...register('ltvPercent', { valueAsNumber: true })} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>RBI max is 75%</span>
              </div>
              <div className="input-group">
                <label className="input-label">Interest Rate (% p.a.)</label>
                <input className="input" type="number" step="0.01"
                  {...register('interestRate', { valueAsNumber: true })} />
              </div>
              <div className="input-group">
                <label className="input-label">Tenure (months)</label>
                <input className="input" type="number" step="1"
                  {...register('tenureMonths', { valueAsNumber: true })} />
              </div>
              <button type="submit" className="btn btn-primary w-full" id="gold-loan-calc-btn">Calculate</button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Eligible Loan Amount</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.03em' }}>
                  {formatCurrency(result.eligible)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {[
                  { label: 'Monthly EMI', value: result.emi, color: 'var(--color-primary-light)' },
                  { label: 'Total Payment', value: result.totalPayment, color: undefined },
                  { label: 'Total Interest', value: result.totalInterest, color: 'var(--color-warning)' },
                ].map(item => (
                  <div key={item.label} className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.125rem', color: item.color }}>{formatCurrency(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-state__icon"><Coins size={28} /></div>
              <div className="empty-state__title">Enter gold details</div>
              <p>Fill in the form to calculate your eligible loan amount</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
