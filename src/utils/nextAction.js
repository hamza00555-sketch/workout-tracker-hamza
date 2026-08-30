import { currentMonth, daysUntil } from './format.js';
import { isCommitmentDue, goalContribFor } from './calc.js';

// The single question the dashboard answers: "what needs me right now?"
//
// Deterministic rules only — no scoring, no learning. Rules are evaluated in
// priority order and the first match wins, so adding a rule is a matter of
// slotting it at the right index.
//
// Pure: no React, no DOM, no IndexedDB. `today` is injectable so the rules can
// be tested across dates.

// Actions the user may wave away. Hard obligations (a bill due today) are not
// dismissible — silencing those would defeat the point.
const DISMISSIBLE = new Set(['undistributed', 'goal-late']);

function todayMidnight(today) {
  const d = today ?? new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * @returns {{key, tone, title, detail, cta, page, sig, dismissible}}
 *   tone: 'urgent' | 'warn' | 'primary' | 'calm'
 *   sig:  signature of the state that produced this action. A dismissal is
 *         remembered against this value, so the alert returns when the
 *         underlying number changes rather than staying silent all month.
 */
export function getNextAction({
  commitments = [],
  goals = [],
  settings = {},
  record = null,
  dismissed = [],
  today = null,
} = {}) {
  const now = todayMidnight(today);
  const month = currentMonth(now);
  const dayOfMonth = now.getDate();

  const due = commitments.filter(c => isCommitmentDue(c, month));
  const unpaid = due.filter(c => !c.paidThisMonth);
  const openGoals = goals.filter(g => !g.completed);

  const isDismissed = (key, sig) =>
    dismissed.some(d => d.key === key && d.sig === sig);

  const candidates = [];

  // 1 — The month has not been planned yet. The app cannot know the salary
  // actually landed, so the copy talks about the date, never the deposit.
  if (!record && dayOfMonth >= (settings.salaryDay || 25)) {
    candidates.push({
      key: 'salary-day',
      tone: 'primary',
      title: 'موعد راتبك اليوم',
      detail: 'خلّنا نرتّب شهرك',
      cta: 'ابدأ الترتيب',
      page: 'salaryDay',
      sig: month,
    });
  }

  // 2 — Due today. daysUntil() returns 0 for today only after the midnight
  // normalisation fix; before it, this rule could never fire.
  const dueToday = unpaid.filter(c => daysUntil(c.dayOfMonth || 1, now) === 0);
  if (dueToday.length) {
    const total = dueToday.reduce((s, c) => s + (c.amount || 0), 0);
    candidates.push({
      key: 'due-today',
      tone: 'urgent',
      title: dueToday.length === 1
        ? `${dueToday[0].name} مستحق اليوم`
        : `${dueToday.length} التزامات مستحقة اليوم`,
      detail: total,
      cta: 'شوف التزاماتك',
      page: 'commitments',
      sig: `${month}:${dueToday.map(c => c.id).sort().join(',')}`,
    });
  }

  // 3 — Due within three days.
  const soon = unpaid
    .map(c => ({ c, days: daysUntil(c.dayOfMonth || 1, now) }))
    .filter(x => x.days > 0 && x.days <= 3)
    .sort((a, b) => a.days - b.days);
  if (soon.length) {
    const { c, days } = soon[0];
    candidates.push({
      key: 'due-soon',
      tone: 'warn',
      title: `${c.name} ${days === 1 ? 'بكرة' : `بعد ${days} أيام`}`,
      detail: c.amount || 0,
      cta: 'شوف التزاماتك',
      page: 'commitments',
      sig: `${month}:${c.id}:${days}`,
    });
  }

  // 4 — Salary left over with no job to do. Only meaningful once the month has
  // been planned, otherwise every unplanned month would nag about its whole
  // salary.
  if (record) {
    const committed = due.reduce((s, c) => s + (c.amount || 0), 0);
    const toGoals = openGoals.reduce((s, g) => s + goalContribFor(g, record), 0);
    const salary = Number(record.salary) || Number(settings.salary) || 0;
    const left = salary - committed - toGoals;
    if (left > 0) {
      candidates.push({
        key: 'undistributed',
        tone: 'calm',
        title: 'باقي معك مبلغ غير مخصص',
        detail: left,
        cta: 'وزّعه',
        page: 'salaryDay',
        sig: String(left),
      });
    }
  }

  // 5 — A goal whose target date has passed while it is still open.
  const late = openGoals
    .filter(g => g.targetDate && new Date(g.targetDate) < now)
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
  if (late.length) {
    candidates.push({
      key: 'goal-late',
      tone: 'warn',
      title: `هدف ${late[0].name} تجاوز موعده`,
      detail: null,
      cta: 'عدّل الخطة',
      page: 'goals',
      sig: `${late[0].id}:${late[0].targetDate}`,
    });
  }

  // 6 — The month is unplanned but its salary date has not arrived. Lowest
  // priority so it never nags, but without it the dashboard offers no route
  // into Salary Day at all before the date lands.
  if (!record) {
    candidates.push({
      key: 'plan-month',
      tone: 'calm',
      title: 'ما رتّبت شهرك بعد',
      detail: 'تقدر ترتّبه في أي وقت',
      cta: 'رتّب شهرك',
      page: 'salaryDay',
      sig: month,
    });
  }

  for (const a of candidates) {
    const dismissible = DISMISSIBLE.has(a.key);
    if (dismissible && isDismissed(a.key, a.sig)) continue;
    return { ...a, dismissible };
  }

  return {
    key: 'clear',
    tone: 'calm',
    title: 'اليوم ما عليك شيء',
    detail: 'أمورك تمام',
    cta: null,
    page: null,
    sig: month,
    dismissible: false,
  };
}
