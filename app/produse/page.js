'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Copy, Trash2, Pencil, Package, Download } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import ProduseModal from '../../components/produse/ProduseModal'
import { ConfirmDialog, EmptyState, Badge, MarjaCell, ProfitCell } from '../../components/ui'
import { getProduse, addProdus, updateProdus, deleteProdus, initStorage } from '../../lib/storage'
import { calcCostTotal, formatRon, formatPct } from '../../lib/calculations'
import { exportProduse } from '../../lib/export'
import { v4 as uuidv4 } from 'uuid'

export default function ProducePage() {
  const [produse, setProduse] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editProdus, setEditProdus] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    initStorage()
    setProduse(getProduse())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = (p) => {
    if (editProdus) updateProdus(p)
    else addProdus(p)
    load()
  }

  const handleDelete = (id) => {
    deleteProdus(id)
    load()
  }

  const handleDuplicate = (p) => {
    const nou = { ...p, id: uuidv4(), numeBarrano: p.numeBarrano + ' (copie)', createdAt: new Date().toISOString().slice(0,10) }
    addProdus(nou)
    load()
  }

  const filtered = produse.filter(p =>
    p.numeBarrano.toLowerCase().includes(search.toLowerCase()) ||
    (p.numeProducator || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <Topbar title="Produse" subtitle={`${produse.length} produse în catalog`}>
        <button className="btn-secondary" onClick={() => exportProduse(produse)}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => { setEditProdus(null); setModalOpen(true) }}>
          <Plus size={15} /> Produs nou
        </button>
      </Topbar>

      <div className="p-6">
        {/* Search */}
        <div className="mb-5">
          <input
            className="input max-w-xs"
            placeholder="Caută produs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={Package} title="Niciun produs găsit" subtitle="Adaugă primul produs apăsând butonul de mai sus" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header text-left px-4 py-3">Produs Barrano</th>
                    <th className="table-header text-left px-4 py-3">Producător</th>
                    <th className="table-header text-right px-4 py-3">Cost total</th>
                    <th className="table-header text-right px-4 py-3">Preț vânzare</th>
                    <th className="table-header text-right px-4 py-3">Profit / buc</th>
                    <th className="table-header text-right px-4 py-3">Marjă</th>
                    <th className="table-header text-center px-4 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const cost = calcCostTotal(p)
                    const profit = (Number(p.pretVanzare) || 0) - cost
                    const marja = p.pretVanzare > 0 ? (profit / Number(p.pretVanzare)) * 100 : 0
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="table-cell font-semibold text-slate-900">{p.numeBarrano}</td>
                        <td className="table-cell text-slate-500 text-xs">{p.numeProducator || '—'}</td>
                        <td className="table-cell text-right font-mono text-sm">{formatRon(cost)}</td>
                        <td className="table-cell text-right font-mono text-sm font-semibold">{formatRon(p.pretVanzare)}</td>
                        <td className="table-cell text-right"><ProfitCell value={profit} /></td>
                        <td className="table-cell text-right"><MarjaCell value={marja} /></td>
                        <td className="table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <button className="btn-ghost" title="Editează" onClick={() => { setEditProdus(p); setModalOpen(true) }}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn-ghost" title="Duplică" onClick={() => handleDuplicate(p)}>
                              <Copy size={13} />
                            </button>
                            <button className="btn-danger" title="Șterge" onClick={() => setConfirmId(p.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cost breakdown cards */}
        {filtered.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Detaliu costuri pe produs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(p => {
                const cost = calcCostTotal(p)
                const customTotal = (p.componente || []).reduce((s,c) => s + Number(c.suma), 0)
                const profit = (Number(p.pretVanzare)||0) - cost
                const marja = p.pretVanzare > 0 ? (profit/Number(p.pretVanzare))*100 : 0
                return (
                  <div key={p.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.numeBarrano}</p>
                        <p className="text-xs text-slate-400">{p.numeProducator}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${marja>=20?'bg-emerald-100 text-emerald-700':marja>=10?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                        {formatPct(marja)}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        ['Achiziție furnizor', p.costAchizitie],
                        ['Transport / freight', p.transport],
                        ['Taxe vamale', p.taxeVamale],
                        ['Ambalaj', p.ambalaj],
                        ...(p.componente||[]).map(c => [c.nume||'—', c.suma]),
                      ].filter(([,v]) => Number(v)>0).map(([lbl, val], i) => (
                        <div key={i} className="flex justify-between text-slate-600">
                          <span>{lbl}</span>
                          <span className="font-mono">{formatRon(Number(val))}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-800">
                        <span>Cost total</span>
                        <span className="font-mono">{formatRon(cost)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Preț vânzare</span>
                        <span className="font-mono font-semibold">{formatRon(p.pretVanzare)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${profit>=0?'text-emerald-600':'text-red-500'}`}>
                        <span>Profit / buc</span>
                        <span className="font-mono">{formatRon(profit)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <ProduseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        produs={editProdus}
      />
      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => handleDelete(confirmId)}
        title="Șterge produs"
        message="Ești sigur că vrei să ștergi acest produs? Acțiunea nu poate fi anulată."
      />
    </AppLayout>
  )
}
