import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { uid } from '../utils/format.js';
import BottomSheet from '../components/BottomSheet.jsx';

const BANK_EMOJIS = ['🏦', '🏧', '💳', '💰', '💵', '📊', '🏛️', '🌱', '🛡️', '📈', '🏠', '🚗'];
const BANK_COLORS = ['#6C63FF', '#00C9A7', '#FFB830', '#FF6B6B', '#FF6B9D', '#FF8C42', '#A78BFA', '#10B981'];

function emptyBank() {
  return { name: '', emoji: '🏦', color: '#6C63FF', accounts: [{ id: uid(), name: '' }] };
}

export default function Banks() {
  const { banks, commitments, goals, addBank, updateBank, deleteBank } = useApp();
  const [sheet, setSheet] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyBank());

  function openAdd() {
    setEditItem(null);
    setForm(emptyBank());
    setSheet(true);
  }

  function openEdit(b) {
    setEditItem(b);
    setForm({ name: b.name, emoji: b.emoji, color: b.color, accounts: b.accounts.map(a => ({ ...a })) });
    setSheet(true);
  }

  async function handleSave() {
    if (!form.name) return;
    const accounts = form.accounts.filter(a => a.name).map(a => ({ id: a.id || uid(), name: a.name }));
    if (accounts.length === 0) return;
    const data = { name: form.name, emoji: form.emoji, color: form.color, accounts };
    if (editItem) {
      await updateBank({ ...editItem, ...data });
    } else {
      await addBank(data);
    }
    setSheet(false);
  }

  function addAccount() {
    setForm(p => ({ ...p, accounts: [...p.accounts, { id: uid(), name: '' }] }));
  }

  function removeAccount(idx) {
    if (form.accounts.length <= 1) return;
    setForm(p => ({ ...p, accounts: p.accounts.filter((_, i) => i !== idx) }));
  }

  function updateAccountName(idx, name) {
    setForm(p => {
      const accounts = [...p.accounts];
      accounts[idx] = { ...accounts[idx], name };
      return { ...p, accounts };
    });
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ padding: '52px 16px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>بنوكي</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>
          وجهات التحويل لالتزاماتك وأهدافك · <span className="num">{banks.length}</span> بنك
        </p>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {banks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🏦</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>لا توجد بنوك بعد</div>
            <div style={{ fontSize: 13 }}>أضف بنكك وحساباته، ثم اربطها بالتزاماتك وأهدافك</div>
          </div>
        )}

        {banks.map(bank => (
          <BankCard key={bank.id} bank={bank} commitments={commitments} goals={goals} onEdit={openEdit} />
        ))}
      </div>

      <button className="fab" onClick={openAdd}>+</button>

      {/* Add/Edit Sheet */}
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title={editItem ? 'تعديل البنك' : 'بنك جديد'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="input-group">
            <label className="input-label">اسم البنك</label>
            <input className="input" placeholder="مثال: بنك الراجحي" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="input-group">
            <label className="input-label">الأيقونة</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {BANK_EMOJIS.map(e => (
                <button key={e} onClick={() => setForm(p => ({ ...p, emoji: e }))} style={{
                  width: 42, height: 42, borderRadius: 10,
                  border: `2px solid ${form.emoji === e ? form.color : 'var(--border)'}`,
                  background: form.emoji === e ? `${form.color}22` : 'var(--card2)',
                  fontSize: 20, cursor: 'pointer', transition: 'all .15s',
                }}>{e}</button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">اللون</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {BANK_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{
                  width: 34, height: 34, borderRadius: '50%', background: c,
                  border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`,
                  outline: form.color === c ? `2px solid ${c}` : 'none',
                  cursor: 'pointer', transition: 'all .15s',
                }} />
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">الحسابات</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.accounts.map((acc, idx) => (
                <div key={acc.id || idx} style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="اسم الحساب (مثال: ادخار)" value={acc.name}
                    onChange={e => updateAccountName(idx, e.target.value)}
                    style={{ flex: 1 }} />
                  {form.accounts.length > 1 && (
                    <button onClick={() => removeAccount(idx)} style={{
                      background: 'var(--danger-dim)', border: 'none', borderRadius: 8,
                      color: 'var(--danger)', width: 36, cursor: 'pointer', fontSize: 18, flexShrink: 0,
                    }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={addAccount} style={{
                background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 10,
                color: 'var(--primary)', padding: '10px', cursor: 'pointer',
                fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 14,
              }}>+ إضافة حساب</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
            {editItem && (
              <button className="btn btn-danger" style={{ flex: 1 }}
                onClick={async () => { await deleteBank(editItem.id); setSheet(false); }}>حذف</button>
            )}
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
              {editItem ? 'حفظ التعديل' : 'إضافة البنك'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function BankCard({ bank, commitments, goals, onEdit }) {
  const { fmt } = useApp();

  return (
    <div className="card anim-fadeup" style={{ borderRight: `4px solid ${bank.color}` }}>
      {/* Bank Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, fontSize: 22,
            background: `${bank.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{bank.emoji}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{bank.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              <span className="num">{bank.accounts.length}</span> {bank.accounts.length === 1 ? 'حساب' : 'حسابات'}
            </div>
          </div>
        </div>
        <button onClick={() => onEdit(bank)} className="btn-icon" style={{ color: 'var(--text2)', fontSize: 14 }}>✎</button>
      </div>

      {/* Accounts with assigned commitments/goals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bank.accounts.map(acc => {
          const accCommitments = commitments.filter(c => c.bankId === bank.id && c.accountId === acc.id);
          const accGoals = goals.filter(g => g.bankId === bank.id && g.accountId === acc.id);
          const hasAssigned = accCommitments.length > 0 || accGoals.length > 0;

          return (
            <div key={acc.id} style={{
              padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10,
              borderRight: `2px solid ${bank.color}40`,
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: hasAssigned ? 8 : 0, color: 'var(--text)' }}>
                {acc.name}
              </div>
              {accCommitments.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 13 }}>📋</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                    <span className="num">{fmt(c.amount)}</span> ريال
                  </span>
                </div>
              ))}
              {accGoals.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 13 }}>🎯</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{g.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                    <span className="num">{fmt(g.monthlyContribution || 0)}</span> ريال/شهر
                  </span>
                </div>
              ))}
              {!hasAssigned && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>لا يوجد تعيينات بعد</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
