'use client'
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import AppLayout from '../../components/AppLayout'
import Topbar from '../../components/Topbar'
import { Upload, CheckCircle, AlertCircle, Pencil, Check, X, FileText, ShoppingBag, Megaphone, Truck, CreditCard, Building2, Package, Plus, FileSpreadsheet, FileType, Trash2, Clock } from 'lucide-react'
import { addVanzariBulk, addProduseBulk, addCheltuieliBulk, addIncasariBulk, addCheltuiala, deleteVanzariBySursa, deleteCheltuieliEmagByTara, getProduse, getImporturi, addImport, deleteImport, deleteByBatchId } from '../../lib/storage'
import { v4 as uuidv4 } from 'uuid'

const ron = v => new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',minimumFractionDigits:2}).format(v||0)

function fmtData(s) {
  if (!s) return ''
  s = String(s).trim()
  if (s.includes('/') && s.length <= 10) { const p=s.split('/'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` }
  if (s.includes('.') && s.split('.')[0].length <= 2 && s.split('.').length === 3) { const p=s.split('.'); return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` }
  if (s.includes('-') && s.split('-')[0].length===2) { const p=s.split('-'); return `${p[2]}-${p[1]}-${p[0]}` }
  if (s.length > 10) { const d=new Date(s); if(!isNaN(d)) return d.toISOString().slice(0,10) }
  return s.slice(0,10)
}

const JUDETE_RO = ['Alba','Arad','Arges','Bacau','Bihor','Bistrita-Nasaud','Botosani','Braila','Brasov','Bucuresti','Buzau','Calarasi','Caras-Severin','Cluj','Constanta','Covasna','Dambovita','Dolj','Galati','Giurgiu','Gorj','Harghita','Hunedoara','Ialomita','Iasi','Ilfov','Maramures','Mehedinti','Mures','Neamt','Olt','Prahova','Salaj','Satu Mare','Sibiu','Suceava','Teleorman','Timis','Tulcea','Valcea','Vaslui','Vrancea']
function detectTara(j) {
  if (!j) return 'RO'
  if (JUDETE_RO.some(jr=>jr.toLowerCase()===j.toString().trim().toLowerCase())) return 'RO'
  const hu=['Baranya','Borsod','Bács','Békés','Fejér','Győr','Hajdú','Pest','Somogy','Szabolcs','Zala','Budapest','Csongrád','Heves','Jász','Komárom','Nógrád','Tolna','Veszprém','Vas']
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
    cif: headers.findIndex(h=>{
      const u=h.toUpperCase().replace(/[\s./\-_]/g,'')
      if(['CIF','CIFCLIENT','CIFCNP','CNPCIF','CUI','CODFISCAL','CODIDENTIFICAREFISCALA'].includes(u)) return true
      const l=h.toLowerCase()
      return l==='cif client'||l.includes('cod fiscal')||l.includes('cif/cnp')
    }),
    judet: headers.findIndex(h=>h.includes('Judet')),
    data: headers.findIndex(h=>h==='Data'),
    tipDoc: headers.findIndex(h=>h.includes('Tip doc')),
    document: headers.findIndex(h=>h==='Document'),
    cantitate: headers.findIndex(h=>h==='Cantitate'),
    pretRon: headers.findIndex(h=>h.includes('Pret unitar')&&h.includes('RON')),
    valRon: headers.findIndex(h=>h.includes('Valoare')&&h.includes('RON')),
  }
  const cifColName = idx.cif >= 0 ? headers[idx.cif] : null
  const normale=[], storno=[]
  rows.forEach((row,i)=>{
    const produs=String(row[idx.produs]||'').trim()
    const produsLow=produs.toLowerCase()
    const deIgnorat=['taxe de livrare','transport','discount conform','reducere conform','vásárlási','отстъпка','ваучер:','баучер:','voucher:','vaucer:','card cadou','gift card','total']
    if(deIgnorat.some(x=>produsLow.includes(x))) return
    const tip=String(row[idx.tipDoc]||'').toLowerCase()
    const obj={
      _id:`sb_${i}`, produs, cod:String(row[idx.cod]||'').trim(),
      client:String(row[idx.client]||'').trim(), cif:String(idx.cif>=0?row[idx.cif]||'':'').trim(),
      judet:String(row[idx.judet]||'').trim(),
      tara:detectTara(String(row[idx.judet]||'')), data:String(row[idx.data]||'').trim(),
      document:String(row[idx.document]||'').trim(),
      cantitate:Math.abs(parseFloat(row[idx.cantitate])||0),
      pretUnitar:Math.abs(parseFloat(row[idx.pretRon])||0),
      valoareRon:Math.abs(parseFloat(row[idx.valRon])||0),
    }
    if (tip.includes('storno')) storno.push(obj)
    else normale.push(obj)
  })
  return {normale, storno, cifColName, headers}
}

