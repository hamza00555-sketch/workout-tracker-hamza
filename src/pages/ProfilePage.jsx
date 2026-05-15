import { useState } from 'react'
import { Card, SectionTitle, ProgressBar, RankBadge } from '../components/ui.jsx'
import {
  xpProgress, getRank, getCommitmentLevel,
  calcBMI, bmiCategory, calcAge, fmtDuration,
  sessionVolume, calcStreak,
} from '../utils.js'
import { GOALS, WEEK_DAYS_SHORT } from '../constants.js'

export default function ProfilePage({ profile, sessions, xp, streak, level, onUpdateProfile }) {
  const [editField, setEditField] = useState(null)
  const [editValue, setEditValue] = useState('')

  const { currentXP, neededXP, pct } = xpProgress(xp)
  const rank       = getRank(level)
  const commitment = getCommitmentLevel(streak)
  const age        = calcAge(profile?.birthday)
  const bmi        = calcBMI(profile?.weight, profile?.height)
  const bmiCat     = bmiCategory(bmi)
  const goal       = GOALS.find(g => g.id === profile?.goal) || GOALS[0]

  // Weight update reminder
  const lastUpdate  = profile?.lastWeightUpdate
  const daysSince   = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate)) / 86400000) : null
  const needsUpdate = daysSince === null || daysSince > 30

  // Lifetime stats
  const totalSessions = sessions.length
  const totalVolume   = sessions.reduce((t, s) => t + sessionVolume(s), 0)
  const bestStreak    = streak // simplified - current streak

  const startEdit = (field, current) => {
    setEditField(field)
    setEditValue(current !== null && current !== undefined ? String(current) : '')
  }

  const saveEdit = () => {
    if (!editField) return
    const update = { ...profile, [editField]: editValue }
    if (editField === 'weight') update.lastWeightUpdate = new Date().toISOString()
    onUpdateProfile(update)
    setEditField(null)
  }

  const cancelEdit = () => setEditField(null)

  const StatRow = ({ label, value, field, current, unit = '' }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: 'var(--font-ar)', fontSize: 14, color: 'var(--text2)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>
          {value || '—'}{unit}
        </span>
        {field && (
          <button
            onClick={() => startEdit(field, current)}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '4px 10px',
              color: 'var(--cyan)', fontFamily: 'var(--font-ar)',
              fontSize: 11, cursor: 'pointer',
            }}
          >تعديل</button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* ── Weight Update Banner ──────────────────────────────── */}
      {needsUpdate && (
        <div style={{
          background: 'var(--orange-lo)', border: '1px solid var(--orange)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
              ⚠️ تذكير تحديث الوزن
            </div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 11, color: 'var(--text3)' }}>
              {daysSince ? `آخر تحديث منذ ${daysSince} يوم` : 'لم تسجل وزنك بعد'}
            </div>
          </div>
          <button
            onClick={() => startEdit('weight', profile?.weight)}
            style={{
              background: 'var(--orange)', border: 'none',
              borderRadius: 8, padding: '6px 12px',
              color: '#0A0A0A', fontFamily: 'var(--font-ar)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}
          >تحديث</button>
        </div>
      )}

      {/* ── Player Card ───────────────────────────────────────── */}
      <Card style={{ padding: 20, marginBottom: 14 }} topColor="var(--cyan)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          {/* Avatar */}
          <div className="glow-pulse" style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cyan), #00B0A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#0A0A0A',
            flexShrink: 0,
          }}>
            {(profile?.name || 'H')[0]}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 20, fontWeight: 900 }}>
              {profile?.name || 'حمزة'}
            </div>
            <div style={{ marginTop: 4 }}>
              <RankBadge rank={rank} />
            </div>
          </div>
        </div>

        {/* XP + Level */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{
            background: 'var(--gold-lo)', border: '1px solid var(--gold-md)',
            borderRadius: 12, padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)', fontWeight: 700,
          }}>
            ⭐ {xp.toLocaleString()} XP
          </div>
          <div style={{
            background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 12, padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F59E0B', fontWeight: 700,
          }}>
            LVL {level}
          </div>
        </div>

        {/* XP Bar */}
        <ProgressBar value={currentXP} max={neededXP} color="var(--gold)" height={6} />
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)',
          marginTop: 5,
        }}>
          {currentXP} / {neededXP} XP للمستوى التالي
        </div>
      </Card>

      {/* ── Goal Card ─────────────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12 }} topColor="var(--purple)">
        <SectionTitle>الهدف التدريبي</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>{goal.icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 16, fontWeight: 700 }}>{goal.label}</div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 12, color: 'var(--text3)' }}>{goal.desc}</div>
          </div>
          <button
            onClick={() => startEdit('goal', profile?.goal)}
            style={{
              marginRight: 'auto',
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '5px 12px',
              color: 'var(--purple)', fontFamily: 'var(--font-ar)',
              fontSize: 12, cursor: 'pointer',
            }}
          >تغيير</button>
        </div>
      </Card>

      {/* ── Commitment Card ───────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12, background: 'var(--purple-lo)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
              الالتزام
            </div>
            <div style={{
              fontFamily: 'var(--font-ar)', fontSize: 16, fontWeight: 800,
              color: commitment.color,
            }}>
              {commitment.label}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{
                fontSize: 18,
                opacity: i < commitment.flames ? 1 : 0.15,
              }}>🔥</span>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Body Stats ────────────────────────────────────────── */}
      <Card style={{ padding: 20, marginBottom: 12 }}>
        <SectionTitle>العلامات الحيوية</SectionTitle>

        {/* Grid of vital stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <VitalBox
            label="العمر"
            value={age ? age : '—'}
            unit="سنة"
            color="var(--cyan)"
            icon="🎂"
            onEdit={() => startEdit('birthday', profile?.birthday)}
          />
          <VitalBox
            label="الطول"
            value={profile?.height || '—'}
            unit="سم"
            color="var(--green)"
            icon="📏"
            onEdit={() => startEdit('height', profile?.height)}
          />
          <VitalBox
            label="الوزن"
            value={profile?.weight || '—'}
            unit="كغ"
            color="var(--gold)"
            icon="⚖️"
            onEdit={() => startEdit('weight', profile?.weight)}
          />
          <VitalBox
            label="دهون الجسم"
            value={profile?.bodyFat || '—'}
            unit="%"
            color="var(--orange)"
            icon="🔥"
            onEdit={() => startEdit('bodyFat', profile?.bodyFat)}
          />
        </div>

        {/* BMI row */}
        {bmi > 0 && (
          <div style={{
            background: 'var(--bg3)', borderRadius: 12,
            padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ar)', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                مؤشر كتلة الجسم (BMI)
              </div>
              <div style={{ fontFamily: 'var(--font-ar)', fontSize: 15, fontWeight: 700, color: 'var(--text2)' }}>
                {bmiCat}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800,
              color: bmi < 18.5 ? 'var(--blue)' : bmi < 25 ? 'var(--green)' : bmi < 30 ? 'var(--orange)' : 'var(--red)',
            }}>
              {bmi}
            </div>
          </div>
        )}
      </Card>

      {/* ── Training Schedule ─────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <SectionTitle>جدول التدريب</SectionTitle>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginBottom: 12 }}>
          {WEEK_DAYS_SHORT.map((day, idx) => {
            const isTraining = (profile?.trainingDays || []).includes(idx)
            return (
              <div key={idx} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: isTraining ? 'var(--cyan-lo)' : 'var(--bg3)',
                  border: `2px solid ${isTraining ? 'var(--cyan)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  color: isTraining ? 'var(--cyan)' : 'var(--text3)',
                }}>
                  {isTraining ? '⚔️' : day}
                </div>
              </div>
            )
          })}
        </div>
        {profile?.workoutTime && (
          <div style={{
            fontFamily: 'var(--font-ar)', fontSize: 13, color: 'var(--text3)',
          }}>
            وقت التدريب المفضل: {profile.workoutTime}
          </div>
        )}
      </Card>

      {/* ── Lifetime Stats ────────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <SectionTitle>إحصائيات كاملة</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatBox label="إجمالي الجلسات" value={totalSessions} color="var(--cyan)" />
          <StatBox label="الحجم (طن)" value={`${(totalVolume / 1000).toFixed(1)}`} color="var(--gold)" />
          <StatBox label="أفضل streak" value={`${bestStreak} 🔥`} color="var(--orange)" />
          <StatBox label="إجمالي XP" value={xp.toLocaleString()} color="var(--purple)" />
        </div>
      </Card>

      {/* ── Edit Modal ────────────────────────────────────────── */}
      {editField && (
        <EditModal
          field={editField}
          value={editValue}
          onChange={setEditValue}
          onSave={saveEdit}
          onCancel={cancelEdit}
          profile={profile}
        />
      )}
    </div>
  )
}

