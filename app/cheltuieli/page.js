'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Receipt, Download } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import CheltuialaModal from '../../components/cheltuieli/CheltuialaModal'
import { ConfirmDialog, EmptyState } from '../../components/ui'
import { getCheltuieli, addCheltuiala, updateCheltuiala, deleteCheltuiala, deleteCheltuieliByIds, getVanzari, getProduse } from '../../lib/storage'
import { formatRon, formatDate, filterByDateRange, CATEGORII_CHELTUIELI, calcCostTotal } from '../../lib/calculations'
import { exportCheltuieli } from '../../lib/export'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const RADIAN = Math.PI / 180
const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
  if (percent < 0.04) return null
  // Numele — în interiorul feliei, rotit pe direcția radială
  const ri = innerRadius + (outerRadius - innerRadius) * 0.52
  const ix = cx + ri * Math.cos(-midAngle * RADIAN)
  const iy = cy + ri * Math.sin(-midAngle * RADIAN)
  const rot = midAngle > 90 && midAngle < 270 ? -midAngle + 180 : -midAngle
  // Procentul — pe exterior, în dreptul feliei
  const ro = outerRadius + 18
  const ox = cx + ro * Math.cos(-midAngle * RADIAN)
  const oy = cy + ro * Math.sin(-midAngle * RADIAN)
  return (
    <g>
      <text x={ix} y={iy} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={9} fontWeight="700"
        transform={`rotate(${rot},${ix},${iy})`}>
        {name}
      </text>
      <text x={ox} y={oy} textAnchor={ox > cx ? 'start' : 'end'} dominantBaseline="central"
        fill="#475569" fontSize={10} fontWeight="700">
        {(percent*100).toFixed(1)}%
      </text>
    </g>
  )
}

const CAT_COLORS = {
  'Marketing': '#f97316',
  'Transport': '#3b82f6',
  'Comisioane eMAG': '#ef4444',
  'Abonamente': '#8b5cf6',
  'Chirii': '#f59e0b',
  'Altele': '#64748b',
}

