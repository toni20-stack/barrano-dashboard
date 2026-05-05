'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart3, AlertTriangle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { EmptyState, MarjaCell, ProfitCell } from '../../components/ui'
import { getVanzari, getProduse, getCheltuieli, initStorage } from '../../lib/storage'
import { calcCostTotal, calcVanzareProfit, formatRon, formatPct, filterByDateRange } from '../../lib/calculations'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts'

const PROD_COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444']
const LUNI = ['','Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']

export default function AnalizaPage() {
  const [vanzari,    setVanzari]    = useState([])
  const [produse,    setProduse]    = useState([])
  const [cheltuieli, setCheltuieli] = useState([])
  const [dateFrom,   setDateFrom]   = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo,     setDateTo]     = useState(new Date().toISOString().slice(0,10))
  const [tab,        setTab]        = useState('performanta')
  const [sortBy,     setSortBy]     = useState('venit')
  const [filterTara, setFilterTara] = useState('')

  const load = useCallback(() => {
    initStorage()
    setVanzari(getVanzari())
    setProduse(getProduse())
    setCheltuieli(getCheltuieli())
  }, [])
  useEffect(() => { load() }, [load])

  const filtered   = filterByDateRange(vanzari,    'data', dateFrom, dateTo)
    .filter(v => !filterTara || (filterTara === 'RO' ? (!v.tara || v.tara === 'RO') : v.tara === filterTara))
  const filteredCh = filterByDateRange(cheltuieli, 'data', dateFrom, dateTo)
    .filter(c => !filterTara || (filterTara === 'RO' ? (!c.tara || c.tara === 'RO') : c.tara === filterTara))

  // ── PERFORMANȚĂ ──────────────────────────────────────────
  const produsStats = produse.map((p, i) => {
    const vs = filtered.filter(v => v.produsId === p.id && !v.isStorno)
    const venit  = vs.reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)
    const profit = vs.reduce((s,v) => s + calcVanzareProfit(v, produse).profit, 0)
    const comision = vs.reduce((s,v) => s + calcVanzareProfit(v, produse).comision, 0)
    const qty    = vs.reduce((s,v) => s + Number(v.cantitate), 0)
    const marja  = venit > 0 ? (profit / venit) * 100 : 0
    const costUnic = calcCostTotal(p)
    const profitUnit = Number(p.pretVanzare) - costUnic
    const marjaUnit  = Number(p.pretVanzare) > 0 ? (profitUnit / Number(p.pretVanzare)) * 100 : 0
    return { id: p.id, name: p.numeBarrano, venit, profit, comision, qty, marja, costUnic, profitUnit, marjaUnit, color: PROD_COLORS[i % PROD_COLORS.length] }
  })

  const totalVenit = produsStats.reduce((s,p) => s + p.venit, 0)

  const sorted = [...produsStats].sort((a,b) => {
    if (sortBy === 'venit')  return b.venit  - a.venit
    if (sortBy === 'profit') return b.profit - a.profit
    if (sortBy === 'marja')  return b.marja  - a.marja
    if (sortBy === 'qty')    return b.qty    - a.qty
    return 0
  })

  // ── RETURURI ─────────────────────────────────────────────
  // Sursa 1: SmartBill storno
  const stornoSB = filtered.filter(v => v.isStorno && v.sursa === 'smartbill_storno')

  // Sursa 2: FY din cheltuieli (card cadou retur eMAG)
  const fyChelt = filteredCh.filter(c => c.tip === 'FY')

  // Sursa 3: FCS din cheltuieli (comision recuperat la retur — negativ)
  const fcsChelt = filteredCh.filter(c => c.tip === 'FCS')

  // Rata retur per produs (din SmartBill)
  const returPerProdus = produse.map((p, i) => {
    const vanzariNorm = filtered.filter(v => v.produsId === p.id && !v.isStorno)
    const retururi    = stornoSB.filter(v => v.produsId === p.id)
    const qtyVanduta  = vanzariNorm.reduce((s,v) => s + Number(v.cantitate), 0)
    const qtyReturnata = retururi.reduce((s,v) => s + Number(v.cantitate), 0)
    const valReturnata = retururi.reduce((s,v) => s + (v.cantitate * v.pretUnitar), 0)
    const rataRetur   = qtyVanduta > 0 ? (qtyReturnata / qtyVanduta) * 100 : 0
    return { name: p.numeBarrano, qtyVanduta, qtyReturnata, valReturnata, rataRetur, color: PROD_COLORS[i % PROD_COLORS.length] }
  }).filter(p => p.qtyVanduta > 0).sort((a,b) => b.rataRetur - a.rataRetur)

  // Retururi per lună (toate sursele)
  const luniMap = {}
  stornoSB.forEach(v => {
    const l = v.data?.slice(0,7); if (!l) return
    if (!luniMap[l]) luniMap[l] = { l, valSB: 0, valFY: 0, valFCS: 0 }
    luniMap[l].valSB += v.cantitate * v.pretUnitar
  })
  fyChelt.forEach(c => {
    const l = c.data?.slice(0,7); if (!l) return
    if (!luniMap[l]) luniMap[l] = { l, valSB: 0, valFY: 0, valFCS: 0 }
    luniMap[l].valFY += Math.abs(c.suma)
  })
  fcsChelt.forEach(c => {
    const l = c.data?.slice(0,7); if (!l) return
    if (!luniMap[l]) luniMap[l] = { l, valSB: 0, valFY: 0, valFCS: 0 }
    luniMap[l].valFCS += Math.abs(c.suma)
  })
  const luniRetururi = Object.values(luniMap).sort((a,b) => a.l.localeCompare(b.l)).map(d => ({
    ...d,
    lbl: LUNI[parseInt(d.l.slice(5,7))] || d.l,
    total: d.valSB + d.valFY + d.valFCS,
  }))

  // KPIs retururi
  const totalValSB  = stornoSB.reduce((s,v) => s + v.cantitate * v.pretUnitar, 0)
  const totalValFY  = fyChelt.reduce((s,c) => s + Math.abs(c.suma), 0)
  const totalValFCS = fcsChelt.reduce((s,c) => s + Math.abs(c.suma), 0)
  const totalRetururi = totalValSB + totalValFY + totalValFCS
  const nrRetururiSB  = stornoSB.reduce((s,v) => s + Number(v.cantitate), 0)
  const rataGlobala   = (() => {
    const totVandut = filtered.filter(v => !v.isStorno).reduce((s,v) => s + Number(v.cantitate), 0)
    return totVandut > 0 ? (nrRetururiSB / totVandut) * 100 : 0
  })()

  const TABS = [
    { id: 'performanta', label: 'Performanță produse' },
    { id: 'retururi',    label: 'Retururi' },
  ]

  return (
    <AppLayout>
      <Topbar title="Analiză" subtitle="Performanță, rentabilitate și retururi"
        dateFrom={dateFrom} dateTo={dateTo} onDateFrom={setDateFrom} onDateTo={setDateTo}/>

      <div className="p-6 space-y-5">
        {/* Filtru piață */}
        <div className="flex gap-1 flex-wrap">
          {[['', 'Toate piețele'], ['RO', '🇷🇴 România'], ['BG', '🇧🇬 Bulgaria'], ['HU', '🇭🇺 Ungaria']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterTara(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterTara === val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex gap-2">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-bold rounded-xl border transition-all ${tab===id?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ PERFORMANȚĂ ═══ */}
        {tab === 'performanta' && (
          produsStats.length === 0 ? (
            <div className="card p-10"><EmptyState icon={BarChart3} title="Nicio vânzare în perioada selectată" subtitle="Ajustați filtrele de dată"/></div>
          ) : (
            <>
              {/* Tabel */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">Performanță produse</p>
                  <div className="flex gap-1">
                    {[['venit','Venit'],['profit','Profit'],['marja','Marjă'],['qty','Cantitate']].map(([v,l]) => (
                      <button key={v} onClick={() => setSortBy(v)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${sortBy===v?'bg-orange-500 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Produs','Cant. vândută','Venit total','Cost produse','Comisioane','Profit net','Marjă reală','Cotă venit'].map(h => (
                          <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((p, i) => {
                        const cota = totalVenit > 0 ? (p.venit / totalVenit) * 100 : 0
                        return (
                          <tr key={p.id} className="table-row">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: p.color}}/>
                                <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                              </div>
                            </td>
                            <td className="table-cell text-slate-700">{p.qty} buc</td>
                            <td className="table-cell font-mono font-semibold text-slate-900">{formatRon(p.venit)}</td>
                            <td className="table-cell font-mono text-slate-500">{formatRon(p.qty * p.costUnic)}</td>
                            <td className="table-cell font-mono text-blue-600">{p.comision > 0 ? formatRon(p.comision) : '—'}</td>
                            <td className="table-cell"><ProfitCell value={p.profit}/></td>
                            <td className="table-cell"><MarjaCell value={p.marja}/></td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-400 rounded-full" style={{width:`${cota}%`}}/>
                                </div>
                                <span className="text-xs text-slate-500">{cota.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grafice */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="card p-5">
                  <p className="text-sm font-bold text-slate-800 mb-4">Profit net per produs (RON)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sorted} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={130}/>
                      <Tooltip formatter={v=>formatRon(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
                      <Bar dataKey="profit" radius={[0,4,4,0]}>
                        {sorted.map((e,i) => <Cell key={i} fill={e.profit>=0?'#10b981':'#ef4444'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <p className="text-sm font-bold text-slate-800 mb-4">Marjă reală per produs (%)</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sorted} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10}} unit="%"/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={130}/>
                      <Tooltip formatter={v=>`${v.toFixed(1)}%`} contentStyle={{fontSize:11,borderRadius:8}}/>
                      <Bar dataKey="marja" radius={[0,4,4,0]}>
                        {sorted.map((e,i) => <Cell key={i} fill={e.marja>=20?'#10b981':e.marja>=10?'#f59e0b':'#ef4444'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Structura cost per produs (cost unitar)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {produse.map(p => {
                    const cost = calcCostTotal(p)
                    const profit = Number(p.pretVanzare) - cost
                    const marja = p.pretVanzare > 0 ? (profit / Number(p.pretVanzare)) * 100 : 0
                    return (
                      <div key={p.id} className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-700 mb-3 leading-tight">{p.numeBarrano}</p>
                        {[
                          {lbl:'Achiziție', val:p.costAchizitie, color:'#f97316'},
                          {lbl:'Transport', val:p.transport,     color:'#3b82f6'},
                          {lbl:'Taxe vamale', val:p.taxeVamale,  color:'#8b5cf6'},
                          {lbl:'Ambalaj', val:p.ambalaj,         color:'#f59e0b'},
                          ...(p.componente||[]).map(c=>({lbl:c.nume||'—', val:c.suma, color:'#10b981'})),
                        ].filter(r=>Number(r.val)>0).map((r,i) => (
                          <div key={i} className="mb-2">
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:r.color}}/><span className="text-slate-500">{r.lbl}</span></div>
                              <span className="font-mono text-slate-700">{formatRon(Number(r.val))}</span>
                            </div>
                            <div className="h-1.5 bg-white rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${cost>0?(r.val/cost)*100:0}%`,backgroundColor:r.color}}/>
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 mt-2 pt-2 space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-800"><span>Cost total</span><span>{formatRon(cost)}</span></div>
                          <div className={`flex justify-between text-xs font-bold ${marja>=20?'text-emerald-600':marja>=10?'text-amber-500':'text-red-500'}`}><span>Marjă brută</span><span>{formatPct(marja)}</span></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )
        )}

        {/* ═══ RETURURI ═══ */}
        {tab === 'retururi' && (
          <div className="space-y-5">
            {/* KPI-uri retururi */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Rată retur globală', `${rataGlobala.toFixed(1)}%`, rataGlobala>10?'text-red-500':rataGlobala>5?'text-amber-500':'text-emerald-600', 'Din cantitate vândută'],
                ['Valoare retururi SmartBill', formatRon(totalValSB), 'text-red-500', `${nrRetururiSB} bucăți returnate`],
                ['Card cadou retur (FY)', formatRon(totalValFY), 'text-orange-500', 'Reținut de eMAG'],
                ['Comision recuperat (FCS)', formatRon(totalValFCS), 'text-emerald-600', 'Primit înapoi de la eMAG'],
              ].map(([lbl, val, color, sub]) => (
                <div key={lbl} className="card p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lbl}</p>
                  <p className={`text-xl font-black mt-1 ${color}`}>{val}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Impact net */}
            <div className="card p-4 flex items-center gap-4 bg-red-50 border-red-200">
              <AlertTriangle size={20} className="text-red-500 shrink-0"/>
              <div>
                <p className="text-sm font-bold text-red-700">Impact financiar net al retururilor</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Valoare produse returnate <strong>{formatRon(totalValSB)}</strong> + Card cadou FY <strong>{formatRon(totalValFY)}</strong> − Comision recuperat FCS <strong>{formatRon(totalValFCS)}</strong> = <strong>{formatRon(totalValSB + totalValFY - totalValFCS)}</strong> pierdere netă din retururi
                </p>
              </div>
            </div>

            {/* Grafic retururi per lună */}
            {luniRetururi.length > 0 && (
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-1">Valoare retururi per lună (RON)</p>
                <p className="text-xs text-slate-400 mb-4">SmartBill storno + Card cadou FY + Comision FCS</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={luniRetururi} margin={{top:5,right:20,left:10,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="lbl" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(1)}k`}/>
                    <Tooltip formatter={v=>formatRon(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
                    <Legend iconType="circle" wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="valSB"  stackId="a" fill="#ef4444" name="Produse returnate (SmartBill)" radius={[0,0,0,0]}/>
                    <Bar dataKey="valFY"  stackId="a" fill="#f97316" name="Card cadou retur (FY)" radius={[0,0,0,0]}/>
                    <Bar dataKey="valFCS" stackId="a" fill="#10b981" name="Comision recuperat (FCS)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rata retur per produs */}
            {returPerProdus.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">Rată retur per produs</p>
                  <p className="text-xs text-slate-400 mt-0.5">Calculată din cantitatea vândută vs returnată (SmartBill)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Produs','Cant. vândută','Cant. returnată','Valoare returnată','Rată retur','Indicator'].map(h => (
                          <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {returPerProdus.map((p, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:p.color}}/>
                              <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-slate-700">{p.qtyVanduta} buc</td>
                          <td className="table-cell text-red-500 font-semibold">{p.qtyReturnata} buc</td>
                          <td className="table-cell font-mono text-red-500 font-semibold">{formatRon(p.valReturnata)}</td>
                          <td className="table-cell">
                            <span className={`font-black text-sm ${p.rataRetur>10?'text-red-500':p.rataRetur>5?'text-amber-500':'text-emerald-600'}`}>
                              {p.rataRetur.toFixed(1)}%
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{width:`${Math.min(p.rataRetur, 100)}%`, backgroundColor: p.rataRetur>10?'#ef4444':p.rataRetur>5?'#f59e0b':'#10b981'}}/>
                              </div>
                              <span className="text-xs font-semibold" style={{color:p.rataRetur>10?'#ef4444':p.rataRetur>5?'#f59e0b':'#10b981'}}>
                                {p.rataRetur>10?'⚠️ Ridicat':p.rataRetur>5?'Mediu':'✓ OK'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {returPerProdus.length === 0 && luniRetururi.length === 0 && (
              <div className="card p-10">
                <EmptyState icon={BarChart3} title="Niciun retur în perioada selectată"
                  subtitle="Importă datele din SmartBill și eMAG pentru a vedea analiza retururilor"/>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
