import { supabase } from './supabase'

// Fiecare tabel are: id TEXT PRIMARY KEY, data JSONB
// fromRow: { id, data } → { id, ...data }
// toRow:   { id, ...rest } → { id, data: rest }
const fromRow = row => ({ id: row.id, ...row.data })
const toRow = ({ id, ...rest }) => ({ id, data: rest })

// ── PRODUSE ───────────────────────────────────────────────────
export async function getProduse() {
  const { data, error } = await supabase.from('produse').select('*')
  if (error) console.error('getProduse:', error.message)
  return (data || []).map(fromRow)
}

export async function addProdus(produs) {
  const { error } = await supabase.from('produse').insert([toRow(produs)])
  if (error) console.error('addProdus:', error.message)
}

export async function addProduseBulk(list) {
  if (!list.length) return
  const { error } = await supabase.from('produse').insert(list.map(toRow))
  if (error) console.error('addProduseBulk:', error.message)
}

export async function updateProdus(produs) {
  const { error } = await supabase.from('produse').update(toRow(produs)).eq('id', produs.id)
  if (error) console.error('updateProdus:', error.message)
}

export async function deleteProdus(id) {
  const { error } = await supabase.from('produse').delete().eq('id', id)
  if (error) console.error('deleteProdus:', error.message)
}

// ── VÂNZĂRI ───────────────────────────────────────────────────
export async function getVanzari() {
  const { data, error } = await supabase.from('vanzari').select('*')
  if (error) console.error('getVanzari:', error.message)
  return (data || []).map(fromRow)
}

export async function addVanzare(v) {
  const { error } = await supabase.from('vanzari').insert([toRow(v)])
  if (error) console.error('addVanzare:', error.message)
}

export async function addVanzariBulk(list) {
  if (!list.length) return
  const { error } = await supabase.from('vanzari').insert(list.map(toRow))
  if (error) console.error('addVanzariBulk:', error.message)
}

export async function updateVanzare(v) {
  const { error } = await supabase.from('vanzari').update(toRow(v)).eq('id', v.id)
  if (error) console.error('updateVanzare:', error.message)
}

export async function deleteVanzare(id) {
  const { error } = await supabase.from('vanzari').delete().eq('id', id)
  if (error) console.error('deleteVanzare:', error.message)
}

export async function deleteVanzariBySursa(surse) {
  // surse = array de string-uri ex: ['smartbill', 'smartbill_storno']
  const { data } = await supabase.from('vanzari').select('id, data')
  const ids = (data || []).filter(r => surse.includes(r.data?.sursa)).map(r => r.id)
  if (ids.length) await supabase.from('vanzari').delete().in('id', ids)
}

// ── CHELTUIELI ────────────────────────────────────────────────
export async function getCheltuieli() {
  const { data, error } = await supabase.from('cheltuieli').select('*')
  if (error) console.error('getCheltuieli:', error.message)
  return (data || []).map(fromRow)
}

export async function addCheltuiala(c) {
  const { error } = await supabase.from('cheltuieli').insert([toRow(c)])
  if (error) console.error('addCheltuiala:', error.message)
}

export async function addCheltuieliBulk(list) {
  if (!list.length) return
  const { error } = await supabase.from('cheltuieli').insert(list.map(toRow))
  if (error) console.error('addCheltuieliBulk:', error.message)
}

export async function updateCheltuiala(c) {
  const { error } = await supabase.from('cheltuieli').update(toRow(c)).eq('id', c.id)
  if (error) console.error('updateCheltuiala:', error.message)
}

export async function deleteCheltuiala(id) {
  const { error } = await supabase.from('cheltuieli').delete().eq('id', id)
  if (error) console.error('deleteCheltuiala:', error.message)
}

export async function deleteCheltuieliEmagByTara(tara) {
  const { data } = await supabase.from('cheltuieli').select('id, data')
  const ids = (data || []).filter(r => r.data?.tara === tara && r.data?.sursa === 'emag').map(r => r.id)
  if (ids.length) await supabase.from('cheltuieli').delete().in('id', ids)
}

// ── ÎNCASĂRI ──────────────────────────────────────────────────
export async function getIncasari() {
  const { data, error } = await supabase.from('incasari').select('*')
  if (error) console.error('getIncasari:', error.message)
  return (data || []).map(fromRow)
}

export async function addIncasare(i) {
  const { error } = await supabase.from('incasari').insert([toRow(i)])
  if (error) console.error('addIncasare:', error.message)
}

export async function addIncasariBulk(list) {
  if (!list.length) return
  const { error } = await supabase.from('incasari').insert(list.map(toRow))
  if (error) console.error('addIncasariBulk:', error.message)
}

export async function deleteIncasare(id) {
  const { error } = await supabase.from('incasari').delete().eq('id', id)
  if (error) console.error('deleteIncasare:', error.message)
}

// ── RESET / CLEAR ─────────────────────────────────────────────
export async function clearAllData() {
  await Promise.all([
    supabase.from('produse').delete().neq('id', ''),
    supabase.from('vanzari').delete().neq('id', ''),
    supabase.from('cheltuieli').delete().neq('id', ''),
    supabase.from('incasari').delete().neq('id', ''),
  ])
}

// No-op — păstrat pentru compatibilitate cu paginile existente
export async function initStorage() {}
export async function resetStorage() { await clearAllData() }

// Deprecated — nu mai fac nimic, înlocuite cu addX/updateX/deleteX
export async function saveProduse() {}
export async function saveVanzari() {}
export async function saveCheltuieli() {}
export async function saveIncasari() {}