// Parser Excel generic — detectează coloane automat
function parseGenericExcel(buf) {
  const wb = XLSX.read(buf, {type:'array'})
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:''})
  if (raw.length < 2) throw new Error('Fișierul este gol sau nu are date.')

  const headers = raw[0].map(h => String(h).trim())
  const headersLow = headers.map(h => h.toLowerCase())

  const dateIdx = headersLow.findIndex(h =>
    h.includes('data') || h.includes('date') || h.includes('zi') || h.includes('emitere') || h.includes('scadent'))
  const sumaIdx = headersLow.findIndex(h =>
    h.includes('suma') || h.includes('valoare') || h.includes('total') ||
    h.includes('amount') || h.includes('pret') || h.includes('net') || h.includes('tva'))
  const descriereIdx = headersLow.findIndex(h =>
    h.includes('descriere') || h.includes('denumire') || h.includes('produs') ||
    h.includes('serviciu') || h.includes('description') || h.includes('furnizor') ||
    h.includes('nota') || h.includes('detalii') || h.includes('text'))
  const docIdx = headersLow.findIndex(h =>
    h.includes('factura') || h.includes('document') || h.includes('numar') ||
    h.includes('serie') || h.includes('invoice') || (h.includes('nr') && !h.includes('transport')))

  const rows = raw.slice(1).filter(r => r.some(c => c !== '')).map((row, i) => {
    const rawSuma = String(row[sumaIdx] ?? '').trim()
    // Suportă format românesc: 1.234,56 sau internațional: 1234.56
    const sumaStr = rawSuma.includes(',') && rawSuma.includes('.')
      ? rawSuma.replace(/\./g, '').replace(',', '.') // 1.234,56 → 1234.56
      : rawSuma.replace(',', '.') // 1234,56 → 1234.56
    const suma = Math.abs(parseFloat(sumaStr) || 0)

    const descriere = descriereIdx >= 0 ? String(row[descriereIdx] || '').trim() : ''
    const doc = docIdx >= 0 ? String(row[docIdx] || '').trim() : ''

    return {
      _id: `gx_${i}`,
      data: dateIdx >= 0 ? fmtData(String(row[dateIdx] || '')) : '',
      suma,
      descriere: [descriere, doc].filter(Boolean).join(' — '),
    }
  }).filter(r => r.suma > 0)

  if (rows.length === 0) throw new Error('Nu s-au găsit rânduri cu sume valide. Verifică că fișierul are o coloană cu suma/valoarea.')

  return { headers, dateIdx, sumaIdx, descriereIdx, docIdx, rows }
}

// Extractor text din PDF (fără dependențe externe — funcționează pentru PDF-uri text)
function extractPDFTextRaw(buf) {
  let raw = ''
  for (let i = 0; i < buf.length; i++) raw += String.fromCharCode(buf[i])

  const texts = []
  // Extrage string-uri PDF: (text)Tj sau (text)'
  const re = /\(([^)\\]*(?:\\[\s\S][^)\\]*)*)\)\s*(?:Tj|'|"|\bTJ\b)/g
  let m
  while ((m = re.exec(raw)) !== null) {
    const t = m[1]
      .replace(/\\n/g, ' ').replace(/\\r/g, ' ')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
    if (t.trim().length > 0) texts.push(t.trim())
  }

  // Fallback: extrage text ASCII direct
  if (texts.length === 0) {
    let chunk = ''
    for (let i = 0; i < buf.length; i++) {
      const c = buf[i]
      if (c >= 32 && c <= 126) chunk += String.fromCharCode(c)
      else if (chunk.length > 3) { texts.push(chunk); chunk = '' }
      else chunk = ''
    }
  }
  return texts.join(' ')
}

function parsePDFText(text) {
  // Date: DD.MM.YYYY sau DD/MM/YYYY
  const dateRe = /(\d{1,2}[./]\d{1,2}[./]\d{4})/g
  const dates = [...text.matchAll(dateRe)].map(m => m[1])

  // Sume în format românesc: 1.234,56 sau 1234,56
  const amountRe = /(\d{1,3}(?:\.\d{3})*,\d{2})/g
  const amounts = [...text.matchAll(amountRe)]
    .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
    .filter(a => a > 0 && a < 10000000)

  // Deduplicare și sortare descrescătoare
  const uniqueAmounts = [...new Set(amounts)].sort((a, b) => b - a)
  const total = uniqueAmounts.length > 0 ? uniqueAmounts[0] : 0
  const date = dates.length > 0 ? fmtData(dates[0]) : new Date().toISOString().slice(0, 10)

  return { date, total, amounts: uniqueAmounts, dates }
}

