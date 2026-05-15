import { getRank } from '../utils.js'

export default function LevelUpScreen({ level, onDismiss }) {
  const rank = getRank(level)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Glow rings */}
      <div style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,200,0.12) 0%, transparent 70%)',
        animation: 'glowPulse 2s ease-in-out infinite',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', textAlign: 'center',
        animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        {/* Crown */}
        <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}
          className="icon-glow">
          👑
        </div>

        {/* LEVEL UP text */}
        <div className="shimmer-text" style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          fontWeight: 800, letterSpacing: 6, marginBottom: 8,
        }}>
          LEVEL UP!
        </div>

        {/* Level number */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 72, fontWeight: 900,
          color: 'var(--cyan)', lineHeight: 1,
          textShadow: '0 0 40px rgba(0,212,200,0.6)',
          marginBottom: 4,
          animation: 'levelBurst 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          {level}
        </div>

        {/* Level label */}
        <div style={{
          fontFamily: 'var(--font-ar)', fontSize: 18,
          color: 'var(--text2)', marginBottom: 20,
        }}>
          مستوى {level}
        </div>

        {/* Rank badge */}
        {rank && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: rank.bg || rank.color + '20',
            border: `1px solid ${rank.color}50`,
            borderRadius: 24, padding: '8px 20px',
            marginBottom: 32,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 800,
              fontSize: 14, color: rank.color,
            }}>{rank.tier}</span>
            <span style={{
              fontFamily: 'var(--font-ar)', fontWeight: 700,
              fontSize: 16, color: rank.color,
            }}>{rank.label}</span>
          </div>
        )}

        {/* Dismiss button */}
        <div>
          <button
            onClick={onDismiss}
            className="btn-cyan"
            style={{ maxWidth: 240, margin: '0 auto' }}
          >
            استمر 💪
          </button>
        </div>
      </div>
    </div>
  )
}
