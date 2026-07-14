'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateAmortization } from '@/lib/calculations'
import { formatCurrency } from '@/lib/utils'
import type { AmortizationRow } from '@/types'
import { Calculator } from 'lucide-react'

ModuleRegistry.registerModules([AllCommunityModule])

const schema = z.object({
  principal: z.number().positive('Enter loan amount'),
  rate: z.number().positive('Enter interest rate').max(50),
  tenureYears: z.number().int().positive('Enter tenure in years').max(30),
})

type FormData = z.infer<typeof schema>

const colDefs: ColDef<AmortizationRow>[] = [
  { field: 'month', headerName: 'Month', width: 90 },
  { field: 'emi', headerName: 'EMI (₹)', width: 140, cellRenderer: (p: any) => formatCurrency(p.value) },
  { field: 'principal', headerName: 'Principal (₹)', width: 150, cellRenderer: (p: any) => formatCurrency(p.value) },
  {
    field: 'interest', headerName: 'Interest (₹)', width: 150,
    cellRenderer: (p: any) => <span style={{ color: 'var(--color-warning)' }}>{formatCurrency(p.value)}</span>,
  },
  {
    field: 'balance', headerName: 'Balance (₹)', width: 160,
    cellRenderer: (p: any) => <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(p.value)}</span>,
  },
]

export default function HomeLoanCalculator() {
  const [result, setResult] = useState<{ emi: number; totalPayment: number; totalInterest: number; amortization: AmortizationRow[] } | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { principal: 5000000, rate: 8.5, tenureYears: 20 },
  })

  const onSubmit = (data: FormData) => {
    const r = generateAmortization(data.principal, data.rate, data.tenureYears * 12, new Date())
    setResult(r)
  }

  return (
    <div>
      <div style={{ marginTop: '0.5rem' }}></div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Input panel */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Loan Details</span>
            <Calculator size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} id="home-loan-calc-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Loan Amount (₹)</label>
                <input className={`input ${errors.principal ? 'error' : ''}`} type="number" step="10000"
                  {...register('principal', { valueAsNumber: true })} />
                {errors.principal && <span className="input-error">{errors.principal.message}</span>}
              </div>
              <div className="input-group">
                <label className="input-label">Interest Rate (% p.a.)</label>
                <input className={`input ${errors.rate ? 'error' : ''}`} type="number" step="0.01"
                  {...register('rate', { valueAsNumber: true })} />
                {errors.rate && <span className="input-error">{errors.rate.message}</span>}
              </div>
              <div className="input-group">
                <label className="input-label">Tenure (Years)</label>
                <input className={`input ${errors.tenureYears ? 'error' : ''}`} type="number" step="1"
                  {...register('tenureYears', { valueAsNumber: true })} />
                {errors.tenureYears && <span className="input-error">{errors.tenureYears.message}</span>}
              </div>
              <button type="submit" className="btn btn-primary w-full" id="home-loan-calc-btn" style={{ marginTop: '0.5rem' }}>
                Calculate
              </button>
            </div>
          </form>

          {result && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="divider" />
              {[
                { label: 'Monthly EMI', value: formatCurrency(result.emi), color: 'var(--color-primary-light)', big: true },
                { label: 'Total Payment', value: formatCurrency(result.totalPayment) },
                { label: 'Total Interest', value: formatCurrency(result.totalInterest), color: 'var(--color-warning)' },
                { label: 'Principal Amount', value: formatCurrency(result.totalPayment - result.totalInterest) },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: item.big ? 800 : 600, fontSize: item.big ? '1.125rem' : '0.875rem', color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amortization table */}
        <div>
          {result ? (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header">
                <span className="card-title">Amortization Schedule</span>
                <span className="badge badge-info">{result.amortization.length} payments</span>
              </div>
              <div className="ag-theme-quartz ag-theme-wealthhub" style={{ height: 480 }}>
                <AgGridReact
                  theme="legacy"
                  rowData={result.amortization}
                  columnDefs={colDefs}
                  pagination
                  paginationPageSize={24}
                />
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <div className="empty-state__icon"><Calculator size={28} /></div>
              <div className="empty-state__title">Enter details to calculate</div>
              <p>Fill in the loan details on the left to see your amortization schedule</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
