'use client'
import { useState, useEffect } from 'react'
import { Zap, Eye, EyeOff, Lock } from 'lucide-react'

export default function LoginPage({ children }) {
  const [autentificat, setAutentificat] = useState(false)
  const [parola, setParola] = useState('')
  const [eroare, setEroare] = useState(false)
  const [afiseaza, setAfiseaza] = useState(false)
  const [verificat, setVerificat] = useState(false)

  useEffect(() => {
    const session = sessionStorage.getItem('barrano_auth')
    if (session === 'true') setAutentificat(true)
    setVerificat(true)
  }, [])

  const handleLogin = () => {
    if (parola === 'salam123') {
      sessionStorage.setItem('barrano_auth', 'true')
      setAutentificat(true)
      setEroare(false)
    } else {
      setEroare(true)
      setParola('')
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  if (!verificat) return null
  if (autentificat) return children

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, border: '1.5px solid #e2e8f0',
        padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: '#f97316', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', letterSpacing: '.5px' }}>BARRANO</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Management intern</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Bună ziua</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Introduceți parola pentru a accesa panoul de control.</div>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            color: '#64748b', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8
          }}>Parolă</label>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)'
            }}>
              <Lock size={15} color="#94a3b8" />
            </div>
            <input
              type={afiseaza ? 'text' : 'password'}
              value={parola}
              onChange={e => { setParola(e.target.value); setEroare(false) }}
              onKeyDown={handleKey}
              placeholder="Introduceți parola..."
              autoFocus
              style={{
                width: '100%', padding: '12px 44px 12px 40px',
                border: `1.5px solid ${eroare ? '#ef4444' : '#e2e8f0'}`,
                borderRadius: 12, fontSize: 14, outline: 'none',
                background: eroare ? '#fef2f2' : '#fff',
                color: '#1e293b', boxSizing: 'border-box',
                transition: 'border-color .15s'
              }}
            />
            <button
              onClick={() => setAfiseaza(!afiseaza)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4
              }}
            >
              {afiseaza ? <EyeOff size={15} color="#94a3b8" /> : <Eye size={15} color="#94a3b8" />}
            </button>
          </div>
          {eroare && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 500 }}>
              Parolă incorectă. Încearcă din nou.
            </div>
          )}
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%', padding: '13px', background: '#f97316',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'background .15s'
          }}
          onMouseOver={e => e.target.style.background = '#ea580c'}
          onMouseOut={e => e.target.style.background = '#f97316'}
        >
          Intră în aplicație
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#cbd5e1' }}>
          © 2025 Activ Mag S.R.L. · Acces restricționat
        </div>
      </div>
    </div>
  )
}
