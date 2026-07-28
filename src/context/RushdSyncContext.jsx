import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase.js';
import { syncToRushd, hasPendingSync } from '../lib/rushdSync.js';
import { useApp } from './AppContext.jsx';

const RushdSyncContext = createContext(null);
export const useRushdSync = () => useContext(RushdSyncContext);

const ARABIC_ERRORS = {
  'auth/user-not-found':      'لم نجد حساب رُشد بهذا البريد. أنشئ حسابك في رُشد أولاً.',
  'auth/wrong-password':      'البريد أو كلمة المرور غير صحيحة.',
  'auth/invalid-credential':  'البريد أو كلمة المرور غير صحيحة.',
  'auth/invalid-email':       'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/too-many-requests':   'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
  'auth/unauthorized-domain': 'نطاق راتبي غير مضاف إلى Firebase Authentication.',
  'no-salary':                'أكمل إعداد الراتب في راتبي قبل ربط رُشد.',
  'permission':               'تعذر حفظ المزامنة في حساب رُشد. تحقق من إعدادات الربط.',
  'unknown':                  'حدث خطأ غير متوقع. اضغط «زامن الآن» للمحاولة.',
};

function arabicError(code) {
  return ARABIC_ERRORS[code] ?? ARABIC_ERRORS['unknown'];
}

export function RushdSyncProvider({ children }) {
  const { settings, commitments, goals, banks, debts, extraIncome, monthlyRecords } = useApp();

  const [status, setStatus] = useState(isFirebaseConfigured ? 'disconnected' : 'unconfigured');
  const [rushdUser, setRushdUser] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);
  const hasMounted = useRef(false);
  const activeUserRef = useRef(null);

  // ── Firebase auth listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!auth) {
      setStatus('unconfigured');
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      activeUserRef.current = user;
      setRushdUser(user);
      if (user) {
        setError(null);
        doSync(true, user);
      } else {
        setStatus('disconnected');
        setLastSyncedAt(null);
      }
    });
    return unsub;
  }, []);

  // ── Reconnect: flush pending sync ─────────────────────────────────────────
  useEffect(() => {
    function handleOnline() {
      const user = activeUserRef.current;
      if (user && hasPendingSync()) doSync(false, user);
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // ── Debounced auto-sync on data changes ───────────────────────────────────
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const user = activeUserRef.current;
    if (!user) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSync(false, user), 1500);
    return () => clearTimeout(debounceTimer.current);
  }, [settings, commitments, goals, banks, debts, extraIncome, monthlyRecords]);

  async function doSync(force, user) {
    const u = user ?? activeUserRef.current;
    if (!u) return;
    setStatus('syncing');
    const result = await syncToRushd({ force });
    if (result.status === 'connected') {
      setStatus('connected');
      setError(null);
      if (result.syncedAt) setLastSyncedAt(result.syncedAt);
    } else if (result.status === 'offline') {
      setStatus('offline');
    } else if (result.status === 'error') {
      setStatus('error');
      setError(arabicError(result.errorKey));
    }
  }

  const login = useCallback(async (email, password) => {
    if (!auth) return { ok: false, error: arabicError('unknown') };
    setStatus('connecting');
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged handles state update
      return { ok: true };
    } catch (err) {
      const msg = arabicError(err.code);
      setStatus('disconnected');
      setError(msg);
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    clearTimeout(debounceTimer.current);
    await signOut(auth);
    activeUserRef.current = null;
    setRushdUser(null);
    setStatus('disconnected');
    setLastSyncedAt(null);
    setError(null);
  }, []);

  const syncNow = useCallback(() => doSync(true, activeUserRef.current), []);

  return (
    <RushdSyncContext.Provider value={{
      status,
      rushdUser,
      lastSyncedAt,
      error,
      login,
      logout,
      syncNow,
      isConfigured: isFirebaseConfigured,
    }}>
      {children}
    </RushdSyncContext.Provider>
  );
}
