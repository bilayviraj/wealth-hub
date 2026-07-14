'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, ValidationModule } from 'ag-grid-community'
import {
  PlusCircle, RefreshCw, Upload, Download, CalendarClock,
  TrendingUp, Pencil, Trash2,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import type { InvestmentEntry } from '@/types'
import {
  formatCurrency, formatDate, formatDateInput,
  getInvestmentTypeColor, getInvestmentTypeLabel,
  getActivityStatus, getActivityBadge,
} from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import InvestmentForm from '@/components/investments/InvestmentForm'
import SIPManager from '@/components/investments/SIPManager'
import ImportModal from '@/components/investments/ImportModal'
import toast from 'react-hot-toast'

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule])

// Preset account and owner options
export const ACCOUNT_OPTIONS = ['Zerodha Coin', 'Zerodha', 'Upstox', 'Angel One', 'ICICI', 'LIC', 'Gold', 'HDFC', 'SBI', 'Other']
export const OWNER_OPTIONS   = ['Viraj', 'Prachi', 'Joint']

// ── Types for the summary payload ─────────────────────────────────────────────
interface InvestmentSummary {
  totalAllTime:   number
  totalThisYear:  number
  totalThisMonth: number
  byYear:   { year: string; invested: number }[]
  byType:   { type: string; invested: number }[]
  byAccount:{ account: string; invested: number }[]
  byOwner:  { owner: string; invested: number }[]
  uniqueNames: string[]
}

