// lib/calculations.js

export function calcCostTotal(produs) {
  const base = (Number(produs.costAchizitie) || 0)
    + (Number(produs.transport) || 0)
    + (Number(produs.taxeVamale) || 0)
    + (Number(produs.ambalaj) || 0)
  const custom = (produs.componente || []).reduce((sum, c) => sum + (Number(c.suma) || 0), 0)
  return base + custom
}

export function calcVanzareProfit(vanzare, produse) {
  const produs = produse.find(p => p.id === vanzare.produsId)
  if (!produs) return { venit: 0, cost: 0, comision: 0, profit: 0, marja: 0 }

  const cantitate = Number(vanzare.cantitate) || 0
  const pretUnitar = Number(vanzare.pretUnitar) || 0
  const venit = cantitate * pretUnitar
  const cost = calcCostTotal(produs) * cantitate
  const comision = (vanzare.canal === 'emag' && vanzare.aplicaComision)
    ? venit * (Number(vanzare.comisionEmag) || 0) / 100
    : 0
  const profit = venit - cost - comision
  const marja = venit > 0 ? (profit / venit) * 100 : 0
  return { venit, cost, comision, profit, marja }
}

export function formatRon(val) {
  if (val === undefined || val === null || isNaN(val)) return '—'
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency', currency: 'RON', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(val)
}

export function formatRon0(val) {
  if (val === undefined || val === null || isNaN(val)) return '—'
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency', currency: 'RON', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val)
}

export function formatPct(val) {
  if (val === undefined || val === null || isNaN(val)) return '—'
  return `${val.toFixed(1)}%`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const CANALE_LABELS = {
  emag: 'eMAG',
  site: 'Site',
  altele: 'Altele',
}

export const MEDIU_LABELS = {
  urban: 'Urban',
  rural: 'Rural',
}

export const TIP_CLIENT_LABELS = {
  persoana_fizica: 'Persoană fizică',
  firma: 'Firmă',
}

export const CATEGORII_CHELTUIELI = [
  'Marketing',
  'Logistică',
  'Abonamente',
  'Salarii',
  'Chirii',
  'Altele',
]

export const JUDETE = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brăila', 'Brasov', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța',
  'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita',
  'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș',
  'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava',
  'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea', 'Bucuresti',
]

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'necunoscut'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function filterByDateRange(arr, dateKey, from, to) {
  return arr.filter(item => {
    const d = item[dateKey]
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}
