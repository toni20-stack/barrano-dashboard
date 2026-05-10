'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Field } from '../ui'
import { calcCostTotal, formatRon, formatPct } from '../../lib/calculations'
import { v4 as uuidv4 } from 'uuid'

const EMPTY = {
  numeProducator: '',
  numeBarrano: '',
  costAchizitieNIR: '',
  ambalaj: '',
  componente: [],
  pretVanzare: '',
  createdAt: new Date().toISOString().slice(0, 10),
}

export default function ProduseModal({ open, onClose, onSave, produs, produse = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [bulkIds, setBulkIds] = useState([])
  const [bulkSearch, setBulkSearch] = useState('')

  useEffect(() => {
    if (produs) {
      const migrated = { ...EMPTY, ...produs }
      if ((migrated.costAchizitieNIR === undefined || migrated.costAchizitieNIR === '') && (produs.costAchizitie || produs.transport || produs.taxeVamale)) {
        const old = (Number(produs.costAchizitie) || 0) + (Number(produs.transport) || 0) + (Number(produs.taxeVamale) || 0)
        if (old > 0) migrated.costAchizitieNIR = old
      }
      setForm(migrated)
    } else {
      setForm(EMPTY)
    }
    setBulkIds([])
    setBulkSearch('')
  }, [produs, open])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addComponenta = () => {
    setForm(f => ({ ...f, componente: [...f.componente, { id: uuidv4(), nume: '', suma: '' }] }))
  }
  const updateComponenta = (id, key, val) => {
    setForm(f => ({ ...f, componente: f.componente.map(c => c.id === id ? { ...c, [key]: val } : c) }))
  }
  const removeComponenta = (id) => {
    setForm(f => ({ ...f, componente: f.componente.filter(c => c.id !== id) }))
  }

  const costTotal = calcCostTotal({
    ...form,
    costAchizitieNIR: Number(form.costAchizitieNIR) || 0,
    ambalaj: Number(form.ambalaj) || 0,
    componente: form.componente.map(c => ({ ...c, suma: Number(c.suma) || 0 }))
  })
  const pretVanzare = Number(form.pretVanzare) || 0
  const profit = pretVanzare - costTotal
  const marja = pretVanzare > 0 ? (profit / pretVanzare) * 100 : 0

  const alteProduse = produse
    .filter(p => p.id !== produs?.id)
    .filter(p => !bulkSearch || p.numeBarrano.toLowerCase().includes(bulkSearch.toLowerCase()))

  const handleSave = () => {
    if (!form.numeBarrano.trim()) return alert('Introduceți numele Barrano')
    const saved = {
      ...form,
      id: form.id || uuidv4(),
      costAchizitieNIR: Number(form.costAchizitieNIR) || 0,
      ambalaj: Number(form.ambalaj) || 0,
      pretVanzare: Number(form.pretVanzare) || 0,
      componente: form.componente.map(c => ({ ...c, suma: Number(c.suma) || 0 }))
    }
    const costData = {
      costAchizitieNIR: saved.costAchizitieNIR,
      ambalaj: saved.ambalaj,
      componente: saved.componente,
    }
    onSave(saved, bulkIds, costData)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={produs ? 'Editare produs' : 'Produs nou'} size="xl">
      <div className="space-y-5">
        {/* Identitate */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identitate produs</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nume producător">
              <input className="input" value={form.numeProducator} onChange={e => set('numeProducator', e.target.value)} placeholder="ex: Aroma Diffuser Co. CN-300" />
            </Field>
            <Field label="Nume Barrano" required>
              <input className="input" value={form.numeBarrano} onChange={e => set('numeBarrano', e.target.value)} placeholder="ex: Difuzor Barrano Noir 300ml" />
            </Field>
          </div>
        </div>

        {/* Costuri */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Componente cost (RON)</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cost achiziție NIR">
              <input className="input" type="number" step="0.01" value={form.costAchizitieNIR} onChange={e => set('costAchizitieNIR', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Ambalaj">
              <input className="input" type="number" step="0.01" value={form.ambalaj} onChange={e => set('ambalaj', e.target.value)} placeholder="0.00" />
            </Field>
          </div>
        </div>

        {/* Componente custom */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Componente custom</p>
            <button className="btn-ghost text-orange-500 hover:bg-orange-50" onClick={addComponenta}>
              <Plus size={12} /> Adaugă
            </button>
          </div>
          {form.componente.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Fără componente suplimentare</p>
          ) : (
            <div className="space-y-2">
              {form.componente.map(c => (
                <div key={c.id} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder="Denumire componentă (ex: Etichetă premium)" value={c.nume} onChange={e => updateComponenta(c.id, 'nume', e.target.value)} />
                  <input className="input w-28" type="number" step="0.01" placeholder="RON" value={c.suma} onChange={e => updateComponenta(c.id, 'suma', e.target.value)} />
                  <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" onClick={() => removeComponenta(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preț și calcule */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <Field label="Preț vânzare implicit (RON)" required>
                <input className="input" type="number" step="0.01" value={form.pretVanzare} onChange={e => set('pretVanzare', e.target.value)} placeholder="0.00" />
              </Field>
            </div>
            <div className="flex gap-6 mt-5">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Cost total</p>
                <p className="text-lg font-bold text-slate-900">{formatRon(costTotal)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Profit / buc</p>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRon(profit)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Marjă</p>
                <p className={`text-lg font-bold ${marja >= 20 ? 'text-emerald-600' : marja >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{formatPct(marja)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk update — doar la editare */}
        {produs && produse.length > 1 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Aplică același cost NIR și la</p>
            <p className="text-xs text-slate-400 mb-2">Selectează produsele care au același cost (ex: același produs, culori diferite)</p>
            <input className="input mb-2" placeholder="Filtrează produse..." value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} />
            <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {alteProduse.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-1">Niciun produs găsit</p>
              ) : alteProduse.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                  <input type="checkbox" checked={bulkIds.includes(p.id)}
                    onChange={e => setBulkIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
                  <span className="text-slate-700 flex-1">{p.numeBarrano}</span>
                  <span className="text-slate-400 font-mono">{formatRon(calcCostTotal(p))}</span>
                </label>
              ))}
            </div>
            {bulkIds.length > 0 && (
              <p className="text-xs font-semibold text-orange-600 mt-1.5">
                Cost NIR {formatRon(Number(form.costAchizitieNIR) || 0)} va fi aplicat la {bulkIds.length} produs(e) suplimentar(e)
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>Anulează</button>
          <button className="btn-primary" onClick={handleSave}>
            {produs ? 'Salvează modificările' : 'Adaugă produs'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
