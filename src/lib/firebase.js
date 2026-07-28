import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';

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
let _projectId = null;

if (isFirebaseConfigured) {
  const config = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
  _projectId = config.projectId;

  const app = getApps().length ? getApps()[0] : initializeApp(config);

  const firebaseAuth = getAuth(app);
  firebaseAuth.languageCode = 'ar';
  setPersistence(firebaseAuth, browserLocalPersistence).catch(() =>
    setPersistence(firebaseAuth, browserSessionPersistence).catch(() => {})
  );
  _auth = firebaseAuth;
}

export const auth = _auth;
export const firebaseProjectId = _projectId;
