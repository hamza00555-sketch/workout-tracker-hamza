import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

export const isFirebaseConfigured =
  typeof import.meta !== 'undefined' &&
  REQUIRED.every(k => import.meta.env?.[k]?.trim());

let _auth = null;
let _firestore = null;

if (isFirebaseConfigured) {
  const config = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = getApps().length ? getApps()[0] : initializeApp(config);

  const firebaseAuth = getAuth(app);
  firebaseAuth.languageCode = 'ar';
  setPersistence(firebaseAuth, browserLocalPersistence).catch(() =>
    setPersistence(firebaseAuth, browserSessionPersistence).catch(() => {})
  );
  _auth = firebaseAuth;

  try {
    _firestore = initializeFirestore(app, {
      // بعض شبكات الجوال والبروكسيات تحجب قناة Firestore الافتراضية وتترك
      // عملية الحفظ معلّقة. Long polling أكثر ثباتاً لهذا الربط المباشر.
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    try { _firestore = getFirestore(app); } catch {}
  }
}

export const auth = _auth;
export const firestore = _firestore;
