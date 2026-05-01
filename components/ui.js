'use client'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { formatRon, formatPct } from '../lib/calculations'

// Modal
export function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const widths = { sm: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box w-full ${widths[size]}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// KPI Card
export function KPICard({ label, value, sub, icon: Icon, color = 'blue', trend, trendVal }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          {trendVal !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trendVal}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${colors[color]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  )
}

// Empty state
export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"><Icon size={24} className="text-slate-400" /></div>}
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// Confirm dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Anulează</button>
          <button className="btn-primary flex-1 bg-red-500 hover:bg-red-600" onClick={() => { onConfirm(); onClose() }}>Șterge</button>
        </div>
      </div>
    </div>
  )
}

// Form field wrapper
export function Field({ label, children, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

// Badge
export function Badge({ variant, children }) {
  const variants = {
    emag: 'badge-emag',
    site: 'badge-site',
    altele: 'badge-altele',
    urban: 'badge-urban',
    rural: 'badge-rural',
    green: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700',
    red: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600',
    gray: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600',
  }
  return <span className={variants[variant] || variants.gray}>{children}</span>
}

// Profit cell
export function ProfitCell({ value }) {
  if (value === undefined || value === null) return <span className="text-slate-400">—</span>
  const cls = value >= 0 ? 'profit-positive' : 'profit-negative'
  return <span className={cls}>{formatRon(value)}</span>
}

// Marja cell
export function MarjaCell({ value }) {
  if (value === undefined || value === null) return <span className="text-slate-400">—</span>
  const cls = value >= 20 ? 'text-emerald-600' : value >= 10 ? 'text-amber-500' : 'text-red-500'
  return <span className={`font-semibold ${cls}`}>{formatPct(value)}</span>
}
