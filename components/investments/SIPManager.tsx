'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Play, Pause, Trash2, CalendarClock } from 'lucide-react'
import type { RecurringSchedule } from '@/types'
import { formatCurrency, formatDate, formatDateInput, getInvestmentTypeLabel, getFrequencyLabel } from '@/lib/utils'
import { ACCOUNT_OPTIONS, OWNER_OPTIONS } from '@/app/investments/page'
import toast from 'react-hot-toast'

const schema = z.object({
  name:       z.string().min(1, 'Name required'),
  type:       z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']),
  account:    z.string().optional().nullable(),
  owner:      z.string().optional().nullable(),
  amount:     z.number({ error: 'Enter amount' }).positive(),
  frequency:  z.enum(['DAILY','WEEKLY','FIFTEEN_DAYS','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY']),
  dayOfMonth: z.number().int().min(1).max(28),
  startDate:  z.string().min(1),
  notes:      z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

const FREQ_OPTIONS = [
  { value: 'DAILY',       label: 'Daily' },
  { value: 'WEEKLY',      label: 'Weekly' },
  { value: 'FIFTEEN_DAYS',label: '15-days' },
  { value: 'MONTHLY',     label: 'Monthly' },
  { value: 'QUARTERLY',   label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY',      label: 'Yearly' },
]

const TYPE_OPTIONS = [
  { value: 'MF',     label: 'Mutual Fund (SIP)' },
  { value: 'PPF',    label: 'PPF' },
  { value: 'POLICY', label: 'Policy / Insurance' },
  { value: 'STOCKS', label: 'Stocks' },
  { value: 'FD',     label: 'Fixed Deposit' },
  { value: 'GOLD',   label: 'Gold' },
  { value: 'BONDS',  label: 'Bonds' },
  { value: 'CASH',   label: 'Cash' },
]

interface Props { onEntryCreated?: () => void }

export default function SIPManager({ onEntryCreated }: Props) {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'MF', frequency: 'MONTHLY', dayOfMonth: 10, owner: 'Viraj', startDate: formatDateInput(new Date()) },
  })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/sip'); setSchedules(await r.json())
    } catch { toast.error('Failed to load schedules') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const onSubmit = async (data: FormData) => {
    try {
      const r = await fetch('/api/sip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, account: data.account || null, owner: data.owner || null, notes: data.notes || null }),
      })
      if (!r.ok) throw new Error()
      toast.success('Schedule created')
      reset()
      setShowForm(false)
      fetch_()
    } catch { toast.error('Failed to create') }
  }

  const toggleActive = async (s: RecurringSchedule) => {
    try {
      await fetch(`/api/sip/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !s.active }),
      })
      toast.success(s.active ? 'Paused' : 'Activated')
      fetch_()
    } catch { toast.error('Failed to update') }
  }

  const runNow = async () => {
    try {
      const r = await fetch('/api/sip/run', { method: 'POST' })
      const data = await r.json()
      if (data.created > 0) {
        toast.success(`Created ${data.created} entry/entries`)
        onEntryCreated?.()
        fetch_()
      } else {
        toast.success('No schedules due today')
      }
    } catch { toast.error('Failed to run') }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await fetch(`/api/sip/${id}`, { method: 'DELETE' })
      toast.success('Deleted')
      fetch_()
    } catch { toast.error('Failed') }
  }

  const nextDue = (s: RecurringSchedule) => {
    const start = new Date(s.startDate)
    const lastRun = s.lastRun ? new Date(s.lastRun) : null
    
    if (!lastRun) {
      return start
    }
    
    const d = new Date(lastRun)
    if (s.frequency === 'DAILY') {
      d.setDate(d.getDate() + 1)
    } else if (s.frequency === 'WEEKLY') {
      d.setDate(d.getDate() + 7)
    } else if (s.frequency === 'FIFTEEN_DAYS') {
      d.setDate(d.getDate() + 15)
    } else if (s.frequency === 'MONTHLY') {
      d.setMonth(d.getMonth() + 1)
    } else if (s.frequency === 'QUARTERLY') {
      d.setMonth(d.getMonth() + 3)
    } else if (s.frequency === 'HALF_YEARLY') {
      d.setMonth(d.getMonth() + 6)
    } else if (s.frequency === 'YEARLY') {
      d.setFullYear(d.getFullYear() + 1)
    }
    return d
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} · SIPs, Policy premiums, PPF deposits auto-added to your investment entries.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={runNow} id="sip-run-now-btn"><Play size={13} /> Run Due Now</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)} id="sip-add-btn"><PlusCircle size={14} /> Add Schedule</button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>New Recurring Schedule</h3>
          <div className="form-grid">
            <div className="input-group span-2">
              <label className="input-label">Name <span className="required">*</span></label>
              <input className={`input ${errors.name ? 'error' : ''}`} placeholder="e.g. Mirae Asset ELSS, LIC Premium" {...register('name')} />
              {errors.name && <span className="input-error">{errors.name.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Type</label>
              <select className="select" {...register('type')}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Amount (₹) <span className="required">*</span></label>
              <input type="number" step="1" className={`input ${errors.amount ? 'error' : ''}`} placeholder="e.g. 5000" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <span className="input-error">{errors.amount.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Frequency</label>
              <select className="select" {...register('frequency')}>
                {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Day of Month (1–28)</label>
              <input type="number" min="1" max="28" className="input" {...register('dayOfMonth', { valueAsNumber: true })} />
            </div>
            <div className="input-group">
              <label className="input-label">Owner</label>
              <select className="select" {...register('owner')}>
                <option value="">—</option>
                {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Account</label>
              <select className="select" {...register('account')}>
                <option value="">—</option>
                {ACCOUNT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input type="date" className="input" {...register('startDate')} />
            </div>
            <div className="input-group">
              <label className="input-label">Notes</label>
              <input className="input" placeholder="Optional" {...register('notes')} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="sip-save-btn">
              {isSubmitting ? 'Saving…' : 'Create Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* Schedule list */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '2rem auto' }} />
      ) : schedules.length === 0 ? (
        <div className="empty-state">
          <CalendarClock size={36} style={{ margin: '0 auto 1rem', color: 'var(--color-text-muted)', display: 'block' }} />
          <div className="empty-state__title">No recurring schedules</div>
          <p>Add SIPs, LIC premiums, PPF deposits and they'll be auto-added each period.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {schedules.map(s => {
            const nd = nextDue(s)
            return (
              <div key={s.id} className="card" style={{
                padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                opacity: s.active ? 1 : 0.55, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {getInvestmentTypeLabel(s.type)}
                    {s.account && ` · ${s.account}`}
                    {s.owner && ` · ${s.owner}`}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>{formatCurrency(s.amount)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{getFrequencyLabel(s.frequency)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Next due</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatDate(nd.toISOString())}</div>
                </div>
                {s.lastRun && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Last run</div>
                    <div style={{ fontSize: '0.8rem' }}>{formatDate(s.lastRun)}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleActive(s)} title={s.active ? 'Pause' : 'Activate'}>
                    {s.active ? <Pause size={14} /> : <Play size={14} style={{ color: 'var(--color-success)' }} />}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => del(s.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
