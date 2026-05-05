'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ShoppingCart, Download } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import VanzareModal from '../../components/vanzari/VanzareModal'
import { ConfirmDialog, EmptyState, Badge, ProfitCell, MarjaCell } from '../../components/ui'
import { getVanzari, addVanzare, updateVanzare, deleteVanzare, getProduse, initStorage } from '../../lib/storage'
import { calcVanzareProfit, formatRon, formatDate, filterByDateRange, CANALE_LABELS, MEDIU_LABELS, TIP_CLIENT_LABELS } from '../../lib/calculations'
import { exportVanzari } from '../../lib/export'

export default function VanzariPage() {
  const [vanzari, setVanzari] = useState([])
  const [produse, setProduse] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editV, setEditV] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCanal, setFilterCanal] = useState('')
  const [filterTara, setFilterTara] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    initStorage()
    setVanzari(getVanzari())
    setProduse(getProduse())
  }, [])
  useEffect(() => { load() }, [load])

  const handleSave = (v) => {
    if (editV) updateVanzare(v)
    else addVanzare(v)
    load()
  }

  const sorted = [...vanzari].sort((a, b) => b.data.localeCompare(a.data))
  const filtered = filterByDateRange(sorted, 'data', dateFrom, dateTo)
    .filter(v => !filterCanal || v.canal === filterCanal)
    .filter(v => !filterTara || (filterTara === 'RO' ? (!v.tara || v.tara === 'RO') : v.tara === filterTara))
    .filter(v => {
      if (!search) return true
      const p = produse.find(p => p.id === v.produsId)
      return (p?.numeBarrano || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.judet || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.oras || '').toLowerCase().includes(search.toLowerCase())
    })

  // Totals
  const totals = filtered.reduce((acc, v) => {
    const { venit, profit, cost, comision } = calcVanzareProfit(v, produse)
    return { venit: acc.venit + venit, profit: acc.profit + profit, cost: acc.cost + cost, comision: acc.comision + comision }
  }, { venit: 0, profit: 0, cost: 0, comision: 0 })
  const marjaTotal = totals.venit > 0 ? (totals.profit / totals.venit) * 100 : 0

  return (
    <AppLayout>
      <Topbar
        title="Vânzări"
        subtitle={`${filtered.length} tranzacții filtrate`}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      >
        <button className="btn-secondary" onClick={() => exportVanzari(filtered, produse)}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => { setEditV(null); setModalOpen(true) }}>
          <Plus size={15} /> Vânzare nouă
        </button>
      </Topbar>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { lbl: 'Venit total', val: formatRon(totals.venit), color: 'text-slate-900' },
            { lbl: 'Cost produse', val: formatRon(totals.cost), color: 'text-slate-600' },
            { lbl: 'Comisioane eMAG', val: formatRon(totals.comision), color: 'text-blue-600' },
            { lbl: 'Profit net', val: formatRon(totals.profit), color: totals.profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
          ].map(({ lbl, val, color }) => (
            <div key={lbl} className="card p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbl}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <input className="input max-w-xs" placeholder="Caută produs, județ, oraș..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-1">
            {[['', 'Toate canalele'], ['emag', 'eMAG'], ['site', 'Site']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterCanal(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterCanal === val ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {[['', 'Toate piețele'], ['RO', '🇷🇴 România'], ['BG', '🇧🇬 Bulgaria'], ['HU', '🇭🇺 Ungaria']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterTara(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterTara === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nicio vânzare găsită" subtitle="Adaugă prima vânzare sau ajustează filtrele" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header text-left px-4 py-3">Data</th>
                    <th className="table-header text-left px-4 py-3">Produs</th>
                    <th className="table-header text-center px-4 py-3">Canal</th>
                    <th className="table-header text-right px-4 py-3">Cant.</th>
                    <th className="table-header text-right px-4 py-3">Preț unit.</th>
                    <th className="table-header text-right px-4 py-3">Venit</th>
                    <th className="table-header text-right px-4 py-3">Comision</th>
                    <th className="table-header text-right px-4 py-3">Profit</th>
                    <th className="table-header text-right px-4 py-3">Marjă</th>
                    <th className="table-header text-center px-4 py-3">Județ</th>
                    <th className="table-header text-center px-4 py-3">Mediu</th>
                    <th className="table-header text-center px-4 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => {
                    const { venit, cost, comision, profit, marja } = calcVanzareProfit(v, produse)
                    const produs = produse.find(p => p.id === v.produsId)
                    return (
                      <tr key={v.id} className="table-row">
                        <td className="table-cell text-slate-500 text-xs whitespace-nowrap">{formatDate(v.data)}</td>
                        <td className="table-cell font-medium text-slate-900 max-w-[160px] truncate">{produs?.numeBarrano || '—'}</td>
                        <td className="table-cell text-center">
                          <Badge variant={v.canal}>{CANALE_LABELS[v.canal]}</Badge>
                        </td>
                        <td className="table-cell text-right text-slate-700">{v.cantitate}</td>
                        <td className="table-cell text-right font-mono text-sm">{formatRon(v.pretUnitar)}</td>
                        <td className="table-cell text-right font-mono text-sm font-semibold text-slate-900">{formatRon(venit)}</td>
                        <td className="table-cell text-right font-mono text-sm text-blue-600">{comision > 0 ? formatRon(comision) : '—'}</td>
                        <td className="table-cell text-right"><ProfitCell value={profit} /></td>
                        <td className="table-cell text-right"><MarjaCell value={marja} /></td>
                        <td className="table-cell text-center text-xs text-slate-500">{v.judet || '—'}</td>
                        <td className="table-cell text-center">
                          {v.mediu ? <Badge variant={v.mediu}>{MEDIU_LABELS[v.mediu]}</Badge> : '—'}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <button className="btn-ghost" onClick={() => { setEditV(v); setModalOpen(true) }}><Pencil size={13} /></button>
                            <button className="btn-danger" onClick={() => setConfirmId(v.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase" colSpan={5}>
                      Total ({filtered.length} tranzacții)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">{formatRon(totals.venit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 font-mono">{formatRon(totals.comision)}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono">
                      <span className={totals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatRon(totals.profit)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={marjaTotal >= 20 ? 'text-emerald-600' : marjaTotal >= 10 ? 'text-amber-500' : 'text-red-500'}>
                        {marjaTotal.toFixed(1)}%
                      </span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <VanzareModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} vanzare={editV} produse={produse} />
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => { deleteVanzare(confirmId); load() }} title="Șterge vânzare" message="Ești sigur că vrei să ștergi această vânzare?" />
    </AppLayout>
  )
}