// ── Vital Box ─────────────────────────────────────────────────
function VitalBox({ label, value, unit, color, icon, onEdit }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: `1px solid var(--border)`,
      borderRadius: 14, padding: '14px 14px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <button
          onClick={onEdit}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: 12, padding: 0, lineHeight: 1,
          }}
        >✏️</button>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800,
        color, marginTop: 8, lineHeight: 1,
      }}>
        {value}
        {value !== '—' && (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', marginRight: 4 }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-ar)', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

// ── Stat Box ──────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 12px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 22,
        fontWeight: 800, color, marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-ar)', fontSize: 11, color: 'var(--text3)' }}>{label}</div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({ field, value, onChange, onSave, onCancel, profile }) {
  const FIELD_LABELS = {
    name:     'الاسم',
    birthday: 'تاريخ الميلاد',
    height:   'الطول (سم)',
    weight:   'الوزن (كجم)',
    bodyFat:  'نسبة الدهون (%)',
    goal:     'الهدف',
  }

  const FIELD_TYPES = {
    name:     'text',
    birthday: 'date',
    height:   'number',
    weight:   'number',
    bodyFat:  'number',
    goal:     'select',
  }

  const label    = FIELD_LABELS[field] || field
  const type     = FIELD_TYPES[field]  || 'text'
  const isSelect = type === 'select'

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="scale-enter"
        style={{
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
        }}
      >
        <div style={{ fontFamily: 'var(--font-ar)', fontSize: 17, fontWeight: 800, marginBottom: 16 }}>
          تعديل {label}
        </div>

        {isSelect ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: 10,
              padding: '10px 12px', color: 'var(--text)',
              fontFamily: 'var(--font-ar)', fontSize: 14, outline: 'none',
              marginBottom: 16, cursor: 'pointer',
            }}
          >
            {GOALS.map(g => (
              <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            inputMode={type === 'number' ? 'decimal' : undefined}
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg3)',
              border: '1px solid var(--cyan)', borderRadius: 10,
              padding: '12px', color: 'var(--text)',
              fontFamily: type === 'text' ? 'var(--font-ar)' : 'var(--font-mono)',
              fontSize: 14, outline: 'none', marginBottom: 16,
            }}
          />
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSave}
            className="btn-cyan"
            style={{ flex: 1, fontSize: 14 }}
          >
            حفظ
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: 'var(--bg2)',
              border: '1px solid var(--border2)', borderRadius: 10,
              padding: '12px', color: 'var(--text2)',
              fontFamily: 'var(--font-ar)', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
