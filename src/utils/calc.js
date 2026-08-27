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

export function calcGoalsMonthlyTotal(goals) {
  return goals.filter(g => !g.completed).reduce((s, g) => s + (g.monthlyContribution || 0), 0);
}

export function calcRemaining(salary, commitmentsTotal, goalsTotal) {
  return (salary || 0) - commitmentsTotal - goalsTotal;
}
