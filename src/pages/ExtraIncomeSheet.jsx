import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { uid, todayISO } from '../utils/format.js';

const SOURCES = [
  { id: 'bonus', label: 'مكافأة', icon: '🎁' },
  { id: 'freelance', label: 'عمل حر', icon: '💻' },
  { id: 'gift', label: 'هدية', icon: '🎀' },
  { id: 'investment', label: 'استثمار', icon: '📈' },
  { id: 'other', label: 'غيره', icon: '💰' },
];

export default function ExtraIncomeSheet({ onClose }) {
  const { commitments, goals, debts, addExtraIncome, addDebt, deleteDebt, fmt } = useApp();

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('bonus');
  const [debtPct, setDebtPct] = useState(0);
  const [goalsPct, setGoalsPct] = useState(0);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const activeDebts = debts.filter(d => !d.paid);
  const activeCommitments = commitments.filter(c => c.active !== false);
  const activeGoals = goals.filter(g => !g.completed);

  // Smart init based on what the user has
  useEffect(() => {
    if (activeDebts.length > 0) {
      setDebtPct(50); setGoalsPct(30);
    } else if (activeCommitments.length > 0) {
      setDebtPct(30); setGoalsPct(40);
    } else {
      setDebtPct(0); setGoalsPct(60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAmount = parseFloat(amount) || 0;
  const pp = Math.max(0, 100 - debtPct - goalsPct);
  const debtAmount = Math.round(totalAmount * debtPct / 100);
  const goalsAmount = Math.round(totalAmount * goalsPct / 100);
  const personalAmount = totalAmount - debtAmount - goalsAmount;

  function adjustDebt(delta) {
    setDebtPct(prev => Math.max(0, Math.min(prev + delta, 80 - goalsPct)));
  }
  function adjustGoals(delta) {
    setGoalsPct(prev => Math.max(0, Math.min(prev + delta, 80 - debtPct)));
  }

  // Distribute debt portion: standalone debts first, then commitments buffer
  const debtBreakdown = useMemo(() => {
    if (debtAmount <= 0) return [];
    if (activeDebts.length > 0) {
      const totalRem = activeDebts.reduce((s, d) => s + Math.max(0, (d.totalAmount || 0) - (d.paidAmount || 0)), 0);
      if (totalRem <= 0) return [];
      let rem = debtAmount;
      return activeDebts.map((d, i) => {
        const dRem = Math.max(0, (d.totalAmount || 0) - (d.paidAmount || 0));
        const share = i === activeDebts.length - 1 ? rem : Math.round(debtAmount * dRem / totalRem);
        rem -= share;
        return { id: d.id, name: d.name, amount: share };
      }).filter(x => x.amount > 0);
    }
    // No standalone debts — buffer across commitments
    const total = activeCommitments.reduce((s, c) => s + (c.amount || 0), 0);
    if (total <= 0) return [];
    let rem = debtAmount;
    return activeCommitments.map((c, i) => {
      const share = i === activeCommitments.length - 1 ? rem : Math.round(debtAmount * (c.amount || 0) / total);
      rem -= share;
      return { id: c.id, name: c.name, amount: share };
    }).filter(x => x.amount > 0);
  }, [debtAmount, activeDebts, activeCommitments]);

  // Distribute goals portion proportionally by monthly contribution
  const goalsBreakdown = useMemo(() => {
    if (goalsAmount <= 0 || activeGoals.length === 0) return [];
    const total = activeGoals.reduce((s, g) => s + (g.monthlyContribution || 0), 0);
    const base = total > 0 ? total : activeGoals.length;
    let rem = goalsAmount;
    return activeGoals.map((g, i) => {
      const share = i === activeGoals.length - 1 ? rem
        : Math.round(goalsAmount * (total > 0 ? (g.monthlyContribution || 0) : 1) / base);
      rem -= share;
      return { id: g.id, name: g.name, amount: share };
    }).filter(x => x.amount > 0);
  }, [goalsAmount, activeGoals]);

  async function handleAddDebt() {
    const name = newDebtName.trim();
    const amt = parseFloat(newDebtAmount);
    if (!name || !amt) return;
    await addDebt({ name, totalAmount: amt, paidAmount: 0, paid: false });
    setNewDebtName(''); setNewDebtAmount(''); setShowDebtForm(false);
    if (debtPct < 30) { setDebtPct(50); setGoalsPct(prev => Math.min(prev, 30)); }
  }

  async function handleConfirm() {
    if (!totalAmount) return;
    setSaving(true);
    await addExtraIncome({
      id: uid(), date: todayISO(), amount: totalAmount, source,
      distribution: { debts: debtAmount, goals: goalsAmount, personal: personalAmount, debtsPct: debtPct, goalsPct, personalPct: pp },
      debtBreakdown, goalsBreakdown,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', maxHeight: '92vh', overflowY: 'auto', paddingBottom: 40 }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>دخل إضافي 💰</div>
            <button onClick={onClose} style={{ background: 'var(--card2)', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>المبلغ</div>
            <input type="text" inputMode="decimal" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: 'var(--card2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px', fontSize: 28, fontWeight: 900, color: 'var(--text)', fontFamily: 'Cairo, sans-serif', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>

          {/* Source chips */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>المصدر</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SOURCES.map(s => (
                <button key={s.id} onClick={() => setSource(s.id)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  border: `1.5px solid ${source === s.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: source === s.id ? 'var(--accent-dim)' : 'var(--card2)',
                  color: source === s.id ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{s.icon} {s.label}</button>
              ))}
            </div>
          </div>

          {/* Standalone debts */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>الديون المستقلة</div>
              <button onClick={() => setShowDebtForm(v => !v)} style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ إضافة دين</button>
            </div>

            {activeDebts.length === 0 && !showDebtForm && (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 0 2px' }}>
                لا يوجد ديون — نسبة الديون ستوزَّع كاحتياطي للالتزامات الشهرية
              </div>
            )}

            {activeDebts.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'var(--card2)', borderRadius: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    متبقي: <span className="num">{fmt(Math.max(0, (d.totalAmount || 0) - (d.paidAmount || 0)))}</span> ريال
                  </div>
                </div>
                <button onClick={() => deleteDebt(d.id)} style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}

            {showDebtForm && (
              <div style={{ background: 'var(--card2)', borderRadius: 12, padding: 12, marginTop: 4 }}>
                <input type="text" placeholder="اسم الدين (مثال: سلف أخي)" value={newDebtName}
                  onChange={e => setNewDebtName(e.target.value)}
                  style={{ width: '100%', marginBottom: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, color: 'var(--text)', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" inputMode="decimal" placeholder="المبلغ الكلي" value={newDebtAmount}
                    onChange={e => setNewDebtAmount(e.target.value)}
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
                  <button onClick={handleAddDebt} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>حفظ</button>
                </div>
              </div>
            )}
          </div>

          {/* Distribution — only show if amount is entered */}
          {totalAmount > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>توزيع المبلغ</div>

              <DistRow label="الديون والالتزامات" icon="🏦" pct={debtPct} amount={debtAmount} color="#FF6B6B"
                onDec={() => adjustDebt(-5)} onInc={() => adjustDebt(5)} fmt={fmt} />
              <DistRow label="الأهداف" icon="🎯" pct={goalsPct} amount={goalsAmount} color="#A78BFA"
                onDec={() => adjustGoals(-5)} onInc={() => adjustGoals(5)} fmt={fmt} />

              {/* Personal — read-only */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--card2)', borderRadius: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🛍️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>شخصي</div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ width: `${pp}%`, height: '100%', background: '#00C9A7', borderRadius: 2, transition: 'width .2s' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'left', minWidth: 72 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#00C9A7' }}><span className="num">{fmt(personalAmount)}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>{pp}%</div>
                </div>
              </div>

              {/* Breakdowns */}
              {debtBreakdown.length > 0 && (
                <BreakdownCard
                  title={activeDebts.length > 0 ? `الديون (${fmt(debtAmount)} ريال)` : `احتياطي الالتزامات (${fmt(debtAmount)} ريال)`}
                  color="#FF6B6B" items={debtBreakdown} fmt={fmt} />
              )}
              {goalsBreakdown.length > 0 && (
                <BreakdownCard title={`الأهداف (${fmt(goalsAmount)} ريال)`} color="#A78BFA" items={goalsBreakdown} fmt={fmt} />
              )}
            </div>
          )}

          {/* Confirm */}
          <button onClick={handleConfirm} disabled={!totalAmount || saving} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: totalAmount ? 'var(--accent)' : 'var(--card2)',
            color: totalAmount ? 'var(--bg)' : 'var(--text3)',
            border: 'none', fontSize: 15, fontWeight: 900,
            cursor: totalAmount ? 'pointer' : 'default', transition: 'all .2s',
          }}>
            {saving ? '...' : 'حفظ الدخل الإضافي'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DistRow({ label, icon, pct, amount, color, onDec, onInc, fmt }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--card2)', borderRadius: 12, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .2s' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={onDec} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>−</button>
        <div style={{ textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color }}><span className="num">{fmt(amount)}</span></div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{pct}%</div>
        </div>
        <button onClick={onInc} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>+</button>
      </div>
    </div>
  );
}

function BreakdownCard({ title, color, items, fmt }) {
  return (
    <div style={{ background: 'var(--bg)', border: `1.5px solid ${color}35`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8 }}>{title}</div>
      {items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{item.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color }}><span className="num">{fmt(item.amount)}</span> ريال</span>
        </div>
      ))}
    </div>
  );
}
