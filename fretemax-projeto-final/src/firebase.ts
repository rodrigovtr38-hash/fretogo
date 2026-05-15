import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

import { getStorage } from 'firebase/storage';

// ======================================================
// VALIDAÇÃO SEGURA DAS ENVS
// ======================================================

const requiredEnvVars = [
  'VITE_FB_API_KEY',
  'VITE_FB_AUTH_DOMAIN',
  'VITE_FB_PROJECT_ID',
  'VITE_FB_STORAGE_BUCKET',
  'VITE_FB_MESSAGING_SENDER_ID',
  'VITE_FB_APP_ID',
];

requiredEnvVars.forEach((envName) => {
  if (!import.meta.env[envName]) {
    throw new Error(
      `❌ Firebase ENV ausente: ${envName}. Verifique as variáveis da Vercel.`,
    );
  }
});

// ======================================================
// CONFIG FIREBASE
// ======================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

// ======================================================
// INIT APP
// ======================================================

const app = initializeApp(firebaseConfig);

// ======================================================
// AUTH
// ======================================================

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('❌ Erro ao configurar persistência Auth:', error);
});

// ======================================================
// GOOGLE PROVIDER
// ======================================================

export const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account',
});

// ======================================================
// FIRESTORE ENTERPRISE SETUP
// ======================================================

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ======================================================
// STORAGE
// ======================================================

export const storage = getStorage(app);

export default app;
