import { formatCurrency, getPnLColor } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  isCurrency?: boolean
  compact?: boolean
  subLabel?: string
  subValue?: number
  subIsPercent?: boolean
  icon?: React.ReactNode
  accentColor?: string
  iconBg?: string
  trend?: 'up' | 'down' | 'neutral'
  id?: string
}

export default function StatCard({
  label,
  value,
  isCurrency = true,
  compact = false,
  subLabel,
  subValue,
  subIsPercent = false,
  icon,
  accentColor = 'var(--color-primary)',
  iconBg = 'var(--color-primary-glow)',
  trend,
  id,
}: StatCardProps) {
  const displayValue = isCurrency ? formatCurrency(value, compact) : value.toLocaleString('en-IN')

  const subColor = subValue !== undefined
    ? getPnLColor(subValue)
    : 'var(--color-text-secondary)'

  const subDisplay = subValue !== undefined
    ? subIsPercent
      ? `${subValue >= 0 ? '+' : ''}${subValue.toFixed(2)}%`
      : formatCurrency(subValue, true)
    : undefined

  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': accentColor, '--stat-icon-bg': iconBg } as React.CSSProperties}
      id={id}
    >
      {icon && (
        <div className="stat-card__icon">
          {icon}
        </div>
      )}
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{displayValue}</div>
      {(subLabel || subDisplay) && (
        <div className="stat-card__sub" style={{ color: subColor }}>
          {trend === 'up' && <TrendingUp size={13} />}
          {trend === 'down' && <TrendingDown size={13} />}
          {subDisplay && <span>{subDisplay}</span>}
          {subLabel && <span style={{ color: 'var(--color-text-secondary)' }}>{subLabel}</span>}
        </div>
      )}
    </div>
  )
}
