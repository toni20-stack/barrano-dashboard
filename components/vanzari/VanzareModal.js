'use client'
import { useState, useEffect } from 'react'
import { Modal, Field } from '../ui'
import { calcCostTotal, calcVanzareProfit, formatRon, formatPct, JUDETE } from '../../lib/calculations'
import { v4 as uuidv4 } from 'uuid'

const EMPTY = {
  produsId: '',
  cantitate: '1',
  pretUnitar: '',
  data: new Date().toISOString().slice(0, 10),
  canal: 'emag',
  aplicaComision: true,
  comisionEmag: '26',
  judet: '',
  oras: '',
  mediu: 'urban',
  tipClient: 'persoana_fizica',
}

export default function VanzareModal({ open, onClose, onSave, vanzare, produse }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (vanzare) {
      setForm({ ...EMPTY, ...vanzare, cantitate: String(vanzare.cantitate), pretUnitar: String(vanzare.pretUnitar), comisionEmag: String(vanzare.comisionEmag || 26) })
    } else {
      setForm(EMPTY)
    }
  }, [vanzare, open])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const produs = produse.find(p => p.id === form.produsId)
  const costTotal = produs ? calcCostTotal(produs) : 0

  useEffect(() => {
    if (produs && !vanzare) {
      set('pretUnitar', String(produs.pretVanzare))
    }
  }, [form.produsId])

  const calcObj = {
    produsId: form.produsId,
    cantitate: Number(form.cantitate) || 0,
    pretUnitar: Number(form.pretUnitar) || 0,
    canal: form.canal,
    aplicaComision: form.aplicaComision,
    comisionEmag: Number(form.comisionEmag) || 0,
  }
  const { venit, cost, comision, profit, marja } = calcVanzareProfit(calcObj, produse)

  const handleSave = () => {
    if (!form.produsId) return alert('Selectați un produs')
    if (!form.cantitate || Number(form.cantitate) < 1) return alert('Cantitatea trebuie să fie cel puțin 1')
    if (!form.pretUnitar || Number(form.pretUnitar) <= 0) return alert('Introduceți prețul de vânzare')
    const saved = {
      ...form,
      id: form.id || uuidv4(),
      cantitate: Number(form.cantitate),
      pretUnitar: Number(form.pretUnitar),
      comisionEmag: Number(form.comisionEmag) || 0,
    }
    onSave(saved)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={vanzare ? 'Editare vânzare' : 'Vânzare nouă'} size="xl">
      <div className="space-y-5">
        {/* Produs + cantitate + pret */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Detalii vânzare</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <Field label="Produs" required>
                <select className="input" value={form.produsId} onChange={e => set('produsId', e.target.value)}>
                  <option value="">— Selectați produsul —</option>
                  {produse.map(p => (
                    <option key={p.id} value={p.id}>{p.numeBarrano}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Cantitate" required>
              <input className="input" type="number" min="1" value={form.cantitate} onChange={e => set('cantitate', e.target.value)} />
            </Field>
            <Field label="Preț unitar (RON)" required>
              <input className="input" type="number" step="0.01" value={form.pretUnitar} onChange={e => set('pretUnitar', e.target.value)} />
            </Field>
            <Field label="Data" required>
              <input className="input" type="date" value={form.data} onChange={e => set('data', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Canal */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Canal vânzare</p>
          <div className="flex gap-2 mb-3">
            {[['emag', 'eMAG'], ['site', 'Site propriu'], ['altele', 'Altele']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => set('canal', val)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${form.canal === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {form.canal === 'emag' && (
            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-blue-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.aplicaComision}
                  onChange={e => set('aplicaComision', e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                Aplică comision eMAG
              </label>
              {form.aplicaComision && (
                <div className="flex items-center gap-2">
                  <input
                    className="input w-20 text-center"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={form.comisionEmag}
                    onChange={e => set('comisionEmag', e.target.value)}
                  />
                  <span className="text-sm font-semibold text-blue-700">%</span>
                </div>
              )}
              {form.aplicaComision && (
                <p className="text-xs text-blue-600 ml-auto">Comision: <strong>{formatRon(comision)}</strong></p>
              )}
            </div>
          )}
        </div>

        {/* Locatie + client */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Locație & tip client</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Județ">
              <select className="input" value={form.judet} onChange={e => set('judet', e.target.value)}>
                <option value="">— Județ —</option>
                {JUDETE.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </Field>
            <Field label="Oraș">
              <input className="input" value={form.oras} onChange={e => set('oras', e.target.value)} placeholder="ex: Cluj-Napoca" />
            </Field>
            <Field label="Mediu">
              <div className="flex gap-2">
                {[['urban', 'Urban'], ['rural', 'Rural']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => set('mediu', val)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${form.mediu === val ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tip client">
              <div className="flex gap-2">
                {[['persoana_fizica', 'Pers. fizică'], ['firma', 'Firmă']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => set('tipClient', val)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${form.tipClient === val ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        {/* Sumar calcule */}
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Venit brut</p>
            <p className="text-base font-bold text-slate-900">{formatRon(venit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Cost produs</p>
            <p className="text-base font-bold text-slate-600">{formatRon(cost)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Profit net</p>
            <p className={`text-base font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRon(profit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Marjă</p>
            <p className={`text-base font-bold ${marja >= 20 ? 'text-emerald-600' : marja >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{formatPct(marja)}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>Anulează</button>
          <button className="btn-primary" onClick={handleSave}>
            {vanzare ? 'Salvează modificările' : 'Adaugă vânzare'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
