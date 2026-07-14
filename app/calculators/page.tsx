'use client'

import Link from 'next/link'
import { Home, Coins, CreditCard, Calculator, ArrowRight } from 'lucide-react'

const CALCULATORS = [
  {
    href: '/calculators/home-loan',
    icon: Home,
    title: 'Home Loan',
    description: 'Calculate EMI, total interest, and full amortization schedule for your home loan',
    accent: '#3b82f6',
    id: 'calc-home-loan',
  },
  {
    href: '/calculators/gold-loan',
    icon: Coins,
    title: 'Gold Loan',
    description: 'Estimate eligible loan amount based on gold weight, purity, and LTV percentage',
    accent: '#f59e0b',
    id: 'calc-gold-loan',
  },
  {
    href: '/calculators/personal-loan',
    icon: CreditCard,
    title: 'Personal Loan',
    description: 'Compare EMIs across different tenures and rates to find the best plan',
    accent: '#ec4899',
    id: 'calc-personal-loan',
  },
]

export default function CalculatorsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Calculators</h1>
          <p className="page-header__subtitle">Financial planning tools — no data saved, all calculations happen instantly</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {CALCULATORS.map(({ href, icon: Icon, title, description, accent, id }) => (
          <Link href={href} key={href} id={id} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'all var(--transition-fast)', borderColor: 'var(--glass-border)', height: '100%' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = accent
                el.style.boxShadow = `0 0 24px ${accent}25`
                el.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--glass-border)'
                el.style.boxShadow = ''
                el.style.transform = ''
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${accent}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
                color: accent,
              }}>
                <Icon size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title} Calculator</h3>
                <ArrowRight size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 2 }} />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
