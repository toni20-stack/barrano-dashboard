'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart3 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { EmptyState, MarjaCell, ProfitCell } from '../../components/ui'
import { getVanzari, getProduse, initStorage } from '../../lib/storage'
import { calcCostTotal, calcVanzareProfit, formatRon, formatPct, filterByDateRange } from '../../lib/calculations'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

export default function AnalizaPage() {
  const [vanzari, setVanzari] = useState([])
  const [produse, setProduse] = useState([])
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))
  const [sortBy, setSortBy] = useState('venit')

  const load = useCallback(() => {
    initStorage()
    setVanzari(getVanzari())
    setProduse(getProduse())
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = filterByDateRange(vanzari, 'data', dateFrom, dateTo)

  // Agregare per produs
  const produsStats = produse.map(p => {
    const vs = filtered.filter(v => v.produsId === p.id)
    const venit = vs.reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)
    const profit = vs.reduce((s, v) => s + calcVanzareProfit(v, produse).profit, 0)
    const cost = vs.reduce((s, v) => s + calcVanzareProfit(v, produse).cost, 0)
    const comision = vs.reduce((s, v) => s + calcVanzareProfit(v, produse).comision, 0)
    const qty = vs.reduce((s, v) => s + Number(v.cantitate), 0)
    const marja = venit > 0 ? (profit / venit) * 100 : 0
    const costUnic = calcCostTotal(p)
    const marjaBruta = p.pretVanzare > 0 ? ((Number(p.pretVanzare) - costUnic) / Number(p.pretVanzare)) * 100 : 0
    return { id: p.id, name: p.numeBarrano, venit, profit, cost, comision, qty, marja, costUnic, pretVanzare: p.pretVanzare, marjaBruta, tranzactii: vs.length }
  }).filter(p => p.qty > 0)

  const sorted = [...produsStats].sort((a, b) => {
    if (sortBy === 'venit') return b.venit - a.venit
    if (sortBy === 'profit') return b.profit - a.profit
    if (sortBy === 'marja') return b.marja - a.marja
    if (sortBy === 'qty') return b.qty - a.qty
    return 0
  })

  const totalVenit = produsStats.reduce((s, p) => s + p.venit, 0)

  // Scatter: marja vs venit
  const scatterData = produsStats.map(p => ({ x: p.venit, y: p.marja, z: p.qty, name: p.name }))

  return (
    <AppLayout>
      <Topbar
        title="Analiză"
        subtitle="Performanță și rentabilitate produse"
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      />

      <div className="p-6 space-y-5">
        {produsStats.length === 0 ? (
          <div className="card p-10">
            <EmptyState icon={BarChart3} title="Nicio vânzare în perioada selectată" subtitle="Ajustați filtrele de dată" />
          </div>
        ) : (
          <>
            {/* Tabel performanță */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Performanță produse</p>
                <div className="flex gap-1">
                  {[['venit', 'Venit'], ['profit', 'Profit'], ['marja', 'Marjă'], ['qty', 'Cantitate']].map(([val, lbl]) => (
                    <button key={val} onClick={() => setSortBy(val)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${sortBy === val ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header text-left px-4 py-3">Produs</th>
                      <th className="table-header text-right px-4 py-3">Cant. vândută</th>
                      <th className="table-header text-right px-4 py-3">Venit total</th>
                      <th className="table-header text-right px-4 py-3">Cost produse</th>
                      <th className="table-header text-right px-4 py-3">Comisioane</th>
                      <th className="table-header text-right px-4 py-3">Profit net</th>
                      <th className="table-header text-right px-4 py-3">Marjă reală</th>
                      <th className="table-header text-right px-4 py-3">Cotă venit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p, i) => {
                      const cota = totalVenit > 0 ? (p.venit / totalVenit) * 100 : 0
                      return (
                        <tr key={p.id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-right text-slate-700">{p.qty} buc</td>
                          <td className="table-cell text-right font-mono font-semibold text-slate-900">{formatRon(p.venit)}</td>
                          <td className="table-cell text-right font-mono text-slate-500">{formatRon(p.cost)}</td>
                          <td className="table-cell text-right font-mono text-blue-600">{p.comision > 0 ? formatRon(p.comision) : '—'}</td>
                          <td className="table-cell text-right"><ProfitCell value={p.profit} /></td>
                          <td className="table-cell text-right"><MarjaCell value={p.marja} /></td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${cota}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{cota.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Profit per produs bar */}
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Profit net per produs (RON)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip formatter={(v) => formatRon(v)} />
                    <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                      {sorted.map((entry, i) => (
                        <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Marja per produs */}
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Marjă reală per produs (%)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="marja" name="Marjă" radius={[0, 4, 4, 0]}>
                      {sorted.map((entry, i) => (
                        <Cell key={i} fill={entry.marja >= 20 ? '#10b981' : entry.marja >= 10 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost breakdown tabel */}
            <div className="card p-5">
              <p className="text-sm font-bold text-slate-800 mb-4">Structura cost per produs (cost unitar)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {produse.map(p => {
                  const cost = calcCostTotal(p)
                  const profit = Number(p.pretVanzare) - cost
                  const marja = p.pretVanzare > 0 ? (profit / Number(p.pretVanzare)) * 100 : 0
                  return (
                    <div key={p.id} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-700 mb-3 leading-tight">{p.numeBarrano}</p>
                      {[
                        { lbl: 'Achiziție', val: p.costAchizitie, pct: cost > 0 ? (p.costAchizitie/cost)*100 : 0, color: '#f97316' },
                        { lbl: 'Transport', val: p.transport, pct: cost > 0 ? (p.transport/cost)*100 : 0, color: '#3b82f6' },
                        { lbl: 'Taxe vamale', val: p.taxeVamale, pct: cost > 0 ? (p.taxeVamale/cost)*100 : 0, color: '#8b5cf6' },
                        { lbl: 'Ambalaj', val: p.ambalaj, pct: cost > 0 ? (p.ambalaj/cost)*100 : 0, color: '#f59e0b' },
                        ...(p.componente||[]).map(c => ({ lbl: c.nume, val: c.suma, pct: cost > 0 ? (c.suma/cost)*100 : 0, color: '#10b981' })),
                      ].filter(r => Number(r.val) > 0).map((r, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{r.lbl}</span>
                            <span>{formatRon(Number(r.val))}</span>
                          </div>
                          <div className="h-1.5 bg-white rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-xs font-bold text-slate-800">
                        <span>Cost total</span><span>{formatRon(cost)}</span>
                      </div>
                      <div className={`flex justify-between text-xs font-bold mt-1 ${marja>=20?'text-emerald-600':marja>=10?'text-amber-500':'text-red-500'}`}>
                        <span>Marjă brută</span><span>{formatPct(marja)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
