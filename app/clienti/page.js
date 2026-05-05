'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, RotateCcw } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { EmptyState } from '../../components/ui'
import { getVanzari, getProduse, initStorage } from '../../lib/storage'
import { calcVanzareProfit, formatRon, filterByDateRange, groupBy } from '../../lib/calculations'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

function detectGender(numeClient) {
  if (!numeClient) return null
  const prenume = numeClient.trim().split(/\s+/)[0]?.toLowerCase() || ''
  if (prenume.endsWith('a') || prenume.endsWith('ea')) return 'F'
  return 'M'
}

export default function ClientiPage() {
  const [vanzari, setVanzari] = useState([])
  const [produse, setProduse] = useState([])
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))
  const [filterTara, setFilterTara] = useState('')
  const [viewTab, setViewTab] = useState('clienti')

  const load = useCallback(() => { initStorage(); setVanzari(getVanzari()); setProduse(getProduse()) }, [])
  useEffect(() => { load() }, [load])

  const allFiltered = filterByDateRange(vanzari, 'data', dateFrom, dateTo)
    .filter(v => !filterTara || (filterTara === 'RO' ? (!v.tara || v.tara === 'RO') : v.tara === filterTara))

  const filtered   = allFiltered.filter(v => !v.isStorno)
  const stornoList = allFiltered.filter(v => v.isStorno)

  // ── CLIENȚI ──────────────────────────────────────────────────
  const urbanCount = filtered.filter(v => v.mediu === 'urban').length
  const ruralCount = filtered.filter(v => v.mediu === 'rural').length
  const urbanVenit = filtered.filter(v => v.mediu === 'urban').reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)
  const ruralVenit = filtered.filter(v => v.mediu === 'rural').reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)
  const pfVenit    = filtered.filter(v => v.tipClient === 'persoana_fizica').reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)
  const firmaVenit = filtered.filter(v => v.tipClient === 'firma').reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)
  const totalVenit = filtered.reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0)

  const byJudet = groupBy(filtered, 'judet')
  const topJudete = Object.entries(byJudet)
    .map(([judet, vs]) => ({ judet: judet === 'necunoscut' ? '—' : judet, venit: vs.reduce((s,v) => s + calcVanzareProfit(v, produse).venit, 0), tranzactii: vs.length }))
    .filter(j => j.judet !== '—').sort((a,b) => b.venit - a.venit).slice(0, 10)

  const mediuPie = [{ name:'Urban', value:urbanVenit, fill:'#8b5cf6' }, { name:'Rural', value:ruralVenit, fill:'#f59e0b' }].filter(d => d.value > 0)
  const tipPie   = [{ name:'Persoană fizică', value:pfVenit, fill:'#3b82f6' }, { name:'Firmă', value:firmaVenit, fill:'#10b981' }].filter(d => d.value > 0)

  // ── RETURURI ─────────────────────────────────────────────────
  // Urban/Rural nu e disponibil din SmartBill storno (câmpul e hardcodat)

  const genderCounts = stornoList.reduce((acc,v) => { const g = detectGender(v.oras); if(g==='F') acc.F++; else acc.M++; return acc }, { F:0, M:0 })
  const genderPie = [{ name:'Feminin (estimat)', value:genderCounts.F, fill:'#ec4899' }, { name:'Masculin (estimat)', value:genderCounts.M, fill:'#3b82f6' }].filter(d => d.value > 0)

  // Top județe retururi
  const stornoByJudet = {}
  stornoList.forEach(v => {
    const j = v.judet || '—'
    if (!stornoByJudet[j]) stornoByJudet[j] = { judet:j, count:0, val:0 }
    stornoByJudet[j].count += 1
    stornoByJudet[j].val += v.cantitate * v.pretUnitar
  })
  const topJudeteStorno = Object.values(stornoByJudet).filter(j => j.judet !== '—').sort((a,b) => b.count - a.count).slice(0, 10)

  // Top orașe retururi (câmpul oras din SmartBill e de fapt numele clientului)
  const stornoByOras = {}
  stornoList.forEach(v => {
    const key = v.oras || '—'
    if (!stornoByOras[key]) stornoByOras[key] = { oras:key, count:0, val:0 }
    stornoByOras[key].count += Number(v.cantitate) || 1
    stornoByOras[key].val += v.cantitate * v.pretUnitar
  })
  const topOraseStorno = Object.values(stornoByOras).filter(o => o.oras !== '—').sort((a,b) => b.count - a.count).slice(0, 10)

  // Top 10 clienți după retururi
  const stornoByNume = {}
  stornoList.forEach(v => {
    const n = v.oras || '—'
    if (n === '—') return
    if (!stornoByNume[n]) stornoByNume[n] = { nume:n, count:0, val:0, gender:detectGender(n) }
    stornoByNume[n].count += 1
    stornoByNume[n].val += v.cantitate * v.pretUnitar
  })
  const topClientiStorno = Object.values(stornoByNume).sort((a,b) => b.count - a.count || b.val - a.val).slice(0, 10)

  const PieCard = ({ title, subtitle, data }) => (
    <div className="card p-5">
      <p className="text-sm font-bold text-slate-800 mb-1">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-400 mb-3">{subtitle}</p>}
      {data.length === 0 ? <EmptyState icon={Users} title="Fără date" /> : (
        <>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                {data.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={v => typeof v === 'number' && v > 100 ? formatRon(v) : `${v}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {data.map(d => (
              <div key={d.name} className="flex justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} /><span>{d.name}</span></div>
                <span className="font-semibold">{d.value > 100 ? formatRon(d.value) : `${d.value} ret.`}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <AppLayout>
      <Topbar title="Clienți" subtitle="Distribuție geografică și retururi"
        dateFrom={dateFrom} dateTo={dateTo} onDateFrom={setDateFrom} onDateTo={setDateTo} />

      <div className="p-6 space-y-5">
        {/* Filtru piață */}
        <div className="flex gap-1 flex-wrap">
          {[['','Toate piețele'],['RO','🇷🇴 România'],['BG','🇧🇬 Bulgaria'],['HU','🇭🇺 Ungaria']].map(([val,lbl]) => (
            <button key={val} onClick={() => setFilterTara(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${filterTara===val ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setViewTab('clienti')}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${viewTab==='clienti' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            Clienți ({filtered.length})
          </button>
          <button onClick={() => setViewTab('retururi')}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${viewTab==='retururi' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            Retururi ({stornoList.length})
          </button>
        </div>

        {/* ═══ CLIENȚI ═══ */}
        {viewTab === 'clienti' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { lbl:'Tranzacții totale', val: filtered.length },
                { lbl:'Urban', val:`${urbanCount} (${filtered.length>0?((urbanCount/filtered.length)*100).toFixed(0):0}%)` },
                { lbl:'Rural', val:`${ruralCount} (${filtered.length>0?((ruralCount/filtered.length)*100).toFixed(0):0}%)` },
                { lbl:'Județe active', val: Object.keys(byJudet).filter(j=>j!=='necunoscut').length },
              ].map(({lbl,val}) => (
                <div key={lbl} className="card p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbl}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{val}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <PieCard title="Urban vs Rural — Venit" data={mediuPie} />
              <PieCard title="Tip client — Venit" data={tipPie} />
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Top județe după venit</p>
                {topJudete.length === 0 ? <EmptyState icon={Users} title="Fără date" /> : (
                  <div className="space-y-3">
                    {topJudete.map((j,i) => {
                      const pct = totalVenit > 0 ? (j.venit/totalVenit)*100 : 0
                      return (
                        <div key={j.judet}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{i+1}. {j.judet}</span>
                            <div className="flex gap-3">
                              <span className="text-slate-400">{j.tranzactii} tr.</span>
                              <span className="font-semibold text-slate-900">{formatRon(j.venit)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            {topJudete.length > 0 && (
              <div className="card p-5">
                <p className="text-sm font-bold text-slate-800 mb-4">Top 10 județe — Venit (RON)</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topJudete} margin={{top:5,right:20,left:10,bottom:30}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="judet" tick={{fontSize:10}} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v=>formatRon(v)} />
                    <Bar dataKey="venit" fill="#f97316" radius={[4,4,0,0]} name="Venit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ═══ RETURURI ═══ */}
        {viewTab === 'retururi' && (
          stornoList.length === 0
            ? <div className="card p-10"><EmptyState icon={RotateCcw} title="Niciun retur în perioada selectată" /></div>
            : <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { lbl:'Total retururi', val: stornoList.length },
                    { lbl:'Județe afectate', val: topJudeteStorno.length },
                    { lbl:'Clienți unici', val: Object.keys(stornoByNume).length },
                  ].map(({lbl,val}) => (
                    <div key={lbl} className="card p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{lbl}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <PieCard title="Gen client — Retururi" subtitle="estimat din prenume" data={genderPie} />
                  <div className="card p-5">
                    <p className="text-sm font-bold text-slate-800 mb-4">Top județe — Retururi</p>
                    {topJudeteStorno.length === 0 ? <EmptyState icon={RotateCcw} title="Fără date" /> : (
                      <div className="space-y-3">
                        {topJudeteStorno.map((j,i) => {
                          const max = topJudeteStorno[0].count
                          return (
                            <div key={j.judet}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">{i+1}. {j.judet}</span>
                                <div className="flex gap-3">
                                  <span className="font-semibold text-red-500">{j.count} ret.</span>
                                  <span className="text-slate-400">{formatRon(j.val)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full" style={{width:`${max>0?(j.count/max)*100:0}%`}} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {topOraseStorno.length > 0 && (
                  <div className="card p-5">
                    <p className="text-sm font-bold text-slate-800 mb-1">Top orașe cu cele mai multe retururi</p>
                    <p className="text-[10px] text-slate-400 mb-4">câmpul „oraș" din SmartBill = numele clientului</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topOraseStorno} margin={{top:5,right:20,left:10,bottom:50}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fef2f2" />
                        <XAxis dataKey="oras" tick={{fontSize:9}} angle={-40} textAnchor="end" interval={0} />
                        <YAxis tick={{fontSize:11}} allowDecimals={false} />
                        <Tooltip formatter={(v,n) => [n==='count' ? `${v} retururi` : formatRon(v)]} />
                        <Bar dataKey="count" fill="#ef4444" radius={[4,4,0,0]} name="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {topClientiStorno.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 bg-red-50">
                      <p className="text-sm font-bold text-red-700">Top 10 clienți după retururi</p>
                      <p className="text-xs text-red-500 mt-0.5">Sortați după număr retururi, apoi după valoare</p>
                    </div>
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['#','Client','Gen estimat','Nr. retururi','Valoare totală'].map(h => (
                            <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topClientiStorno.map((c,i) => (
                          <tr key={i} className="table-row">
                            <td className="table-cell text-slate-400 text-xs">{i+1}</td>
                            <td className="table-cell font-medium text-slate-900">{c.nume}</td>
                            <td className="table-cell text-sm">{c.gender==='F' ? '👩 Feminin' : '👨 Masculin'}</td>
                            <td className="table-cell">
                              <span className={`font-black text-lg ${c.count >= 2 ? 'text-red-500' : 'text-slate-700'}`}>{c.count}×</span>
                              {c.count >= 2 && <span className="text-[10px] text-red-400 ml-1">repetat</span>}
                            </td>
                            <td className="table-cell font-mono font-semibold text-red-500">{formatRon(c.val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
        )}
      </div>
    </AppLayout>
  )
}
