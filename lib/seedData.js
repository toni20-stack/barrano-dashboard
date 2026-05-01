// lib/seedData.js
// Date demo pentru Barrano

export const SEED_PRODUSE = [
  {
    id: 'p1',
    numeProducator: 'Aroma Diffuser Co. CN-300',
    numeBarrano: 'Difuzor Barrano Noir 300ml',
    costAchizitie: 28.50,
    transport: 8.85,
    taxeVamale: 1.43,
    ambalaj: 4.20,
    componente: [
      { id: 'c1a', nume: 'Etichetă premium', suma: 1.50 },
      { id: 'c1b', nume: 'Cutie cadou', suma: 3.00 },
    ],
    pretVanzare: 119,
    createdAt: '2024-11-01',
  },
  {
    id: 'p2',
    numeProducator: 'Nail Clipper Factory NC-07',
    numeBarrano: 'Set Unghiere Barrano Pro',
    costAchizitie: 6.80,
    transport: 2.11,
    taxeVamale: 0.34,
    ambalaj: 1.50,
    componente: [
      { id: 'c2a', nume: 'Pungă catifea', suma: 0.80 },
    ],
    pretVanzare: 47,
    createdAt: '2024-11-01',
  },
  {
    id: 'p3',
    numeProducator: 'Copper Cup Trading CU-500',
    numeBarrano: 'Cană Cupru Ayurvedic 500ml',
    costAchizitie: 18.40,
    transport: 5.71,
    taxeVamale: 0.92,
    ambalaj: 3.00,
    componente: [
      { id: 'c3a', nume: 'Card wellness', suma: 0.50 },
      { id: 'c3b', nume: 'Pungă iută', suma: 2.50 },
    ],
    pretVanzare: 119,
    createdAt: '2024-11-15',
  },
  {
    id: 'p4',
    numeProducator: 'Perfume Oil Factory PO-50',
    numeBarrano: 'Ulei Parfumat Barrano Oud 50ml',
    costAchizitie: 12.00,
    transport: 3.72,
    taxeVamale: 0.60,
    ambalaj: 2.80,
    componente: [
      { id: 'c4a', nume: 'Pipetă dropper', suma: 1.20 },
    ],
    pretVanzare: 89,
    createdAt: '2024-12-01',
  },
]

