import { currentMonth } from './format.js';

export function monthsUntil(targetDate) {
  const now = new Date();
  const t = new Date(targetDate);
  return Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
}

export function calcGoalMonthly(goal) {
  const remaining = (goal.targetAmount || 0) - (goal.savedAmount || 0);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthsUntil(goal.targetDate));
}

export function calcGoalProgress(goal) {
  if (!goal.targetAmount) return 0;
  return Math.min(100, Math.round(((goal.savedAmount || 0) / goal.targetAmount) * 100));
}

// A commitment counts this month unless it was archived outright, or paused
// for this specific month. `pausedMonth` holds a 'yyyy-mm' string, so it stops
// matching on its own once the month rolls over — no cleanup needed.
export function isCommitmentDue(c, month) {
  const m = month ?? currentMonth();
  return c.active !== false && c.pausedMonth !== m;
}

export function calcCommitmentsTotal(commitments, month) {
  return commitments
    .filter(c => isCommitmentDue(c, month))
    .reduce((s, c) => s + (c.amount || 0), 0);
}

// Salary Day edits are scoped to the month they were made in: they live on the
// monthly record and must never overwrite the goal's standing contribution.
// Reading through here is what makes those edits visible everywhere else.
export function goalContribFor(goal, record) {
  const scoped = record?.goalContribs?.[goal.id];
  // Guard before coercing: Number(null) and Number('') are both 0, which would
  // silently read a missing entry as a deliberate zero contribution.
  if (scoped === null || scoped === undefined || scoped === '') {
    return goal.monthlyContribution || 0;
  }
  const n = Number(scoped);
  return Number.isFinite(n) ? n : (goal.monthlyContribution || 0);
}

export function calcGoalsMonthlyTotal(goals, record) {
  return goals.filter(g => !g.completed).reduce((s, g) => s + goalContribFor(g, record), 0);
}

// Everything earmarked for a bank (or one of its accounts) this month: due
// commitments plus this month's contributions to still-open goals.
//
// The dashboard and the Banks page each used to compute this inline and had
// drifted apart — Banks counted completed goals the dashboard excluded, so the
// two screens disagreed about the same bank. Both read it from here now.
export function bankAllocation(bankId, { commitments = [], goals = [], record = null, month, accountId } = {}) {
  const m = month ?? currentMonth();
  const mine = x => x.bankId === bankId && (accountId === undefined || x.accountId === accountId);
  const dueCommitments = commitments.filter(c => isCommitmentDue(c, m) && mine(c));
  const openGoals = goals.filter(g => !g.completed && mine(g));
  const total =
    dueCommitments.reduce((s, c) => s + (c.amount || 0), 0) +
    openGoals.reduce((s, g) => s + goalContribFor(g, record), 0);
  return { commitments: dueCommitments, goals: openGoals, total };
}

export function calcRemaining(salary, commitmentsTotal, goalsTotal) {
  return (salary || 0) - commitmentsTotal - goalsTotal;
}
