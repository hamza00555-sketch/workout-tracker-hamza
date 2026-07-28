import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore, isFirebaseConfigured } from './firebase.js';
import * as db from '../db/index.js';
import { buildRushdFinanceBundle, SalaryMissingError, settingsToObj } from './rushdBundle.js';
import { currentMonth } from '../utils/format.js';

const FINGERPRINT_KEY = 'ratebi_rushd_fp';
const PENDING_KEY = 'ratebi_rushd_pending';

async function computeFingerprint(bundle) {
  // Exclude exportedAt so identical financial data always produces the same hash
  const { exportedAt, ...financial } = bundle;
  const text = JSON.stringify(financial);
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: djb2-style hash
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
}

function loadFingerprint() {
  try { return localStorage.getItem(FINGERPRINT_KEY); } catch { return null; }
}
function saveFingerprint(fp) {
  try { localStorage.setItem(FINGERPRINT_KEY, fp); } catch {}
}
export function hasPendingSync() {
  try { return !!localStorage.getItem(PENDING_KEY); } catch { return false; }
}
function markPending() {
  try { localStorage.setItem(PENDING_KEY, '1'); } catch {}
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

/**
 * Sync راتبي data to Firestore users/{uid}/ratibiSync/{yyyy-mm}.
 * @param {object} opts
 * @param {boolean} opts.force - bypass fingerprint check (manual sync)
 * @param {import('firebase/auth').User|null} opts.user - authenticated user from the auth listener
 * @returns {{ status: string, syncedAt?: string, errorKey?: string }}
 */
export async function syncToRushd({ force = false, user = null } = {}) {
  if (!isFirebaseConfigured) return { status: 'unconfigured' };

  const activeUser = user ?? auth?.currentUser;
  if (!activeUser) return { status: 'disconnected' };

  if (!navigator.onLine) {
    markPending();
    return { status: 'offline' };
  }

  const month = currentMonth();
  const exportedAt = new Date().toISOString();

  try {
    const rawSnapshot = await db.exportAll();

    const bundle = buildRushdFinanceBundle({
      rawSnapshot,
      month,
      displayName: activeUser.displayName,
      exportedAt,
    });

    const fp = await computeFingerprint(bundle);
    const lastFp = loadFingerprint();

    if (!force && fp === lastFp) {
      return { status: 'connected', noChange: true };
    }

    await setDoc(
      doc(firestore, 'users', activeUser.uid, 'ratibiSync', bundle.month),
      {
        sourceApp: 'ratibi',
        sourceVersion: 1,
        bundle,
        updatedAt: serverTimestamp(),
      },
    );

    saveFingerprint(fp);
    clearPending();

    return { status: 'connected', syncedAt: exportedAt };

  } catch (err) {
    if (err instanceof SalaryMissingError) {
      return { status: 'error', errorKey: 'no-salary' };
    }
    if (
      err?.code === 'permission-denied' ||
      err?.code === 'firestore/permission-denied'
    ) {
      return { status: 'error', errorKey: 'permission' };
    }
    if (!navigator.onLine) {
      markPending();
      return { status: 'offline' };
    }
    return { status: 'error', errorKey: 'unknown' };
  }
}
