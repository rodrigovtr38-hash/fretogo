// =========================================================
// NOME DO ARQUIVO: src/firebase.ts
// CTO-Log: Infraestrutura validada. Código compactado para eficiência de tokens da IA.
// =========================================================

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, indexedDBLocalPersistence, initializeAuth, setPersistence } from 'firebase/auth';
import { Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

/* =========================================================
   GLOBAL TYPES
========================================================= */
declare global {
  interface Window {
    __FRETOGO_FIREBASE_APP__?: FirebaseApp;
    __FRETOGO_FIRESTORE__?: Firestore;
    __FRETOGO_STORAGE__?: FirebaseStorage;
  }
}

/* =========================================================
   VALIDATE ENV
========================================================= */
const requiredEnvVars = [
  'VITE_FB_API_KEY', 'VITE_FB_AUTH_DOMAIN', 'VITE_FB_PROJECT_ID',
  'VITE_FB_STORAGE_BUCKET', 'VITE_FB_MESSAGING_SENDER_ID', 'VITE_FB_APP_ID',
];

requiredEnvVars.forEach((envName) => {
  if (!import.meta.env[envName]) {
    throw new Error(`❌ Firebase ENV ausente: ${envName}`);
  }
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

/* =========================================================
   FIREBASE APP SINGLETON
========================================================= */
function createFirebaseApp(): FirebaseApp {
  if (typeof window !== 'undefined' && window.__FRETOGO_FIREBASE_APP__) {
    return window.__FRETOGO_FIREBASE_APP__;
  }
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') window.__FRETOGO_FIREBASE_APP__ = firebaseApp;
  return firebaseApp;
}
export const app = createFirebaseApp();

/* =========================================================
   AUTH SINGLETON & PERSISTENCE
========================================================= */
export const auth = (() => {
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  }
})();

void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('❌ Erro persistência Auth:', error);
});

export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/* =========================================================
   FIRESTORE SINGLETON
========================================================= */
function createFirestore(): Firestore {
  if (typeof window !== 'undefined' && window.__FRETOGO_FIRESTORE__) {
    return window.__FRETOGO_FIRESTORE__;
  }
  const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (typeof window !== 'undefined') window.__FRETOGO_FIRESTORE__ = firestore;
  return firestore;
}
export const db = createFirestore();

/* =========================================================
   STORAGE SINGLETON
========================================================= */
function createStorage(): FirebaseStorage {
  if (typeof window !== 'undefined' && window.__FRETOGO_STORAGE__) {
    return window.__FRETOGO_STORAGE__;
  }
  const storageInstance = getStorage(app);
  if (typeof window !== 'undefined') window.__FRETOGO_STORAGE__ = storageInstance;
  return storageInstance;
}
export const storage = createStorage();

console.log('✅ Firebase CORE inicializado.');
export default app;
