'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt,
  Users, BarChart3, Zap
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produse', label: 'Produse', icon: Package },
  { href: '/vanzari', label: 'Vânzări', icon: ShoppingCart },
  { href: '/cheltuieli', label: 'Cheltuieli', icon: Receipt },
  { href: '/clienti', label: 'Clienți', icon: Users },
  { href: '/analiza', label: 'Analiză', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-slate-200 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white fill-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 leading-none">BARRANO</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Management intern</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">Navigare</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-[10px] text-slate-400 text-center">
          © 2025 Activ Mag S.R.L.
        </div>
      </div>
    </aside>
  )
}
