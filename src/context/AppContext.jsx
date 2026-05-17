import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as db from '../db/index.js';
import { currentMonth, uid, todayISO, monthFromDate, formatAmount } from '../utils/format.js';
import { calcGoalMonthly } from '../utils/calc.js';
import { checkCommitmentsAndNotify, showRandomTipIfDue, registerPeriodicSync } from '../utils/notifications.js';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const DEFAULT_SETTINGS = {
  salary: 0, salaryDay: 25, currency: 'ريال',
  onboardingComplete: false,
};

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [commitments, setCommitments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [banks, setBanks] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [debts, setDebts] = useState([]);
  const [extraIncome, setExtraIncome] = useState([]);
  const [page, setPage] = useState('loading');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [s, c, g, b, mr, dbt, ei] = await Promise.all([
      db.getAllSettings(),
      db.getCommitments(),
      db.getGoals(),
      db.getBanks(),
      db.getMonthlyRecords(),
      db.getDebts(),
      db.getExtraIncome(),
    ]);
    const merged = { ...DEFAULT_SETTINGS, ...s };
    setSettings(merged);
    setCommitments(c);
    setGoals(g);
    setBanks(b);
    setMonthlyRecords(mr);
    setDebts(dbt);
    setExtraIncome(ei.sort((a, z) => z.date.localeCompare(a.date)));

    if (!merged.onboardingComplete) {
      setPage('onboarding');
    } else {
      const month = currentMonth();
      const hasRecord = mr.some(r => r.month === month);
      const today = new Date().getDate();
      if (!hasRecord && today >= merged.salaryDay) {
        setPage('salaryDay');
      } else {
        setPage('dashboard');
      }
    }

    if (merged.lockEnabled && merged.pinHash) {
      setLocked(true);
    } else {
      // No lock — run notifications immediately on load
      if (merged.onboardingComplete) {
        checkCommitmentsAndNotify(c);
        showRandomTipIfDue();
        registerPeriodicSync();
      }
    }
    setLoading(false);
  }

  const updateSettings = useCallback(async (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    for (const [k, v] of Object.entries(updates)) await db.setSetting(k, v);
  }, [settings]);

  const addCommitment = useCallback(async (data) => {
    const item = { id: uid(), active: true, ...data };
    await db.saveCommitment(item);
    setCommitments(prev => [...prev, item]);
    return item;
  }, []);

  const updateCommitment = useCallback(async (item) => {
    await db.saveCommitment(item);
    setCommitments(prev => prev.map(c => c.id === item.id ? item : c));
  }, []);

  const deleteCommitment = useCallback(async (id) => {
    await db.deleteCommitment(id);
    setCommitments(prev => prev.filter(c => c.id !== id));
  }, []);

  const addGoal = useCallback(async (data) => {
    const item = { id: uid(), savedAmount: 0, completed: false, ...data };
    item.monthlyContribution = data.monthlyContribution ?? calcGoalMonthly(item);
    await db.saveGoal(item);
    setGoals(prev => [...prev, item]);
    return item;
  }, []);

  const updateGoal = useCallback(async (item) => {
    await db.saveGoal(item);
    setGoals(prev => prev.map(g => g.id === item.id ? item : g));
  }, []);

  const deleteGoal = useCallback(async (id) => {
    await db.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  const addGoalAmount = useCallback(async (id, amount) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const updated = { ...goal, savedAmount: (goal.savedAmount || 0) + amount };
    if (updated.savedAmount >= updated.targetAmount) updated.completed = true;
    await db.saveGoal(updated);
    setGoals(prev => prev.map(g => g.id === id ? updated : g));
  }, [goals]);

  const addDebt = useCallback(async (data) => {
    const item = { id: uid(), paid: false, paidAmount: 0, ...data };
    await db.saveDebt(item);
    setDebts(prev => [...prev, item]);
    return item;
  }, []);

  const updateDebt = useCallback(async (item) => {
    await db.saveDebt(item);
    setDebts(prev => prev.map(d => d.id === item.id ? item : d));
  }, []);

  const deleteDebt = useCallback(async (id) => {
    await db.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
  }, []);

  const addExtraIncome = useCallback(async (data) => {
    await db.saveExtraIncome(data);
    setExtraIncome(prev => [data, ...prev]);
  }, []);

  const deleteExtraIncome = useCallback(async (id) => {
    await db.deleteExtraIncome(id);
    setExtraIncome(prev => prev.filter(e => e.id !== id));
  }, []);

  const addBank = useCallback(async (data) => {
    const item = { id: uid(), ...data };
    await db.saveBank(item);
    setBanks(prev => [...prev, item]);
    return item;
  }, []);

  const updateBank = useCallback(async (item) => {
    await db.saveBank(item);
    setBanks(prev => prev.map(b => b.id === item.id ? item : b));
  }, []);

  const deleteBank = useCallback(async (id) => {
    await db.deleteBank(id);
    setBanks(prev => prev.filter(b => b.id !== id));
  }, []);

  const togglePrivacy = useCallback(() => setPrivacyMode(v => !v), []);
  const fmt = useCallback((n) => privacyMode ? '••••' : formatAmount(n), [privacyMode]);

  const unlock = useCallback(() => {
    setLocked(false);
    // Run notification checks after successful unlock
    checkCommitmentsAndNotify(commitments);
    showRandomTipIfDue();
    registerPeriodicSync();
  }, [commitments]);

  // Auto-lock after 60 seconds in background
  useEffect(() => {
    if (!settings.lockEnabled || !settings.pinHash) return;
    let timer;
    const onHide = () => { timer = setTimeout(() => setLocked(true), 60_000); };
    const onShow = () => clearTimeout(timer);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide(); else onShow();
    });
    return () => { clearTimeout(timer); };
  }, [settings.lockEnabled, settings.pinHash]);

  const confirmSalaryDay = useCallback(async (record) => {
    await db.saveMonthlyRecord(record);
    setMonthlyRecords(prev => {
      const exists = prev.find(r => r.month === record.month);
      return exists ? prev.map(r => r.month === record.month ? record : r) : [...prev, record];
    });
    setPage('dashboard');
  }, []);

  const currentMonthRecord = monthlyRecords.find(r => r.month === currentMonth()) || null;

  return (
    <AppContext.Provider value={{
      loading, settings, commitments, goals, banks, monthlyRecords,
      debts, extraIncome,
      page, setPage, currentMonthRecord,
      privacyMode, togglePrivacy, fmt,
      locked, unlock,
      updateSettings, addCommitment, updateCommitment, deleteCommitment,
      addGoal, updateGoal, deleteGoal, addGoalAmount,
      addBank, updateBank, deleteBank,
      addDebt, updateDebt, deleteDebt,
      addExtraIncome, deleteExtraIncome,
      confirmSalaryDay,
    }}>
      {children}
    </AppContext.Provider>
  );
}
