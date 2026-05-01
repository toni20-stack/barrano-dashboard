'use client'
import { useState, useEffect, useCallback } from 'react'
import { Trash2, Download, TrendingUp } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { EmptyState, ConfirmDialog } from '../../components/ui'
import { getIncasari, saveIncasari, initStorage } from '../../lib/storage'
import { formatRon, formatDate, filterByDateRange } from '../../lib/calculations'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const TIP_LABELS = {
  FV: 'Decont vouchere',
  FY: 'Compensație retururi',
  FVS: 'Storno decont vouchere',
}

const TIP_COLORS = {
  FV: '#10b981',
  FY: '#3b82f6',
  FVS: '#ef4444',
}

export default function IncasariPage() {
  const [incasari, setIncasari] = useState([])
  const [confirmId, setConfirmId] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterTip, setFilterTip] = useState('')

  const load = useCallback(() => { initStorage(); setIncasari(getIncasari()) }, [])
  useEffect(() => { load() }, [load])

  const sorted = [...incasari].sort((a,b) => b.data?.localeCompare(a.data||''))
  const filtered = filterByDateRange(sorted, 'data', dateFrom, dateTo)
    .filter(i => !filterTip || i.tip === filterTip)

  const totalIncasat = filtered.filter(i => !i.isNegativ).reduce((s,i) => s+i.suma, 0)
  const totalNegativ = filtered.filter(i => i.isNegativ).reduce((s,i) => s+i.suma, 0)
  const totalNet = totalIncasat - totalNegativ

  const tipuri = [...new Set(incasari.map(i => i.tip))].filter(Boolean)

  const pieData = tipuri.map(tip => ({
    name: TIP_LABELS[tip] || tip,
    value: filtered.filter(i => i.tip===tip && !i.isNegativ).reduce((s,i) => s+i.suma, 0),
    fill: TIP_COLORS[tip] || '#64748b'
  })).filter(d => d.value > 0)

  const exportCSV = () => {
    const rows = [['Data','Tip','Descriere','Document','Sumă (RON)','Negativ']]
    filtered.forEach(i => rows.push([i.data, i.tip, i.label, i.document||'', i.suma, i.isNegativ?'Da':'Nu']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv'}))
    a.download = `barrano_incasari_emag_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <AppLayout>
      <Topbar title="Încasări eMAG" subtitle="Vouchere decontate, compensații retururi"
        dateFrom={dateFrom} dateTo={dateTo} onDateFrom={setDateFrom} onDateTo={setDateTo}>
        <button className="btn-secondary" onClick={exportCSV}><Download size={15}/> Export CSV</button>
      </Topbar>

      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['Total încasat', formatRon(totalIncasat), 'text-emerald-600'],
            ['Stornouri', formatRon(totalNegativ), 'text-red-500'],
            ['Total net', formatRon(totalNet), totalNet>=0?'text-emerald-600':'text-red-500'],
          ].map(([l,v,c]) => (
            <div key={l} className="card p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p>
              <p className={`text-xl font-black mt-1 ${c}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Table */}
          <div className="xl:col-span-2 space-y-3">
            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilterTip('')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${!filterTip?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200'}`}>Toate</button>
              {tipuri.map(tip => (
                <button key={tip} onClick={() => setFilterTip(tip)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${filterTip===tip?'text-white border-transparent':'bg-white text-slate-600 border-slate-200'}`}
                  style={filterTip===tip?{backgroundColor:TIP_COLORS[tip]||'#1e293b'}:{}}>
                  {TIP_LABELS[tip]||tip}
                </button>
              ))}
            </div>

            <div className="card overflow-hidden">
              {filtered.length === 0 ? (
                <EmptyState icon={TrendingUp} title="Nicio încasare" subtitle="Importă facturile eMAG din secțiunea Import date"/>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Data','Tip','Descriere','Document','Sumă'].map(h=><th key={h} className="table-header text-left px-4 py-3">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(i => (
                      <tr key={i.id} className="table-row">
                        <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{formatDate(i.data)}</td>
                        <td className="table-cell">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{backgroundColor:`${TIP_COLORS[i.tip]||'#64748b'}18`,color:TIP_COLORS[i.tip]||'#64748b'}}>
                            {TIP_LABELS[i.tip]||i.tip}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-slate-700">{i.label}</td>
                        <td className="table-cell text-xs text-slate-400">{i.document||'—'}</td>
                        <td className={`table-cell text-right font-mono font-bold text-sm ${i.isNegativ?'text-red-500':'text-emerald-600'}`}>
                          {i.isNegativ?'-':''}{formatRon(i.suma)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase" colSpan={4}>Total net ({filtered.length} înregistrări)</td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${totalNet>=0?'text-emerald-600':'text-red-500'}`}>{formatRon(totalNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Pie */}
          <div className="card p-5">
            <p className="text-sm font-bold text-slate-800 mb-4">Distribuție încasări</p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Fără date</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                      {pieData.map((e,i) => <Cell key={i} fill={e.fill}/>)}
                    </Pie>
                    <Tooltip formatter={v => formatRon(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {pieData.map(d => (
                    <div key={d.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.fill}}/><span className="text-slate-600">{d.name}</span></div>
                      <span className="font-bold text-slate-800">{formatRon(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog open={!!confirmId} onClose={()=>setConfirmId(null)}
        onConfirm={()=>{saveIncasari(getIncasari().filter(i=>i.id!==confirmId));load()}}
        title="Șterge încasare" message="Ești sigur că vrei să ștergi această încasare?"/>
    </AppLayout>
  )
}
