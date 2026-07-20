'use client'

import { useForm, useController } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { InvestmentEntry } from '@/types'
import { formatDateInput } from '@/lib/utils'
import { ACCOUNT_OPTIONS, OWNER_OPTIONS } from '@/app/investments/page'
import toast from 'react-hot-toast'

const schema = z.object({
  date:    z.string().min(1, 'Date required'),
  name:    z.string().min(1, 'Investment name required'),
  type:    z.enum(['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH']),
  account: z.string().optional().nullable(),
  owner:   z.string().optional().nullable(),
  amount:  z.number({ error: 'Enter a valid amount' }).positive('Must be positive'),
  notes:   z.string().optional().nullable(),
})

type TxnType = 'BUY' | 'SELL'

type FormData = z.infer<typeof schema>

interface Props {
  initial?: InvestmentEntry | null
  uniqueNames?: string[]
  onSaved: () => void
  onCancel: () => void
}

const TYPE_OPTIONS = [
  { value: 'MF',     label: 'Mutual Fund' },
  { value: 'STOCKS', label: 'Stocks / Equity' },
  { value: 'PPF',    label: 'PPF' },
  { value: 'FD',     label: 'Fixed Deposit' },
  { value: 'POLICY', label: 'Policy / Insurance' },
  { value: 'GOLD',   label: 'Gold' },
  { value: 'BONDS',  label: 'Bonds' },
  { value: 'CASH',   label: 'Cash' },
]

// ── Custom combobox field ──────────────────────────────────────────────────────
interface NameComboboxProps {
  value: string
  onChange: (val: string) => void
  suggestions: string[]
  hasError: boolean
}

function NameCombobox({ value, onChange, suggestions, hasError }: NameComboboxProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase())
  )

  const select = useCallback((name: string) => {
    onChange(name)
    setOpen(false)
    setActiveIdx(-1)
  }, [onChange])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && filtered.length > 0) { setOpen(true); setActiveIdx(0) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      select(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className={`input ${hasError ? 'error' : ''}`}
        placeholder="e.g. Mirae Asset ELSS Tax Saver, PPF, 10g Gold"
        value={value}
        autoComplete="off"
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
          setActiveIdx(-1)
        }}
        onFocus={() => { if (filtered.length > 0) setOpen(true) }}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        role="combobox"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 2000,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 220,
            overflowY: 'auto',
            margin: 0,
            padding: '4px 0',
            listStyle: 'none',
          }}
        >
          {filtered.map((name, idx) => (
            <li
              key={name}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={() => select(name)}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                padding: '8px 14px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                color: 'var(--color-text)',
                background: idx === activeIdx ? 'var(--bg-overlay)' : 'transparent',
                transition: 'background 0.1s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function InvestmentForm({ initial, uniqueNames = [], onSaved, onCancel }: Props) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initial
      ? {
          date:    formatDateInput(initial.date),
          name:    initial.name,
          type:    initial.type,
          account: initial.account ?? '',
          owner:   initial.owner ?? '',
          amount:  initial.amount,
          notes:   initial.notes ?? '',
        }
      : {
          date:    formatDateInput(new Date()),
          type:    'MF',
          owner:   'Viraj',
        },
  })

  const [txnType, setTxnType] = useState<TxnType>(initial?.txnType === 'SELL' ? 'SELL' : 'BUY')
  const isSell = txnType === 'SELL'

  const { field: nameField } = useController({ name: 'name', control, defaultValue: '' })

  const onSubmit = async (data: FormData) => {
    try {
      const url    = initial ? `/api/investments/${initial.id}` : '/api/investments'
      const method = initial ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          txnType,
          account: data.account || null,
          owner:   data.owner   || null,
          notes:   data.notes   || null,
        }),
      })

      if (!res.ok) throw new Error()
      toast.success(initial ? 'Entry updated' : (isSell ? 'Redemption recorded' : 'Entry added'))
      onSaved()
    } catch {
      toast.error('Failed to save entry')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} id="inv-entry-form">
      {/* BUY / SELL toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setTxnType('BUY')}
          style={{
            flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '2px solid',
            borderColor: !isSell ? 'var(--color-success)' : 'var(--border-default)',
            background: !isSell ? 'var(--color-success-bg)' : 'transparent',
            color: !isSell ? 'var(--color-success)' : 'var(--color-text-secondary)',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          📈 BUY / Invest
        </button>
        <button
          type="button"
          onClick={() => setTxnType('SELL')}
          style={{
            flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '2px solid',
            borderColor: isSell ? 'var(--color-danger)' : 'var(--border-default)',
            background: isSell ? 'var(--color-danger-bg)' : 'transparent',
            color: isSell ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          📉 SELL / Redeem
        </button>
      </div>
      {isSell && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--border-radius)', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
          ⚠️ This will record a redemption/exit. The amount will be subtracted from your net invested total.
        </div>
      )}
      <div className="form-grid">

        {/* Date */}
        <div className="input-group">
          <label className="input-label">Date <span className="required">*</span></label>
          <input type="date" className={`input ${errors.date ? 'error' : ''}`} {...register('date')} />
          {errors.date && <span className="input-error">{errors.date.message}</span>}
        </div>

        {/* Type */}
        <div className="input-group">
          <label className="input-label">Type <span className="required">*</span></label>
          <select className={`select ${errors.type ? 'error' : ''}`} {...register('type')}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {errors.type && <span className="input-error">{errors.type.message}</span>}
        </div>

        {/* Name — custom combobox */}
        <div className="input-group span-2">
          <label className="input-label">Investment Name <span className="required">*</span></label>
          <NameCombobox
            value={nameField.value ?? ''}
            onChange={nameField.onChange}
            suggestions={uniqueNames}
            hasError={!!errors.name}
          />
          {errors.name && <span className="input-error">{errors.name.message}</span>}
        </div>

        {/* Amount */}
        <div className="input-group">
          <label className="input-label">{isSell ? 'Redemption Value (₹)' : 'Amount (₹)'} <span className="required">*</span></label>
          <input type="number" step="1" className={`input ${errors.amount ? 'error' : ''}`}
            placeholder={isSell ? 'e.g. 15000' : 'e.g. 25000'}
            style={isSell ? { borderColor: 'var(--color-danger)' } : {}}
            {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <span className="input-error">{errors.amount.message}</span>}
        </div>

        {/* Owner */}
        <div className="input-group">
          <label className="input-label">Owner</label>
          <select className="select" {...register('owner')}>
            <option value="">— Select owner —</option>
            {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Account */}
        <div className="input-group">
          <label className="input-label">Account / Platform</label>
          <select className="select" {...register('account')}>
            <option value="">— Select account —</option>
            {ACCOUNT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div className="input-group">
          <label className="input-label">Notes</label>
          <input className="input" placeholder={isSell ? 'e.g. Partial redemption – 100 units @ ₹52' : 'Optional notes'} {...register('notes')} />
        </div>

      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}
          style={isSell ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}}
          id="inv-save-btn">
          {isSubmitting ? 'Saving…' : initial ? 'Update Entry' : isSell ? 'Record Redemption' : 'Add Entry'}
        </button>
      </div>
    </form>
  )
}
