import { Card, SectionTitle, ProgressBar, EmptyState } from '../components/ui.jsx'
import { xpProgress, getRank, getCommitmentLevel } from '../utils.js'
import { MUSCLE_GROUPS, WEEK_DAYS_SHORT } from '../constants.js'

export default function HomePage({ sessions, xp, streak, profile, onStartWorkout, onGoToWorkout, active }) {
  const { level, currentXP, neededXP, pct } = xpProgress(xp)
  const rank        = getRank(level)
  const commitment  = getCommitmentLevel(streak)
  const today       = new Date().getDay() // 0=Sun

  // Training days from profile (array of 0-6)
  const trainingDays = profile?.trainingDays || []
  const isTodayTraining = trainingDays.includes(today)

  // Muscle progress this month (last 30 days)
  const monthAgo = Date.now() - 30 * 86400000
  const monthSessions = sessions.filter(s => new Date(s.date) > monthAgo)
  const muscleSets = {}
  monthSessions.forEach(s => {
    s.exercises.forEach(ex => {
      const count = ex.sets.filter(ss => ss.done).length
      muscleSets[ex.muscle] = (muscleSets[ex.muscle] || 0) + count
    })
  })
  const muscleEntries = Object.entries(muscleSets).sort((a, b) => b[1] - a[1])
  const maxSets = muscleEntries[0]?.[1] || 1

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* ── Greeting ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: 2, marginBottom: 4 }}>
          HAMZAFIT · PLAYER
        </div>
        <div style={{ fontFamily: 'var(--font-ar)', fontSize: 20, fontWeight: 900 }}>
          مرحباً، {profile?.name || 'حمزة'} 👋
        </div>
      </div>

      {/* ── XP Card ───────────────────────────────────────────── */}
      <Card style={{ padding: 18, marginBottom: 12 }} topColor="var(--gold)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {/* XP Badge */}
          <div style={{
            background: 'var(--gold-lo)', border: '1px solid var(--gold-md)',
            borderRadius: 20, padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--gold)', fontWeight: 700,
          }}>
            ⭐ {xp.toLocaleString()} XP
          </div>

          {/* Level Badge */}
          <div style={{
            background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 20, padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F59E0B', fontWeight: 700,
          }}>
            LVL {level}
          </div>

          {/* Rank */}
          <div style={{ marginRight: 'auto' }}>
            <span style={{
              background: rank.bg, border: `1px solid ${rank.color}50`,
              borderRadius: 20, padding: '3px 10px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: rank.color, fontWeight: 700,
            }}>
              {rank.tier} · {rank.label}
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <ProgressBar value={currentXP} max={neededXP} color="var(--gold)" height={8} />
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)',
          marginTop: 6, textAlign: 'left',
        }}>
          {currentXP} / {neededXP} XP · {pct}%
        </div>
      </Card>

      {/* ── Commitment Level ──────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12, background: 'var(--purple-lo)' }} topColor="var(--purple)">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
              مستوى الالتزام
            </div>
            <div style={{
              fontFamily: 'var(--font-ar)', fontSize: 16, fontWeight: 800,
              color: commitment.color,
            }}>
              {commitment.label}
            </div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {commitment.desc}
            </div>
          </div>
          {/* Flames row */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{
                fontSize: 20,
                opacity: i < commitment.flames ? 1 : 0.15,
                filter: i < commitment.flames ? `drop-shadow(0 0 6px ${commitment.color})` : 'none',
                transition: 'all 0.3s',
              }}>🔥</span>
            ))}
          </div>
        </div>
        {streak > 0 && (
          <div style={{
            marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--purple)',
          }}>
            🔥 {streak} يوم متواصل
          </div>
        )}
      </Card>

      {/* ── Today Status ──────────────────────────────────────── */}
      <Card style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: isTodayTraining ? 'var(--cyan-lo)' : 'var(--bg3)',
            border: `2px solid ${isTodayTraining ? 'var(--cyan)' : 'var(--border2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {isTodayTraining ? '⚔️' : '😴'}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-ar)', fontSize: 14, fontWeight: 700,
              color: isTodayTraining ? 'var(--cyan)' : 'var(--text2)',
            }}>
              {isTodayTraining ? 'يوم تمرين 💪' : 'يوم راحة مجدولة'}
            </div>
            <div style={{ fontFamily: 'var(--font-ar)', fontSize: 12, color: 'var(--text3)' }}>
              {isTodayTraining ? 'اليوم مقرر له التمرين' : 'استرح واستعد للغد'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Weekly Schedule ───────────────────────────────────── */}
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <SectionTitle>الجدول الأسبوعي</SectionTitle>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {WEEK_DAYS_SHORT.map((day, idx) => {
            const isToday    = idx === today
            const isTraining = trainingDays.includes(idx)
            return (
              <div key={idx} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isToday ? 'var(--cyan)' : isTraining ? 'var(--bg3)' : 'transparent',
                  border: isToday ? '2px solid var(--cyan)' : isTraining ? '2px solid var(--border2)' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isToday ? 16 : 14,
                  color: isToday ? '#0A0A0A' : isTraining ? 'var(--text2)' : 'var(--text3)',
                  fontWeight: isToday ? 800 : isTraining ? 700 : 400,
                  transition: 'all 0.2s',
                }}>
                  {isTraining ? '🏋️' : day}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: isToday ? 'var(--cyan)' : 'var(--text3)',
                }}>
                  {isToday ? day : ''}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Muscle Progress (this month) ──────────────────────── */}
      {muscleEntries.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <SectionTitle>تقدم العضلات (هذا الشهر)</SectionTitle>
          {muscleEntries.map(([muscle, count]) => {
            const g = MUSCLE_GROUPS[muscle]
            if (!g) return null
            return (
              <div key={muscle} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-ar)', fontSize: 13 }}>
                    {g.emoji} {g.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>
                    {count} sets
                  </span>
                </div>
                <ProgressBar value={count} max={maxSets} color={g.color} height={6} />
              </div>
            )
          })}
        </Card>
      )}

      {sessions.length === 0 && !active && (
        <div style={{ marginBottom: 16 }}>
          <EmptyState icon="🏋️" title="لا توجد جلسات بعد" desc="ابدأ جلستك الأولى وسجّل تقدمك!" />
        </div>
      )}

      {/* ── Fixed Bottom CTA ──────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 560,
        padding: '12px 16px calc(var(--safe-bottom) + 76px)',
        background: 'linear-gradient(transparent, var(--bg) 40%)',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'all' }}>
          {active ? (
            <button className="btn-cyan" onClick={onGoToWorkout}>
              <span className="pulse-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
              متابعة الجلسة
            </button>
          ) : (
            <button className="btn-cyan" onClick={onStartWorkout}>
              ⚔️ ابدأ التمرين
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
