'use client'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, ShoppingCart, Percent, RefreshCw } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { KPICard } from '../../components/ui'
import { getProduse, getVanzari, getCheltuieli, initStorage, resetStorage, clearAllData } from '../../lib/storage'
import { calcVanzareProfit, formatRon, formatPct, filterByDateRange } from '../../lib/calculations'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const B = '#1C1C1A'; const BEIGE = '#C4A882'; const CREAM = '#F5F0E8'; const BORDER = '#E8E0D4'

export default function DashboardPage() {
  const [produse, setProduse] = useState([])
  const [vanzari, setVanzari] = useState([])
  const [cheltuieli, setCheltuieli] = useState([])
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))

  const load = useCallback(() => { initStorage(); setProduse(getProduse()); setVanzari(getVanzari()); setCheltuieli(getCheltuieli()) }, [])
  useEffect(() => { load() }, [load])

  const filteredV = filterByDateRange(vanzari, 'data', dateFrom, dateTo)
  const filteredC = filterByDateRange(cheltuieli, 'data', dateFrom, dateTo)

  const totalVenit = filteredV.reduce((s,v) => s + calcVanzareProfit(v,produse).venit, 0)
  const totalProfit = filteredV.reduce((s,v) => s + calcVanzareProfit(v,produse).profit, 0)
  const totalChelt = filteredC.reduce((s,c) => s + Number(c.suma), 0)
  const profitNet = totalProfit - totalChelt
  const marjaGlobala = totalVenit > 0 ? (totalProfit/totalVenit)*100 : 0

  const luniMap = {}
  filteredV.forEach(v => {
    const l = v.data.slice(0,7)
    if (!luniMap[l]) luniMap[l] = { luna:l, venit:0, profit:0, cheltuieli:0 }
    const c = calcVanzareProfit(v, produse)
    luniMap[l].venit += c.venit; luniMap[l].profit += c.profit
  })
  filteredC.forEach(c => { const l = c.data.slice(0,7); if (!luniMap[l]) luniMap[l]={luna:l,venit:0,profit:0,cheltuieli:0}; luniMap[l].cheltuieli += Number(c.suma) })
  const luniData = Object.values(luniMap).sort((a,b) => a.luna.localeCompare(b.luna)).map(d => ({
    ...d,
    lunaLabel: new Date(d.luna+'-01').toLocaleDateString('ro-RO',{month:'short',year:'2-digit'}),
    profitNet: d.profit - d.cheltuieli,
  }))

  const canalData = ['emag','site','altele'].map(canal => ({
    name: canal==='emag'?'eMAG':canal==='site'?'Site':'Altele',
    venit: filteredV.filter(v=>v.canal===canal).reduce((s,v)=>s+calcVanzareProfit(v,produse).venit,0),
  })).filter(d=>d.venit>0)

  const topProduse = Object.entries(filteredV.reduce((acc,v) => {
    if (!acc[v.produsId]) acc[v.produsId]={venit:0,profit:0,qty:0}
    const c = calcVanzareProfit(v,produse)
    acc[v.produsId].venit+=c.venit; acc[v.produsId].profit+=c.profit; acc[v.produsId].qty+=Number(v.cantitate)
    return acc
  },{})).map(([id,d]) => ({...d, name:produse.find(p=>p.id===id)?.numeBarrano||id})).sort((a,b)=>b.venit-a.venit).slice(0,5)

  const ttSt = { fontSize:11, color:BEIGE, fontWeight:500, borderRadius:10, border:`1px solid ${BORDER}`, padding:'8px 12px', background:'#FDFBF7' }

  return (
    <AppLayout>
      <Topbar title="Dashboard" subtitle="Vizualizare globală a performanței" dateFrom={dateFrom} dateTo={dateTo} onDateFrom={setDateFrom} onDateTo={setDateTo}>
        <button className="btn-secondary" style={{fontSize:12,color:"#dc2626",borderColor:"#fecaca"}} onClick={()=>{ if(window.confirm("Ești sigur? Toate datele vor fi șterse definitiv. Această acțiune nu poate fi anulată.")) { clearAllData(); load(); } }}><RefreshCw size={13}/> Șterge toate datele</button>
      </Topbar>

      <div style={{padding:'24px 28px', display:'flex', flexDirection:'column', gap:20}}>
        {/* KPIs */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14}}>
          <KPICard label="Venit brut" value={formatRon(totalVenit)} icon={DollarSign} color="beige" sub={`${filteredV.length} tranzacții`}/>
          <KPICard label="Profit vânzări" value={formatRon(totalProfit)} icon={TrendingUp} color="green"/>
          <KPICard label="Cheltuieli" value={formatRon(totalChelt)} icon={ShoppingCart} color="beige" sub={`${filteredC.length} înregistrări`}/>
          <KPICard label="Profit net final" value={formatRon(profitNet)} icon={Percent} color={profitNet>=0?'green':'red'} sub={`Marjă ${marjaGlobala.toFixed(1)}%`}/>
        </div>

        {/* Linie */}
        <div className="card" style={{padding:24}}>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:'0 0 4px'}}>Evoluție lunară</p>
          <p style={{fontSize:11,color:BEIGE,margin:'0 0 20px'}}>Venit, Profit din vânzări, Cheltuieli</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={luniData} margin={{top:5,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" vertical={false}/>
              <XAxis dataKey="lunaLabel" tick={{fontSize:11,fill:BEIGE}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:BEIGE}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>formatRon(v)} contentStyle={{fontSize:11,borderRadius:10,border:`1px solid ${BORDER}`,background:'#FDFBF7'}}/>
              <Line type="monotone" dataKey="venit" stroke={B} strokeWidth={2} dot={false} name="Venit"/>
              <Line type="monotone" dataKey="profit" stroke={BEIGE} strokeWidth={2} dot={false} name="Profit"/>
              <Line type="monotone" dataKey="cheltuieli" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Cheltuieli"/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:12}}>
            {[[B,'Venit'],[BEIGE,'Profit'],['#94a3b8','Cheltuieli']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:20,height:2,background:c,borderRadius:1}}/><span style={{fontSize:11,color:BEIGE}}>{l}</span></div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Canal bar */}
          <div className="card" style={{padding:24}}>
            <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:'0 0 20px'}}>Venit per canal</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={canalData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:12,fill:BEIGE}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:BEIGE}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>formatRon(v)} contentStyle={{fontSize:11,borderRadius:10,border:`1px solid ${BORDER}`}}/>
                <Bar dataKey="venit" radius={[6,6,0,0]}>
                  {canalData.map((_,i)=><Cell key={i} fill={i===0?B:i===1?BEIGE:'#C8C2B8'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top produse */}
          <div className="card" style={{padding:24}}>
            <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:'0 0 20px'}}>Top produse după venit</p>
            {topProduse.length === 0 ? <p style={{color:BEIGE,fontSize:12,textAlign:'center',padding:'40px 0'}}>Fără date în perioada selectată</p> : (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {topProduse.map((p,i)=>{
                  const pct = totalVenit>0?(p.venit/totalVenit)*100:0
                  const marja = p.venit>0?(p.profit/p.venit)*100:0
                  return (
                    <div key={i}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                        <span style={{color:B,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{p.name}</span>
                        <div style={{display:'flex',gap:14,flexShrink:0}}>
                          <span style={{color:BEIGE}}>{p.qty} buc</span>
                          <span style={{color:B,fontWeight:600}}>{formatRon(p.venit)}</span>
                          <span style={{color:marja>=20?'#16a34a':marja>=10?'#d97706':'#dc2626',fontWeight:600}}>{marja.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div style={{height:3,background:CREAM,borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:'100%',background:i===0?B:BEIGE,borderRadius:99,width:`${pct}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Profit net bar */}
        <div className="card" style={{padding:24}}>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:'0 0 4px'}}>Profit net lunar</p>
          <p style={{fontSize:11,color:BEIGE,margin:'0 0 20px'}}>după deducerea cheltuielilor</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={luniData} margin={{top:5,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" vertical={false}/>
              <XAxis dataKey="lunaLabel" tick={{fontSize:11,fill:BEIGE}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:BEIGE}} tickFormatter={v=>`${(v/1000).toFixed(1)}k`} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v=>formatRon(v)} contentStyle={{fontSize:11,borderRadius:10,border:`1px solid ${BORDER}`}}/>
              <Bar dataKey="profitNet" radius={[5,5,0,0]}>
                {luniData.map((e,i)=><Cell key={i} fill={e.profitNet>=0?B:'#dc2626'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  )
}
