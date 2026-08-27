import { auth, firebaseProjectId, isFirebaseConfigured } from './firebase.js';
import * as db from '../db/index.js';
import { buildRushdFinanceBundle, SalaryMissingError, settingsToObj } from './rushdBundle.js';
import { currentMonth } from '../utils/format.js';

const FINGERPRINT_KEY = 'ratebi_rushd_fp';
const PENDING_KEY = 'ratebi_rushd_pending';
const WRITE_TIMEOUT_MS = 20000;

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value)
            .filter(([, nested]) => nested !== undefined)
            .map(([key, nested]) => [key, firestoreValue(nested)]),
        ),
      },
    };
  }
  throw new TypeError(`Unsupported Firestore value: ${typeof value}`);
}

function firestoreFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, firestoreValue(nested)]),
  );
}

async function writeBundle(activeUser, bundle) {
  const idToken = await activeUser.getIdToken();
  const documentName = [
    'projects',
    firebaseProjectId,
    'databases',
    '(default)',
    'documents',
    'users',
    activeUser.uid,
    'ratibiSync',
    bundle.month,
  ].join('/');
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}` +
    '/databases/(default)/documents:commit';
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WRITE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: documentName,
              fields: firestoreFields({
                sourceApp: 'ratibi',
                sourceVersion: 1,
                bundle,
              }),
            },
            updateTransforms: [
              {
                fieldPath: 'updatedAt',
                setToServerValue: 'REQUEST_TIME',
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Firestore REST write failed (${response.status})`);
      error.code = response.status === 401 || response.status === 403
        ? 'permission-denied'
        : 'firestore-rest-error';
      throw error;
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

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

    await writeBundle(activeUser, bundle);

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
