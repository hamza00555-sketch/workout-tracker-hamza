import { useEffect, useState } from 'react'

// Build time is injected by Vite at build (see vite.config.js).
// Falls back to "dev" when running the dev server without the define.
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null
const APP_VERSION = 'v1.0.0'

function fmtBuild(iso) {
  if (!iso) return 'وضع التطوير'
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${date} · ${time}`
  } catch {
    return iso
  }
}

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1900)   // start fade-out
    const t2 = setTimeout(() => onDone(), 2300)           // unmount after fade
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(circle at 50% 35%, #1a1030 0%, var(--bg) 70%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: leaving ? 'none' : 'all',
      }}
    >
      {/* Rotating glow ring behind the logo */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <div style={{
          position: 'absolute',
          width: 160, height: 160, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, var(--cyan), transparent 60%)',
          animation: 'spin 2.4s linear infinite',
          filter: 'blur(8px)', opacity: 0.55,
        }} />
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: 'var(--bg2)',
          border: '2px solid var(--cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 58,
          boxShadow: '0 0 40px rgba(155,92,255,0.45)',
          animation: 'scaleIn 0.5s ease',
        }}>
          ⚔️
        </div>
      </div>

      {/* App name */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14,
        letterSpacing: 8, color: 'var(--cyan)',
        marginBottom: 8, animation: 'fadeUp 0.6s ease',
      }}>
        HAMZAFIT
      </div>
      <div style={{
        fontFamily: 'var(--font-ar)', fontSize: 15,
        color: 'var(--text2)', marginBottom: 26,
        animation: 'fadeUp 0.8s ease',
      }}>
        ارفع مستواك · كل تمرين خطوة
      </div>

      {/* Loading bar */}
      <div style={{
        width: 140, height: 4, borderRadius: 4,
        background: 'var(--bg3)', overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          height: '100%', borderRadius: 4,
          background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
          animation: 'splashBar 1.9s ease forwards',
        }} />
      </div>

      {/* Version + build marker — confirms which build is live */}
      <div style={{
        position: 'absolute', bottom: 'calc(var(--safe-bottom) + 24px)',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text3)', lineHeight: 1.7,
        animation: 'fadeIn 1s ease',
      }}>
        <div style={{ color: 'var(--cyan)' }}>{APP_VERSION}</div>
        <div>الإصدار · {fmtBuild(BUILD_TIME)}</div>
      </div>

      {/* Local keyframes for the loading bar */}
      <style>{`
        @keyframes splashBar {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )
}
