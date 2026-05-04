'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, DollarSign, ShoppingCart, Percent, RefreshCw, X, ChevronDown } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { KPICard } from '../../components/ui'
import { getProduse, getVanzari, getCheltuieli, initStorage, resetStorage, clearAllData } from '../../lib/storage'
import { calcVanzareProfit, formatRon, formatRon0, formatPct, filterByDateRange } from '../../lib/calculations'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const B = '#1C1C1A'; const BEIGE = '#C4A882'; const CREAM = '#F5F0E8'; const BORDER = '#E8E0D4'

function TopProdusePanou({ produse, vanzari, dateFrom, dateTo, onClose }) {
  const filtered = filterByDateRange(vanzari, 'data', dateFrom, dateTo).filter(v=>!v.isStorno)
  const totalVenit = filtered.reduce((s,v)=>s+calcVanzareProfit(v,produse).venit,0)
  const stats = produse.map(p=>{
    const vs = filtered.filter(v=>v.produsId===p.id)
    const venit = vs.reduce((s,v)=>s+calcVanzareProfit(v,produse).venit,0)
    const profit = vs.reduce((s,v)=>s+calcVanzareProfit(v,produse).profit,0)
    const qty = vs.reduce((s,v)=>s+Number(v.cantitate),0)
    const marja = venit>0?(profit/venit)*100:0
    return {name:p.numeBarrano, venit, profit, qty, marja}
  }).filter(p=>p.qty>0).sort((a,b)=>b.venit-a.venit)
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(28,28,26,0.5)',backdropFilter:'blur(4px)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,border:'1px solid #E8E0D4',width:'100%',maxWidth:700,maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #F0EAE0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:20,fontWeight:500,color:B,margin:0}}>Top produse după venit</h2>
            <p style={{fontSize:11,color:BEIGE,margin:'3px 0 0'}}>{stats.length} produse · total {formatRon0(totalVenit)}</p>
          </div>
          <button onClick={onClose} style={{border:'none',background:'#F5F0E8',borderRadius:8,padding:8,cursor:'pointer',display:'flex'}}><X size={16} color={B}/></button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'#FAFAF8',position:'sticky',top:0}}>
              <tr>
                {['#','Produs','Cant.','Venit','Profit','Marjă','% din total'].map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:h==='Produs'?'left':'right',fontSize:10,fontWeight:600,color:BEIGE,textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'1px solid #F0EAE0'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((p,i)=>{
                const cota = totalVenit>0?(p.venit/totalVenit)*100:0
                return (
                  <tr key={i} style={{borderBottom:'1px solid #F5F0E8'}}>
                    <td style={{padding:'12px 16px',fontSize:11,color:BEIGE,fontWeight:600}}>{i+1}</td>
                    <td style={{padding:'12px 16px',fontSize:12,fontWeight:500,color:B}}>{p.name}</td>
                    <td style={{padding:'12px 16px',fontSize:12,color:B,textAlign:'right'}}>{p.qty} buc</td>
                    <td style={{padding:'12px 16px',fontSize:12,fontWeight:600,color:B,textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{formatRon(p.venit)}</td>
                    <td style={{padding:'12px 16px',fontSize:12,fontWeight:600,textAlign:'right',color:p.profit>=0?'#16a34a':'#dc2626',fontVariantNumeric:'tabular-nums'}}>{formatRon(p.profit)}</td>
                    <td style={{padding:'12px 16px',fontSize:12,fontWeight:600,textAlign:'right',color:p.marja>=20?'#16a34a':p.marja>=10?'#d97706':'#dc2626'}}>{p.marja.toFixed(1)}%</td>
                    <td style={{padding:'12px 16px',textAlign:'right'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                        <div style={{width:60,height:4,background:'#F5F0E8',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',background:BEIGE,borderRadius:99,width:`${cota}%`}}/></div>
                        <span style={{fontSize:11,color:BEIGE,minWidth:32,textAlign:'right'}}>{cota.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [produse, setProduse] = useState([])
  const [vanzari, setVanzari] = useState([])
  const [cheltuieli, setCheltuieli] = useState([])
  const [showTop, setShowTop] = useState(false)
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10))

  const load = useCallback(() => { initStorage(); setProduse(getProduse()); setVanzari(getVanzari()); setCheltuieli(getCheltuieli()) }, [])
  useEffect(() => { load() }, [load])

  const filteredV = useMemo(() => filterByDateRange(vanzari, 'data', dateFrom, dateTo).filter(v => !v.isStorno), [vanzari, dateFrom, dateTo])
  const filteredC = useMemo(() => filterByDateRange(cheltuieli, 'data', dateFrom, dateTo), [cheltuieli, dateFrom, dateTo])
  const profitCache = useMemo(() => { const m = new Map(); filteredV.forEach(v => m.set(v.id, calcVanzareProfit(v, produse))); return m }, [filteredV, produse])

  const totalVenit = useMemo(() => filteredV.reduce((s,v) => s + profitCache.get(v.id).venit, 0), [filteredV, profitCache])
  const totalProfit = useMemo(() => filteredV.reduce((s,v) => s + profitCache.get(v.id).profit, 0), [filteredV, profitCache])
  const totalChelt = filteredC.reduce((s,c) => s + Number(c.suma), 0)
  const profitNet = totalProfit - totalChelt
  const marjaGlobala = totalVenit > 0 ? (totalProfit/totalVenit)*100 : 0

  const luniMap = {}
  filteredV.forEach(v => {
    const l = v.data.slice(0,7)
    if (!luniMap[l]) luniMap[l] = { luna:l, venit:0, profit:0, cheltuieli:0 }
    const c = profitCache.get(v.id)
    luniMap[l].venit += c.venit; luniMap[l].profit += c.profit
  })
  filteredC.forEach(c => { const l = c.data.slice(0,7); if (!luniMap[l]) luniMap[l]={luna:l,venit:0,profit:0,cheltuieli:0}; luniMap[l].cheltuieli += Number(c.suma) })
  const luniData = Object.values(luniMap).sort((a,b) => a.luna.localeCompare(b.luna)).map(d => ({
    ...d,
    lunaLabel: new Date(d.luna+'-01').toLocaleDateString('ro-RO',{month:'short',year:'2-digit'}),
    profitNet: d.profit - d.cheltuieli,
  }))

  const canalData = [
    {name:'eMAG RO', venit: filteredV.filter(v=>v.canal==='emag'&&(!v.tara||v.tara==='RO')).reduce((s,v)=>s+profitCache.get(v.id).venit,0), fill:B},
    {name:'eMAG BG', venit: filteredV.filter(v=>v.canal==='emag'&&v.tara==='BG').reduce((s,v)=>s+profitCache.get(v.id).venit,0), fill:BEIGE},
    {name:'eMAG HU', venit: filteredV.filter(v=>v.canal==='emag'&&v.tara==='HU').reduce((s,v)=>s+profitCache.get(v.id).venit,0), fill:'#8B7355'},
    {name:'Site', venit: filteredV.filter(v=>v.canal==='site').reduce((s,v)=>s+profitCache.get(v.id).venit,0), fill:'#4A4A45'},
    {name:'Altele', venit: filteredV.filter(v=>v.canal==='altele').reduce((s,v)=>s+profitCache.get(v.id).venit,0), fill:'#C8BFB0'},
  ].filter(d=>d.venit>0)

  // Profit per tara
  const tari = [
    {tara:'RO', flag:'🇷🇴', label:'eMAG România', fill:B},
    {tara:'BG', flag:'🇧🇬', label:'eMAG Bulgaria', fill:BEIGE},
    {tara:'HU', flag:'🇭🇺', label:'eMAG Ungaria', fill:'#8B7355'},
  ]
  // Calculăm vânzările per piață pentru distribuție proporțională cheltuieli
  const venitPerTara = tari.reduce((acc, t) => {
    const v = filteredV.filter(v=>v.canal==='emag'&&(t.tara==='RO'?(!v.tara||v.tara==='RO'):v.tara===t.tara))
    acc[t.tara] = v.reduce((s,v)=>s+profitCache.get(v.id).venit,0)
    return acc
  }, {})
  const totalVenitEmag = Object.values(venitPerTara).reduce((s, v) => s + v, 0)
  // Cheltuieli cu tara setată explicit (ex: FTIC cross-border)
  const cheltCuTara = filteredC.filter(c => c.tara && c.tara !== '')
  // Cheltuieli fără tara → distribuim proporțional cu vânzările
  const cheltFaraTara = filteredC.filter(c => !c.tara || c.tara === '')
  const totalCheltFaraTara = cheltFaraTara.reduce((s,c)=>s+(c.isNegativ?-Number(c.suma):Number(c.suma)),0)

  const profitPerTara = tari.map(t => {
    const vanzariTara = filteredV.filter(v=>v.canal==='emag'&&(t.tara==='RO'?(!v.tara||v.tara==='RO'):v.tara===t.tara))
    const venit = vanzariTara.reduce((s,v)=>s+profitCache.get(v.id).venit,0)
    // Marjă brută: venit - cost produs. Comisioanele vin din facturi reale (FC în cheltuieli per țară)
    const profitVanzari = vanzariTara.reduce((s,v)=>{ const c=profitCache.get(v.id); return s+c.venit-c.cost },0)
    // Cheltuieli specifice acestei țări (FCS/FCDP isNegativ → reduc cheltuielile)
    const cheltSpecifice = cheltCuTara.filter(c=>c.tara===t.tara).reduce((s,c)=>s+(c.isNegativ?-Number(c.suma):Number(c.suma)),0)
    // Cheltuieli comune distribuite proporțional cu vânzările
    const proportie = totalVenitEmag > 0 ? venitPerTara[t.tara] / totalVenitEmag : (t.tara==='RO'?1:0)
    const cheltProp = totalCheltFaraTara * proportie
    const chelt = cheltSpecifice + cheltProp
    const profitNet = profitVanzari - chelt
    return {...t, venit, profitVanzari, chelt, profitNet}
  })

  const topProduse = Object.entries(filteredV.reduce((acc,v) => {
    if (!acc[v.produsId]) acc[v.produsId]={venit:0,profit:0,qty:0}
    const c = profitCache.get(v.id)
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

        {/* Profit per tara */}
        <div className="card" style={{padding:24}}>
          <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:'0 0 20px'}}>Profit net per piață</p>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${BORDER}`}}>
                  {['Piață','Vânzări','Facturi eMAG','Marjă brută','Profit net','Marjă'].map(h=>(
                    <th key={h} style={{padding:'8px 16px',textAlign:h==='Piață'?'left':'right',fontSize:10,fontWeight:600,color:BEIGE,textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profitPerTara.filter(t => t.venit > 0 || t.chelt > 0).map((t,i)=>{
                  const marja = t.venit>0?(t.profitNet/t.venit)*100:0
                  return (
                    <tr key={i} style={{borderBottom:`1px solid #F5F0E8`}}>
                      <td style={{padding:'12px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:t.fill,flexShrink:0}}/>
                          <span style={{fontSize:13,fontWeight:500,color:B}}>{t.flag} {t.label}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:600,color:B,fontVariantNumeric:'tabular-nums'}}>{formatRon0(t.venit)}</td>
                      <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,color:'#dc2626',fontVariantNumeric:'tabular-nums'}}>{formatRon0(t.chelt)}</td>
                      <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,color:BEIGE,fontVariantNumeric:'tabular-nums'}}>{formatRon0(t.profitVanzari)}</td>
                      <td style={{padding:'12px 16px',textAlign:'right',fontSize:13,fontWeight:700,color:t.profitNet>=0?'#16a34a':'#dc2626',fontVariantNumeric:'tabular-nums'}}>{formatRon0(t.profitNet)}</td>
                      <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:600,color:marja>=20?'#16a34a':marja>=10?'#d97706':'#dc2626'}}>{marja.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot style={{borderTop:`2px solid ${BORDER}`,background:'#FAFAF8'}}>
                <tr>
                  <td style={{padding:'12px 16px',fontSize:12,fontWeight:700,color:B}}>Total</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:700,color:B,fontVariantNumeric:'tabular-nums'}}>{formatRon0(profitPerTara.reduce((s,t)=>s+t.venit,0))}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:700,color:'#dc2626',fontVariantNumeric:'tabular-nums'}}>{formatRon0(profitPerTara.reduce((s,t)=>s+t.chelt,0))}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:700,color:BEIGE,fontVariantNumeric:'tabular-nums'}}>{formatRon0(profitPerTara.reduce((s,t)=>s+t.profitVanzari,0))}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontSize:13,fontWeight:700,color:profitPerTara.reduce((s,t)=>s+t.profitNet,0)>=0?'#16a34a':'#dc2626',fontVariantNumeric:'tabular-nums'}}>{formatRon0(profitPerTara.reduce((s,t)=>s+t.profitNet,0))}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontSize:12,fontWeight:700,color:BEIGE}}>{profitPerTara.reduce((s,t)=>s+t.venit,0)>0?((profitPerTara.reduce((s,t)=>s+t.profitNet,0)/profitPerTara.reduce((s,t)=>s+t.venit,0))*100).toFixed(1)+'%':'—'}</td>
                </tr>
              </tfoot>
            </table>
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
                  {canalData.map((e,i)=><Cell key={i} fill={e.fill||B}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top produse */}
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><p style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:17,fontWeight:500,color:B,margin:0}}>Top produse după venit</p><button onClick={()=>setShowTop(true)} style={{fontSize:11,fontWeight:500,color:BEIGE,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,padding:0}}>Vezi tot <ChevronDown size={12}/></button></div>
            {topProduse.length === 0 ? <p style={{color:BEIGE,fontSize:12,textAlign:'center',padding:'40px 0'}}>Fără date în perioada selectată</p> : (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {topProduse.map((p,i)=>{
                  const pct = totalVenit>0?(p.venit/totalVenit)*100:0
                  const marja = p.venit>0?(p.profit/p.venit)*100:0
                  return (
                    <div key={i}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}>
                        <a href="/analiza" style={{color:'var(--b-black)',fontWeight:500,textDecoration:'none',fontSize:12,cursor:'pointer'}} title={p.name}>{p.name.length>35?p.name.slice(0,35)+'…':p.name}</a>
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
      {showTop && <TopProdusePanou produse={produse} vanzari={vanzari} dateFrom={dateFrom} dateTo={dateTo} onClose={()=>setShowTop(false)}/>}
    </AppLayout>
  )
}
