'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay mobil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(28,28,26,0.45)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-h-screen md:ml-56">
        {/* Header mobil cu hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-20"
          style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #E8E0D4', backdropFilter: 'blur(8px)' }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ padding: '6px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Menu size={22} color="#1C1C1A" />
          </button>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 19, fontWeight: 500, letterSpacing: '0.08em', color: '#1C1C1A' }}>
            BARRANO
          </span>
        </div>

        {children}
      </main>
    </div>
  )
}
