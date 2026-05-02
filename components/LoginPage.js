'use client'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function LoginPage({ children }) {
  const [autentificat, setAutentificat] = useState(false)
  const [parola,       setParola]       = useState('')
  const [eroare,       setEroare]       = useState(false)
  const [afiseaza,     setAfiseaza]     = useState(false)
  const [verificat,    setVerificat]    = useState(false)

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

  if (!verificat) return null
  if (autentificat) return children

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F0E8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E8E0D4',
        padding: '44px 40px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 4px 40px rgba(28,28,26,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52,
            background: '#1C1C1A',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 22, fontStyle: 'italic', fontWeight: 400,
              color: '#F5F0E8', letterSpacing: '-1px',
            }}>BR</span>
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22, fontWeight: 500,
            letterSpacing: '0.14em', color: '#1C1C1A',
          }}>
            BARRANO
          </div>
          <div style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: '0.2em', color: '#C4A882',
            textTransform: 'uppercase', marginTop: 4,
          }}>
            Management intern
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1C1C1A', marginBottom: 4 }}>Bună ziua</div>
          <div style={{ fontSize: 13, color: '#6B6B67', lineHeight: 1.5 }}>Introduceți parola pentru a accesa panoul de control.</div>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 600,
            color: '#C4A882', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 8,
          }}>Parolă</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <Lock size={14} color="#C4A882"/>
            </div>
            <input
              type={afiseaza ? 'text' : 'password'}
              value={parola}
              onChange={e => { setParola(e.target.value); setEroare(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Introduceți parola..."
              autoFocus
              style={{
                width: '100%', padding: '11px 40px',
                border: `1px solid ${eroare ? '#dc2626' : '#E8E0D4'}`,
                borderRadius: 10, fontSize: 13,
                background: eroare ? '#fef2f2' : '#FAFAF8',
                color: '#1C1C1A', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button onClick={() => setAfiseaza(!afiseaza)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              {afiseaza ? <EyeOff size={14} color="#C4A882"/> : <Eye size={14} color="#C4A882"/>}
            </button>
          </div>
          {eroare && (
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>Parolă incorectă. Încearcă din nou.</div>
          )}
        </div>

        {/* Button */}
        <button onClick={handleLogin}
          style={{
            width: '100%', padding: 13,
            background: '#1C1C1A', color: '#F5F0E8',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            letterSpacing: '0.06em', cursor: 'pointer',
          }}>
          Intră în aplicație
        </button>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: '#C4A882', letterSpacing: '0.05em' }}>
          © 2025 Activ Mag S.R.L.
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap');`}</style>
    </div>
  )
}
