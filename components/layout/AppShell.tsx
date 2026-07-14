'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      {/* Tap outside the mobile menu drawer to close it */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop animate-fadeIn" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="main-content" id="main-content">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="page-container animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  )
}