export default function InvestmentsPage() {
  const [entries, setEntries]     = useState<InvestmentEntry[]>([])
  const [summary, setSummary]     = useState<InvestmentSummary | null>(null)
  const [loading, setLoading]     = useState(true)
  const [addOpen, setAddOpen]     = useState(false)
  const [editItem, setEditItem]   = useState<InvestmentEntry | null>(null)
  const [isMobile, setIsMobile]   = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [sipOpen, setSipOpen]     = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [filterOwner, setFilterOwner]     = useState<string>('all')
  const [filterType, setFilterType]       = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [recentPeriod, setRecentPeriod]   = useState<'1m' | '3m' | '6m'>('1m')
  const gridRef = useRef<GridApi | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      // Trigger SIP run on each page load (fire-and-forget)
      fetch('/api/sip/run', { method: 'POST' }).catch(() => {})
      const res = await fetch('/api/investments')
      const data = await res.json()
      setEntries(data.entries ?? [])
      setSummary(data.summary ?? null)
    } catch {
      toast.error('Failed to load investments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    try {
      await fetch(`/api/investments/${id}`, { method: 'DELETE' })
      toast.success('Entry deleted')
      fetchEntries()
    } catch {
      toast.error('Failed to delete')
    }
  }

  // ── Local client-side filter (owner / type / account) on the loaded entries ──
  const filtered = entries.filter(e => {
    if (filterOwner   !== 'all' && e.owner   !== filterOwner)   return false
    if (filterType    !== 'all' && e.type    !== filterType)    return false
    if (filterAccount !== 'all' && e.account !== filterAccount) return false
    return true
  })

  // ── Stats from server-provided summary ────────────────────────────────────────
  const totalInvested = summary?.totalAllTime ?? 0
  const totalEntries  = filtered.length

  // ── Unique dropdown options from loaded entries ────────────────────────────────
  const uniqueOwners   = [...new Set(entries.map(e => e.owner).filter(Boolean))] as string[]
  const uniqueAccounts = [...new Set(entries.map(e => e.account).filter(Boolean))] as string[]
  const uniqueNames    = summary?.uniqueNames ?? []

  // ── Charts — use server aggregates (all-time, all entries) ───────────────────
  const byYear = summary?.byYear ?? []

  const byType = (summary?.byType ?? []).map(r => ({
    name:  getInvestmentTypeLabel(r.type),
    value: r.invested,
    color: getInvestmentTypeColor(r.type),
  }))

  // ── Current year breakdown — computed from loaded (current-year) entries ──────
  const currentYear     = new Date().getFullYear()
  const currentYearTotal = summary?.totalThisYear ?? 0
  const currentYearByType = Object.entries(
    entries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + e.amount
      return acc
    }, {} as Record<string, number>)
  ).map(([type, amount]) => ({
    type,
    label: getInvestmentTypeLabel(type),
    amount,
    color: getInvestmentTypeColor(type),
  })).sort((a, b) => b.amount - a.amount)

  const currentMonthIdx  = new Date().getMonth()
  const currentMonthTotal = summary?.totalThisMonth ?? 0
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonthName  = MONTH_NAMES[currentMonthIdx]

  // ── Recent period breakdown — computed from loaded entries ────────────────────
  const getPeriodStartDate = (period: '1m' | '3m' | '6m') => {
    const d = new Date()
    if (period === '1m') d.setMonth(d.getMonth() - 1)
    else if (period === '3m') d.setMonth(d.getMonth() - 3)
    else if (period === '6m') d.setMonth(d.getMonth() - 6)
    return d
  }
  const periodStart  = getPeriodStartDate(recentPeriod)
  const recentEntries = filtered.filter(e => new Date(e.date) >= periodStart)
  const recentByType  = Object.entries(
    recentEntries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + e.amount
      return acc
    }, {} as Record<string, number>)
  ).map(([type, amount]) => ({
    type,
    label: getInvestmentTypeLabel(type),
    amount,
    color: getInvestmentTypeColor(type),
  })).sort((a, b) => b.amount - a.amount)
  const recentTotal = recentByType.reduce((s, e) => s + e.amount, 0)

  // ── AG Grid column defs ───────────────────────────────────────────────────────
  const colDefs: ColDef<InvestmentEntry>[] = [
    {
      field: 'date', headerName: 'Date', width: 130, sort: 'desc',
      cellRenderer: (p: any) => formatDate(p.value),
      comparator: (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    },
    {
      field: 'name', headerName: 'Investment', flex: 1, minWidth: 180,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'type', headerName: 'Type', width: 130,
      cellRenderer: (p: any) => {
        const typeClass = `badge-type-${(p.value || '').toLowerCase()}`
        return (
          <span className={`badge ${typeClass}`}>
            {getInvestmentTypeLabel(p.value)}
          </span>
        )
      },
      filter: 'agTextColumnFilter',
    },
    {
      field: 'account', headerName: 'Account', width: 150,
      cellRenderer: (p: any) => p.value ?? <span className="text-muted">—</span>,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'owner', headerName: 'Owner', width: 110,
      cellRenderer: (p: any) => p.value
        ? <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>{p.value}</span>
        : <span className="text-muted">—</span>,
    },
    {
      field: 'amount', headerName: 'Amount (₹)', width: 150,
      cellRenderer: (p: any) => <span style={{ fontWeight: 600 }}>{formatCurrency(p.value)}</span>,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
    },
    {
      field: 'notes', headerName: 'Notes', width: 140,
      cellRenderer: (p: any) => p.value
        ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{p.value}</span>
        : <span className="text-muted">—</span>,
    },
    {
      headerName: '', width: 90, sortable: false, filter: false, pinned: isMobile ? undefined : 'right',
      cellRenderer: (p: any) => (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: '100%' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditItem(p.data); setAddOpen(true) }} title="Edit">
            <Pencil size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.data.id)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner" />
        <span className="loader-text">Loading portfolio data...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-header__subtitle" style={{ margin: 0 }}>
            {currentYear} entries &middot; {totalEntries} records &middot; {formatCurrency(currentYearTotal)} this year
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchEntries} id="inv-refresh-btn"><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setImportOpen(true)} id="inv-import-btn"><Upload size={14} /> Import CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSipOpen(true)} id="inv-sip-btn"><CalendarClock size={14} /> Recurring</button>
          <button className="btn btn-secondary btn-sm" onClick={() => gridRef.current?.exportDataAsCsv({ fileName: 'investments.csv' })} id="inv-export-btn"><Download size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setAddOpen(true) }} id="inv-add-btn"><PlusCircle size={13} /> Add Entry</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard id="stat-total-inv" label="Total Invested" value={totalInvested} compact accentColor="var(--color-primary)" iconBg="var(--color-primary-glow)" />
        <StatCard id="stat-inv-month" label={`${currentMonthName} Invested`} value={currentMonthTotal} compact accentColor="var(--color-info)" iconBg="var(--color-info-bg)" />
        <StatCard id="stat-inv-year" label={`${currentYear} Invested`}
          value={currentYearTotal}
          compact accentColor="var(--color-success)" iconBg="var(--color-success-bg)" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* By Year */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header"><span className="card-title">Year-wise Investment</span></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byYear} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => formatCurrency(v as number)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--color-text)', fontSize: '0.8rem' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="invested" name="Invested" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio Allocation (Pie by Type) */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><span className="card-title">Portfolio Allocation</span></div>
          {byType.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byType.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v as number)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--color-text)', fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
                {byType.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    {item.name}: {formatCurrency(item.value, true)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}><p>No data</p></div>
          )}
        </div>
      </div>

      {/* Grouping Lists Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Current Year Investments by Type */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span className="card-title">{currentYear} Investments</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {formatCurrency(currentYearTotal)}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scroll">
            {currentYearByType.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>No investments in {currentYear}</div>
            ) : (
              currentYearByType.map(item => (
                <div key={item.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: `3px solid ${item.color}` }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Investments by Period (1M, 3M, 6M) */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="card-title" style={{ marginRight: 'auto' }}>Recent Activity</span>
            <div className="tabs" style={{ margin: 0, padding: '2px', borderRadius: '4px', display: 'flex', gap: '2px' }}>
              {(['1m', '3m', '6m'] as const).map(p => (
                <button
                  key={p}
                  className={`tab ${recentPeriod === p ? 'active' : ''}`}
                  onClick={() => setRecentPeriod(p)}
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '3px' }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <span>Total last {recentPeriod === '1m' ? 'month' : recentPeriod === '3m' ? '3m' : '6m'}:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{formatCurrency(recentTotal)}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '170px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scroll">
            {recentByType.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>No recent activity</div>
            ) : (
              recentByType.map(item => (
                <div key={item.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', borderLeft: `3px solid ${item.color}` }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters + Grid */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {/* Filter row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Filter:</span>
          <select className="select" style={{ minWidth: 110, fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            value={filterOwner} onChange={e => setFilterOwner(e.target.value)} id="filter-owner">
            <option value="all">All Owners</option>
            {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="select" style={{ minWidth: 140, fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            value={filterType} onChange={e => setFilterType(e.target.value)} id="filter-type">
            <option value="all">All Types</option>
            {['FD','MF','STOCKS','GOLD','BONDS','POLICY','PPF','CASH'].map(t => (
              <option key={t} value={t}>{getInvestmentTypeLabel(t)}</option>
            ))}
          </select>
          <select className="select" style={{ minWidth: 140, fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
            value={filterAccount} onChange={e => setFilterAccount(e.target.value)} id="filter-account">
            <option value="all">All Accounts</option>
            {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(filterOwner !== 'all' || filterType !== 'all' || filterAccount !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterOwner('all'); setFilterType('all'); setFilterAccount('all') }}>
              Clear filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            {filtered.length} entries · {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
          </span>
        </div>

        {/* AG Grid */}
        <div className="ag-theme-quartz ag-theme-wealthhub" style={{ height: 500 }}>
          <AgGridReact
            theme="legacy"
            rowData={loading ? undefined : filtered}
            columnDefs={colDefs}
            pagination
            paginationPageSize={20}
            onGridReady={(e: GridReadyEvent) => { gridRef.current = e.api }}
            overlayNoRowsTemplate='<div class="empty-state"><div class="empty-state__title">No entries found</div><p>Add an entry or import your Excel data</p></div>'
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Edit Entry' : 'Add Investment Entry'} size="lg">
        <InvestmentForm
          initial={editItem}
          uniqueNames={uniqueNames}
          onSaved={() => { setAddOpen(false); setEditItem(null); fetchEntries() }}
          onCancel={() => { setAddOpen(false); setEditItem(null) }}
        />
      </Modal>

      {/* Recurring Schedules Modal */}
      <Modal isOpen={sipOpen} onClose={() => setSipOpen(false)} title="Recurring Schedules" size="lg">
        <SIPManager onEntryCreated={fetchEntries} />
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import from CSV / Excel" size="lg">
        <ImportModal onImported={() => { setImportOpen(false); fetchEntries() }} onCancel={() => setImportOpen(false)} />
      </Modal>
    </div>
  )
}
