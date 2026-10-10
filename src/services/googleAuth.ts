import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const env = ((import.meta as unknown) as { env?: Record<string, string> }).env || {};

export const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig);
const auth = getAuth(app);

export const getFirebaseConsoleSettingsUrl = () => {
  return `https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId}/authentication/settings`;
};

export const isUnauthorizedDomainError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === 'auth/unauthorized-domain' ||
    (typeof err.message === 'string' && err.message.includes('auth/unauthorized-domain'))
  );
};

export const getCurrentHostname = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname;
  }
  return '';
};

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token for Sheets');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logoutGoogle = async () => {
  await fbSignOut(auth);
  cachedAccessToken = null;
};
