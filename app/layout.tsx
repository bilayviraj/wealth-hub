import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: {
    default: 'WealthHub',
    template: '%s | WealthHub',
  },
  description: 'Your personal finance dashboard — track investments, loans, goals, and plan your financial future.',
  keywords: ['finance', 'investments', 'wealth', 'loans', 'goals', 'budget'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content" id="main-content">
            <Topbar />
            <main className="page-container animate-fadeIn">
              {children}
            </main>
          </div>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--color-text)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: 'var(--color-success)', secondary: 'var(--bg-elevated)' },
            },
            error: {
              iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--bg-elevated)' },
            },
          }}
        />
      </body>
    </html>
  )
}
