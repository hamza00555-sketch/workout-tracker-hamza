import { useEffect } from 'react'

export default function SystemAlert({ alerts, onRemove }) {
  useEffect(() => {
    if (!alerts.length) return
    const latest = alerts[alerts.length - 1]
    const timer = setTimeout(() => onRemove(latest.id), 3000)
    return () => clearTimeout(timer)
  }, [alerts, onRemove])

  if (!alerts.length) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%',
      transform: 'translateX(-50%)',
      width: '100%', maxWidth: 560,
      zIndex: 900,
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '8px 12px 0',
      pointerEvents: 'none',
    }}>
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="slide-down"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            pointerEvents: 'all',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{alert.icon}</span>
          <span style={{
            fontFamily: 'var(--font-ar)', fontSize: 14,
            color: 'var(--text)', flex: 1,
          }}>{alert.msg}</span>
          <button
            onClick={() => onRemove(alert.id)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text3)', fontSize: 18,
              cursor: 'pointer', lineHeight: 1, padding: 2,
            }}
          >×</button>
        </div>
      ))}
    </div>
  )
}
