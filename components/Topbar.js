'use client'
import { Calendar } from 'lucide-react'

export default function Topbar({ title, subtitle, children, dateFrom, dateTo, onDateFrom, onDateTo }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #E8E0D4',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22, fontWeight: 500,
            letterSpacing: '0.06em', color: '#1C1C1A',
            margin: 0, lineHeight: 1,
          }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 11, color: '#C4A882', marginTop: 4, letterSpacing: '0.04em' }}>{subtitle}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onDateFrom !== undefined && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F5F0E8', border: '1px solid #E8E0D4',
              borderRadius: 10, padding: '8px 14px',
            }}>
              <Calendar size={13} color="#C4A882"/>
              <span style={{ fontSize: 11, color: '#6B6B67', fontWeight: 500 }}>De la:</span>
              <input type="date" value={dateFrom || ''} onChange={e => onDateFrom(e.target.value)}
                style={{ fontSize: 11, border: 0, background: 'transparent', outline: 'none', color: '#1C1C1A' }}/>
              <span style={{ fontSize: 11, color: '#C4A882' }}>—</span>
              <span style={{ fontSize: 11, color: '#6B6B67', fontWeight: 500 }}>Până la:</span>
              <input type="date" value={dateTo || ''} onChange={e => onDateTo(e.target.value)}
                style={{ fontSize: 11, border: 0, background: 'transparent', outline: 'none', color: '#1C1C1A' }}/>
            </div>
          )}
          {children}
        </div>
      </div>
    </header>
  )
}
