import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🛡️ CRÍTICO C3 RESOLVIDO: Chaves escondidas! Agora o código lê as senhas do cofre da Vercel
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// 🔴 CRÍTICO C4 RESOLVIDO: Removido o parâmetro "undefined" que causava erro de conexão
export const db = getFirestore(app); 
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);
