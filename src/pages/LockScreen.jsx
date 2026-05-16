import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { hashPin, isBiometricAvailable, authenticateBiometric } from '../utils/notifications.js';

function FingerprintIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 17.5c1-.5 3-2 3-5.5"/>
      <path d="M20 13c.5 2 .5 4-1 6"/>
      <path d="M6 14a11.93 11.93 0 0 0 .5 5"/>
      <path d="M8.5 10.5a5.48 5.48 0 0 1 1.5-1.93"/>
      <circle cx="12" cy="12" r="10" opacity=".15" fill="currentColor" stroke="none"/>
    </svg>
  );
}

const NUMPAD = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

export default function LockScreen() {
  const { settings, unlock } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    const credId = localStorage.getItem('ratebi-biometric-id');
    if (settings.biometricEnabled && credId) {
      isBiometricAvailable().then(ok => {
        if (ok) { setHasBiometric(true); triggerBiometric(); }
      });
    }
  }, []);

  const triggerBiometric = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) { unlock(); } else { setError(''); }
  }, [unlock]);

  const addDigit = useCallback(async (d) => {
    if (shaking) return;
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    setError('');

    if (next.length === 4) {
      const hash = await hashPin(next);
      if (hash === settings.pinHash) {
        unlock();
      } else {
        setShaking(true);
        setError('رمز الدخول غير صحيح');
        setTimeout(() => { setPin(''); setShaking(false); }, 650);
      }
    }
  }, [pin, shaking, settings.pinHash, unlock]);

  const removeDigit = useCallback(() => {
    setPin(p => p.slice(0, -1));
    setError('');
  }, []);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '40px 32px',
    }}>
      <img
        src="/assets/icons/app-icon.png" alt="راتبي"
        style={{ width: 88, height: 88, borderRadius: 22, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}
      />
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>راتبي</div>
      <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 36 }}>أدخل رمز الدخول</div>

      {/* PIN dots */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 16,
        animation: shaking ? 'lock-shake 0.55s ease' : 'none',
      }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            background: pin.length > i ? 'var(--primary)' : 'var(--border)',
            boxShadow: pin.length > i ? '0 0 12px rgba(108,99,255,.5)' : 'none',
            transition: 'background .15s, box-shadow .15s',
          }} />
        ))}
      </div>

      <div style={{ minHeight: 28, marginBottom: 24, textAlign: 'center' }}>
        {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
      </div>

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: 264 }}>
        {NUMPAD.flat().map(d => (
          <NumBtn key={d} label={String(d)} onClick={() => addDigit(String(d))} />
        ))}

        {/* Biometric / empty */}
        {hasBiometric
          ? <NumBtn label={<FingerprintIcon />} onClick={triggerBiometric} dimmed />
          : <div />
        }

        <NumBtn label="0" onClick={() => addDigit('0')} />
        <NumBtn label="⌫" onClick={removeDigit} dimmed />
      </div>

      {hasBiometric && (
        <button onClick={triggerBiometric} style={{
          marginTop: 28, background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontSize: 14, fontWeight: 700,
          fontFamily: 'Mestika, Cairo, sans-serif',
        }}>
          الدخول ببصمة الإصبع / الوجه
        </button>
      )}

      <style>{`
        @keyframes lock-shake {
          0%,100% { transform: translateX(0); }
          15%,55% { transform: translateX(-10px); }
          35%,75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}

function NumBtn({ label, onClick, dimmed }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 70, borderRadius: 16, border: 'none', cursor: 'pointer',
        background: 'var(--card)', color: dimmed ? 'var(--text2)' : 'var(--text)',
        fontSize: typeof label === 'string' ? 24 : 18,
        fontWeight: 700, fontFamily: 'Cairo, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        transition: 'transform .1s, background .1s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(.92)'}
      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {label}
    </button>
  );
}
