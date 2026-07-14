'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calculateEMI } from '@/lib/calculations'
import { formatCurrency } from '@/lib/utils'
import { CreditCard } from 'lucide-react'

const schema = z.object({
  principal: z.number().positive('Enter loan amount'),
  rate: z.number().positive().max(50),
})

type FormData = z.infer<typeof schema>

const TENURES = [6, 12, 18, 24, 36, 48, 60]

export default function PersonalLoanCalculator() {
  const [principal, setPrincipal] = useState<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { principal: 500000, rate: 14 },
  })

  const onSubmit = (data: FormData) => {
    setPrincipal(data.principal)
    setRate(data.rate)
  }

  const comparisons = (principal && rate) ? TENURES.map(t => ({
    tenure: t,
    emi: calculateEMI(principal, rate, t),
    totalPayment: calculateEMI(principal, rate, t) * t,
    totalInterest: calculateEMI(principal, rate, t) * t - principal,
  })) : []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Personal Loan Calculator</h1>
          <p className="page-header__subtitle">Compare EMIs across different tenures to find the optimal plan</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Input */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Loan Details</span>
            <CreditCard size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} id="personal-loan-calc-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Loan Amount (₹)</label>
                <input className={`input ${errors.principal ? 'error' : ''}`} type="number" step="10000"
                  {...register('principal', { valueAsNumber: true })} />
                {errors.principal && <span className="input-error">{errors.principal.message}</span>}
              </div>
              <div className="input-group">
                <label className="input-label">Interest Rate (% p.a.)</label>
                <input className={`input ${errors.rate ? 'error' : ''}`} type="number" step="0.1"
                  {...register('rate', { valueAsNumber: true })} />
                {errors.rate && <span className="input-error">{errors.rate.message}</span>}
              </div>
              <button type="submit" className="btn btn-primary w-full" id="personal-loan-calc-btn">Compare Tenures</button>
            </div>
          </form>
        </div>

        {/* Tenure comparison table */}
        <div>
          {comparisons.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Tenure Comparison</span>
                <span className="badge badge-info">{principal && formatCurrency(principal)} at {rate}%</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Tenure', 'Monthly EMI', 'Total Payment', 'Total Interest', 'Interest %'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row, idx) => {
                      const isOptimal = idx === 2 // 18-month often optimal balance
                      return (
                        <tr key={row.tenure} style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isOptimal ? 'rgba(99,102,241,0.07)' : undefined,
                          transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                          onMouseLeave={e => (e.currentTarget.style.background = isOptimal ? 'rgba(99,102,241,0.07)' : '')}
                        >
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <span style={{ fontWeight: 600 }}>{row.tenure} months</span>
                            {isOptimal && <span className="badge badge-primary" style={{ marginLeft: '0.5rem', fontSize: '0.6875rem' }}>Recommended</span>}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{formatCurrency(row.emi)}</td>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{formatCurrency(row.totalPayment)}</td>
                          <td style={{ padding: '0.875rem 1rem', color: 'var(--color-warning)', fontWeight: 600 }}>{formatCurrency(row.totalInterest)}</td>
                          <td style={{ padding: '0.875rem 1rem', color: 'var(--color-text-secondary)' }}>
                            {principal ? ((row.totalInterest / principal) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-state__icon"><CreditCard size={28} /></div>
              <div className="empty-state__title">Enter loan details</div>
              <p>We'll compare EMIs across 6 different tenure options for you</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
