'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ShoppingCart, Download, RotateCcw } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import VanzareModal from '../../components/vanzari/VanzareModal'
import { ConfirmDialog, EmptyState, Badge, ProfitCell, MarjaCell } from '../../components/ui'
import { getVanzari, addVanzare, updateVanzare, deleteVanzare, getProduse, initStorage } from '../../lib/storage'
import { calcVanzareProfit, formatRon, formatDate, filterByDateRange, CANALE_LABELS, MEDIU_LABELS } from '../../lib/calculations'
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
  const [viewTab, setViewTab] = useState('vanzari')

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

  const norm   = filtered.filter(v => !v.isStorno)
  const storno = filtered.filter(v => v.isStorno)

  const calcTotals = (list) => list.reduce((acc, v) => {
    const { venit, profit, cost, comision } = calcVanzareProfit(v, produse)
    return { venit: acc.venit + venit, profit: acc.profit + profit, cost: acc.cost + cost, comision: acc.comision + comision }
  }, { venit: 0, profit: 0, cost: 0, comision: 0 })

  const totNorm   = calcTotals(norm)
  const totStorno = calcTotals(storno)
  const venitNet  = totNorm.venit - totStorno.venit
  const profitNet = totNorm.profit - totStorno.profit
  const marjaNeta = venitNet > 0 ? (profitNet / venitNet) * 100 : 0

  const activeList = viewTab === 'vanzari' ? norm : storno
  const activeTot  = viewTab === 'vanzari' ? totNorm : totStorno
  const activeMarja = activeTot.venit > 0 ? (activeTot.profit / activeTot.venit) * 100 : 0

  const TabelVanzari = ({ list, tot, marja, isStorno }) => (
    <div className="card overflow-hidden">
      {list.length === 0 ? (
        <EmptyState icon={isStorno ? RotateCcw : ShoppingCart}
          title={isStorno ? 'Niciun retur în perioada selectată' : 'Nicio vânzare găsită'}
          subtitle={isStorno ? '' : 'Adaugă prima vânzare sau ajustează filtrele'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header text-left px-4 py-3">Data</th>
                <th className="table-header text-left px-4 py-3">Produs</th>
                <th className="table-header text-center px-4 py-3">Piață</th>
                <th className="table-header text-right px-4 py-3">Cant.</th>
                <th className="table-header text-right px-4 py-3">Preț unit.</th>
                <th className="table-header text-right px-4 py-3">Venit</th>
                <th className="table-header text-right px-4 py-3">Profit</th>
                <th className="table-header text-right px-4 py-3">Marjă</th>
                <th className="table-header text-center px-4 py-3">Județ</th>
                <th className="table-header text-center px-4 py-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {list.map(v => {
                const { venit, profit, marja: mj } = calcVanzareProfit(v, produse)
                const produs = produse.find(p => p.id === v.produsId)
                const flagTara = v.tara === 'BG' ? '🇧🇬' : v.tara === 'HU' ? '🇭🇺' : '🇷🇴'
                return (
                  <tr key={v.id} className={`table-row ${isStorno ? 'bg-red-50/30' : ''}`}>
                    <td className="table-cell text-slate-500 text-xs whitespace-nowrap">{formatDate(v.data)}</td>
                    <td className="table-cell font-medium text-slate-900 max-w-[160px] truncate">{produs?.numeBarrano || '—'}</td>
                    <td className="table-cell text-center text-sm">{flagTara}</td>
                    <td className="table-cell text-right text-slate-700">{v.cantitate}</td>
                    <td className="table-cell text-right font-mono text-sm">{formatRon(v.pretUnitar)}</td>
                    <td className={`table-cell text-right font-mono text-sm font-semibold ${isStorno ? 'text-red-500' : 'text-slate-900'}`}>{isStorno ? '-' : ''}{formatRon(venit)}</td>
                    <td className="table-cell text-right"><ProfitCell value={isStorno ? -profit : profit} /></td>
                    <td className="table-cell text-right"><MarjaCell value={mj} /></td>
                    <td className="table-cell text-center text-xs text-slate-500">{v.judet || '—'}</td>
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
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase" colSpan={5}>
                  Total ({list.length})
                </td>
                <td className={`px-4 py-3 text-right font-bold font-mono ${isStorno ? 'text-red-500' : 'text-slate-900'}`}>{isStorno ? '-' : ''}{formatRon(tot.venit)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono">
                  <span className={tot.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatRon(isStorno ? -tot.profit : tot.profit)}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  <span className={marja >= 20 ? 'text-emerald-600' : marja >= 10 ? 'text-amber-500' : 'text-red-500'}>
                    {marja.toFixed(1)}%
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      <Topbar
        title="Vânzări"
        subtitle={`${norm.length} vânzări · ${storno.length} retururi`}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFrom={setDateFrom} onDateTo={setDateTo}
      >
        <button className="btn-secondary" onClick={() => exportVanzari(norm, produse)}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => { setEditV(null); setModalOpen(true) }}>
          <Plus size={15} /> Vânzare nouă
        </button>
      </Topbar>

      <div className="p-6 space-y-5">
        {/* KPI strip — net */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vânzări brute</p>
            <p className="text-xl font-bold mt-1 text-slate-900">{formatRon(totNorm.venit)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{norm.length} tranzacții</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retururi</p>
            <p className="text-xl font-bold mt-1 text-red-500">-{formatRon(totStorno.venit)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{storno.length} înregistrări</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vânzări nete</p>
            <p className={`text-xl font-bold mt-1 ${venitNet >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{formatRon(venitNet)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit brut</p>
            <p className={`text-xl font-bold mt-1 ${profitNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRon(profitNet)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Marjă {marjaNeta.toFixed(1)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <input className="input max-w-xs" placeholder="Caută produs, județ, oraș..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-1">
            {[['', 'Toate piețele'], ['RO', '🇷🇴 România'], ['BG', '🇧🇬 Bulgaria'], ['HU', '🇭🇺 Ungaria']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterTara(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterTara === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs vânzări / retururi */}
        <div className="flex gap-2">
          <button onClick={() => setViewTab('vanzari')}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${viewTab === 'vanzari' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            Vânzări ({norm.length})
          </button>
          <button onClick={() => setViewTab('retururi')}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${viewTab === 'retururi' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            Retururi ({storno.length})
          </button>
        </div>

        <TabelVanzari list={activeList} tot={activeTot} marja={activeMarja} isStorno={viewTab === 'retururi'} />
      </div>

      <VanzareModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} vanzare={editV} produse={produse} />
      <ConfirmDialog open={!!confirmId} onClose={() => setConfirmId(null)} onConfirm={() => { deleteVanzare(confirmId); load() }} title="Șterge înregistrare" message="Ești sigur că vrei să ștergi această înregistrare?" />
    </AppLayout>
  )
}
