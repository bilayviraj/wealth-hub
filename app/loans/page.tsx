'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { PlusCircle, RefreshCw, CheckCircle, Circle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { Loan, EMIPayment } from '@/types'
import { formatCurrency, formatDate, getLoanTypeLabel } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import LoanForm from '@/components/loans/LoanForm'
import toast from 'react-hot-toast'

ModuleRegistry.registerModules([AllCommunityModule])

function LoanTypeColor(type: string) {
  const colors: Record<string, string> = {
    HOME: '#3b82f6', GOLD: '#f59e0b', PERSONAL: '#ec4899', CAR: '#10b981', OTHER: '#64748b',
  }
  return colors[type] ?? '#64748b'
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null)
  const gridRefs = useRef<Record<string, GridApi>>({})

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/loans')
      const data = await res.json()
      setLoans(data)
    } catch {
      toast.error('Failed to load loans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLoans() }, [fetchLoans])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loan and all its EMI schedule?')) return
    try {
      await fetch(`/api/loans/${id}`, { method: 'DELETE' })
      toast.success('Loan deleted')
      fetchLoans()
    } catch {
      toast.error('Failed to delete loan')
    }
  }

  const toggleEMI = async (loanId: string, emiId: string, isPaid: boolean) => {
    try {
      await fetch(`/api/loans/${loanId}/emi/${emiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      })
      setLoans(prev => prev.map(l => l.id === loanId ? {
        ...l,
        emiSchedule: l.emiSchedule?.map(e => e.id === emiId ? { ...e, isPaid, paidDate: isPaid ? new Date().toISOString() : null } : e),
      } : l))
      toast.success(isPaid ? 'EMI marked as paid' : 'EMI marked as unpaid')
    } catch {
      toast.error('Failed to update EMI')
    }
  }

  // Summary stats
  const totalPrincipal = loans.reduce((s, l) => s + l.principalAmount, 0)
  const totalOutstanding = loans.reduce((l, loan) => {
    const unpaid = loan.emiSchedule?.filter(e => !e.isPaid) ?? []
    return l + (unpaid.length > 0 ? unpaid[unpaid.length - 1].balance : 0)
  }, 0)
  const totalMonthlyEMI = loans.reduce((s: number, l: Loan) => {
    const unpaid = l.emiSchedule?.filter(e => !e.isPaid) ?? []
    return unpaid.length > 0 ? s + l.emiAmount : s
  }, 0)

  // EMI Schedule columns
  const emiColumns = (loan: Loan): ColDef<EMIPayment>[] => [
    { field: 'month', headerName: '#', width: 60, sortable: false },
    {
      field: 'dueDate', headerName: 'Due Date', width: 130,
      cellRenderer: (p: any) => {
        const isOverdue = !p.data.isPaid && new Date(p.value) < new Date()
        return <span style={{ color: isOverdue ? 'var(--color-danger)' : undefined }}>{formatDate(p.value)}</span>
      }
    },
    {
      field: 'principal', headerName: 'Principal', width: 130,
      cellRenderer: (p: any) => formatCurrency(p.value),
    },
    {
      field: 'interest', headerName: 'Interest', width: 130,
      cellRenderer: (p: any) => <span style={{ color: 'var(--color-warning)' }}>{formatCurrency(p.value)}</span>,
    },
    {
      field: 'balance', headerName: 'Balance', width: 150,
      cellRenderer: (p: any) => formatCurrency(p.value),
    },
    {
      field: 'isPaid', headerName: 'Status', width: 120,
      cellRenderer: (p: any) => (
        <span className={`badge ${p.value ? 'badge-success' : 'badge-warning'}`}>
          {p.value ? '✓ Paid' : 'Pending'}
        </span>
      ),
    },
    {
      headerName: 'Action', width: 100, sortable: false,
      cellRenderer: (p: any) => (
        <button
          className={`btn btn-ghost btn-sm ${p.data.isPaid ? 'text-muted' : ''}`}
          style={{ gap: 4, fontSize: '0.75rem' }}
          onClick={() => toggleEMI(loan.id, p.data.id, !p.data.isPaid)}
        >
          {p.data.isPaid ? <Circle size={13} /> : <CheckCircle size={13} />}
          {p.data.isPaid ? 'Undo' : 'Pay'}
        </button>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p className="page-header__subtitle" style={{ margin: 0, fontWeight: 500 }}>
            Track EMI schedules and outstanding balances
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchLoans} id="loans-refresh-btn">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)} id="loans-add-btn">
            <PlusCircle size={13} /> Add Loan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Loans" value={loans.length} isCurrency={false} accentColor="var(--color-info)" iconBg="var(--color-info-bg)" />
        <StatCard label="Original Principal" value={totalPrincipal} compact accentColor="var(--color-primary)" iconBg="var(--color-primary-glow)" />
        <StatCard label="Outstanding Balance" value={totalOutstanding} compact accentColor="var(--color-danger)" iconBg="var(--color-danger-bg)" />
        <StatCard label="Monthly EMI Total" value={totalMonthlyEMI} compact accentColor="var(--color-warning)" iconBg="var(--color-warning-bg)" />
      </div>

      {/* Loan cards */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Loading loans...</div>
      ) : loans.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state__icon"><span style={{ fontSize: '1.5rem' }}>🏦</span></div>
          <div className="empty-state__title">No loans yet</div>
          <p>Add a loan to track your EMI schedule</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map(loan => {
            const unpaid = loan.emiSchedule?.filter(e => !e.isPaid) ?? []
            const paid = loan.emiSchedule?.filter(e => e.isPaid) ?? []
            const outstanding = unpaid.length > 0 ? unpaid[unpaid.length - 1].balance : 0
            const paidPrincipal = paid.reduce((s, e) => s + e.principal, 0)
            const paidInterest = paid.reduce((s, e) => s + e.interest, 0)
            const progress = loan.tenureMonths > 0 ? Math.round((paid.length / loan.tenureMonths) * 100) : 0
            const isExpanded = expandedLoan === loan.id

            return (
              <div key={loan.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Loan header */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${LoanTypeColor(loan.type)}20`,
                    color: LoanTypeColor(loan.type),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', flexShrink: 0,
                  }}>
                    {loan.type === 'HOME' ? '🏠' : loan.type === 'GOLD' ? '🥇' : loan.type === 'CAR' ? '🚗' : '💳'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{loan.lenderName}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-info">{getLoanTypeLabel(loan.type)}</span>
                          <span className="badge badge-muted">{loan.interestRate}% p.a.</span>
                          <span className="badge badge-muted">{loan.tenureMonths} months</span>
                          {unpaid.length === 0 && <span className="badge badge-success">✓ Fully Paid</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-danger)' }}>
                          {formatCurrency(outstanding)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>outstanding</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                        <span>{paid.length}/{loan.tenureMonths} EMIs paid</span>
                        <span>{progress}% done</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar__fill" style={{ width: `${progress}%`, background: 'var(--color-primary)' }} />
                      </div>
                    </div>

                    {/* Summary row */}
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                      {[
                        { l: 'Principal', v: formatCurrency(loan.principalAmount) },
                        { l: 'Monthly EMI', v: formatCurrency(loan.emiAmount) },
                        { l: 'Principal Paid', v: formatCurrency(paidPrincipal) },
                        { l: 'Interest Paid', v: formatCurrency(paidInterest), col: 'var(--color-warning)' },
                        { l: 'EMIs Left', v: unpaid.length, col: unpaid.length > 0 ? undefined : 'var(--color-success)' },
                      ].map(item => (
                        <div key={item.l}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: 1 }}>{item.l}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: item.col }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpandedLoan(isExpanded ? null : loan.id)} title="View EMI Schedule">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(loan.id)} title="Delete loan">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Expandable EMI schedule */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '1rem 1.5rem 1.5rem' }}>
                    <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      EMI Schedule
                    </div>
                    <div className="ag-theme-quartz ag-theme-wealthhub" style={{ height: 380 }}>
                      <AgGridReact
                        theme="legacy"
                        rowData={loan.emiSchedule ?? []}
                        columnDefs={emiColumns(loan)}
                        onGridReady={(e: GridReadyEvent) => { gridRefs.current[loan.id] = e.api }}
                        pagination
                        paginationPageSize={12}
                        domLayout="normal"
                        rowClassRules={{
                          'ag-row-success': (p: any) => p.data?.isPaid === true,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New Loan" size="lg">
        <LoanForm onSaved={() => { setModalOpen(false); fetchLoans() }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
