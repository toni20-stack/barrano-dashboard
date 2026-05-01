'use client'
import { Calendar } from 'lucide-react'

export default function Topbar({ title, subtitle, children, dateFrom, dateTo, onDateFrom, onDateTo }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {(onDateFrom !== undefined) && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">De la:</span>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={e => onDateFrom(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none text-slate-700"
              />
              <span className="text-xs text-slate-400 mx-1">—</span>
              <span className="text-xs text-slate-500 font-medium">Până la:</span>
              <input
                type="date"
                value={dateTo || ''}
                onChange={e => onDateTo(e.target.value)}
                className="text-xs border-0 bg-transparent focus:outline-none text-slate-700"
              />
            </div>
          )}
          {children}
        </div>
      </div>
    </header>
  )
}
