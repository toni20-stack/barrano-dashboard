# Barrano Dashboard — Context proiect

## Ce face aplicația
Dashboard financiar pentru **Activ Mag S.R.L.** — management vânzări eMAG pe 3 piețe: România (RO), Bulgaria (BG), Ungaria (HU).
Stack: Next.js 14 + React 18, date stocate în localStorage, import Excel cu librăria xlsx.

## Regulă push
Când userul spune „push": generează mesajul din context și rulează direct `bash push.sh "mesaj"` — fără să întrebi.

## Business logic esențial

### Vânzări
- **SmartBill = vânzări eMAG** — SmartBill emite facturile pentru comenzile eMAG, nu sunt vânzări separate.
- **Stornouri = retururi** — importate cu `isStorno: true`, separate de vânzările normale în UI, scad din total.
- Canal disponibil: doar `emag` și `site` (altele a fost eliminat).

### Comision eMAG
- **Comisionul real vine exclusiv din FC-urile** importate din eMAG Facturi (salvate ca cheltuieli, categoria "Comisioane eMAG RO/BG/HU").
- La import SmartBill: `aplicaComision: false, comisionEmag: 0` — nu se estimează 26%.
- **Nu dubla contabiliza**: dacă aplici % pe vânzări ȘI imporți FC ca cheltuieli, comisionul e scăzut de două ori.

### Piețe și monede
- Bulgaria a trecut la **EUR** (nu BGN) — moneda default BG = EUR.
- Ungaria folosește **HUF**.
- Cursurile valutare se introduc **manual** la import (nu există API BNR integrat).
- Cheltuielile fără `tara` setată = comune, tratate ca RO în filtre.

### Distribuție cheltuieli pe piețe
- Cheltuielile cu `tara` setată = specifice pieței respective.
- Cheltuielile fără `tara` = distribuite proporțional cu vânzările per piață în calcule dashboard.

## Fluxul corect de import (ordinea contează)
1. **eMAG Facturi** (FC → cheltuieli comision real; FV → încasări eMAG)
2. **SmartBill** (vânzări normale + stornouri/retururi)
3. **eMAG Ads** (opțional — credite pre-paid → cheltuieli Marketing)

## Structura datelor (localStorage)
```
barrano_produse    — catalog produse cu costuri detaliate
barrano_vanzari    — vânzări + stornouri (isStorno: true pentru retururi)
barrano_cheltuieli — cheltuieli cu câmpul tara (RO/BG/HU sau gol)
barrano_incasari   — încasări eMAG (FV/FVS)
```

## Pagini și separare RO/BG/HU
Toate paginile au filtru piață: `Toate / 🇷🇴 România / 🇧🇬 Bulgaria / 🇭🇺 Ungaria`.
- **Dashboard** — 3 panouri separate cu KPI-uri per piață
- **Vânzări** — tab Vânzări / tab Retururi; KPI-uri nete (brute - retururi)
- **Cheltuieli** — filtru piață, cheltuielile fără tara intră la RO
- **Clienți** — tab Clienți / tab Retururi (urban/rural, județe, clienți repetitivi, gen estimat)
- **Analiză** — tab Performanță / tab Retururi (cu distribuție geografică retururi)
- **Import** — 3 taburi: SmartBill / eMAG Facturi / eMAG Ads

## Tipuri documente eMAG
- **Cheltuieli**: FC, FCCO, FCS, FCDP, FED, FY, FTIC, FHIC
- **Încasări**: FV, FVS, FHIC
- **Ignorate**: FAACP, FACCP, FAPC, FAPOF (avansuri reclame Ads)

## Preferințe comunicare
- Răspunde **doar în română**.
- Răspunsuri scurte și directe.
