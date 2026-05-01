'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { EmptyState } from '../../components/ui'
import { getVanzari, getProduse, initStorage } from '../../lib/storage'
import { calcVanzareProfit, formatRon, filterByDateRange, groupBy } from '../../lib/calculations'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

export default function ClientiPage() {
  const [vanzari, setVanzari] = useState([])
  const [produse, setProduse] = useState([])
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))

  const load = useCallback(() => {
    initStorage()
    setVanzari(getVanzari())
    setProduse(getProduse())
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = filterByDateRange(vanzari, 'data', dateFrom, dateTo)

  // Urban vs Rural
  const urbanCount = filtered.filter(v => v.mediu === 'urban').length
  const ruralCount = filtered.filter(v => v.mediu === 'rural').length
  const urbanVenit = filtered.filter(v => v.mediu === 'urban').reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)
  const ruralVenit = filtered.filter(v => v.mediu === 'rural').reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)

  const mediuPie = [
    { name: 'Urban', value: urbanVenit, fill: '#8b5cf6' },
    { name: 'Rural', value: ruralVenit, fill: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Tip client
  const pfVenit = filtered.filter(v => v.tipClient === 'persoana_fizica').reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)
  const firmaVenit = filtered.filter(v => v.tipClient === 'firma').reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)

  const tipPie = [
    { name: 'Persoană fizică', value: pfVenit, fill: '#3b82f6' },
    { name: 'Firmă', value: firmaVenit, fill: '#10b981' },
  ].filter(d => d.value > 0)

  // Top județe
  const byJudet = groupBy(filtered, 'judet')
  const topJudete = Object.entries(byJudet)
    .map(([judet, vs]) => ({
      judet: judet === 'necunoscut' ? '—' : judet,
      venit: vs.reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0),
      tranzactii: vs.length,
    }))
    .filter(j => j.judet !== '—')
    .sort((a, b) => b.venit - a.venit)
    .slice(0, 10)

  const totalVenit = filtered.reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)

  return (
    <AppLayout>
      <Topbar
        title="Clienți"
        subtitle="Distribuție geografică și demografică"
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      />

      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { lbl: 'Tranzacții totale', val: filtered.length },
            { lbl: 'Urban', val: `${urbanCount} (${filtered.length > 0 ? ((urbanCount/filtered.length)*100).toFixed(0) : 0}%)` },
            { lbl: 'Rural', val: `${ruralCount} (${filtered.length > 0 ? ((ruralCount/filtered.length)*100).toFixed(0) : 0}%)` },
            { lbl: 'Județe active', val: Object.keys(byJudet).filter(j => j !== 'necunoscut').length },
          ].map(({ lbl, val }) => (
            <div key={lbl} className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbl}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Urban vs Rural pie */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Urban vs Rural — Venit</p>
            {mediuPie.length === 0 ? <EmptyState icon={Users} title="Fără date" /> : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={mediuPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {mediuPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={v => formatRon(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {mediuPie.map(d => (
                    <div key={d.name} className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="font-semibold">{formatRon(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tip client pie */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Tip client — Venit</p>
            {tipPie.length === 0 ? <EmptyState icon={Users} title="Fără date" /> : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={tipPie} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {tipPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={v => formatRon(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {tipPie.map(d => (
                    <div key={d.name} className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span>{d.name}</span>
                      </div>
                      <span className="font-semibold">{formatRon(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top județe list */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Top județe după venit</p>
            {topJudete.length === 0 ? <EmptyState icon={Users} title="Fără date" /> : (
              <div className="space-y-3">
                {topJudete.map((j, i) => {
                  const pct = totalVenit > 0 ? (j.venit / totalVenit) * 100 : 0
                  return (
                    <div key={j.judet}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{i + 1}. {j.judet}</span>
                        <div className="flex gap-3">
                          <span className="text-slate-400">{j.tranzactii} tr.</span>
                          <span className="font-semibold text-slate-900">{formatRon(j.venit)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bar chart județe */}
        {topJudete.length > 0 && (
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Top 10 județe — Venit (RON)</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topJudete} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="judet" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatRon(v)} />
                <Bar dataKey="venit" fill="#f97316" radius={[4, 4, 0, 0]} name="Venit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
