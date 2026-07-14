'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDateInput } from '@/lib/utils'
import { calculateEMI } from '@/lib/calculations'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const schema = z.object({
  type: z.enum(['HOME', 'GOLD', 'PERSONAL', 'CAR', 'OTHER']),
  lenderName: z.string().min(1, 'Lender name is required'),
  principalAmount: z.number().positive('Must be positive'),
  interestRate: z.number().positive('Must be positive').max(100),
  tenureMonths: z.number().int().positive('Must be at least 1 month'),
  startDate: z.string().min(1, 'Start date required'),
  notes: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onSaved: () => void
  onCancel: () => void
}

export default function LoanForm({ onSaved, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'HOME',
      startDate: formatDateInput(new Date()),
      tenureMonths: 120,
    },
  })

  const [principal, interestRate, tenureMonths] = watch(['principalAmount', 'interestRate', 'tenureMonths'])
  const previewEMI = principal > 0 && interestRate > 0 && tenureMonths > 0
    ? calculateEMI(principal, interestRate, tenureMonths)
    : null

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success('Loan added with EMI schedule generated!')
      onSaved()
    } catch {
      toast.error('Failed to add loan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="loan-form">
      <div className="form-grid">
        <div className="input-group">
          <label className="input-label">Loan Type <span className="required">*</span></label>
          <select className={`select ${errors.type ? 'error' : ''}`} {...register('type')}>
            <option value="HOME">Home Loan</option>
            <option value="GOLD">Gold Loan</option>
            <option value="PERSONAL">Personal Loan</option>
            <option value="CAR">Car Loan</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Lender / Bank Name <span className="required">*</span></label>
          <input className={`input ${errors.lenderName ? 'error' : ''}`} placeholder="e.g. SBI, HDFC Bank" {...register('lenderName')} />
          {errors.lenderName && <span className="input-error">{errors.lenderName.message}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Principal Amount (₹) <span className="required">*</span></label>
          <input className={`input ${errors.principalAmount ? 'error' : ''}`} type="number" step="1" placeholder="0"
            {...register('principalAmount', { valueAsNumber: true })} />
          {errors.principalAmount && <span className="input-error">{errors.principalAmount.message}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Interest Rate (% p.a.) <span className="required">*</span></label>
          <input className={`input ${errors.interestRate ? 'error' : ''}`} type="number" step="0.01" placeholder="e.g. 8.5"
            {...register('interestRate', { valueAsNumber: true })} />
          {errors.interestRate && <span className="input-error">{errors.interestRate.message}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Tenure (months) <span className="required">*</span></label>
          <input className={`input ${errors.tenureMonths ? 'error' : ''}`} type="number" step="1" placeholder="e.g. 240"
            {...register('tenureMonths', { valueAsNumber: true })} />
          {errors.tenureMonths && <span className="input-error">{errors.tenureMonths.message}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Loan Start Date <span className="required">*</span></label>
          <input className="input" type="date" {...register('startDate')} />
        </div>

        <div className="input-group span-2">
          <label className="input-label">Notes</label>
          <textarea className="input textarea" rows={2} placeholder="Optional notes..." {...register('notes')} />
        </div>
      </div>

      {/* EMI Preview */}
      {previewEMI && (
        <div style={{
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 'var(--border-radius)',
          padding: '1rem 1.25rem',
          marginTop: '1rem',
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Monthly EMI</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary-light)' }}>{formatCurrency(previewEMI)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Total Payment</div>
            <div style={{ fontWeight: 600 }}>{formatCurrency(previewEMI * tenureMonths)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Total Interest</div>
            <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{formatCurrency(previewEMI * tenureMonths - principal)}</div>
          </div>
        </div>
      )}

      <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} id="loan-form-cancel">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting} id="loan-form-submit">
          {submitting ? 'Creating...' : 'Add Loan & Generate Schedule'}
        </button>
      </div>
    </form>
  )
}