const EMAG_IGNORAT=['FAACP','FACCP','FAPC','FAPOF','FAECCP','FAECP']
const EMAG_CH=['FC','FCCO','FCS','FCDP','FED','FY','FTIC']
const EMAG_INC=['FV','FVS','FHIC']
const EMAG_COMISION=['FC','FCS','FCCO','FCDP']
const EMAG_TRANSPORT=['FTIC']
const EMAG_ABONAMENTE=['FED']
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
  if (row['Invoice type'] !== undefined) {
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
    const categorie = tip==='FTIC' ? 'Transport' :
                      tip==='FED'  ? 'Abonamente' :
                      tip==='FY'   ? 'Altele' :
                      'Comisioane eMAG'
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

function isFirma(cif) {
  if (!cif) return false
  const v = cif.trim().replace(/\s/g,'')
  if (!v || v === '0') return false
  return !/^\d{13}$/.test(v)
}

async function doImportSB(normale, storno, editNames, fisier) {
  const batchId = uuidv4()
  const existProduse = await getProduse()
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
  const hasCif = cif => /[a-zA-Z0-9]/.test((cif||'').trim())
  const vNoi=normale.map(r=>({id:uuidv4(),batchId,produsId:map[getName(r)]||'',cantitate:r.cantitate,pretUnitar:r.pretUnitar,data:fmtData(r.data),canal:'emag',aplicaComision:false,comisionEmag:0,judet:r.judet,oras:r.client||'',mediu:'urban',tipClient:hasCif(r.cif)?'firma':'persoana_fizica',fisiere:[],sursa:'smartbill',document:r.document,tara:r.tara}))
  const sNoi=storno.map(r=>({id:uuidv4(),batchId,produsId:map[getName(r)]||'',cantitate:r.cantitate,pretUnitar:r.pretUnitar,data:fmtData(r.data),canal:'emag',aplicaComision:false,comisionEmag:0,judet:r.judet,oras:r.client||'',mediu:'urban',tipClient:hasCif(r.cif)?'firma':'persoana_fizica',fisiere:[],sursa:'smartbill_storno',document:r.document,tara:r.tara,isStorno:true}))
  await Promise.all([addProduseBulk(noi), addVanzariBulk([...vNoi,...sNoi])])
  await addImport({id:batchId, fisier:fisier||'SmartBill', tip:'smartbill', data:new Date().toISOString().slice(0,10), countVanzari:vNoi.length, countStorno:sNoi.length, countProduse:noi.length})
  return {vanzari:vNoi.length,storno:sNoi.length,produse:noi.length}
}

async function doImportEF(cheltuieli, incasari, fisier, tara) {
  const batchId = uuidv4()
  const chNoi=cheltuieli.map(c=>({id:uuidv4(),batchId,categorie:c.categorie,suma:Math.abs(c.suma),data:c.data,descriere:`${c.label} — ${c.document}`,sursa:'emag',tip:c.tip,isNegativ:c.isNegativ,tara:c.tara||''}))
  const iNoi=incasari.map(i=>({id:uuidv4(),batchId,tip:i.tip,label:i.label,suma:i.suma,data:i.data,document:i.document,sursa:'emag',isNegativ:i.isNegativ,tara:i.tara||''}))
  await Promise.all([addCheltuieliBulk(chNoi), addIncasariBulk(iNoi)])
  await addImport({id:batchId, fisier:fisier||'eMAG Facturi', tip:'emag_facturi', tara:tara||'RO', data:new Date().toISOString().slice(0,10), countCheltuieli:chNoi.length, countIncasari:iNoi.length})
  return {cheltuieli:chNoi.length,incasari:iNoi.length}
}

async function doImportAds(credite, fisier) {
  const batchId = uuidv4()
  const noi=credite.map(p=>({id:uuidv4(),batchId,categorie:'Marketing',suma:p.valoare,data:p.data,descriere:`eMAG Ads — ${p.tip||'credit'}`,sursa:'emag_ads',tara:'RO'}))
  await addCheltuieliBulk(noi)
  await addImport({id:batchId, fisier:fisier||'eMAG Ads', tip:'emag_ads', data:new Date().toISOString().slice(0,10), countCheltuieli:noi.length})
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
  const cls={
    amber:'bg-amber-50 border-amber-200 text-amber-700',
    blue:'bg-blue-50 border-blue-200 text-blue-700',
    purple:'bg-purple-50 border-purple-200 text-purple-700',
    red:'bg-red-50 border-red-200 text-red-700',
    green:'bg-emerald-50 border-emerald-200 text-emerald-700',
    slate:'bg-slate-50 border-slate-200 text-slate-600',
  }
  return <div className={`p-3 rounded-lg border text-[11px] font-semibold ${cls[color]||cls.slate}`}>{children}</div>
}

// Componenta universală de import fișier (Excel/PDF) + formular manual
function SimpleImport({ categorie }) {
  const [mode, setMode] = useState('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Excel
  const [excelData, setExcelData] = useState(null)
  const [excelTara, setExcelTara] = useState('')

  // PDF
  const [pdfParsed, setPdfParsed] = useState(null)
  const [pdfData, setPdfData] = useState('')
  const [pdfSuma, setPdfSuma] = useState('')
  const [pdfDescriere, setPdfDescriere] = useState('')
  const [pdfTara, setPdfTara] = useState('')

  // Manual
  const [manData, setManData] = useState(new Date().toISOString().slice(0,10))
  const [manSuma, setManSuma] = useState('')
  const [manDescriere, setManDescriere] = useState('')
  const [manTara, setManTara] = useState('')
  const [manSaved, setManSaved] = useState(false)

  const [importCount, setImportCount] = useState(0)

  const handleFile = async (file) => {
    setLoading(true); setError('')
    try {
      const buf = await file.arrayBuffer()
      const arr = new Uint8Array(buf)
      const name = file.name.toLowerCase()

      if (name.endsWith('.pdf')) {
        const text = extractPDFTextRaw(arr)
        const parsed = parsePDFText(text)
        setPdfParsed({ ...parsed, fileName: file.name })
        setPdfData(parsed.date)
        setPdfSuma(parsed.total > 0 ? String(parsed.total) : '')
        setPdfDescriere(file.name.replace(/\.pdf$/i, ''))
        setMode('pdf')
      } else {
        const data = parseGenericExcel(arr)
        setExcelData({...data, fileName: file.name})
        setMode('excel')
      }
    } catch(e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const importExcel = async () => {
    const batchId = uuidv4()
    const noi = excelData.rows.map(r => ({
      id: uuidv4(), batchId, categorie, suma: r.suma, data: r.data,
      descriere: r.descriere || '', tara: excelTara, sursa: 'excel_import'
    }))
    await addCheltuieliBulk(noi)
    await addImport({id:batchId, fisier:excelData.fileName||'Excel', tip:'excel', categorie, tara:excelTara, data:new Date().toISOString().slice(0,10), countCheltuieli:noi.length})
    setImportCount(noi.length)
    setMode('done')
  }

  const importPDF = async () => {
    const s = parseFloat(pdfSuma)
    if (!s || s <= 0) { setError('Suma trebuie să fie mai mare ca 0.'); return }
    if (!pdfData) { setError('Completează data facturii.'); return }
    const batchId = uuidv4()
    await addCheltuiala({ id: uuidv4(), batchId, categorie, suma: s, data: pdfData, descriere: pdfDescriere, tara: pdfTara, sursa: 'pdf_import' })
    await addImport({id:batchId, fisier:pdfParsed?.fileName||'PDF', tip:'pdf', categorie, tara:pdfTara, data:new Date().toISOString().slice(0,10), countCheltuieli:1})
    setImportCount(1)
    setMode('done')
  }

  const importManual = async () => {
    const s = parseFloat(manSuma)
    if (!s || s <= 0) return
    await addCheltuiala({ id: uuidv4(), categorie, suma: s, data: manData, descriere: manDescriere, tara: manTara, sursa: 'manual' })
    setManSuma(''); setManDescriere(''); setManSaved(true)
    setTimeout(() => setManSaved(false), 2500)
  }

  const reset = () => { setMode('idle'); setExcelData(null); setPdfParsed(null); setError('') }

  if (mode === 'done') return (
    <DoneCard
      title={`${importCount} ${importCount === 1 ? 'cheltuială importată' : 'cheltuieli importate'} în ${categorie}`}
      stats={[['Înregistrări', importCount, 'text-orange-600']]}
      links={[['/cheltuieli', '→ Cheltuieli']]}
      onReset={reset}
    />
  )

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2"><AlertCircle size={13} className="shrink-0 mt-0.5"/>{error}</div>}

      {/* ── IDLE: drop zone ── */}
      {mode === 'idle' && (
        <DropZone onFile={handleFile} loading={loading} accept=".xlsx,.xls,.pdf"
          hint="Excel (.xlsx/.xls) sau PDF — toate cheltuielile merg la categoria curentă"/>
      )}

      {/* ── EXCEL preview ── */}
      {mode === 'excel' && excelData && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Rânduri', excelData.rows.length, 'text-slate-900'],
              ['Total', ron(excelData.rows.reduce((s,r)=>s+r.suma,0)), 'text-orange-600'],
              ['Categorie', categorie, 'text-slate-700'],
            ].map(([l,v,c]) => (
              <div key={l} className="card p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{l}</p>
                <p className={`text-sm font-black mt-1 ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          <InfoBox color="blue">
            Coloane detectate:{' '}
            {excelData.dateIdx >= 0 ? `Data="${excelData.headers[excelData.dateIdx]}"` : '⚠️ Data negăsită'}{' '}
            · {excelData.sumaIdx >= 0 ? `Sumă="${excelData.headers[excelData.sumaIdx]}"` : '⚠️ Sumă negăsită'}
            {excelData.descriereIdx >= 0 ? ` · Descriere="${excelData.headers[excelData.descriereIdx]}"` : ''}
          </InfoBox>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500">Piață:</span>
            {[['','Toate'],['RO','🇷🇴 RO'],['BG','🇧🇬 BG'],['HU','🇭🇺 HU']].map(([v,l]) => (
              <button key={v} onClick={() => setExcelTara(v)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${excelTara===v?'bg-orange-500 text-white border-orange-500':'bg-white text-slate-600 border-slate-200'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="table-header text-left px-3 py-2">Data</th>
                    <th className="table-header text-left px-3 py-2">Descriere</th>
                    <th className="table-header text-right px-3 py-2">Sumă</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.rows.map(r => (
                    <tr key={r._id} className="table-row">
                      <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{r.data || '—'}</td>
                      <td className="table-cell text-xs text-slate-700 max-w-xs truncate">{r.descriere || '—'}</td>
                      <td className="table-cell text-right font-mono text-xs font-bold text-slate-900">{ron(r.suma)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-3 py-2 text-xs font-bold text-slate-500" colSpan={2}>Total ({excelData.rows.length} rânduri)</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono text-xs">{ron(excelData.rows.reduce((s,r)=>s+r.suma,0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={reset}>← Alt fișier</button>
            <button className="btn-primary" onClick={importExcel}>
              <CheckCircle size={14}/> Importă {excelData.rows.length} rânduri → {categorie}
            </button>
          </div>
        </div>
      )}

      {/* ── PDF form ── */}
      {mode === 'pdf' && (
        <div className="space-y-3">
          {pdfParsed?.amounts.length > 0
            ? <InfoBox color="green">PDF procesat: {pdfParsed?.fileName} · Sume detectate: {pdfParsed.amounts.slice(0,6).map(a=>ron(a)).join(' · ')}</InfoBox>
            : <InfoBox color="amber">PDF procesat: {pdfParsed?.fileName} · Nu s-au detectat sume automat — completează manual.</InfoBox>
          }

          <div className="card p-5 max-w-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Data facturii</label>
                <input type="date" className="input w-full" value={pdfData} onChange={e=>setPdfData(e.target.value)}/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Sumă totală (RON)</label>
                <input type="number" className="input w-full" value={pdfSuma} onChange={e=>setPdfSuma(e.target.value)} step="0.01" min="0" placeholder="0.00"/>
              </div>
            </div>

            {pdfParsed?.amounts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Selectează suma din PDF:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {pdfParsed.amounts.slice(0,8).map((a,i) => (
                    <button key={i} onClick={() => setPdfSuma(String(a))}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${String(a) === pdfSuma ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300'}`}>
                      {ron(a)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Descriere</label>
              <input type="text" className="input w-full" value={pdfDescriere} onChange={e=>setPdfDescriere(e.target.value)} placeholder="ex: Factură mai 2025"/>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Piață</label>
              <select className="input w-full" value={pdfTara} onChange={e=>setPdfTara(e.target.value)}>
                <option value="">Toate piețele (comun)</option>
                <option value="RO">🇷🇴 România</option>
                <option value="BG">🇧🇬 Bulgaria</option>
                <option value="HU">🇭🇺 Ungaria</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button className="btn-secondary flex-1 justify-center" onClick={reset}>← Alt fișier</button>
              <button className="btn-primary flex-1 justify-center" onClick={importPDF}>
                <CheckCircle size={14}/> Salvează în {categorie}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formular manual (întotdeauna vizibil când nu e preview) ── */}
      {(mode === 'idle') && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Sau adaugă manual</p>
          <div className="card p-5 max-w-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Data</label>
                <input type="date" className="input w-full" value={manData} onChange={e=>setManData(e.target.value)}/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Sumă (RON)</label>
                <input type="number" className="input w-full" value={manSuma} onChange={e=>setManSuma(e.target.value)} placeholder="0.00" min="0" step="0.01"/>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Descriere</label>
              <input type="text" className="input w-full" value={manDescriere} onChange={e=>setManDescriere(e.target.value)} placeholder="ex: factură mai 2025"/>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Piață</label>
              <select className="input w-full" value={manTara} onChange={e=>setManTara(e.target.value)}>
                <option value="">Toate piețele (comun)</option>
                <option value="RO">🇷🇴 România</option>
                <option value="BG">🇧🇬 Bulgaria</option>
                <option value="HU">🇭🇺 Ungaria</option>
              </select>
            </div>
            <button className="btn-primary w-full justify-center" onClick={importManual}>
              {manSaved ? '✓ Adăugat în Cheltuieli' : <span className="flex items-center justify-center gap-2"><Plus size={14}/>Adaugă cheltuială</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LegendaFacturi({open, onToggle}) {
  const sectiuni = [
    { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', textColor:'#991b1b',
      titlu:'Cheltuieli — tu plătești',
      items:[{cod:'FC',desc:'Comision pe vânzări → Comisioane eMAG'},{cod:'FED',desc:'Comision Genius → Abonamente'},{cod:'FTIC',desc:'Transport cross-border → Transport'},{cod:'FCCO',desc:'Corecție comision → Comisioane eMAG'},{cod:'FY',desc:'Card cadou retur → Altele'}]},
    { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', textColor:'#14532d',
      titlu:'Reduc cheltuielile (valori negative)',
      items:[{cod:'FCS',desc:'Storno comision la retur'},{cod:'FCDP',desc:'Discount comision de la eMAG'}]},
    { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', textColor:'#1e3a8a',
      titlu:'Venituri — merg în Încasări',
      items:[{cod:'FV',desc:'Decont vouchere clienți'},{cod:'FVS',desc:'Storno decont vouchere'},{cod:'FHIC',desc:'Despăgubire produse deteriorate'}]},
    { color:'#94a3b8', bg:'#f8fafc', border:'#e2e8f0', textColor:'#475569',
      titlu:'Ignorate în import',
      items:[{cod:'FAACP',desc:'Avans credite reclame Ads'},{cod:'FACCP',desc:'Consum credite pre-paid Ads'},{cod:'FAPC',desc:'Storno avans reclame'},{cod:'FAPOF',desc:'Avans plată online intern'}]},
  ]
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-bold text-slate-800">📋 Legendă tipuri facturi eMAG</span>
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
        </div>
      )}
    </div>
  )
}

// Componenta reutilizabilă pentru import eMAG Facturi, filtrată pe tipuri
function EmagFacturiSection({ tipuriCheltuieli, showIncasari = false }) {
  const [efData, setEfData] = useState(null)
  const [efFileName, setEfFileName] = useState('')
  const [efTara, setEfTara] = useState('RO')
  const [efMoneda, setEfMoneda] = useState('RON')
  const [efCurs, setEfCurs] = useState(1)
  const [efResult, setEfResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const MONEDE = [
    {cod:'RON', label:'RON — Leu românesc', curs:1},
    {cod:'EUR', label:'EUR — Euro',          curs:5.05},
    {cod:'BGN', label:'BGN — Leva bulgară',  curs:2.58},
    {cod:'HUF', label:'HUF — Forint ungar',  curs:0.0135},
  ]
  const MONEDA_DEFAULT_TARA = {RO:'RON', BG:'EUR', HU:'HUF'}

  const handleFile = async (file) => {
    setLoading(true); setError('')
    try {
      const buf = await file.arrayBuffer()
      const result = parseEmagFacturi(new Uint8Array(buf))
      const monedaDefault = MONEDA_DEFAULT_TARA[result.tara]||'RON'
      setEfData(result); setEfFileName(file.name); setEfTara(result.tara)
      setEfMoneda(monedaDefault); setEfCurs(MONEDE.find(m=>m.cod===monedaDefault)?.curs||1)
      setEfResult(null)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  const cheltuieliFiltrate = efData ? efData.cheltuieli.filter(c => tipuriCheltuieli.includes(c.tip)) : []
  const incasariFiltrate = efData ? efData.incasari : []

  const doImport = async () => {
    const result = await doImportEF(
      cheltuieliFiltrate.map(c => ({...c, tara:efTara, suma:parseFloat((Math.abs(c.suma)*efCurs).toFixed(2))})),
      showIncasari ? incasariFiltrate.map(i => ({...i, tara:efTara, suma:parseFloat((i.suma*efCurs).toFixed(2))})) : [],
      efFileName, efTara
    )
    setEfResult(result)
  }

  if (efResult) return (
    <DoneCard title="eMAG Facturi importate!"
      stats={[['Cheltuieli',efResult.cheltuieli,'text-red-500'],['Încasări eMAG',efResult.incasari,'text-emerald-600']]}
      links={[['/cheltuieli','→ Cheltuieli'],['/incasari','→ Încasări eMAG']]}
      onReset={()=>{ setEfResult(null); setEfData(null) }}/>
  )

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{error}</div>}

      {!efData && <DropZone onFile={handleFile} loading={loading} accept=".xlsx,.xls" hint="Export facturi eMAG Seller (.xlsx)"/>}

      {efData && (
        <div className="space-y-4">
          <div className={`grid grid-cols-2 ${showIncasari ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-3`}>
            {[
              ['Cheltuieli', cheltuieliFiltrate.length, 'text-red-600'],
              ['Total cheltuieli', ron(cheltuieliFiltrate.reduce((s,c)=>s+Math.abs(c.suma),0)), 'text-slate-900'],
              ...(showIncasari ? [
                ['Încasări eMAG', incasariFiltrate.length, 'text-emerald-600'],
                ['Total încasări', ron(incasariFiltrate.reduce((s,i)=>s+i.suma,0)), 'text-emerald-600'],
              ] : []),
            ].map(([l,v,c]) => (
              <div key={l} className="card p-3"><p className="text-[10px] font-bold text-slate-400 uppercase">{l}</p><p className={`text-lg font-black mt-1 ${c}`}>{v}</p></div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[11px] font-bold text-red-700">Cheltuieli ({cheltuieliFiltrate.length})</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Piață:</span>
                <select value={efTara} onChange={e=>{const t=e.target.value;const m=MONEDA_DEFAULT_TARA[t]||'RON';setEfTara(t);setEfMoneda(m);setEfCurs(MONEDE.find(x=>x.cod===m)?.curs||1)}}
                  className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white">
                  <option value="RO">🇷🇴 România</option>
                  <option value="BG">🇧🇬 Bulgaria</option>
                  <option value="HU">🇭🇺 Ungaria</option>
                </select>
                <span className="text-[10px] text-slate-400">{efTara===efData.tara?'detectat automat':'modificat manual'}</span>
              </div>
              {efMoneda!=='RON'&&(
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={efMoneda} onChange={e=>{setEfMoneda(e.target.value);setEfCurs(MONEDE.find(m=>m.cod===e.target.value)?.curs||1)}}
                    className="text-[11px] font-bold border border-red-200 rounded-lg px-2 py-1 bg-red-50">
                    {MONEDE.map(m=><option key={m.cod} value={m.cod}>{m.label}</option>)}
                  </select>
                  <input type="number" step="0.0001" min="0.0001" value={efCurs} onChange={e=>setEfCurs(parseFloat(e.target.value)||1)}
                    className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 w-24 text-right"/>
                  <span className="text-[10px] text-slate-500">1 {efMoneda} = <strong>{efCurs} RON</strong></span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>{['Cod','Descriere','Data','Sumă cu TVA'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {cheltuieliFiltrate.map(c=>(
                    <tr key={c._id} className="table-row">
                      <td className="table-cell"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c.tip}</span></td>
                      <td className="table-cell text-xs text-slate-700">{c.label}</td>
                      <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{c.data}</td>
                      <td className={`table-cell text-right font-mono text-xs font-bold ${c.isNegativ?'text-emerald-600':'text-slate-900'}`}>{c.isNegativ?'-':''}{ron(Math.abs(c.suma))}</td>
                    </tr>
                  ))}
                  {cheltuieliFiltrate.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">Nicio factură de tipul selectat în fișier.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showIncasari && incasariFiltrate.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100"><p className="text-[11px] font-bold text-emerald-700">Încasări eMAG ({incasariFiltrate.length})</p></div>
              <div className="overflow-x-auto max-h-44 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>{['Cod','Descriere','Data','Sumă'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {incasariFiltrate.map(i=>(
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
            <button className="btn-primary" onClick={doImport} disabled={cheltuieliFiltrate.length===0&&(!showIncasari||incasariFiltrate.length===0)}>
              <CheckCircle size={14}/> Importă {cheltuieliFiltrate.length + (showIncasari ? incasariFiltrate.length : 0)} înregistrări
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ISTORIC IMPORTURI ────────────────────────────────────────

const TIP_INFO = {
  smartbill:    { label:'SmartBill',    color:'bg-blue-100 text-blue-700' },
  emag_facturi: { label:'eMAG Facturi', color:'bg-red-100 text-red-700' },
  emag_ads:     { label:'eMAG Ads',     color:'bg-orange-100 text-orange-700' },
  excel:        { label:'Excel',        color:'bg-slate-100 text-slate-700' },
  pdf:          { label:'PDF',          color:'bg-purple-100 text-purple-700' },
}

function IstoricImporturi({ importuri, onDelete }) {
  const [open, setOpen] = useState(false)
  const sorted = [...importuri].sort((a,b) => (b.data||'').localeCompare(a.data||''))
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={15}/> Istoric importuri ({importuri.length})</span>
        <span className="text-xs text-slate-400 font-semibold">{open ? 'Ascunde ▲' : 'Afișează ▼'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {sorted.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Niciun import înregistrat.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sorted.map(imp => {
                const info = TIP_INFO[imp.tip] || { label: imp.tip, color: 'bg-slate-100 text-slate-700' }
                const stats = []
                if (imp.countVanzari)   stats.push(`${imp.countVanzari} vânzări`)
                if (imp.countStorno)    stats.push(`${imp.countStorno} retururi`)
                if (imp.countProduse)   stats.push(`${imp.countProduse} produse noi`)
                if (imp.countCheltuieli) stats.push(`${imp.countCheltuieli} cheltuieli`)
                if (imp.countIncasari)  stats.push(`${imp.countIncasari} încasări`)
                return (
                  <div key={imp.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${info.color}`}>{info.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{imp.fisier}</p>
                      <p className="text-[10px] text-slate-400">{imp.data} · {stats.join(' · ')}{imp.tara ? ` · ${imp.tara}` : ''}</p>
                    </div>
                    <button onClick={() => onDelete(imp)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────

export default function ImportPage() {
  const [tab, setTab] = useState('comisioane')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [legendOpen, setLegendOpen] = useState(false)
  const [importuri, setImporturi] = useState([])

  const loadImporturi = async () => setImporturi(await getImporturi())
  useEffect(() => { loadImporturi() }, [])

  const handleDeleteImport = async (imp) => {
    if (!window.confirm(`Ștergi importul "${imp.fisier}"? Toate datele asociate vor fi șterse.`)) return
    if (imp.tip === 'smartbill') {
      await deleteByBatchId('vanzari', imp.id)
    } else if (imp.tip === 'emag_facturi') {
      await Promise.all([deleteByBatchId('cheltuieli', imp.id), deleteByBatchId('incasari', imp.id)])
    } else {
      await deleteByBatchId('cheltuieli', imp.id)
    }
    await deleteImport(imp.id)
    await loadImporturi()
  }

  // Vânzări (SmartBill)
  const [sbData, setSbData] = useState(null)
  const [sbNames, setSbNames] = useState({})
  const [sbEditing, setSbEditing] = useState(null)
  const [sbTemp, setSbTemp] = useState('')
  const [sbSubTab, setSbSubTab] = useState('normale')
  const [sbResult, setSbResult] = useState(null)

  // Marketing (eMAG Ads)
  const [adsData, setAdsData] = useState(null)
  const [adsResult, setAdsResult] = useState(null)

  const wrap = async(fn) => { setLoading(true); setError(''); try { await fn() } catch(e) { setError(e.message) } setLoading(false) }

  const handleSB = file => wrap(async() => {
    const buf = await file.arrayBuffer()
    const d = parseSmartBill(new Uint8Array(buf))
    setSbData({...d, fisier: file.name}); setSbResult(null)
    const n = {}; ;[...d.normale,...d.storno].forEach(r=>{n[r.cod||r.produs]=r.produs}); setSbNames(n)
  })

  const handleAds = file => wrap(async() => {
    const buf = await file.arrayBuffer()
    setAdsData({...parseEmagAds(new Uint8Array(buf)), fisier: file.name}); setAdsResult(null)
  })

  const getName = row => sbNames[row.cod||row.produs]||row.produs

  const TABS = [
    { id:'vanzari',    label:'Vânzări',        icon:FileText,   on:'bg-blue-50 text-blue-700' },
    { id:'marketing',  label:'Marketing',       icon:Megaphone,  on:'bg-orange-50 text-orange-700' },
    { id:'transport',  label:'Transport',       icon:Truck,      on:'bg-sky-50 text-sky-700' },
    { id:'comisioane', label:'Comisioane eMAG', icon:ShoppingBag,on:'bg-red-50 text-red-700' },
    { id:'abonamente', label:'Abonamente',      icon:CreditCard, on:'bg-purple-50 text-purple-700' },
    { id:'chirii',     label:'Chirii',          icon:Building2,  on:'bg-amber-50 text-amber-700' },
    { id:'altele',     label:'Altele',          icon:Package,    on:'bg-slate-100 text-slate-700' },
  ]

  return (
    <AppLayout>
      <Topbar title="Import" subtitle="Vânzări · Cheltuieli"/>
      <div className="p-6 max-w-5xl space-y-5">

        <div className="flex gap-2 flex-wrap">
          {TABS.map(({id,label,icon:Icon,on})=>(
            <button key={id} onClick={()=>{setTab(id);setError('')}}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab===id?`${on} border-transparent`:'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              <Icon size={15}/>{label}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"><AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0"/><p className="text-sm text-red-600">{error}</p></div>}

        {/* ═══ VÂNZĂRI (SmartBill) ═══ */}
        {tab==='vanzari' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Cum descarci din SmartBill:</p>
              <ol className="text-xs text-slate-500 space-y-1 ml-4 list-decimal">
                <li>SmartBill → <strong>Rapoarte → Vânzări pe produse</strong></li>
                <li>Selectează perioada → <strong>Export XLS</strong></li>
              </ol>
              <InfoBox color="blue">Se importă vânzările ca tranzacții + stornourile ca retururi separate. Produsele inexistente se creează automat. Taxele de livrare sunt ignorate.</InfoBox>
            </div>

            <div className="card p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600">Șterge vânzările SmartBill importate anterior (pentru reimport):</p>
              <button className="text-xs font-bold border border-red-200 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-all"
                onClick={async ()=>{
                  if(!window.confirm('Ștergi toate vânzările și retururile importate din SmartBill? Cheltuielile și încasările eMAG rămân intacte.')) return
                  await deleteVanzariBySursa(['smartbill','smartbill_storno'])
                  setSbData(null); setSbResult(null)
                  alert('Vânzările SmartBill au fost șterse.')
                }}>
                🗑 Șterge vânzări SmartBill
              </button>
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

                <div className={`p-3 rounded-xl border text-[11px] font-semibold space-y-1 ${sbData.cifColName?'bg-blue-50 border-blue-200 text-blue-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <p><strong>Coloana CIF detectată:</strong> {sbData.cifColName?`"${sbData.cifColName}"`:'⚠️ Nu s-a găsit nicio coloană CIF/CNP'}</p>
                  <p><strong>Firme detectate:</strong> {sbData.normale.filter(r=>/[a-zA-Z0-9]/.test((r.cif||'').trim())).length} din {sbData.normale.length} rânduri</p>
                  <p style={{opacity:0.6}}>Coloane fișier: {(sbData.headers||[]).slice(0,12).join(' · ')}</p>
                </div>

                <div className="flex gap-2">
                  {[['normale',`Vânzări (${sbData.normale.length})`],['storno',`Stornouri (${sbData.storno.length})`]].map(([v,l])=>(
                    <button key={v} onClick={()=>setSbSubTab(v)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${sbSubTab===v?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-[11px] text-slate-500 font-semibold">{sbSubTab==='storno'?'⚠️ Stornourile se importă separat ca retururi':'✓ Apasă pe produs pentru a edita numele'}</p>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>{['Produs (editabil)','Client','CIF/CNP','Județ','Țară','Data','Cant.','Valoare RON'].map(h=><th key={h} className="table-header text-left px-3 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {(sbSubTab==='normale'?sbData.normale:sbData.storno).slice(0,150).map(row=>{
                          const key=row.cod||row.produs
                          const isEd=sbEditing===key
                          const name=getName(row)
                          const firma=/[a-zA-Z0-9]/.test((row.cif||'').trim())
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
                              <td className="table-cell text-xs">
                                {row.cif?<span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${firma?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}`}>{firma?'🏢':'👤'} {row.cif}</span>:<span className="text-slate-300 text-[10px]">—</span>}
                              </td>
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
                  <button className="btn-primary" onClick={async ()=>setSbResult(await doImportSB(sbData.normale,sbData.storno,sbNames,sbData.fisier))}><CheckCircle size={14}/> Importă {sbData.normale.length+sbData.storno.length} rânduri</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ MARKETING ═══ */}
        {tab==='marketing' && (
          <div className="space-y-4">
            <SimpleImport categorie="Marketing"/>
          </div>
        )}

        {/* ═══ TRANSPORT ═══ */}
        {tab==='transport' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Import transport cross-border eMAG (FTIC):</p>
              <InfoBox color="blue">Încarcă exportul de facturi eMAG Seller — se vor importa doar facturile de tip <strong>FTIC</strong> (Comision transport cross-border) ca Transport.</InfoBox>
            </div>
            <EmagFacturiSection tipuriCheltuieli={EMAG_TRANSPORT} showIncasari={false}/>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Alte cheltuieli Transport (curierat, combustibil etc.)</p>
              <SimpleImport categorie="Transport"/>
            </div>
          </div>
        )}

        {/* ═══ COMISIOANE eMAG (eMAG Facturi) ═══ */}
        {tab==='comisioane' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Import facturi eMAG Seller:</p>
              <ol className="text-xs text-slate-500 space-y-1 ml-4 list-decimal">
                <li>eMAG Seller → <strong>Financiar → Facturi</strong></li>
                <li>Selectează perioada → <strong>Export Excel</strong></li>
              </ol>
              <InfoBox color="red">Se importă doar <strong>FC, FCS, FCCO, FCDP</strong> (comisioane propriu-zise) + Încasările FV/FVS/FHIC. Facturile FTIC → tab Transport · FED → tab Abonamente.</InfoBox>
            </div>

            <LegendaFacturi open={legendOpen} onToggle={()=>setLegendOpen(o=>!o)}/>

            <div className="card p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600">Șterge înregistrări importate greșit:</p>
              <div className="flex gap-2 flex-wrap">
                {[{tara:'BG',flag:'🇧🇬',label:'Bulgaria',color:'text-amber-700 border-amber-200 hover:bg-amber-50'},
                  {tara:'HU',flag:'🇭🇺',label:'Ungaria',color:'text-purple-700 border-purple-200 hover:bg-purple-50'}
                ].map(({tara,flag,label,color})=>(
                  <button key={tara} className={`text-xs font-bold border rounded-lg px-3 py-1.5 transition-all ${color}`}
                    onClick={async ()=>{
                      if(!window.confirm(`Ștergi toate cheltuielile eMAG ${label}? Încasările rămân.`)) return
                      await deleteCheltuieliEmagByTara(tara)
                      alert(`Cheltuielile eMAG ${label} au fost șterse.`)
                    }}>
                    {flag} Șterge eMAG {label}
                  </button>
                ))}
              </div>
            </div>

            <EmagFacturiSection tipuriCheltuieli={EMAG_COMISION} showIncasari={true}/>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Alte cheltuieli Comisioane (Excel / PDF)</p>
              <SimpleImport categorie="Comisioane eMAG"/>
            </div>
          </div>
        )}

        {/* ═══ ABONAMENTE ═══ */}
        {tab==='abonamente' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">Import abonament Genius eMAG (FED):</p>
              <InfoBox color="purple">Încarcă exportul de facturi eMAG Seller — se vor importa doar facturile de tip <strong>FED</strong> (Comision Genius) ca Abonamente.</InfoBox>
            </div>
            <EmagFacturiSection tipuriCheltuieli={EMAG_ABONAMENTE} showIncasari={false}/>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Alte abonamente (software, servicii etc.)</p>
              <SimpleImport categorie="Abonamente"/>
            </div>
          </div>
        )}

        {/* ═══ CHIRII ═══ */}
        {tab==='chirii' && (
          <div className="space-y-4">
            <SimpleImport categorie="Chirii"/>
          </div>
        )}

        {/* ═══ ALTELE ═══ */}
        {tab==='altele' && (
          <div className="space-y-4">
            <SimpleImport categorie="Altele"/>
          </div>
        )}

        <IstoricImporturi importuri={importuri} onDelete={handleDeleteImport}/>

      </div>
    </AppLayout>
  )
}
