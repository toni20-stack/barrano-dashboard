'use client'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, ShoppingCart, Percent, Package, RefreshCw } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { KPICard } from '../../components/ui'
import { getProduse, getVanzari, getCheltuieli, initStorage, resetStorage } from '../../lib/storage'
import { calcVanzareProfit, formatRon, formatPct, filterByDateRange } from '../../lib/calculations'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'

const CANAL_COLORS = { emag: '#3b82f6', site: '#10b981', altele: '#64748b' }

export default function DashboardPage() {
  const [produse, setProduse] = useState([])
  const [vanzari, setVanzari] = useState([])
  const [cheltuieli, setCheltuieli] = useState([])
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))

  const load = useCallback(() => {
    initStorage()
    setProduse(getProduse())
    setVanzari(getVanzari())
    setCheltuieli(getCheltuieli())
  }, [])
  useEffect(() => { load() }, [load])

  const filteredV = filterByDateRange(vanzari, 'data', dateFrom, dateTo)
  const filteredC = filterByDateRange(cheltuieli, 'data', dateFrom, dateTo)

  // KPIs
  const totalVenit = filteredV.reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0)
  const totalProfit = filteredV.reduce((s, v) => s + calcVanzareProfit(v, produse).profit, 0)
  const totalCheltuieli = filteredC.reduce((s, c) => s + Number(c.suma), 0)
  const profitNet = totalProfit - totalCheltuieli
  const marjaGlobala = totalVenit > 0 ? (totalProfit / totalVenit) * 100 : 0

  // Vânzări per lună (linie)
  const luniMap = {}
  filteredV.forEach(v => {
    const luna = v.data.slice(0, 7)
    if (!luniMap[luna]) luniMap[luna] = { luna, venit: 0, profit: 0, cheltuieli: 0 }
    const calc = calcVanzareProfit(v, produse)
    luniMap[luna].venit += calc.venit
    luniMap[luna].profit += calc.profit
  })
  filteredC.forEach(c => {
    const luna = c.data.slice(0, 7)
    if (!luniMap[luna]) luniMap[luna] = { luna, venit: 0, profit: 0, cheltuieli: 0 }
    luniMap[luna].cheltuieli += Number(c.suma)
  })
  const luniData = Object.values(luniMap).sort((a, b) => a.luna.localeCompare(b.luna)).map(d => ({
    ...d,
    lunaLabel: new Date(d.luna + '-01').toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' }),
    profitNet: d.profit - d.cheltuieli,
  }))

  // Canal distribution
  const canalData = ['emag', 'site', 'altele'].map(canal => ({
    name: canal === 'emag' ? 'eMAG' : canal === 'site' ? 'Site' : 'Altele',
    venit: filteredV.filter(v => v.canal === canal).reduce((s, v) => s + calcVanzareProfit(v, produse).venit, 0),
    fill: CANAL_COLORS[canal]
  })).filter(d => d.venit > 0)

  // Top produse
  const produsMap = {}
  filteredV.forEach(v => {
    if (!produsMap[v.produsId]) produsMap[v.produsId] = { venit: 0, profit: 0, qty: 0 }
    const calc = calcVanzareProfit(v, produse)
    produsMap[v.produsId].venit += calc.venit
    produsMap[v.produsId].profit += calc.profit
    produsMap[v.produsId].qty += Number(v.cantitate)
  })
  const topProduse = Object.entries(produsMap)
    .map(([id, d]) => ({ ...d, name: produse.find(p => p.id === id)?.numeBarrano || id }))
    .sort((a, b) => b.venit - a.venit)
    .slice(0, 5)

  return (
    <AppLayout>
      <Topbar
        title="Dashboard"
        subtitle="Vizualizare globală a performanței"
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      >
        <button className="btn-secondary text-xs" onClick={() => { resetStorage(); load() }}>
          <RefreshCw size={13} /> Reset date demo
        </button>
      </Topbar>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard label="Venit brut" value={formatRon(totalVenit)} icon={DollarSign} color="blue" sub={`${filteredV.length} tranzacții`} />
          <KPICard label="Profit din vânzări" value={formatRon(totalProfit)} icon={TrendingUp} color="green" />
          <KPICard label="Cheltuieli totale" value={formatRon(totalCheltuieli)} icon={ShoppingCart} color="orange" sub={`${filteredC.length} înregistrări`} />
          <KPICard label="Profit net final" value={formatRon(profitNet)} icon={Percent} color={profitNet >= 0 ? 'green' : 'red'} sub={`Marjă ${marjaGlobala.toFixed(1)}%`} />
        </div>

        {/* Linie venit/profit/cheltuieli */}
        <div className="card p-5">
          <p className="text-sm font-bold text-slate-800 mb-4">Evoluție lunară — Venit, Profit din vânzări, Cheltuieli</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={luniData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="lunaLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(val) => formatRon(val)} labelStyle={{ fontWeight: 600 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="venit" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Venit brut" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Profit vânzări" />
              <Line type="monotone" dataKey="cheltuieli" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Cheltuieli" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Canal bar */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Venit per canal de vânzare</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={canalData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(val) => formatRon(val)} />
                <Bar dataKey="venit" name="Venit" radius={[6, 6, 0, 0]}>
                  {canalData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top produse */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Top produse după venit</p>
            {topProduse.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Fără date în perioada selectată</div>
            ) : (
              <div className="space-y-3">
                {topProduse.map((p, i) => {
                  const pct = totalVenit > 0 ? (p.venit / totalVenit) * 100 : 0
                  const marja = p.venit > 0 ? (p.profit / p.venit) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{p.name}</span>
                        <div className="flex gap-3">
                          <span className="text-slate-500">{p.qty} buc</span>
                          <span className="font-semibold text-slate-900">{formatRon(p.venit)}</span>
                          <span className={`font-semibold ${marja >= 20 ? 'text-emerald-600' : marja >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{marja.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Profit net bar per luna */}
        <div className="card p-5">
          <p className="text-sm font-bold text-slate-800 mb-4">Profit net per lună (după deducerea cheltuielilor)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={luniData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="lunaLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={(val) => formatRon(val)} />
              <Bar dataKey="profitNet" name="Profit net" radius={[6, 6, 0, 0]}>
                {luniData.map((entry, i) => (
                  <Cell key={i} fill={entry.profitNet >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  )
}
