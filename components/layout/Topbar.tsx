'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import styles from './Topbar.module.css'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your financial overview at a glance' },
  '/investments': { title: 'Investments', subtitle: 'Manage your portfolio' },
  '/loans': { title: 'Loans', subtitle: 'Track your loan repayments' },
  '/goals': { title: 'Goals & Budget', subtitle: 'Plan your financial future' },
  '/calculators': { title: 'Calculators', subtitle: 'Financial planning tools' },
  '/calculators/home-loan': { title: 'Home Loan Calculator', subtitle: 'Calculate your home loan EMI' },
  '/calculators/gold-loan': { title: 'Gold Loan Calculator', subtitle: 'Estimate gold loan eligibility' },
  '/calculators/personal-loan': { title: 'Personal Loan Calculator', subtitle: 'Plan your personal loan' },
}

export default function Topbar() {
  const pathname = usePathname()
  const pageInfo = PAGE_TITLES[pathname] ?? { title: 'WealthHub', subtitle: '' }
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className={styles.subtitle}>{pageInfo.subtitle}</p>
        )}
      </div>

      <div className={styles.right}>
        <span className={styles.date}>{today}</span>
        <button className={styles.notifBtn} title="Notifications" id="topbar-notifications-btn">
          <Bell size={14} />
        </button>
        <div className={styles.avatar} title="You">
          <span>W</span>
        </div>
      </div>
    </header>
  )
}
