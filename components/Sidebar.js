'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Receipt, Users, BarChart3, FileUp, TrendingUp } from 'lucide-react'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/produse',    label: 'Produse',        icon: Package },
  { href: '/vanzari',    label: 'Vânzări',        icon: ShoppingCart },
  { href: '/cheltuieli', label: 'Cheltuieli',     icon: Receipt },
  { href: '/clienti',    label: 'Clienți',        icon: Users },
  { href: '/analiza',    label: 'Analiză',        icon: BarChart3 },
]

const extraItems = [
  { href: '/incasari', label: 'Încasări eMAG', icon: TrendingUp },
  { href: '/import',   label: 'Import date',   icon: FileUp },
]

// BR Monogram SVG — inspired by the product engraving
function BRMonogram() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#1C1C1A"/>
      {/* B */}
      <text
        x="5.5"
        y="25"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="20"
        fontWeight="400"
        fontStyle="italic"
        fill="#F5F0E8"
        letterSpacing="-1"
      >BR</text>
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const active = (href) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100%', width: 220,
      background: '#FFFFFF',
      borderRight: '1px solid #E8E0D4',
      display: 'flex', flexDirection: 'column', zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #F0EAE0',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <BRMonogram />
        <div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '0.12em',
            color: '#1C1C1A',
            lineHeight: 1,
          }}>
            BARRANO
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.18em',
            color: '#C4A882',
            marginTop: 3,
            textTransform: 'uppercase',
          }}>
            Management intern
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: '#C4A882',
          textTransform: 'uppercase', letterSpacing: '0.14em',
          padding: '0 12px', marginBottom: 8,
        }}>
          Navigare
        </div>

        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = active(href)
          return (
            <Link key={href} href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                marginBottom: 2, textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                letterSpacing: '0.01em',
                background: isActive ? '#1C1C1A' : 'transparent',
                color: isActive ? '#F5F0E8' : '#6B6B67',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background='#F5F0E8'; e.currentTarget.style.color='#1C1C1A' } }}
              onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#6B6B67' } }}
            >
              <Icon size={15} strokeWidth={isActive ? 2 : 1.6}/>
              {label}
            </Link>
          )
        })}

        {/* Separator */}
        <div style={{ margin: '16px 0 12px', borderTop: '1px solid #F0EAE0' }}/>

        <div style={{
          fontSize: 9, fontWeight: 600, color: '#C4A882',
          textTransform: 'uppercase', letterSpacing: '0.14em',
          padding: '0 12px', marginBottom: 8,
        }}>
          eMAG & Import
        </div>

        {extraItems.map(({ href, label, icon: Icon }) => {
          const isActive = active(href)
          return (
            <Link key={href} href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                marginBottom: 2, textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                letterSpacing: '0.01em',
                background: isActive ? '#1C1C1A' : 'transparent',
                color: isActive ? '#F5F0E8' : '#6B6B67',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background='#F5F0E8'; e.currentTarget.style.color='#1C1C1A' } }}
              onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#6B6B67' } }}
            >
              <Icon size={15} strokeWidth={isActive ? 2 : 1.6}/>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid #F0EAE0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#EDE5D8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 13, fontWeight: 500, color: '#1C1C1A', fontStyle: 'italic',
        }}>
          A
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#1C1C1A' }}>Activ Mag S.R.L.</div>
          <div style={{ fontSize: 9, color: '#C4A882', marginTop: 1, letterSpacing: '0.05em' }}>© 2025</div>
        </div>
      </div>
    </aside>
  )
}
