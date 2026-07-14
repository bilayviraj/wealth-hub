'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Landmark,
  Target,
  Calculator,
  ChevronLeft,
  Wallet,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/investments', icon: TrendingUp, label: 'Investments' },
  { href: '/loans', icon: Landmark, label: 'Loans' },
  { href: '/goals', icon: Target, label: 'Goals & Budget' },
  { href: '/calculators', icon: Calculator, label: 'Calculators' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Wallet size={22} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>WealthHub</span>
            <span className={styles.logoTagline}>Personal Finance</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={collapsed ? label : undefined}
            >
              <span className={styles.navIcon}>
                <Icon size={18} />
              </span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
              {isActive && !collapsed && <span className={styles.activeIndicator} />}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        className={`${styles.collapseBtn} ${collapsed ? styles.collapseBtnFlipped : ''}`}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="sidebar-collapse-btn"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Version */}
      {!collapsed && (
        <div className={styles.footer}>
          <span className={styles.version}>v1.0.0</span>
        </div>
      )}
    </aside>
  )
}
