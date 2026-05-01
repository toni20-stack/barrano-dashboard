// lib/export.js
import { calcCostTotal, calcVanzareProfit, formatDate, CANALE_LABELS, MEDIU_LABELS, TIP_CLIENT_LABELS } from './calculations'

function downloadCSV(filename, rows) {
  const csv = rows.map(row =>
    row.map(cell => {
      const val = cell === null || cell === undefined ? '' : String(cell)
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  ).join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportProduse(produse) {
  const headers = [
    'Nume Producător', 'Nume Barrano', 'Cost Achiziție (RON)',
    'Transport (RON)', 'Taxe Vamale (RON)', 'Ambalaj (RON)',
    'Componente Custom (RON)', 'Cost Total (RON)', 'Preț Vânzare (RON)',
    'Profit Brut / buc (RON)', 'Marjă (%)'
  ]
  const rows = produse.map(p => {
    const cost = calcCostTotal(p)
    const customTotal = (p.componente || []).reduce((s, c) => s + Number(c.suma), 0)
    const profit = Number(p.pretVanzare) - cost
    const marja = p.pretVanzare > 0 ? (profit / Number(p.pretVanzare)) * 100 : 0
    return [
      p.numeProducator, p.numeBarrano,
      p.costAchizitie, p.transport, p.taxeVamale, p.ambalaj,
      customTotal.toFixed(2), cost.toFixed(2),
      p.pretVanzare, profit.toFixed(2), marja.toFixed(1) + '%'
    ]
  })
  downloadCSV(`barrano_produse_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows])
}

export function exportVanzari(vanzari, produse) {
  const headers = [
    'Data', 'Produs Barrano', 'Cantitate', 'Preț Unitar (RON)',
    'Venit Brut (RON)', 'Cost Produs (RON)', 'Comision eMAG (RON)',
    'Profit Net (RON)', 'Marjă (%)', 'Canal', 'Județ', 'Oraș',
    'Mediu', 'Tip Client'
  ]
  const rows = vanzari.map(v => {
    const { venit, cost, comision, profit, marja } = calcVanzareProfit(v, produse)
    const produs = produse.find(p => p.id === v.produsId)
    return [
      formatDate(v.data), produs?.numeBarrano || v.produsId,
      v.cantitate, v.pretUnitar,
      venit.toFixed(2), cost.toFixed(2), comision.toFixed(2),
      profit.toFixed(2), marja.toFixed(1) + '%',
      CANALE_LABELS[v.canal] || v.canal,
      v.judet, v.oras,
      MEDIU_LABELS[v.mediu] || v.mediu,
      TIP_CLIENT_LABELS[v.tipClient] || v.tipClient
    ]
  })
  downloadCSV(`barrano_vanzari_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows])
}

export function exportCheltuieli(cheltuieli) {
  const headers = ['Data', 'Categorie', 'Sumă (RON)', 'Descriere']
  const rows = cheltuieli.map(c => [
    formatDate(c.data), c.categorie, c.suma, c.descriere || ''
  ])
  downloadCSV(`barrano_cheltuieli_${new Date().toISOString().slice(0,10)}.csv`, [headers, ...rows])
}
