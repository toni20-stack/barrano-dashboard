'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { Upload, CheckCircle, AlertCircle, Pencil, Check, X, FileText, ShoppingBag, Megaphone } from 'lucide-react'
import { getVanzari, saveVanzari, getProduse, saveProduse, getCheltuieli, saveCheltuieli, getIncasari, saveIncasari, initStorage } from '../../lib/storage'
import { v4 as uuidv4 } from 'uuid'

const ron = v => new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',minimumFractionDigits:2}).format(v||0)

function fmtData(s) {
  if (!s) return ''
  s = String(s).trim()
  if (s.includes('/') && s.length <= 10) { const p=s.split('/'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` }
  if (s.includes('-') && s.split('-')[0].length===2) { const p=s.split('-'); return `${p[2]}-${p[1]}-${p[0]}` }
  if (s.length > 10) { const d=new Date(s); if(!isNaN(d)) return d.toISOString().slice(0,10) }
  return s.slice(0,10)
}

const JUDETE_RO = ['Alba','Arad','Arges','Bacau','Bihor','Bistrita-Nasaud','Botosani','Braila','Brasov','Bucuresti','Buzau','Calarasi','Caras-Severin','Cluj','Constanta','Covasna','Dambovita','Dolj','Galati','Giurgiu','Gorj','Harghita','Hunedoara','Ialomita','Iasi','Ilfov','Maramures','Mehedinti','Mures','Neamt','Olt','Prahova','Salaj','Satu Mare','Sibiu','Suceava','Teleorman','Timis','Tulcea','Valcea','Vaslui','Vrancea']
function detectTara(j) {
  if (!j) return 'RO'
  if (JUDETE_RO.some(jr=>jr.toLowerCase()===j.toString().trim().toLowerCase())) return 'RO'
  const hu=['Baranya','Borsod','Bács','Békés','Fejér','Győr','Hajdú','Pest','Somogy','Szabolcs','Zala','Budapest']
  if (hu.some(u=>j.toLowerCase().includes(u.toLowerCase()))) return 'HU'
  return 'BG'
}

// ── PARSERS ──────────────────────────────────────────────────

function parseSmartBill(buf) {
  const wb = XLSX.read(buf,{type:'array'})
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''})
  let hRow = raw.findIndex(r=>r.some(c=>String(c).trim()==='Produs'))
  if (hRow===-1) throw new Error('Fișier SmartBill invalid — nu am găsit headerul.')
  const headers = raw[hRow].map(h=>String(h).trim().replace(/\n/g,' '))
  const rows = raw.slice(hRow+1).filter(r=>r.some(c=>c!==''))
  const idx = {
    produs: headers.findIndex(h=>h==='Produs'),
    cod: headers.findIndex(h=>h.includes('Cod Produs')),
    client: headers.findIndex(h=>h==='Client'),
    judet: headers.findIndex(h=>h.includes('Judet')),
    data: headers.findIndex(h=>h==='Data'),
    tipDoc: headers.findIndex(h=>h.includes('Tip doc')),
    document: headers.findIndex(h=>h==='Document'),
    cantitate: headers.findIndex(h=>h==='Cantitate'),
    pretRon: headers.findIndex(h=>h.includes('Pret unitar')&&h.includes('RON')),
    valRon: headers.findIndex(h=>h.includes('Valoare')&&h.includes('RON')),
  }
  const normale=[], storno=[]
  rows.forEach((row,i)=>{
    const produs=String(row[idx.produs]||'').trim()
    const produsLow=produs.toLowerCase(); const deIgnorat=['taxe de livrare','transport','discount conform','reducere conform','vásárlási','отстъпка','ваучер:','баучер:','voucher:','vaucer:','card cadou','gift card','total']; if(deIgnorat.some(x=>produsLow.includes(x))) return
    const tip=String(row[idx.tipDoc]||'').toLowerCase()
    const obj={
      _id:`sb_${i}`, produs, cod:String(row[idx.cod]||'').trim(),
      client:String(row[idx.client]||'').trim(), judet:String(row[idx.judet]||'').trim(),
      tara:detectTara(String(row[idx.judet]||'')), data:String(row[idx.data]||'').trim(),
      document:String(row[idx.document]||'').trim(),
      cantitate:Math.abs(parseFloat(row[idx.cantitate])||0),
      pretUnitar:Math.abs(parseFloat(row[idx.pretRon])||0),
      valoareRon:Math.abs(parseFloat(row[idx.valRon])||0),
    }
    if (tip.includes('storno')) storno.push(obj)
    else normale.push(obj)
  })
  return {normale,storno}
}

const EMAG_IGNORAT=['FAACP','FACCP','FAPC','FAPOF','FAECCP','FAECP']
const EMAG_CH=['FC','FCCO','FCS','FCDP','FED','FY','FTIC']
const EMAG_INC=['FV','FVS','FHIC']
const EMAG_LABELS={
  FC:'Comision vânzări',FCS:'Storno comision',FCCO:'Corecție comision',
  FCDP:'Discount comision',FED:'Comision Genius',FY:'Card cadou emis la retur',
  FV:'Decont vouchere clienți',FVS:'Storno decont vouchere',
  FTIC:'Comision transport cross-border',FHIC:'Despăgubire produse deteriorate',
}

function detectTaraEmag(buf) {
  const wb = XLSX.read(buf,{type:'array'})
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',nrows:2})
  if (!data.length) return 'RO'
  const row = data[0]
  // Detectare după coloane — RO are 'Tip factura', BG/HU au 'Invoice type'
  if (row['Invoice type'] !== undefined) {
    // BG vs HU după supplier
    const supplier = String(row['Supplier']||row['Furnizor']||'').toLowerCase()
    if (supplier.includes('bulgaria')||supplier.includes('eood')||supplier.includes('bg')) return 'BG'
    return 'HU'
  }
  return 'RO'
}

function parseEmagFacturi(buf, taraFortat) {
  const wb = XLSX.read(buf,{type:'array'})
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})
  if (!data.length) return {cheltuieli:[],incasari:[],tara:'RO'}

  // Detectare RO vs BG/HU după coloane
  const isEngleza = data[0]['Invoice type'] !== undefined
  const tara = taraFortat || (isEngleza ? detectTaraEmag(buf) : 'RO')

  const cheltuieli=[], incasari=[]
  data.forEach((row,i)=>{
    const tip=String(isEngleza ? (row['Invoice type']||'') : (row['Tip factura']||'')).trim()
    if (!tip||EMAG_IGNORAT.includes(tip)) return
    const valoare=parseFloat(isEngleza ? row['Invoice value with VAT'] : row['Valoare factura cu TVA'])||0
    const d=fmtData(String(isEngleza ? (row['Invoice emission date']||'') : (row['Data emitere factura']||'')))
    const doc=String(isEngleza ? (row['Invoice series/number']||row['Invoice series\/number']||'') : (row['Serie/numar factura']||'')).trim()
    const label=EMAG_LABELS[tip]||tip
    const categorie = tip==='FED'?`Comision Genius eMAG ${tara}`:
                      tip==='FY'?'Card cadou retur eMAG':
                      tip==='FTIC'?`Comision transport cross-border eMAG ${tara}`:
                      tip==='FHIC'?`Handling fee eMAG ${tara}`:
                      `Comisioane eMAG ${tara}`
    if (EMAG_CH.includes(tip)) {
      cheltuieli.push({_id:`ef_${i}`,tip,label,categorie,suma:valoare,data:d,document:doc,isNegativ:valoare<0,tara})
    } else if (EMAG_INC.includes(tip)) {
      incasari.push({_id:`ei_${i}`,tip,label,suma:Math.abs(valoare),data:d,document:doc,isNegativ:valoare<0,tara})
    }
  })
  return {cheltuieli,incasari,tara}
}

function parseEmagAds(buf) {
  const wb = XLSX.read(buf,{type:'array'})
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})
  const prepaid=[], free=[]
  data.forEach((row,i)=>{
    const tip=String(row['Tip credit']||'').trim()
    const val=parseFloat(row['Valoare credit'])||0
    const d=fmtData(String(row['Data activare']||''))
    const obj={_id:`ads_${i}`,tip,valoare:val,data:d}
    if (tip==='Pre-paid') prepaid.push(obj)
    else if (tip==='Free') free.push(obj)
  })
  return {prepaid,free}
}

// ── IMPORT FUNCTIONS ─────────────────────────────────────────

function doImportSB(normale, storno, editNames) {
  initStorage()
  const existProduse=getProduse(), existVanzari=getVanzari()
  const map={}
  existProduse.forEach(p=>{map[p.numeBarrano]=p.id})
  const noi=[], vazute=new Set()
  const getName=row=>editNames[row.cod||row.produs]||row.produs
  ;[...normale,...storno].forEach(row=>{
    const n=getName(row)
    if (!map[n]&&!vazute.has(n)) {
      vazute.add(n)
      const p={id:uuidv4(),numeProducator:'',numeBarrano:n,costAchizitie:0,transport:0,taxeVamale:0,ambalaj:0,componente:[],pretVanzare:row.pretUnitar||0,createdAt:new Date().toISOString().slice(0,10)}
      noi.push(p); map[n]=p.id
    }
  })
  const vNoi=normale.map(r=>({id:uuidv4(),produsId:map[getName(r)]||'',cantitate:r.cantitate,pretUnitar:r.pretUnitar,data:fmtData(r.data),canal:'emag',aplicaComision:false,comisionEmag:0,judet:r.judet,oras:r.client||'',mediu:'urban',tipClient:'persoana_fizica',fisiere:[],sursa:'smartbill',document:r.document,tara:r.tara}))
  const sNoi=storno.map(r=>({id:uuidv4(),produsId:map[getName(r)]||'',cantitate:r.cantitate,pretUnitar:r.pretUnitar,data:fmtData(r.data),canal:'altele',aplicaComision:false,comisionEmag:0,judet:r.judet,oras:r.client||'',mediu:'urban',tipClient:'persoana_fizica',fisiere:[],sursa:'smartbill_storno',document:r.document,tara:r.tara,isStorno:true}))
  saveProduse([...existProduse,...noi])
  saveVanzari([...existVanzari,...vNoi,...sNoi])
  return {vanzari:vNoi.length,storno:sNoi.length,produse:noi.length}
}

function doImportEF(cheltuieli, incasari) {
  initStorage()
  const chNoi=cheltuieli.map(c=>({id:uuidv4(),categorie:c.categorie,suma:Math.abs(c.suma),data:c.data,descriere:`${c.label} — ${c.document}`,sursa:'emag',tip:c.tip,isNegativ:c.isNegativ,tara:c.tara||''}))
  const iNoi=incasari.map(i=>({id:uuidv4(),tip:i.tip,label:i.label,suma:i.suma,data:i.data,document:i.document,sursa:'emag',isNegativ:i.isNegativ,tara:i.tara||''}))
  saveCheltuieli([...getCheltuieli(),...chNoi])
  saveIncasari([...getIncasari(),...iNoi])
  return {cheltuieli:chNoi.length,incasari:iNoi.length}
}

function doImportAds(prepaid) {
  initStorage()
  const noi=prepaid.map(p=>({id:uuidv4(),categorie:'Marketing eMAG Ads',suma:p.valoare,data:p.data,descriere:'eMAG Ads — credit pre-paid',sursa:'emag_ads',tara:'RO'}))
  saveCheltuieli([...getCheltuieli(),...noi])
  return {cheltuieli:noi.length}
}

// ── COMPONENTS ───────────────────────────────────────────────

function DropZone({onFile, loading, accept, hint}) {
  const ref=useRef()
  return (
    <div onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}}
      className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all">
      {loading
        ? <div className="flex flex-col items-center gap-3"><div className="w-10 h-10 rounded-full border-4 border-orange-400 border-t-transparent animate-spin"/><p className="text-sm font-semibold text-orange-500">Se procesează...</p></div>
        : <><div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Upload size={24} className="text-slate-400"/></div><p className="text-sm font-bold text-slate-700">Trage fișierul aici sau apasă</p><p className="text-xs text-slate-400 mt-1">{hint}</p></>
      }
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={e=>{onFile(e.target.files[0]);e.target.value=''}}/>
    </div>
  )
}

function DoneCard({title, stats, links, onReset}) {
  return (
    <div className="card p-10 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle size={28} className="text-emerald-500"/></div>
      <p className="text-base font-black text-slate-900 mb-5">{title}</p>
      <div className={`grid grid-cols-${stats.length} gap-3 mb-6`}>
        {stats.map(([l,v,c])=>(
          <div key={l} className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{l}</p>
            <p className={`text-2xl font-black mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {links.map(([href,label])=><a key={href} href={href} className="btn-primary">{label}</a>)}
        <button className="btn-secondary" onClick={onReset}>Import alt fișier</button>
      </div>
    </div>
  )
}

function InfoBox({color, children}) {
  const cls={amber:'bg-amber-50 border-amber-200 text-amber-700',blue:'bg-blue-50 border-blue-200 text-blue-700',purple:'bg-purple-50 border-purple-200 text-purple-700'}
  return <div className={`p-3 rounded-lg border text-[11px] font-semibold ${cls[color]}`}>{children}</div>
}

function LegendaFacturi({open, onToggle}) {
  const sectiuni = [
    { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', textColor:'#991b1b',
      titlu:'Cheltuieli — tu plătești',
      items:[{cod:'FC',desc:'Comision pe vânzări'},{cod:'FED',desc:'Comision Genius (abonament)'},{cod:'FCCO',desc:'Corecție comision'},{cod:'FY',desc:'Card cadou retur (reținut din decont)'}]},
    { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', textColor:'#14532d',
      titlu:'Reduc cheltuielile (valori negative)',
      items:[{cod:'FCS',desc:'Storno comision la retur client'},{cod:'FCDP',desc:'Discount comision de la eMAG'}]},
    { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', textColor:'#1e3a8a',
      titlu:'Venituri — tu primești',
      items:[{cod:'FV',desc:'Decont vouchere folosite de clienți'},{cod:'FVS',desc:'Storno decont vouchere'}]},
    { color:'#94a3b8', bg:'#f8fafc', border:'#e2e8f0', textColor:'#475569',
      titlu:'Ignorate în import',
      items:[{cod:'FAACP',desc:'Avans credite reclame Ads'},{cod:'FACCP',desc:'Consum credite pre-paid Ads'},{cod:'FAPC',desc:'Storno avans reclame'},{cod:'FAPOF',desc:'Avans plată online intern'}]},
  ]
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-800">📋 Legendă tipuri facturi eMAG</span>
        </div>
        <span className="text-xs text-slate-400 font-semibold">{open?'Ascunde ▲':'Afișează ▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectiuni.map(s => (
              <div key={s.titlu} className="rounded-xl overflow-hidden border border-slate-200">
                <div className="px-4 py-2.5 flex items-center gap-2" style={{background:s.bg,borderBottom:`1px solid ${s.border}`}}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:s.color}}/>
                  <span className="text-[11px] font-bold" style={{color:s.textColor}}>{s.titlu}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {s.items.map(item => (
                    <div key={item.cod} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{item.cod}</span>
                      <span className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Notă:</span> Niciun document eMAG nu este factură fiscală — toate sunt anexe sau note de credit. TVA: <span className="font-semibold">21%</span> România · <span className="font-semibold">19%</span> Ungaria / Bulgaria.
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────

export default function ImportPage() {
  const [tab, setTab]=useState('smartbill')
  const [loading, setLoading]=useState(false)
  const [error, setError]=useState('')

  // SmartBill
  const [sbData,setSbData]=useState(null)
  const [sbNames,setSbNames]=useState({})
  const [sbEditing,setSbEditing]=useState(null)
  const [sbTemp,setSbTemp]=useState('')
  const [sbSubTab,setSbSubTab]=useState('normale')
  const [sbResult,setSbResult]=useState(null)

  const [legendOpen, setLegendOpen] = useState(false)

  // eMAG Facturi
  const [efData,setEfData]=useState(null)
  const [efTara,setEfTara]=useState('RO')
  const [efMoneda,setEfMoneda]=useState('RON')
  const [efCurs,setEfCurs]=useState(1)
  const [efResult,setEfResult]=useState(null)

  const MONEDE = [
    {cod:'RON', label:'RON — Leu românesc', curs:1},
    {cod:'EUR', label:'EUR — Euro',          curs:5.05},
    {cod:'BGN', label:'BGN — Leva bulgară',  curs:2.58},
    {cod:'HUF', label:'HUF — Forint ungar',  curs:0.0135},
  ]
  const MONEDA_DEFAULT_TARA = {RO:'RON', BG:'EUR', HU:'HUF'}

  // eMAG Ads
  const [adsData,setAdsData]=useState(null)
  const [adsResult,setAdsResult]=useState(null)

  const wrap=async(fn)=>{setLoading(true);setError('');try{await fn()}catch(e){setError(e.message)}setLoading(false)}

  const handleSB=file=>wrap(async()=>{
    const buf=await file.arrayBuffer()
    const d=parseSmartBill(new Uint8Array(buf))
    setSbData(d);setSbResult(null)
    const n={}; ;[...d.normale,...d.storno].forEach(r=>{n[r.cod||r.produs]=r.produs}); setSbNames(n)
  })

  const handleEF=file=>wrap(async()=>{
    const buf=await file.arrayBuffer()
    const result=parseEmagFacturi(new Uint8Array(buf))
    const monedaDefault = MONEDA_DEFAULT_TARA[result.tara]||'RON'
    const cursDefault = MONEDE.find(m=>m.cod===monedaDefault)?.curs||1
    setEfData(result); setEfTara(result.tara); setEfMoneda(monedaDefault); setEfCurs(cursDefault); setEfResult(null)
  })

  const handleAds=file=>wrap(async()=>{
    const buf=await file.arrayBuffer()
    setAdsData(parseEmagAds(new Uint8Array(buf))); setAdsResult(null)
  })

  const getName=row=>sbNames[row.cod||row.produs]||row.produs

  const TABS=[
    {id:'smartbill',label:'SmartBill',icon:FileText,active:'bg-blue-50 text-blue-700',inactive:'text-slate-500'},
    {id:'emag-facturi',label:'eMAG Facturi',icon:ShoppingBag,active:'bg-orange-50 text-orange-700',inactive:'text-slate-500'},
    {id:'emag-ads',label:'eMAG Ads',icon:Megaphone,active:'bg-purple-50 text-purple-700',inactive:'text-slate-500'},
  ]

  return (
    <AppLayout>
      <Topbar title="Import date" subtitle="SmartBill · eMAG Facturi · eMAG Ads"/>
      <div className="p-6 max-w-5xl space-y-5">

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map(({id,label,icon:Icon,active,inactive})=>(
            <button key={id} onClick={()=>{setTab(id);setError('')}}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab===id?`${active} border-transparent`:`bg-white ${inactive} border-slate-200 hover:border-slate-300`}`}>
              <Icon size={15}/>{label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"><AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0"/><p className="text-sm text-red-600">{error}</p></div>}

        {/* ═══ SMARTBILL ═══ */}
        {tab==='smartbill' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Cum descarci din SmartBill:</p>
              <ol className="text-xs text-slate-500 space-y-1 ml-4 list-decimal">
                <li>SmartBill → <strong>Rapoarte → Vânzări pe produse</strong></li>
                <li>Selectează perioada → <strong>Export XLS</strong></li>
              </ol>
              <InfoBox color="blue">Se importă vânzările ca tranzacții + stornourile ca retururi separate. Produsele inexistente se creează automat (editabile). Taxele de livrare sunt ignorate automat.</InfoBox>
            </div>

            {!sbData && !sbResult && <DropZone onFile={handleSB} loading={loading} accept=".xls,.xlsx" hint="Raport SmartBill — Vânzări pe produse (.xls / .xlsx)"/>}

            {sbResult && <DoneCard title="SmartBill importat cu succes!"
              stats={[['Vânzări',sbResult.vanzari,'text-emerald-600'],['Retururi',sbResult.storno,'text-red-500'],['Produse noi',sbResult.produse,'text-orange-500']]}
              links={[['/vanzari','→ Vânzări'],['/produse','→ Editează Produse']]} onReset={()=>setSbResult(null)}/>}

            {sbData && !sbResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['Vânzări normale',sbData.normale.length,'text-slate-900'],['Stornouri',sbData.storno.length,'text-red-500'],
                    ['Produse unice',[...new Set([...sbData.normale,...sbData.storno].map(r=>r.cod||r.produs))].length,'text-slate-900'],
                    ['Venit total',ron(sbData.normale.reduce((s,r)=>s+r.valoareRon,0)),'text-emerald-600']
                  ].map(([l,v,c])=>(
                    <div key={l} className="card p-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p><p className={`text-lg font-black mt-1 ${c}`}>{v}</p></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {[['normale',`Vânzări (${sbData.normale.length})`],['storno',`Stornouri / Retururi (${sbData.storno.length})`]].map(([v,l])=>(
                    <button key={v} onClick={()=>setSbSubTab(v)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${sbSubTab===v?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-[11px] text-slate-500 font-semibold">{sbSubTab==='storno'?'⚠️ Stornourile se importă separat ca retururi — nu afectează venitul':'✓ Treci cu mouse-ul pe produs pentru a edita numele'}</p>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>{['Produs (editabil)','Client','Județ','Țară','Data','Cant.','Valoare RON'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {(sbSubTab==='normale'?sbData.normale:sbData.storno).slice(0,150).map(row=>{
                          const key=row.cod||row.produs
                          const isEd=sbEditing===key
                          const name=getName(row)
                          return (
                            <tr key={row._id} className="table-row">
                              <td className="table-cell max-w-[200px]">
                                {isEd
                                  ?<div className="flex items-center gap-1">
                                    <input className="input text-xs py-1 flex-1" value={sbTemp} onChange={e=>setSbTemp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setSbNames(p=>({...p,[key]:sbTemp})),setSbEditing(null))} autoFocus/>
                                    <button onClick={()=>{setSbNames(p=>({...p,[key]:sbTemp}));setSbEditing(null)}} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12}/></button>
                                    <button onClick={()=>setSbEditing(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={12}/></button>
                                  </div>
                                  :<div className="flex items-center gap-1 group cursor-pointer" onClick={()=>{setSbEditing(key);setSbTemp(name)}}>
                                    <span className="text-xs font-medium text-slate-800 truncate max-w-[155px]">{name}</span>
                                    <Pencil size={10} className="opacity-0 group-hover:opacity-100 text-orange-400 shrink-0"/>
                                  </div>
                                }
                              </td>
                              <td className="table-cell text-xs text-slate-500 max-w-[100px] truncate">{row.client}</td>
                              <td className="table-cell text-xs text-slate-600">{row.judet}</td>
                              <td className="table-cell text-center">{row.tara==='RO'?'🇷🇴':row.tara==='HU'?'🇭🇺':'🇧🇬'}</td>
                              <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{row.data}</td>
                              <td className="table-cell text-right text-xs">{row.cantitate}</td>
                              <td className={`table-cell text-right font-mono text-xs font-semibold ${sbSubTab==='storno'?'text-red-500':'text-slate-900'}`}>{ron(row.valoareRon)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {(sbSubTab==='normale'?sbData.normale:sbData.storno).length>150&&<p className="text-center py-2 text-xs text-slate-400">Se afișează primele 150. Toate vor fi importate.</p>}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button className="btn-secondary" onClick={()=>setSbData(null)}>← Alt fișier</button>
                  <button className="btn-primary" onClick={()=>setSbResult(doImportSB(sbData.normale,sbData.storno,sbNames))}><CheckCircle size={14}/> Importă {sbData.normale.length+sbData.storno.length} rânduri</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ eMAG FACTURI ═══ */}
        {tab==='emag-facturi' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Cum descarci din eMAG Seller:</p>
              <ol className="text-xs text-slate-500 space-y-1 ml-4 list-decimal">
                <li>eMAG Seller → <strong>Financiar → Facturi</strong></li>
                <li>Selectează perioada → <strong>Export Excel</strong></li>
              </ol>
              <InfoBox color="amber">
                Se importă: FC/FCS/FCCO/FCDP/FTIC/FHIC → Cheltuieli · FED → Genius · FY → Card cadou retur · FV/FVS → Încasări eMAG. Suportă fișiere RO, BG și HU — țara se detectează automat. Avansurile de reclame (FAACP/FACCP) sunt ignorate.
              </InfoBox>
            </div>

            <LegendaFacturi open={legendOpen} onToggle={() => setLegendOpen(o => !o)}/>

            <div className="card p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600">Șterge înregistrări importate greșit (fără conversie valutară):</p>
              <div className="flex gap-2 flex-wrap">
                {[{tara:'BG',flag:'🇧🇬',label:'Bulgaria',color:'text-amber-700 border-amber-200 hover:bg-amber-50'},
                  {tara:'HU',flag:'🇭🇺',label:'Ungaria',color:'text-purple-700 border-purple-200 hover:bg-purple-50'}
                ].map(({tara,flag,label,color})=>(
                  <button key={tara} className={`text-xs font-bold border rounded-lg px-3 py-1.5 transition-all ${color}`}
                    onClick={()=>{
                      if(!window.confirm(`Ștergi toate cheltuielile eMAG ${label}? Încasările rămân intacte. Apoi reimportă cu cursul corect.`)) return
                      saveCheltuieli(getCheltuieli().filter(c=>!(c.tara===tara&&c.sursa==='emag')))
                      alert(`Cheltuielile eMAG ${label} au fost șterse. Reimportă fișierul cu cursul corect.`)
                    }}>
                    {flag} Șterge eMAG {label}
                  </button>
                ))}
              </div>
            </div>

            {!efData && !efResult && <DropZone onFile={handleEF} loading={loading} accept=".xlsx,.xls" hint="Export facturi eMAG Seller (.xlsx)"/>}

            {efResult && <DoneCard title="eMAG Facturi importate!"
              stats={[['Cheltuieli',efResult.cheltuieli,'text-orange-500'],['Încasări eMAG',efResult.incasari,'text-emerald-600']]}
              links={[['/cheltuieli','→ Cheltuieli'],['/incasari','→ Încasări eMAG']]} onReset={()=>setEfResult(null)}/>}

            {efData && !efResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['Cheltuieli',efData.cheltuieli.length,'text-orange-600'],['Încasări eMAG',efData.incasari.length,'text-emerald-600'],
                    ['Total cheltuieli',ron(efData.cheltuieli.reduce((s,c)=>s+Math.abs(c.suma),0)),'text-slate-900'],
                    ['Total încasări',ron(efData.incasari.reduce((s,i)=>s+i.suma,0)),'text-emerald-600']
                  ].map(([l,v,c])=>(
                    <div key={l} className="card p-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p><p className={`text-lg font-black mt-1 ${c}`}>{v}</p></div>
                  ))}
                </div>

                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-orange-700">Cheltuieli eMAG ({efData.cheltuieli.length})</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Piață:</span>
                    <select value={efTara} onChange={e=>{const t=e.target.value;const m=MONEDA_DEFAULT_TARA[t]||'RON';setEfTara(t);setEfMoneda(m);setEfCurs(MONEDE.find(x=>x.cod===m)?.curs||1)}}
                      className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer">
                      <option value="RO">🇷🇴 România</option>
                      <option value="BG">🇧🇬 Bulgaria</option>
                      <option value="HU">🇭🇺 Ungaria</option>
                    </select>
                    {efTara!==efData.tara&&<span className="text-[10px] text-amber-600 font-semibold">modificat manual</span>}
                    {efTara===efData.tara&&<span className="text-[10px] text-slate-400">detectat automat</span>}
                  </div>
                  {efMoneda!=='RON'&&(
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-semibold">Monedă factură:</span>
                      <select value={efMoneda} onChange={e=>{setEfMoneda(e.target.value);setEfCurs(MONEDE.find(m=>m.cod===e.target.value)?.curs||1)}}
                        className="text-[11px] font-bold border border-orange-200 rounded-lg px-2 py-1 bg-orange-50 cursor-pointer">
                        {MONEDE.map(m=><option key={m.cod} value={m.cod}>{m.label}</option>)}
                      </select>
                      <span className="text-[10px] text-slate-400">Curs BNR:</span>
                      <input type="number" step="0.0001" min="0.0001" value={efCurs}
                        onChange={e=>setEfCurs(parseFloat(e.target.value)||1)}
                        className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 w-24 text-right"/>
                      <span className="text-[10px] text-slate-500">1 {efMoneda} = <strong>{efCurs} RON</strong></span>
                    </div>
                  )}
                </div>
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>{['Cod','Descriere','Categorie','Data','Sumă cu TVA'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {efData.cheltuieli.map(c=>(
                          <tr key={c._id} className="table-row">
                            <td className="table-cell"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.tip}</span></td>
                            <td className="table-cell text-xs text-slate-700">{c.label}</td>
                            <td className="table-cell text-xs text-slate-500">{c.categorie}</td>
                            <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{c.data}</td>
                            <td className={`table-cell text-right font-mono text-xs font-bold ${c.isNegativ?'text-emerald-600':'text-slate-900'}`}>{c.isNegativ?'-':''}{ron(Math.abs(c.suma))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {efData.incasari.length>0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100"><p className="text-[11px] font-bold text-emerald-700">Încasări eMAG ({efData.incasari.length}) — merg în modulul Încasări eMAG</p></div>
                    <div className="overflow-x-auto max-h-44 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>{['Cod','Descriere','Data','Sumă'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {efData.incasari.map(i=>(
                            <tr key={i._id} className="table-row">
                              <td className="table-cell"><span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{i.tip}</span></td>
                              <td className="table-cell text-xs text-slate-700">{i.label}</td>
                              <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{i.data}</td>
                              <td className={`table-cell text-right font-mono text-xs font-bold ${i.isNegativ?'text-red-500':'text-emerald-600'}`}>{ron(i.suma)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button className="btn-secondary" onClick={()=>setEfData(null)}>← Alt fișier</button>
                  <button className="btn-primary" onClick={()=>setEfResult(doImportEF(
                    efData.cheltuieli.map(c=>({...c,tara:efTara,suma:parseFloat((Math.abs(c.suma)*efCurs).toFixed(2))})),
                    efData.incasari.map(i=>({...i,tara:efTara,suma:parseFloat((i.suma*efCurs).toFixed(2))}))
                  ))}><CheckCircle size={14}/> Importă tot</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ eMAG ADS ═══ */}
        {tab==='emag-ads' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Cum descarci din eMAG Seller:</p>
              <ol className="text-xs text-slate-500 space-y-1 ml-4 list-decimal">
                <li>eMAG Seller → <strong>Marketing → eMAG Ads → Credite</strong></li>
                <li>Apasă <strong>Export Excel</strong></li>
              </ol>
              <InfoBox color="purple">Creditele Free (primite gratuit de la eMAG) sunt ignorate automat — cost 0. Se importă doar creditele Pre-paid ca cheltuieli reale în categoria "Marketing eMAG Ads".</InfoBox>
            </div>

            {!adsData && !adsResult && <DropZone onFile={handleAds} loading={loading} accept=".xlsx,.xls" hint="Export credite eMAG Ads (.xlsx)"/>}

            {adsResult && <DoneCard title="eMAG Ads importate!"
              stats={[['Cheltuieli adăugate',adsResult.cheltuieli,'text-purple-600']]}
              links={[['/cheltuieli','→ Vezi Cheltuieli']]} onReset={()=>setAdsResult(null)}/>}

            {adsData && !adsResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[['Credite Pre-paid',adsData.prepaid.length,'text-purple-600'],['Free (ignorate)',adsData.free.length,'text-slate-400'],
                    ['Total de importat',ron(adsData.prepaid.reduce((s,p)=>s+p.valoare,0)),'text-slate-900']
                  ].map(([l,v,c])=>(
                    <div key={l} className="card p-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</p><p className={`text-lg font-black mt-1 ${c}`}>{v}</p></div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100"><p className="text-[11px] font-bold text-purple-700">Credite — Pre-paid se importă, Free se ignoră</p></div>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>{['Data activare','Tip','Valoare (RON)'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {adsData.prepaid.map(p=>(
                          <tr key={p._id} className="table-row">
                            <td className="table-cell text-xs text-slate-600 whitespace-nowrap">{p.data}</td>
                            <td className="table-cell"><span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Pre-paid</span></td>
                            <td className="table-cell text-right font-mono text-xs font-bold text-slate-900">{ron(p.valoare)}</td>
                          </tr>
                        ))}
                        {adsData.free.map(p=>(
                          <tr key={p._id} className="table-row opacity-40">
                            <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{p.data}</td>
                            <td className="table-cell"><span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Free — ignorat</span></td>
                            <td className="table-cell text-right font-mono text-xs text-slate-400">{ron(p.valoare)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button className="btn-secondary" onClick={()=>setAdsData(null)}>← Alt fișier</button>
                  <button className="btn-primary" onClick={()=>setAdsResult(doImportAds(adsData.prepaid))}><CheckCircle size={14}/> Importă {adsData.prepaid.length} credite pre-paid</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
