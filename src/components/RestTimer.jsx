import { useState, useEffect, useRef } from 'react'
import { Card, Overlay, CloseBtn } from './ui.jsx'
import { playBeep } from '../utils.js'
import { REST_PRESETS } from '../constants.js'

export default function RestTimer({ onClose }) {
  const [selected, setSelected] = useState(90)
  const [remaining, setRemaining] = useState(null)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000)
    } else if (remaining === 0 && running) {
      setRunning(false)
      playBeep(4)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, remaining])

  const start = (t) => {
    clearInterval(intervalRef.current)
    const time = t !== undefined ? t : selected
    setSelected(time)
    setRemaining(time)
    setRunning(true)
  }
  const pause  = () => { setRunning(false); clearInterval(intervalRef.current) }
  const resume = () => setRunning(true)
  const reset  = () => { pause(); setRemaining(null) }

  const pct  = remaining !== null ? remaining / selected : 1
  const R    = 54; const CX = 70; const CY = 70
  const circ = 2 * Math.PI * R
  const dash = circ * pct
  const done = remaining === 0
  const displaySecs = remaining !== null ? remaining : selected
  const mins = Math.floor(displaySecs / 60)
  const secs = displaySecs % 60

  return (
    <Overlay onClose={onClose} align="center">
      <Card style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 17, fontWeight: 800 }}>⏱️ استراحة</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              راحة بين السيتات
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        {/* SVG Ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg width={140} height={140} viewBox="0 0 140 140">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border2)" strokeWidth={10} />
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={done ? 'var(--green)' : 'var(--cyan)'}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - dash}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            <text
              x={CX} y={CY + 8}
              textAnchor="middle"
              fill={done ? '#22C55E' : 'var(--text)'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700 }}
            >
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </text>
            {done && (
              <text x={CX} y={CY + 28} textAnchor="middle" fill="#22C55E"
                style={{ fontSize: 11, fontFamily: 'var(--font-ar)', fontWeight: 700 }}>
                خلصت! 🎉
              </text>
            )}
          </svg>
        </div>

        {/* Preset Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          {REST_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => start(p)}
              style={{
                background: selected === p ? 'var(--cyan-lo)' : 'var(--bg2)',
                border: `1px solid ${selected === p ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: 8, padding: '7px 10px',
                color: selected === p ? 'var(--cyan)' : 'var(--text3)',
                fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >{p < 60 ? `${p}s` : `${p / 60}m`}</button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {remaining === null && (
            <button
              className="btn-cyan"
              onClick={() => start()}
              style={{ fontSize: 15 }}
            >▶ ابدأ</button>
          )}
          {running && (
            <button
              onClick={pause}
              style={{
                background: 'var(--red-lo)', border: '1px solid var(--red-md)',
                borderRadius: 10, padding: '11px 20px',
                color: 'var(--red)', fontFamily: 'var(--font-ar)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >⏸ إيقاف</button>
          )}
          {!running && remaining !== null && remaining > 0 && (
            <button
              className="btn-cyan"
              onClick={resume}
              style={{ fontSize: 15, flex: 1 }}
            >▶ استمر</button>
          )}
          {remaining !== null && (
            <button
              onClick={reset}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 10, padding: '11px 20px',
                color: 'var(--text2)', fontFamily: 'var(--font-ar)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >↺ إعادة</button>
          )}
          {done && (
            <button
              onClick={onClose}
              style={{
                background: 'var(--green-lo)', border: '1px solid #22C55E50',
                borderRadius: 10, padding: '11px 20px',
                color: 'var(--green)', fontFamily: 'var(--font-ar)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >✓ تمام</button>
          )}
        </div>
      </Card>
    </Overlay>
  )
}