export const SEED_VANZARI = [
  // Ianuarie 2025
  { id: 'v1', produsId: 'p1', cantitate: 12, pretUnitar: 119, data: '2025-01-05', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Ilfov', oras: 'Voluntari', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v2', produsId: 'p2', cantitate: 30, pretUnitar: 47, data: '2025-01-08', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Cluj', oras: 'Cluj-Napoca', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v3', produsId: 'p3', cantitate: 5, pretUnitar: 119, data: '2025-01-12', canal: 'site', aplicaComision: false, comisionEmag: 0, judet: 'Timiș', oras: 'Timișoara', mediu: 'urban', tipClient: 'firma' },
  { id: 'v4', produsId: 'p4', cantitate: 8, pretUnitar: 89, data: '2025-01-18', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Prahova', oras: 'Ploiești', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v5', produsId: 'p1', cantitate: 7, pretUnitar: 119, data: '2025-01-22', canal: 'site', aplicaComision: false, comisionEmag: 0, judet: 'Constanța', oras: 'Constanța', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v6', produsId: 'p2', cantitate: 15, pretUnitar: 47, data: '2025-01-25', canal: 'altele', aplicaComision: false, comisionEmag: 0, judet: 'Iași', oras: 'Iași', mediu: 'urban', tipClient: 'firma' },
  // Februarie 2025
  { id: 'v7', produsId: 'p3', cantitate: 18, pretUnitar: 119, data: '2025-02-03', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Bucuresti', oras: 'Sector 1', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v8', produsId: 'p1', cantitate: 9, pretUnitar: 119, data: '2025-02-10', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Bihor', oras: 'Oradea', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v9', produsId: 'p4', cantitate: 12, pretUnitar: 89, data: '2025-02-14', canal: 'site', aplicaComision: false, comisionEmag: 0, judet: 'Mureș', oras: 'Târgu Mureș', mediu: 'urban', tipClient: 'firma' },
  { id: 'v10', produsId: 'p2', cantitate: 22, pretUnitar: 47, data: '2025-02-20', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Dolj', oras: 'Craiova', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v11', produsId: 'p3', cantitate: 6, pretUnitar: 119, data: '2025-02-25', canal: 'altele', aplicaComision: false, comisionEmag: 0, judet: 'Suceava', oras: 'Suceava', mediu: 'urban', tipClient: 'firma' },
  // Martie 2025
  { id: 'v12', produsId: 'p1', cantitate: 20, pretUnitar: 119, data: '2025-03-05', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Ilfov', oras: 'Buftea', mediu: 'rural', tipClient: 'persoana_fizica' },
  { id: 'v13', produsId: 'p3', cantitate: 25, pretUnitar: 119, data: '2025-03-10', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Cluj', oras: 'Florești', mediu: 'rural', tipClient: 'persoana_fizica' },
  { id: 'v14', produsId: 'p2', cantitate: 40, pretUnitar: 47, data: '2025-03-15', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Timiș', oras: 'Timișoara', mediu: 'urban', tipClient: 'firma' },
  { id: 'v15', produsId: 'p4', cantitate: 15, pretUnitar: 89, data: '2025-03-20', canal: 'site', aplicaComision: false, comisionEmag: 0, judet: 'Brasov', oras: 'Brașov', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v16', produsId: 'p1', cantitate: 10, pretUnitar: 119, data: '2025-03-28', canal: 'altele', aplicaComision: false, comisionEmag: 0, judet: 'Galați', oras: 'Galați', mediu: 'urban', tipClient: 'firma' },
  // Aprilie 2025
  { id: 'v17', produsId: 'p3', cantitate: 30, pretUnitar: 119, data: '2025-04-08', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Bucuresti', oras: 'Sector 3', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v18', produsId: 'p1', cantitate: 14, pretUnitar: 119, data: '2025-04-15', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Constanța', oras: 'Mangalia', mediu: 'urban', tipClient: 'persoana_fizica' },
  { id: 'v19', produsId: 'p2', cantitate: 50, pretUnitar: 47, data: '2025-04-20', canal: 'emag', aplicaComision: true, comisionEmag: 26, judet: 'Iași', oras: 'Iași', mediu: 'urban', tipClient: 'firma' },
  { id: 'v20', produsId: 'p4', cantitate: 20, pretUnitar: 89, data: '2025-04-25', canal: 'site', aplicaComision: false, comisionEmag: 0, judet: 'Bihor', oras: 'Oradea', mediu: 'urban', tipClient: 'persoana_fizica' },
]

export const SEED_CHELTUIELI = [
  { id: 'ch1', categorie: 'Marketing', suma: 800, data: '2025-01-05', descriere: 'Campanie Google Ads ianuarie' },
  { id: 'ch2', categorie: 'Logistică', suma: 350, data: '2025-01-10', descriere: 'Curierat & ambalaje' },
  { id: 'ch3', categorie: 'Abonamente', suma: 120, data: '2025-01-15', descriere: 'Shopify + Make.com + SmartBill' },
  { id: 'ch4', categorie: 'Marketing', suma: 1200, data: '2025-02-03', descriere: 'Campanie eMAG Ads + Instagram' },
  { id: 'ch5', categorie: 'Logistică', suma: 420, data: '2025-02-08', descriere: 'Depozitare & transport intern' },
  { id: 'ch6', categorie: 'Abonamente', suma: 120, data: '2025-02-15', descriere: 'Shopify + Make.com + SmartBill' },
  { id: 'ch7', categorie: 'Altele', suma: 250, data: '2025-02-20', descriere: 'Contabilitate lunară' },
  { id: 'ch8', categorie: 'Marketing', suma: 1500, data: '2025-03-05', descriere: 'Campanie luna mart — Google + eMAG' },
  { id: 'ch9', categorie: 'Logistică', suma: 580, data: '2025-03-12', descriere: 'Curierat Fan Courier' },
  { id: 'ch10', categorie: 'Abonamente', suma: 120, data: '2025-03-15', descriere: 'Shopify + Make.com + SmartBill' },
  { id: 'ch11', categorie: 'Marketing', suma: 1800, data: '2025-04-02', descriere: 'TikTok Ads + influenceri' },
  { id: 'ch12', categorie: 'Logistică', suma: 620, data: '2025-04-10', descriere: 'Curierat & retururi' },
  { id: 'ch13', categorie: 'Abonamente', suma: 120, data: '2025-04-15', descriere: 'Shopify + Make.com + SmartBill' },
  { id: 'ch14', categorie: 'Altele', suma: 400, data: '2025-04-20', descriere: 'Fotografie produs studio' },
]
