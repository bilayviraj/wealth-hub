'use client'

import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getInvestmentTypeLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  onImported: () => void
  onCancel: () => void
}

interface ParsedRow {
  date: string
  name: string
  type: string
  rawAccount: string
  account: string
  owner: string
  amount: number
}

// Simple and robust CSV parser
function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = ['']
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      row.push('')
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++
      lines.push(row)
      row = ['']
    } else {
      row[row.length - 1] += c
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row)
  }
  return lines
}

// Auto-map Account Shorthand to Platform + Owner
function mapAccountAndOwner(rawAccount: string): { account: string; owner: string } {
  const acc = rawAccount.trim()
  const lower = acc.toLowerCase()

  if (lower === 'coinv')      return { account: 'Zerodha Coin', owner: 'Viraj' }
  if (lower === 'coinp')      return { account: 'Zerodha Coin', owner: 'Prachi' }
  if (lower === 'zerodhav')   return { account: 'Zerodha', owner: 'Viraj' }
  if (lower === 'zerodhap')   return { account: 'Zerodha', owner: 'Prachi' }
  if (lower === 'zerodhah')   return { account: 'Zerodha', owner: 'Joint' }
  if (lower === 'upstocks')   return { account: 'Upstox', owner: 'Viraj' }
  if (lower === 'angelp')     return { account: 'Angel One', owner: 'Prachi' }
  if (lower === 'icici')      return { account: 'ICICI', owner: 'Viraj' }
  if (lower === 'lic')        return { account: 'LIC', owner: 'Viraj' }
  if (lower === 'gold')       return { account: 'Gold', owner: 'Joint' }
  if (lower === 'cash')       return { account: 'Cash', owner: 'Viraj' }

  // Fallbacks: check suffix V or P or Joint
  if (lower.endsWith('v')) {
    return { account: acc.slice(0, -1).trim() || acc, owner: 'Viraj' }
  }
  if (lower.endsWith('p')) {
    return { account: acc.slice(0, -1).trim() || acc, owner: 'Prachi' }
  }

  return { account: acc || 'Other', owner: 'Viraj' }
}

export default function ImportModal({ onImported, onCancel }: Props) {
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, number>>({
    date: -1,
    name: -1,
    type: -1,
    account: -1,
    amount: -1
  })
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleTextChange = (text: string) => {
    setCsvText(text)
    if (!text.trim()) {
      setParsedRows([])
      setHeaders([])
      return
    }

    const rawRows = parseCSV(text).filter(r => r.some(cell => cell.trim() !== ''))
    if (rawRows.length < 2) return

    const headerRow = rawRows[0].map(h => h.trim())
    setHeaders(headerRow)

    // Auto-map headers
    const newMappings: Record<string, number> = {
      date: headerRow.findIndex(h => /date/i.test(h)),
      name: headerRow.findIndex(h => /investment|name/i.test(h)),
      type: headerRow.findIndex(h => /type/i.test(h)),
      account: headerRow.findIndex(h => /account/i.test(h)),
      amount: headerRow.findIndex(h => /amount|value/i.test(h))
    }
    setMappings(newMappings)
    processRows(rawRows.slice(1), newMappings)
  }

  const handleMappingChange = (field: string, colIdx: number) => {
    const updated = { ...mappings, [field]: colIdx }
    setMappings(updated)
    const rawRows = parseCSV(csvText).filter(r => r.some(cell => cell.trim() !== ''))
    if (rawRows.length > 1) {
      processRows(rawRows.slice(1), updated)
    }
  }

  const processRows = (rows: string[][], currentMappings: Record<string, number>) => {
    const results: ParsedRow[] = []
    for (const r of rows) {
      const dateVal = currentMappings.date >= 0 ? r[currentMappings.date] : ''
      const nameVal = currentMappings.name >= 0 ? r[currentMappings.name] : ''
      const typeVal = currentMappings.type >= 0 ? r[currentMappings.type] : ''
      const accVal = currentMappings.account >= 0 ? r[currentMappings.account] : ''
      const amtVal = currentMappings.amount >= 0 ? r[currentMappings.amount] : ''

      if (!dateVal && !nameVal && !amtVal) continue // skip empty rows

      const cleanAmt = parseFloat((amtVal || '0').replace(/[,₹\s]/g, ''))
      const { account, owner } = mapAccountAndOwner(accVal)

      results.push({
        date: dateVal,
        name: nameVal || 'Unnamed Investment',
        type: typeVal || 'MF',
        rawAccount: accVal,
        account,
        owner,
        amount: isNaN(cleanAmt) ? 0 : cleanAmt
      })
    }
    setParsedRows(results)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      handleTextChange(event.target?.result as string)
    }
    reader.readAsText(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        handleTextChange(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const startImport = async () => {
    if (parsedRows.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/investments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows.map(r => ({
            date: r.date,
            name: r.name,
            type: r.type,
            account: r.account,
            owner: r.owner,
            amount: r.amount
          }))
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Successfully imported ${data.imported} entries!`)
        if (data.errors && data.errors.length > 0) {
          console.warn('Skipped rows during import:', data.errors)
        }
        onImported()
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed due to server error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* File Upload / Paste Area */}
      {parsedRows.length === 0 ? (
        <div>
          <div
            className={`import-dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--border-default)',
              borderRadius: '8px',
              padding: '2.5rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              cursor: 'pointer',
              marginBottom: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Upload size={40} style={{ margin: '0 auto 1rem', color: 'var(--color-primary)' }} />
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drag & drop your CSV file here</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              or click below to choose a file from your computer
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="csv-file-picker"
            />
            <label htmlFor="csv-file-picker" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              Choose File
            </label>
          </div>

          <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            — OR PASTE CSV DATA BELOW —
          </div>

          <textarea
            className="input"
            rows={8}
            placeholder="Paste raw CSV content here. First row must be headers (e.g. Date,Investment,Type,Account,Amount)..."
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', width: '100%', resize: 'vertical' }}
          />
        </div>
      ) : (
        /* Configuration and Preview Table */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-elevated)' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Column Mapping Configuration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {Object.keys(mappings).map((field) => (
                <div key={field} className="input-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                    {field} Column
                  </label>
                  <select
                    className="select"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    value={mappings[field]}
                    onChange={(e) => handleMappingChange(field, parseInt(e.target.value))}
                  >
                    <option value={-1}>— Skip —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Parsed Preview ({parsedRows.length} entries detected)
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => handleTextChange('')}>
              Upload Different File
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
            <table className="table" style={{ fontSize: '0.8rem', margin: 0 }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Investment</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Type</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Excel Account</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Mapped Account</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Mapped Owner</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.date || <span className="text-muted">Empty</span>}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.name}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                        {getInvestmentTypeLabel(row.type)}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                      {row.rawAccount || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{row.account}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{row.owner}</span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      ₹{row.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {parsedRows.length > 50 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ... and {parsedRows.length - 50} more rows ...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(59,130,246,0.06)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.1)' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <strong>Shorthand Mapping active:</strong> Account values like <code>CoinV</code>, <code>CoinP</code>, <code>ZerodhaV</code>, <code>ZerodhaP</code> will be auto-translated to Platforms (Zerodha, Zerodha Coin) and Owners (Viraj, Prachi) based on your settings.
            </div>
          </div>
        </div>
      )}

      <div className="form-actions" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={parsedRows.length === 0 || importing}
          onClick={startImport}
          id="confirm-import-btn"
        >
          {importing ? 'Importing...' : `Import ${parsedRows.length} Entries`}
        </button>
      </div>
    </div>
  )
}
