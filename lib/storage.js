// lib/storage.js
import { SEED_PRODUSE, SEED_VANZARI, SEED_CHELTUIELI } from './seedData'

const KEYS = {
  produse: 'barrano_produse',
  vanzari: 'barrano_vanzari',
  cheltuieli: 'barrano_cheltuieli',
  incasari: 'barrano_incasari',
  seeded: 'barrano_seeded',
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export function initStorage() {
  if (!isBrowser()) return
  if (!localStorage.getItem(KEYS.seeded)) {
    localStorage.setItem(KEYS.produse, JSON.stringify(SEED_PRODUSE))
    localStorage.setItem(KEYS.vanzari, JSON.stringify(SEED_VANZARI))
    localStorage.setItem(KEYS.cheltuieli, JSON.stringify(SEED_CHELTUIELI))
    localStorage.setItem(KEYS.incasari, JSON.stringify([]))
    localStorage.setItem(KEYS.seeded, 'true')
  }
  // Migrare: cheltuieli eMAG Ads fără tară → RO
  const ch = JSON.parse(localStorage.getItem(KEYS.cheltuieli) || '[]')
  const migrated = ch.map(c => (c.sursa === 'emag_ads' && !c.tara) ? {...c, tara: 'RO'} : c)
  if (migrated.some((c, i) => c !== ch[i])) {
    localStorage.setItem(KEYS.cheltuieli, JSON.stringify(migrated))
  }
}

// PRODUSE
export function getProduse() {
  if (!isBrowser()) return []
  return JSON.parse(localStorage.getItem(KEYS.produse) || '[]')
}
export function saveProduse(list) {
  if (!isBrowser()) return
  localStorage.setItem(KEYS.produse, JSON.stringify(list))
}
export function addProdus(produs) {
  const list = getProduse()
  list.push(produs)
  saveProduse(list)
}
export function updateProdus(produs) {
  const list = getProduse().map(p => p.id === produs.id ? produs : p)
  saveProduse(list)
}
export function deleteProdus(id) {
  saveProduse(getProduse().filter(p => p.id !== id))
}

// VÂNZĂRI
export function getVanzari() {
  if (!isBrowser()) return []
  return JSON.parse(localStorage.getItem(KEYS.vanzari) || '[]')
}
export function saveVanzari(list) {
  if (!isBrowser()) return
  localStorage.setItem(KEYS.vanzari, JSON.stringify(list))
}
export function addVanzare(v) {
  const list = getVanzari()
  list.push(v)
  saveVanzari(list)
}
export function updateVanzare(v) {
  saveVanzari(getVanzari().map(x => x.id === v.id ? v : x))
}
export function deleteVanzare(id) {
  saveVanzari(getVanzari().filter(v => v.id !== id))
}

// CHELTUIELI
export function getCheltuieli() {
  if (!isBrowser()) return []
  return JSON.parse(localStorage.getItem(KEYS.cheltuieli) || '[]')
}
export function saveCheltuieli(list) {
  if (!isBrowser()) return
  localStorage.setItem(KEYS.cheltuieli, JSON.stringify(list))
}
export function addCheltuiala(c) {
  const list = getCheltuieli()
  list.push(c)
  saveCheltuieli(list)
}
export function updateCheltuiala(c) {
  saveCheltuieli(getCheltuieli().map(x => x.id === c.id ? c : x))
}
export function deleteCheltuiala(id) {
  saveCheltuieli(getCheltuieli().filter(c => c.id !== id))
}

// ÎNCASĂRI eMAG
export function getIncasari() {
  if (!isBrowser()) return []
  return JSON.parse(localStorage.getItem(KEYS.incasari) || '[]')
}
export function saveIncasari(list) {
  if (!isBrowser()) return
  localStorage.setItem(KEYS.incasari, JSON.stringify(list))
}
export function addIncasare(i) {
  const list = getIncasari()
  list.push(i)
  saveIncasari(list)
}
export function deleteIncasare(id) {
  saveIncasari(getIncasari().filter(i => i.id !== id))
}

export function resetStorage() {
  if (!isBrowser()) return
  localStorage.removeItem(KEYS.seeded)
  localStorage.removeItem(KEYS.produse)
  localStorage.removeItem(KEYS.vanzari)
  localStorage.removeItem(KEYS.cheltuieli)
  localStorage.removeItem(KEYS.incasari)
  initStorage()
}

// Șterge TOT fără a reîncărca datele demo
export function clearAllData() {
  if (typeof window === 'undefined') return
  const keys = ['barrano_produse','barrano_vanzari','barrano_cheltuieli','barrano_incasari','barrano_seeded']
  keys.forEach(k => localStorage.removeItem(k))
  localStorage.setItem('barrano_seeded', 'true')
  localStorage.setItem('barrano_produse', JSON.stringify([]))
  localStorage.setItem('barrano_vanzari', JSON.stringify([]))
  localStorage.setItem('barrano_cheltuieli', JSON.stringify([]))
  localStorage.setItem('barrano_incasari', JSON.stringify([]))
}
