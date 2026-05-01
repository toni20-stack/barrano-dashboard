'use client'
import { useState, useEffect } from 'react'
import { Modal, Field } from '../ui'
import { CATEGORII_CHELTUIELI } from '../../lib/calculations'
import { v4 as uuidv4 } from 'uuid'

const EMPTY = {
  categorie: 'Marketing',
  suma: '',
  data: new Date().toISOString().slice(0, 10),
  descriere: '',
}

export default function CheltuialaModal({ open, onClose, onSave, cheltuiala }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (cheltuiala) setForm({ ...EMPTY, ...cheltuiala, suma: String(cheltuiala.suma) })
    else setForm(EMPTY)
  }, [cheltuiala, open])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = () => {
    if (!form.suma || Number(form.suma) <= 0) return alert('Introduceți suma cheltuielii')
    onSave({ ...form, id: form.id || uuidv4(), suma: Number(form.suma) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={cheltuiala ? 'Editare cheltuială' : 'Cheltuială nouă'} size="sm">
      <div className="space-y-4">
        <Field label="Categorie" required>
          <select className="input" value={form.categorie} onChange={e => set('categorie', e.target.value)}>
            {CATEGORII_CHELTUIELI.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Sumă (RON)" required>
          <input className="input" type="number" step="0.01" min="0" value={form.suma} onChange={e => set('suma', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Data" required>
          <input className="input" type="date" value={form.data} onChange={e => set('data', e.target.value)} />
        </Field>
        <Field label="Descriere">
          <textarea className="input resize-none" rows={2} value={form.descriere} onChange={e => set('descriere', e.target.value)} placeholder="ex: Campanie Google Ads" />
        </Field>
        <div className="flex justify-end gap-3 pt-1">
          <button className="btn-secondary" onClick={onClose}>Anulează</button>
          <button className="btn-primary" onClick={handleSave}>
            {cheltuiala ? 'Salvează' : 'Adaugă cheltuială'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