export default function CheltuieliPage() {
  const [cheltuieli, setCheltuieli] = useState([])
  const [vanzari, setVanzari] = useState([])
  const [produse, setProduse] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editC, setEditC] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterTara, setFilterTara] = useState('')

  const load = useCallback(async () => {
    const [c, v, p] = await Promise.all([getCheltuieli(), getVanzari(), getProduse()])
    setCheltuieli(c); setVanzari(v); setProduse(p)
  }, [])
  useEffect(() => { load() }, [load])

  const handleSave = async (c) => {
    if (editC) await updateCheltuiala(c)
    else await addCheltuiala(c)
    load()
  }

  const sorted = [...cheltuieli].sort((a, b) => b.data.localeCompare(a.data))
  const filtered = filterByDateRange(sorted, 'data', dateFrom, dateTo)
    .filter(c => !filterCat || c.categorie === filterCat)
    .filter(c => !filterTara || (filterTara === 'RO' ? (!c.tara || c.tara === 'RO') : c.tara === filterTara))

  const total = filtered.reduce((s, c) => s + Number(c.suma), 0)

  // COGS — cost marfă vândută în perioada filtrată
  const vanzariFiltrate = filterByDateRange(
    vanzari.filter(v => !v.isStorno),
    'data', dateFrom, dateTo
  ).filter(v => !filterTara || (filterTara === 'RO' ? (!v.tara || v.tara === 'RO') : v.tara === filterTara))
  const costMarfa = vanzariFiltrate.reduce((s, v) => {
    const p = produse.find(pr => pr.id === v.produsId)
    return s + (p ? calcCostTotal(p) * (Number(v.cantitate) || 0) : 0)
  }, 0)
  const venitVanzari = vanzariFiltrate.reduce((s, v) => s + (Number(v.cantitate) || 0) * (Number(v.pretUnitar) || 0), 0)
  const pctMarfa = venitVanzari > 0 ? (costMarfa / venitVanzari) * 100 : 0
  const profitNet = venitVanzari - costMarfa - total
  const impozitProfit = profitNet > 0 ? profitNet * 0.16 : 0

  // Pie data
  const ABO_PALETTE = ['#8b5cf6','#6366f1','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899']
  const byCategorie = CATEGORII_CHELTUIELI.map(cat => ({
    name: cat, color: CAT_COLORS[cat] || '#64748b',
    value: filtered.filter(c => c.categorie === cat).reduce((s, c) => s + Number(c.suma), 0)
  })).filter(d => d.value > 0)

  const byDescriere = Object.entries(
    filtered.reduce((acc, c) => {
      const key = (c.descriere || 'Fără denumire').trim()
      acc[key] = (acc[key] || 0) + Number(c.suma)
      return acc
    }, {})
  ).map(([name, value], i) => ({ name, value, color: ABO_PALETTE[i % ABO_PALETTE.length] }))
   .filter(d => d.value > 0)

  const pieData = filterCat ? byDescriere : [
    ...(costMarfa > 0 ? [{ name: 'Marfă', value: costMarfa, color: '#06b6d4' }] : []),
    ...byCategorie,
  ]

  return (
    <AppLayout>
      <Topbar
        title="Cheltuieli"
        subtitle={`Total filtrat: ${formatRon(total)}`}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      >
        {filtered.length > 0 && (
          <button className="btn-secondary" style={{color:'#dc2626',borderColor:'#fecaca'}}
            onClick={async () => {
              if (!window.confirm(`Ștergi ${filtered.length} cheltuieli filtrate? Acțiunea nu poate fi anulată.`)) return
              await deleteCheltuieliByIds(filtered.map(c => c.id))
              load()
            }}>
            <Trash2 size={15}/> Șterge {filtered.length} filtrate
          </button>
        )}
        <button className="btn-secondary" onClick={() => exportCheltuieli(filtered)}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => { setEditC(null); setModalOpen(true) }}>
          <Plus size={15} /> Cheltuială nouă
        </button>
      </Topbar>

      <div className="p-6 space-y-5">
        {/* Filtru piață */}
        <div className="flex gap-1 flex-wrap">
          {[['', 'Toate piețele'], ['RO', '🇷🇴 România'], ['BG', '🇧🇬 Bulgaria'], ['HU', '🇭🇺 Ungaria']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterTara(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterTara === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Sumar per categorie */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card Marfă — COGS calculat din vânzări × cost produs */}
          <div className="card p-3 border-l-4 border-cyan-500">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Marfă</p>
            </div>
            <p className="text-base font-bold text-slate-900">{formatRon(costMarfa)}</p>
            <p className="text-[10px] text-slate-400">{venitVanzari > 0 ? `${pctMarfa.toFixed(0)}% din vânzări` : `${vanzariFiltrate.length} vânz.`}</p>
          </div>
          {CATEGORII_CHELTUIELI.map(cat => {
            const suma = filtered.filter(c => c.categorie === cat).reduce((s, c) => s + Number(c.suma), 0)
            return (
              <div key={cat} className="card p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[cat] }} />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cat}</p>
                </div>
                <p className="text-base font-bold text-slate-900">{formatRon(suma)}</p>
                {venitVanzari > 0 && <p className="text-[10px] text-slate-400">{((suma/venitVanzari)*100).toFixed(0)}% din vânzări</p>}
              </div>
            )
          })}
          {/* Card Impozit profit 16% */}
          <div className="card p-3 border-l-4 border-rose-500">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Impozit profit 16%</p>
            </div>
            <p className="text-base font-bold text-rose-600">{formatRon(impozitProfit)}</p>
            <p className="text-[10px] text-slate-400">{profitNet > 0 ? `din profit ${formatRon(profitNet)}` : 'Profit net negativ'}</p>
          </div>
          {/* Card Profit net final după impozit */}
          <div className="card p-3 border-l-4 border-emerald-500">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Profit net final</p>
            </div>
            <p className={`text-base font-bold ${profitNet - impozitProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRon(profitNet - impozitProfit)}</p>
            <p className="text-[10px] text-slate-400">după impozit 16%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Table */}
          <div className="xl:col-span-2 space-y-3">
            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${!filterCat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
                Toate
              </button>
              {CATEGORII_CHELTUIELI.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterCat === cat ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}
                  style={filterCat === cat ? { backgroundColor: CAT_COLORS[cat] } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="card overflow-hidden">
              {filtered.length === 0 ? (
                <EmptyState icon={Receipt} title="Nicio cheltuială" subtitle="Adaugă prima cheltuială sau ajustează filtrele" />
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header text-left px-4 py-3">Data</th>
                      <th className="table-header text-left px-4 py-3">Categorie</th>
                      <th className="table-header text-left px-4 py-3">Descriere</th>
                      <th className="table-header text-right px-4 py-3">Sumă</th>
                      <th className="table-header text-center px-4 py-3">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id} className="table-row">
                        <td className="table-cell text-slate-500 text-xs whitespace-nowrap">{formatDate(c.data)}</td>
                        <td className="table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[c.categorie] || '#64748b' }} />
                            <span className="text-xs font-semibold text-slate-700">{c.categorie}</span>
                          </span>
                        </td>
                        <td className="table-cell text-slate-500 text-xs">{c.descriere || '—'}</td>
                        <td className="table-cell text-right font-mono font-semibold text-slate-900">{formatRon(c.suma)}</td>
                        <td className="table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <button className="btn-ghost" onClick={() => { setEditC(c); setModalOpen(true) }}><Pencil size={13} /></button>
                            <button className="btn-danger" onClick={() => setConfirmId(c.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase" colSpan={3}>Total ({filtered.length})</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">{formatRon(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Pie chart */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Distribuție cheltuieli</p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Fără date</div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">
                  {filterCat ? `${filterCat} după denumire` : 'Distribuție pe categorii'}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={renderSliceLabel} labelLine={false}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatRon(val)} contentStyle={{fontSize:11,borderRadius:8}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{formatRon(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CheltuialaModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} cheltuiala={editC} />
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={async () => { await deleteCheltuiala(confirmId); load() }} title="Șterge cheltuială" message="Ești sigur că vrei să ștergi această cheltuială?" />
    </AppLayout>
  )
}
