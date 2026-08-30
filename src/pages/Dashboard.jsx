import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { currentMonth, currentMonthLabel, daysUntil, formatDate } from '../utils/format.js';
import {
  calcCommitmentsTotal, calcGoalsMonthlyTotal, calcGoalProgress,
  isCommitmentDue, goalContribFor,
} from '../utils/calc.js';
import { getNextAction } from '../utils/nextAction.js';
import { getCatData, GOAL_CATEGORIES } from '../components/CategoryData.js';
import CatIcon from '../components/CategoryIcons.jsx';
import ExtraIncomeSheet from './ExtraIncomeSheet.jsx';

// Tone → colour. Every tone also carries an icon and a word, so the state is
// never conveyed by colour alone.
const TONES = {
  urgent:  { color: 'var(--danger)',  dim: 'var(--danger-dim)',  label: 'عاجل' },
  warn:    { color: 'var(--gold)',    dim: 'var(--gold-dim)',    label: 'قريب' },
  primary: { color: 'var(--primary)', dim: 'var(--primary-dim)', label: 'ابدأ' },
  calm:    { color: 'var(--accent)',  dim: 'var(--accent-dim)',  label: 'تمام' },
};

const DISMISS_LIMIT = 20;

export default function Dashboard() {
  const {
    settings, commitments, goals, banks, extraIncome,
    currentMonthRecord, setPage, privacyMode, togglePrivacy,
    fmt, deleteExtraIncome, updateSettings,
  } = useApp();
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const record = currentMonthRecord;
  const thisMonth = currentMonth();
  const salary = record?.salary || settings.salary || 0;
  const commitmentsTotal = calcCommitmentsTotal(commitments, thisMonth);
  // Reads this month's edits from the record, falling back to each goal's
  // standing contribution — Salary Day never rewrites the goal itself.
  const goalsTotal = calcGoalsMonthlyTotal(goals, record);
  const remaining = salary - commitmentsTotal - goalsTotal;

  const monthlyExtraIncome = extraIncome.filter(e => e.date?.startsWith(thisMonth));
  const extraIncomeTotal = monthlyExtraIncome.reduce((s, e) => s + (e.amount || 0), 0);

  const dismissed = settings.nextActionDismissed || [];
  const action = useMemo(
    () => getNextAction({ commitments, goals, settings, record, dismissed }),
    [commitments, goals, settings, record, dismissed],
  );

  async function dismissAction() {
    const next = [...dismissed, { key: action.key, sig: action.sig }].slice(-DISMISS_LIMIT);
    await updateSettings({ nextActionDismissed: next });
  }

  const openGoals = goals.filter(g => !g.completed);
  const topGoals = [...openGoals]
    .sort((a, b) => calcGoalProgress(b) - calcGoalProgress(a))
    .slice(0, 2);
  const bestGoal = topGoals[0] || null;

  // Commitments still owed this month, soonest first.
  const upcoming = commitments
    .filter(c => isCommitmentDue(c, thisMonth) && !c.paidThisMonth)
    .map(c => ({ ...c, days: daysUntil(c.dayOfMonth || 1) }))
    .sort((a, b) => a.days - b.days);
  const upcomingSoon = upcoming.filter(c => c.days <= 7).slice(0, 3);

  const bankTransfers = banks.map(bank => {
    const total =
      commitments.filter(c => isCommitmentDue(c, thisMonth) && c.bankId === bank.id)
        .reduce((s, c) => s + (c.amount || 0), 0) +
      openGoals.filter(g => g.bankId === bank.id)
        .reduce((s, g) => s + goalContribFor(g, record), 0);
    return { ...bank, total };
  }).filter(b => b.total > 0);

  const recentActivity = useMemo(() => {
    const items = [];
    if (record) items.push({ type: 'salary', label: '+ راتب', name: 'راتب هذا الشهر', amount: salary });
    extraIncome.slice(0, 2).forEach(e =>
      items.push({ type: 'income', label: '+ دخل', name: e.source || 'دخل إضافي', amount: e.amount })
    );
    commitments.filter(c => c.paidThisMonth).slice(0, 3).forEach(c =>
      items.push({ type: 'paid', label: '✓ مدفوع', name: c.name, amount: c.amount })
    );
    return items.slice(0, 5);
  }, [commitments, extraIncome, record, salary]);

  const positive = remaining >= 0;
  const tone = TONES[action.tone] || TONES.calm;

  return (
    <div className="page">

      {/* ── Header ── */}
      <header style={{
        padding: '52px 20px 14px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 2 }}>{currentMonthLabel()}</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>راتبي</div>
          </div>
          <button
            onClick={togglePrivacy}
            aria-label={privacyMode ? 'إظهار المبالغ' : 'إخفاء المبالغ'}
            aria-pressed={privacyMode}
            style={{
              background: privacyMode ? 'var(--danger-dim)' : 'var(--card2)',
              border: `1.5px solid ${privacyMode ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 12, width: 44, height: 44, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: privacyMode ? 'var(--danger)' : 'var(--text2)',
              transition: 'all .2s', flexShrink: 0,
            }}
          >
            {privacyMode ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </header>

      <div style={{ padding: '20px 16px 0' }}>

        {/* ── Tier 1: the one thing that needs attention ── */}
        <section aria-labelledby="next-action-title" style={{ marginBottom: 28 }}>
          <div className="card" style={{
            border: `1.5px solid ${tone.color}`,
            background: `linear-gradient(135deg, ${tone.dim} 0%, var(--card) 70%)`,
            padding: '18px 18px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <span style={{ color: tone.color, display: 'flex' }} aria-hidden="true">
                <ToneIcon tone={action.tone} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: tone.color }}>{tone.label}</span>
            </div>

            <h2 id="next-action-title" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.45 }}>
              {action.title}
            </h2>

            {typeof action.detail === 'number' ? (
              <div style={{ fontSize: 26, fontWeight: 900, color: tone.color, marginTop: 8 }}>
                <span className="num">{fmt(action.detail)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, marginRight: 5 }}>ريال</span>
              </div>
            ) : action.detail ? (
              <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>{action.detail}</p>
            ) : null}

            {(action.cta || action.dismissible) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {action.cta && (
                  <button
                    className="btn"
                    onClick={() => action.page && setPage(action.page)}
                    style={{
                      flex: 1, background: tone.color,
                      color: action.tone === 'warn' || action.tone === 'calm' ? '#0D0A26' : '#fff',
                      fontSize: 15, padding: '13px 20px', borderRadius: 12,
                    }}
                  >
                    {action.cta}
                  </button>
                )}
                {action.dismissible && (
                  <button
                    className="btn btn-ghost"
                    onClick={dismissAction}
                    style={{ padding: '13px 18px', fontSize: 14, borderRadius: 12 }}
                  >
                    تجاهل
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Tier 2: the headline number, deliberately not in a card ── */}
        <section aria-label="المتبقي هذا الشهر" style={{ marginBottom: 20, padding: '0 4px' }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
            {positive ? 'متاح لك هذا الشهر' : 'تجاوزت راتبك بـ'}
          </div>
          <div style={{
            fontSize: 44, fontWeight: 900, lineHeight: 1.05,
            color: positive ? 'var(--text)' : 'var(--danger)',
          }}>
            <span className="num">{fmt(Math.abs(remaining))}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginRight: 8 }}>ريال</span>
          </div>
          {!positive && (
            <div style={{ fontSize: 13, color: 'var(--danger)', marginTop: 6 }}>
              خطتك أكبر من دخلك — راجع التزاماتك أو أهدافك
            </div>
          )}
        </section>

        {/* ── Summary strip ── */}
        <section style={{
          display: 'flex', alignItems: 'stretch',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 28,
        }}>
          <StripStat
            label="التزامات" value={fmt(commitmentsTotal)} unit="ريال"
            onClick={() => setPage('commitments')} ariaLabel="اذهب إلى التزاماتك"
          />
          <StripDivider />
          <StripStat
            label={upcoming.length === 1 ? 'التزام قادم' : 'قادمة'}
            value={String(upcoming.length)} plain
            onClick={() => setPage('commitments')} ariaLabel="اذهب إلى الالتزامات القادمة"
          />
          <StripDivider />
          <StripStat
            label={bestGoal ? 'أفضل هدف' : 'أهداف'}
            value={bestGoal ? `${calcGoalProgress(bestGoal)}%` : '—'} plain
            onClick={() => setPage('goals')} ariaLabel="اذهب إلى أهدافك"
          />
        </section>

        {/* ── Tier 3: what still needs doing ── */}
        {upcomingSoon.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <SectionHeader title="مستحق قريباً" />
            <div className="card" style={{ padding: '4px 0', overflow: 'hidden' }}>
              {upcomingSoon.map((c, i) => (
                <ActionRow
                  key={c.id}
                  title={c.name}
                  sub={c.days === 0 ? 'اليوم' : c.days === 1 ? 'بكرة' : `بعد ${c.days} أيام`}
                  urgent={c.days <= 1}
                  amount={c.amount}
                  divider={i < upcomingSoon.length - 1}
                  fmt={fmt}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Tier 4: everything else, folded away ── */}
        <section style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowSummary(v => !v)}
            aria-expanded={showSummary}
            style={{
              width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 4px', fontFamily: 'Mestika, Cairo, sans-serif',
              color: 'var(--text)', fontSize: 15, fontWeight: 700,
            }}
          >
            <span>ملخص شهرك</span>
            <span style={{
              color: 'var(--text2)', display: 'flex',
              transform: showSummary ? 'rotate(90deg)' : 'none', transition: 'transform .2s',
            }} aria-hidden="true">
              <ChevronIcon />
            </span>
          </button>

          {showSummary && (
            <div className="anim-fadein" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8 }}>

              {bankTransfers.length > 0 && (
                <div>
                  <SectionHeader title="وين تحط فلوسك" />
                  <div className="card" style={{ padding: '4px 0', overflow: 'hidden' }}>
                    {bankTransfers.map((bank, i) => (
                      <ActionRow
                        key={bank.id}
                        title={bank.name}
                        sub="خطتك لهذا الشهر"
                        amount={bank.total}
                        divider={i < bankTransfers.length - 1}
                        fmt={fmt}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, padding: '0 4px', lineHeight: 1.6 }}>
                    راتبي ما يعرف أرصدتك الحقيقية — هذي خطتك أنت.
                  </p>
                </div>
              )}

              {topGoals.length > 0 && (
                <div>
                  <SectionHeader title="أهدافك" action="عرض الكل" onAction={() => setPage('goals')} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topGoals.map(g => {
                      const progress = calcGoalProgress(g);
                      const cat = getCatData(GOAL_CATEGORIES, g.category);
                      return (
                        <div key={g.id} className="card" style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <CatIcon id={cat.id} size={19} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{g.name}</div>
                              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                                <span className="num">{fmt(g.savedAmount || 0)}</span>
                                {' / '}
                                <span className="num">{fmt(g.targetAmount)}</span> ريال
                              </div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary-text)', flexShrink: 0 }}>
                              <span className="num">{progress}</span>%
                            </div>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{
                              width: `${progress}%`,
                              background: `linear-gradient(90deg, var(--primary), ${cat.color})`,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <SectionHeader
                  title="الدخل الإضافي"
                  action="+ إضافة"
                  onAction={() => setShowIncomeSheet(true)}
                />
                {extraIncomeTotal > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10, padding: '0 4px' }}>
                    هذا الشهر: <span className="num" style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(extraIncomeTotal)}</span> ريال
                  </div>
                )}
                {extraIncome.length === 0 ? (
                  <button
                    onClick={() => setShowIncomeSheet(true)}
                    className="card"
                    style={{
                      width: '100%', padding: 18, cursor: 'pointer', background: 'transparent',
                      border: '1.5px dashed var(--border)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>ما عندك دخل إضافي بعد</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6 }}>
                      مكافأة أو عمل حر؟ سجّله وراتبي يقترح لك توزيعه
                    </div>
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {extraIncome.slice(0, 2).map(income => (
                      <div key={income.id} className="card" style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 2 }}>
                              {income.source || 'دخل'} · {formatDate(income.date)}
                            </div>
                            <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--accent)' }}>
                              <span className="num">{fmt(income.amount)}</span>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginRight: 5 }}>ريال</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteExtraIncome(income.id)}
                            aria-label={`حذف دخل ${income.source || ''} بمبلغ ${income.amount}`}
                            className="btn-icon"
                            style={{ color: 'var(--text2)', fontSize: 15 }}
                          >✕</button>
                        </div>
                        <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
                          {income.distribution?.debtsPct > 0 && <div style={{ flex: income.distribution.debtsPct, background: 'var(--danger)', borderRadius: 3 }} />}
                          {(income.distribution?.taggedPct || income.distribution?.goalsPct || 0) > 0 && <div style={{ flex: income.distribution.taggedPct || income.distribution.goalsPct, background: 'var(--gold)', borderRadius: 3 }} />}
                          {income.distribution?.personalPct > 0 && <div style={{ flex: income.distribution.personalPct, background: 'var(--accent)', borderRadius: 3 }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {recentActivity.length > 0 && (
                <div>
                  <SectionHeader title="آخر التحديثات" />
                  <div style={{
                    display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
                    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
                  }}>
                    {recentActivity.map((item, i) => (
                      <div key={i} className="card" style={{
                        flexShrink: 0, minWidth: 156, padding: '14px',
                        display: 'flex', flexDirection: 'column', gap: 5,
                      }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          color: item.type === 'paid' ? 'var(--accent)'
                            : item.type === 'income' ? 'var(--primary-text)'
                            : 'var(--accent)',
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 132,
                        }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                          <span className="num">{fmt(item.amount)}</span> ريال
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div style={{ height: 8 }} />
      </div>

      {showIncomeSheet && <ExtraIncomeSheet onClose={() => setShowIncomeSheet(false)} />}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StripDivider() {
  return <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} aria-hidden="true" />;
}

function StripStat({ label, value, unit, plain, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '13px 8px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3, fontFamily: 'Mestika, Cairo, sans-serif',
        color: 'var(--text)', minWidth: 0,
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: 'nowrap' }}>
        <span className="num">{value}</span>
        {unit && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginRight: 3 }}>{unit}</span>}
        {plain && null}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10, padding: '0 4px',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {action && <button onClick={onAction} className="section-action">{action}</button>}
    </div>
  );
}

function ActionRow({ title, sub, amount, urgent, divider, fmt }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <div style={{
            fontSize: 13, marginTop: 3,
            color: urgent ? 'var(--danger)' : 'var(--text2)',
            fontWeight: urgent ? 700 : 400,
          }}>
            {urgent && <span aria-hidden="true">● </span>}{sub}
          </div>
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            <span className="num">{fmt(amount)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>ريال</div>
        </div>
      </div>
      {divider && <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />}
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ToneIcon({ tone }) {
  const p = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (tone === 'urgent') {
    return <svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
  }
  if (tone === 'warn') {
    return <svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  }
  if (tone === 'primary') {
    return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  }
  return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
