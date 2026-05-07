import { supabase } from './supabase'

const fromRow = row => ({ id: row.id, ...row.data })
const toRow = ({ id, ...rest }) => ({ id, data: rest })

// Fetch toate rândurile dintr-un tabel cu paginare (ocolește limita de 1000)
async function fetchAll(table) {
  const PAGE = 1000
  let all = [], from = 0
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) { console.error(`fetchAll ${table}:`, error.message); break }
    all = all.concat(data || [])
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all.map(fromRow)
}

// Insert în batch-uri de 500 (ocolește limita de payload)
async function insertBulk(table, rows) {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + BATCH).map(toRow))
    if (error) console.error(`insertBulk ${table}:`, error.message)
  }
}

// ── PRODUSE ───────────────────────────────────────────────────
export async function getProduse() { return fetchAll('produse') }

export async function addProdus(produs) {
  const { error } = await supabase.from('produse').insert([toRow(produs)])
  if (error) console.error('addProdus:', error.message)
}

export async function addProduseBulk(list) {
  if (!list.length) return
  await insertBulk('produse', list)
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
export async function getVanzari() { return fetchAll('vanzari') }

export async function addVanzare(v) {
  const { error } = await supabase.from('vanzari').insert([toRow(v)])
  if (error) console.error('addVanzare:', error.message)
}

export async function addVanzariBulk(list) {
  if (!list.length) return
  await insertBulk('vanzari', list)
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
  const all = await fetchAll('vanzari')
  const ids = all.filter(r => surse.includes(r.sursa)).map(r => r.id)
  for (let i = 0; i < ids.length; i += 500)
    await supabase.from('vanzari').delete().in('id', ids.slice(i, i + 500))
}

// ── CHELTUIELI ────────────────────────────────────────────────
export async function getCheltuieli() { return fetchAll('cheltuieli') }

export async function addCheltuiala(c) {
  const { error } = await supabase.from('cheltuieli').insert([toRow(c)])
  if (error) console.error('addCheltuiala:', error.message)
}

export async function addCheltuieliBulk(list) {
  if (!list.length) return
  await insertBulk('cheltuieli', list)
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
  const all = await fetchAll('cheltuieli')
  const ids = all.filter(r => r.tara === tara && r.sursa === 'emag').map(r => r.id)
  for (let i = 0; i < ids.length; i += 500)
    await supabase.from('cheltuieli').delete().in('id', ids.slice(i, i + 500))
}

// ── ÎNCASĂRI ──────────────────────────────────────────────────
export async function getIncasari() { return fetchAll('incasari') }

export async function addIncasare(i) {
  const { error } = await supabase.from('incasari').insert([toRow(i)])
  if (error) console.error('addIncasare:', error.message)
}

export async function addIncasariBulk(list) {
  if (!list.length) return
  await insertBulk('incasari', list)
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

// ── IMPORTURI ─────────────────────────────────────────────────
export async function getImporturi() { return fetchAll('importuri') }

export async function addImport(record) {
  const { error } = await supabase.from('importuri').insert([toRow(record)])
  if (error) console.error('addImport:', error.message)
}

export async function deleteImport(batchId) {
  await supabase.from('importuri').delete().eq('id', batchId)
}

export async function deleteByBatchId(table, batchId) {
  const PAGE = 1000
  let ids = [], from = 0
  while (true) {
    const { data } = await supabase.from(table).select('id').filter('data->>batchId', 'eq', batchId).range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    ids = ids.concat(data.map(r => r.id))
    if (data.length < PAGE) break
    from += PAGE
  }
  for (let i = 0; i < ids.length; i += 500)
    await supabase.from(table).delete().in('id', ids.slice(i, i + 500))
}

export async function initStorage() {}
export async function resetStorage() { await clearAllData() }
export async function saveProduse() {}
export async function saveVanzari() {}
export async function saveCheltuieli() {}
export async function saveIncasari() {}
