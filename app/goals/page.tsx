'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, RefreshCw, Pencil, Trash2, Target, Wallet, Save } from 'lucide-react'
import type { Goal, SalaryConfig } from '@/types'
import { formatCurrency, formatDate, formatDateInput, getPnLColor } from '@/lib/utils'
import { monthlySavingsNeeded, goalProgress, monthsRemaining } from '@/lib/calculations'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const GOAL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316']

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name required'),
  targetAmount: z.number().positive('Must be positive'),
  currentAmount: z.number().min(0),
  targetDate: z.string().min(1, 'Target date required'),
  priority: z.number().int().min(1).max(5),
  color: z.string().optional(),
  notes: z.string().optional().nullable(),
})

const salarySchema = z.object({
  monthlyGross: z.number().positive('Enter gross salary'),
  monthlyNet: z.number().positive('Enter net salary'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
})

type GoalFormData = z.infer<typeof goalSchema>
type SalaryFormData = z.infer<typeof salarySchema>

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [salary, setSalary] = useState<SalaryConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [totalMonthlyEMI, setTotalMonthlyEMI] = useState(0)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [goalsRes, salaryRes, loansRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/salary'),
        fetch('/api/loans'),
      ])
      setGoals(await goalsRes.json())
      setSalary(await salaryRes.json())
      const loans = await loansRes.json()
      const emi = loans.reduce((s: number, l: any) => {
        const hasUnpaid = l.emiSchedule?.some((e: any) => !e.isPaid)
        return hasUnpaid ? s + l.emiAmount : s
      }, 0)
      setTotalMonthlyEMI(emi)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Budget calculations
  const monthlyNet = salary?.monthlyNet ?? 0
  const totalMonthlySavings = goals.reduce((s, g) => {
    return s + monthlySavingsNeeded(g.targetAmount, g.currentAmount, new Date(g.targetDate))
  }, 0)
  const surplus = monthlyNet - totalMonthlyEMI - totalMonthlySavings

  // Goal form
  const { register: regGoal, handleSubmit: hsGoal, reset: resetGoal, setValue: svGoal, watch: watchGoal, formState: { errors: errGoal } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: { priority: 3, color: GOAL_COLORS[0], currentAmount: 0 },
  })

  const selectedColor = watchGoal('color')

  const openAddGoal = () => { setEditGoal(null); resetGoal({ priority: 3, color: GOAL_COLORS[0], currentAmount: 0 }); setGoalModalOpen(true) }
  const openEditGoal = (g: Goal) => {
    setEditGoal(g)
    resetGoal({
      name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount,
      targetDate: formatDateInput(g.targetDate), priority: g.priority,
      color: g.color ?? GOAL_COLORS[0], notes: g.notes ?? '',
    })
    setGoalModalOpen(true)
  }

  const onGoalSubmit = async (data: GoalFormData) => {
    try {
      const url = editGoal ? `/api/goals/${editGoal.id}` : '/api/goals'
      const method = editGoal ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success(editGoal ? 'Goal updated!' : 'Goal added!')
      setGoalModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Failed to save goal')
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    toast.success('Goal deleted')
    fetchAll()
  }

  // Salary form
  const now = new Date()
  const { register: regSalary, handleSubmit: hsSalary, formState: { errors: errSalary } } = useForm<SalaryFormData>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      monthlyGross: salary?.monthlyGross ?? 0,
      monthlyNet: salary?.monthlyNet ?? 0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  })

  const onSalarySubmit = async (data: SalaryFormData) => {
    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success('Salary saved!')
      setSalaryModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Failed to save salary')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p className="page-header__subtitle" style={{ margin: 0, fontWeight: 500 }}>
            Plan your financial goals and monthly budget
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSalaryModalOpen(true)} id="goals-salary-btn">
            <Wallet size={13} /> {salary ? 'Update Salary' : 'Set Salary'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddGoal} id="goals-add-btn">
            <PlusCircle size={13} /> Add Goal
          </button>
        </div>
      </div>

      {/* Budget Planner */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <span className="card-title">Monthly Budget Planner</span>
          {!salary && <span className="badge badge-warning">Set your salary first</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          {[
            { label: 'Monthly Net Salary', value: monthlyNet, color: 'var(--color-success)' },
            { label: 'Total EMIs', value: -totalMonthlyEMI, color: 'var(--color-danger)' },
            { label: 'Goal Savings Needed', value: -totalMonthlySavings, color: 'var(--color-warning)' },
            { label: 'Surplus', value: surplus, color: surplus >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>{item.label}</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: item.color, letterSpacing: '-0.02em' }}>
                {item.value < 0 ? '−' : ''}{formatCurrency(Math.abs(item.value))}
              </div>
            </div>
          ))}
        </div>
        {/* Visual budget bar */}
        {monthlyNet > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ height: 12, background: 'var(--bg-overlay)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${Math.min(100, (totalMonthlyEMI / monthlyNet) * 100)}%`, background: 'var(--color-danger)', transition: 'width 0.6s' }} />
              <div style={{ width: `${Math.min(100, (totalMonthlySavings / monthlyNet) * 100)}%`, background: 'var(--color-warning)', transition: 'width 0.6s' }} />
              <div style={{ width: `${Math.max(0, Math.min(100, (surplus / monthlyNet) * 100))}%`, background: 'var(--color-success)', transition: 'width 0.6s' }} />
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
              {[
                { label: 'EMIs', color: 'var(--color-danger)', pct: Math.round((totalMonthlyEMI / monthlyNet) * 100) },
                { label: 'Goal Savings', color: 'var(--color-warning)', pct: Math.round((totalMonthlySavings / monthlyNet) * 100) },
                { label: 'Surplus', color: 'var(--color-success)', pct: Math.round((Math.max(0, surplus) / monthlyNet) * 100) },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.label}: {item.pct}%
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon"><Target size={28} /></div>
          <div className="empty-state__title">No goals yet</div>
          <p>Set financial goals to start planning your budget</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {goals.map(goal => {
            const progress = goalProgress(goal.currentAmount, goal.targetAmount)
            const mSavings = monthlySavingsNeeded(goal.targetAmount, goal.currentAmount, new Date(goal.targetDate))
            const mLeft = monthsRemaining(new Date(goal.targetDate))
            const color = goal.color ?? GOAL_COLORS[0]

            return (
              <div key={goal.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{goal.name}</div>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: `${color}20`, color }}>Priority {goal.priority}</span>
                      {mLeft <= 0 && <span className="badge badge-danger">Overdue</span>}
                      {mLeft > 0 && mLeft <= 3 && <span className="badge badge-warning">{mLeft}m left</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditGoal(goal)}><Pencil size={13} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteGoal(goal.id)}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatCurrency(goal.currentAmount)} saved</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 8 }}>
                    <div className="progress-bar__fill" style={{ width: `${progress}%`, background: color }} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', textAlign: 'right' }}>
                    of {formatCurrency(goal.targetAmount)}
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Target Date</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatDate(goal.targetDate)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Time Left</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mLeft > 0 ? `${mLeft} months` : 'Overdue'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Monthly Need</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color }}>{formatCurrency(mSavings)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Remaining</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}</div>
                  </div>
                </div>
                {goal.notes && <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{goal.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Goal Modal */}
      <Modal isOpen={goalModalOpen} onClose={() => setGoalModalOpen(false)} title={editGoal ? 'Edit Goal' : 'Add Goal'} size="lg">
        <form onSubmit={hsGoal(onGoalSubmit)} id="goal-form">
          <div className="form-grid">
            <div className="input-group span-2">
              <label className="input-label">Goal Name <span className="required">*</span></label>
              <input className={`input ${errGoal.name ? 'error' : ''}`} placeholder="e.g. Emergency Fund, Dream Vacation" {...regGoal('name')} />
              {errGoal.name && <span className="input-error">{errGoal.name.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Target Amount (₹) <span className="required">*</span></label>
              <input className="input" type="number" step="1" {...regGoal('targetAmount', { valueAsNumber: true })} />
              {errGoal.targetAmount && <span className="input-error">{errGoal.targetAmount.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Current Savings (₹)</label>
              <input className="input" type="number" step="1" defaultValue={0} {...regGoal('currentAmount', { valueAsNumber: true })} />
            </div>
            <div className="input-group">
              <label className="input-label">Target Date <span className="required">*</span></label>
              <input className="input" type="date" {...regGoal('targetDate')} />
              {errGoal.targetDate && <span className="input-error">{errGoal.targetDate.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Priority (1=low, 5=high)</label>
              <input className="input" type="number" min={1} max={5} {...regGoal('priority', { valueAsNumber: true })} />
            </div>
            <div className="input-group span-2">
              <label className="input-label">Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {GOAL_COLORS.map(c => (
                  <button key={c} type="button"
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: selectedColor === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.15s' }}
                    onClick={() => svGoal('color', c)}
                  />
                ))}
              </div>
            </div>
            <div className="input-group span-2">
              <label className="input-label">Notes</label>
              <textarea className="input textarea" rows={2} {...regGoal('notes')} />
            </div>
          </div>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setGoalModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" id="goal-form-submit">{editGoal ? 'Update Goal' : 'Add Goal'}</button>
          </div>
        </form>
      </Modal>

      {/* Salary Modal */}
      <Modal isOpen={salaryModalOpen} onClose={() => setSalaryModalOpen(false)} title="Set Monthly Salary">
        <form onSubmit={hsSalary(onSalarySubmit)} id="salary-form">
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Monthly Gross (₹) <span className="required">*</span></label>
              <input className="input" type="number" step="1" {...regSalary('monthlyGross', { valueAsNumber: true })} />
              {errSalary.monthlyGross && <span className="input-error">{errSalary.monthlyGross.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Monthly Net / Take-Home (₹) <span className="required">*</span></label>
              <input className="input" type="number" step="1" {...regSalary('monthlyNet', { valueAsNumber: true })} />
              {errSalary.monthlyNet && <span className="input-error">{errSalary.monthlyNet.message}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Month</label>
              <select className="select" {...regSalary('month', { valueAsNumber: true })}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Year</label>
              <input className="input" type="number" step="1" {...regSalary('year', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="modal-footer" style={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSalaryModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" id="salary-form-submit"><Save size={15} /> Save Salary</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
