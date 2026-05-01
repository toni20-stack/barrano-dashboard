'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Receipt, Download } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import CheltuialaModal from '../../components/cheltuieli/CheltuialaModal'
import { ConfirmDialog, EmptyState } from '../../components/ui'
import { getCheltuieli, addCheltuiala, updateCheltuiala, deleteCheltuiala, initStorage } from '../../lib/storage'
import { formatRon, formatDate, filterByDateRange, CATEGORII_CHELTUIELI } from '../../lib/calculations'
import { exportCheltuieli } from '../../lib/export'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const CAT_COLORS = {
  'Marketing': '#f97316',
  'Logistică': '#3b82f6',
  'Abonamente': '#8b5cf6',
  'Salarii': '#10b981',
  'Chirii': '#f59e0b',
  'Altele': '#64748b',
}

export default function CheltuieliPage() {
  const [cheltuieli, setCheltuieli] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editC, setEditC] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCat, setFilterCat] = useState('')

  const load = useCallback(() => { initStorage(); setCheltuieli(getCheltuieli()) }, [])
  useEffect(() => { load() }, [load])

  const handleSave = (c) => {
    if (editC) updateCheltuiala(c)
    else addCheltuiala(c)
    load()
  }

  const sorted = [...cheltuieli].sort((a, b) => b.data.localeCompare(a.data))
  const filtered = filterByDateRange(sorted, 'data', dateFrom, dateTo)
    .filter(c => !filterCat || c.categorie === filterCat)

  const total = filtered.reduce((s, c) => s + Number(c.suma), 0)

  // Pie data
  const byCategorie = CATEGORII_CHELTUIELI.map(cat => ({
    name: cat,
    value: filtered.filter(c => c.categorie === cat).reduce((s, c) => s + Number(c.suma), 0)
  })).filter(d => d.value > 0)

  return (
    <AppLayout>
      <Topbar
        title="Cheltuieli"
        subtitle={`Total filtrat: ${formatRon(total)}`}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      >
        <button className="btn-secondary" onClick={() => exportCheltuieli(filtered)}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => { setEditC(null); setModalOpen(true) }}>
          <Plus size={15} /> Cheltuială nouă
        </button>
      </Topbar>

      <div className="p-6 space-y-5">
        {/* Sumar per categorie */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {CATEGORII_CHELTUIELI.map(cat => {
            const suma = filtered.filter(c => c.categorie === cat).reduce((s, c) => s + Number(c.suma), 0)
            return (
              <div key={cat} className="card p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[cat] }} />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cat}</p>
                </div>
                <p className="text-base font-bold text-slate-900">{formatRon(suma)}</p>
                {total > 0 && <p className="text-[10px] text-slate-400">{((suma/total)*100).toFixed(0)}% din total</p>}
              </div>
            )
          })}
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
            {byCategorie.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Fără date</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byCategorie} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                      {byCategorie.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[entry.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatRon(val)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {byCategorie.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[d.name] }} />
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
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => { deleteCheltuiala(confirmId); load() }} title="Șterge cheltuială" message="Ești sigur că vrei să ștergi această cheltuială?" />
    </AppLayout>
  )
}
