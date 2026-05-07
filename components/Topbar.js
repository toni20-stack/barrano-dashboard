'use client'
import { Calendar } from 'lucide-react'

export default function Topbar({ title, subtitle, children, dateFrom, dateTo, onDateFrom, onDateTo }) {
  return (
    <header className="sticky top-0 z-20"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E8E0D4' }}>

      {/* Rând 1 — titlu + butoane acțiuni */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}
        className="md:px-7 md:py-4">
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500, letterSpacing: '0.06em', color: '#1C1C1A', margin: 0, lineHeight: 1 }}
            className="text-lg md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 11, color: '#C4A882', marginTop: 3, letterSpacing: '0.04em' }}>{subtitle}</p>
          )}
        </div>

        {children && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {children}
          </div>
        )}
      </div>

      {/* Rând 2 — date picker (doar dacă există) */}
      {onDateFrom !== undefined && (
        <div style={{ padding: '8px 16px 10px', borderTop: '1px solid #F0EAE0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
          className="md:px-7">
          <Calendar size={12} color="#C4A882" />
          <span style={{ fontSize: 11, color: '#6B6B67', fontWeight: 500 }}>De la:</span>
          <input type="date" value={dateFrom || ''} onChange={e => onDateFrom(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: '5px 10px', width: 'auto', minWidth: 130, borderRadius: 8 }} />
          <span style={{ fontSize: 11, color: '#C4A882' }}>—</span>
          <span style={{ fontSize: 11, color: '#6B6B67', fontWeight: 500 }}>Până la:</span>
          <input type="date" value={dateTo || ''} onChange={e => onDateTo(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: '5px 10px', width: 'auto', minWidth: 130, borderRadius: 8 }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { onDateFrom(''); onDateTo('') }}
              style={{ fontSize: 11, color: '#6B6B67', padding: '5px 10px', borderRadius: 7, border: '1px solid #E8E0D4', background: 'white', cursor: 'pointer' }}>
              ✕ Șterge
            </button>
          )}
        </div>
      )}
    </header>
  )
}
