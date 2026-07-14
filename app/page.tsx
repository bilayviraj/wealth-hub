'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, Landmark, Target, Calendar, ArrowRight, RefreshCw, Users, ShieldAlert } from 'lucide-react'
import type { DashboardStats } from '@/types'
import { formatCurrency, formatDate, getInvestmentTypeColor, getInvestmentTypeLabel } from '@/lib/utils'
import { goalProgress as gp, monthlySavingsNeeded as msn } from '@/lib/calculations'
import StatCard from '@/components/ui/StatCard'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error()
      setStats(await res.json())
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-header__title">Dashboard</h1>
            <p className="page-header__subtitle">Your financial overview at a glance</p>
          </div>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 32, width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const s = stats!

  const hasInvestments = (s?.investmentBreakdown?.length ?? 0) > 0
  const hasLoans = (s?.upcomingEMIs?.length ?? 0) > 0 || (s?.totalLoanOutstanding ?? 0) > 0
  const hasGoals = (s?.topGoals?.length ?? 0) > 0

  // Chart 1: Allocation by Type
  const chartData = s?.investmentBreakdown?.map(item => ({
    name: getInvestmentTypeLabel(item.type),
    value: item.invested,
    color: getInvestmentTypeColor(item.type),
  })) ?? []

  // Chart 2: Invested by Year
  const yearData = s?.byYear?.map(item => ({
    name: String(item.year),
    amount: item.invested,
  })) ?? []

  // Chart 3: Invested by Owner
  const ownerData = s?.byOwner?.map(item => ({
    name: item.owner || 'Other',
    amount: item.invested,
  })) ?? []

  // Budget
  const monthlyNet = s?.monthlySalary?.monthlyNet ?? 0
  const goalSavingsNeeded = s?.topGoals?.reduce((acc, g) => {
    return acc + msn(g.targetAmount, g.currentAmount, new Date(g.targetDate))
  }, 0) ?? 0
  const surplus = monthlyNet - (s?.totalMonthlyEMI ?? 0) - goalSavingsNeeded

  const ownerColors: Record<string, string> = {
    'Viraj': '#6366f1',
    'Prachi': '#ec4899',
    'Joint': '#14b8a6',
    'Other': '#64748b'
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Dashboard</h1>
          <p className="page-header__subtitle">Your financial overview at a glance</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats} id="dashboard-refresh-btn">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Net Worth Stats */}
      <div className="stats-grid">
        <StatCard
          id="stat-net-worth"
          label="Net Worth"
          value={s?.netWorth ?? 0}
          compact
          accentColor={(s?.netWorth ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          iconBg={(s?.netWorth ?? 0) >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)'}
        />
        <StatCard
          id="stat-total-invested"
          label="Total Invested"
          value={s?.totalInvested ?? 0}
          compact
          accentColor="var(--color-primary)"
          iconBg="var(--color-primary-glow)"
        />
        <StatCard
          id="stat-loan-outstanding"
          label="Loan Outstanding"
          value={s?.totalLoanOutstanding ?? 0}
          compact
          subValue={s?.totalMonthlyEMI ?? 0}
          subLabel="monthly EMI"
          accentColor="var(--color-danger)"
          iconBg="var(--color-danger-bg)"
        />
        <StatCard
          id="stat-monthly-surplus"
          label="Monthly Surplus"
          value={surplus}
          compact
          subValue={monthlyNet}
          subLabel="net salary"
          trend={surplus >= 0 ? 'up' : 'down'}
          accentColor={surplus >= 0 ? 'var(--color-success)' : 'var(--color-warning)'}
          iconBg={surplus >= 0 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)'}
        />
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">

        {/* Portfolio Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Portfolio Allocation</span>
            <Link href="/investments" className="btn btn-ghost btn-sm" id="dashboard-view-investments-link">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {hasInvestments ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                  {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v as number)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--color-text)', fontSize: '0.8125rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <TrendingUp size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--color-text-muted)', display: 'block' }} />
              <p>No investments yet. <Link href="/investments">Add one →</Link></p>
            </div>
          )}
          {/* Legend */}
          {hasInvestments && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
              {chartData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.name}: {formatCurrency(item.value, true)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming EMIs */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming EMIs</span>
            <Link href="/loans" className="btn btn-ghost btn-sm" id="dashboard-view-loans-link">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {s?.upcomingEMIs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {s.upcomingEMIs.map((emi: any) => {
                const dueDate = new Date(emi.dueDate)
                const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isUrgent = daysLeft <= 7
                return (
                  <div key={emi.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: isUrgent ? 'var(--color-danger-bg)' : 'var(--glass-bg)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: `1px solid ${isUrgent ? 'rgba(244,63,94,0.2)' : 'var(--glass-border)'}`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emi.loan?.lenderName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Due: {formatDate(emi.dueDate)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: isUrgent ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {formatCurrency(emi.loan?.emiAmount ?? 0)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isUrgent ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                        {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <Calendar size={28} style={{ margin: '0 auto 0.75rem', color: 'var(--color-text-muted)', display: 'block' }} />
              <p>No upcoming EMIs in the next 30 days</p>
            </div>
          )}
        </div>

        {/* Yearly Growth bar chart */}
        {hasInvestments && (
          <div className="card span-2">
            <div className="card-header">
              <span className="card-title">Investment by Year</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => formatCurrency(v as number)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--color-text)', fontSize: '0.8125rem' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="amount" name="Invested Amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Split by Owner */}
        {hasInvestments && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Split by Owner</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ownerData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="amount">
                  {ownerData.map((entry, idx) => (
                    <Cell key={idx} fill={ownerColors[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v as number)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--color-text)', fontSize: '0.8125rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.5rem', justifyContent: 'center' }}>
              {ownerData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ownerColors[item.name] || '#64748b', display: 'inline-block' }} />
                  {item.name}: {formatCurrency(item.amount, true)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals progress */}
        {hasGoals && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Goal Progress</span>
              <Link href="/goals" className="btn btn-ghost btn-sm" id="dashboard-view-goals-link">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {s.topGoals.slice(0, 4).map(goal => {
                const progress = gp(goal.currentAmount, goal.targetAmount)
                const color = goal.color ?? 'var(--color-primary)'
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{goal.name}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatCurrency(goal.currentAmount, true)} / {formatCurrency(goal.targetAmount, true)}</span>
                    </div>
                    <div className="progress-bar" style={{ height: 7 }}>
                      <div className="progress-bar__fill" style={{ width: `${progress}%`, background: color }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>{progress}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        {!hasInvestments && !hasLoans && !hasGoals && (
          <div className="card span-2" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Welcome to WealthHub!</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>Start by adding your investments, loans, or financial goals.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/investments" className="btn btn-primary" id="dashboard-start-investments"><TrendingUp size={15} /> Add Investments</Link>
              <Link href="/loans" className="btn btn-secondary" id="dashboard-start-loans"><Landmark size={15} /> Add Loans</Link>
              <Link href="/goals" className="btn btn-secondary" id="dashboard-start-goals"><Target size={15} /> Set Goals</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
