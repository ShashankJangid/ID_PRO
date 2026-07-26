// ============================================================
// Firebase configuration
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or select existing)
// 3. Go to Project Settings > General > Your apps > Add app (Web)
// 4. Copy the firebaseConfig object below
// 5. In Firebase Console > Authentication > Sign-in method > enable:
//    - Google
//    - GitHub
//    - Email/Password
//    - Phone
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics, logEvent, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type User,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "id-card-login.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "id-card-login",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "id-card-login.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "196978536104",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:196978536104:web:a14cb81df8218191c31c9d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DL9NVBTLX9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ── Firebase Analytics & Performance Monitoring ───────────────────
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
      try { getPerformance(app); } catch (e) {}
    }
  }).catch(() => {});
}

export const trackAnalyticsEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analyticsInstance) {
    try { logEvent(analyticsInstance, eventName, eventParams); } catch (e) {}
  }
};

// ── Firebase Remote Config ─────────────────────────────────────────
export const remoteConfig = typeof window !== 'undefined' ? getRemoteConfig(app) : null;
if (remoteConfig) {
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
  remoteConfig.defaultConfig = {
    announcement_banner: '',
    maintenance_mode: false,
  };
  fetchAndActivate(remoteConfig).catch(() => {});
}

export const getRemoteConfigValue = (key: string): string => {
  if (!remoteConfig) return '';
  try {
    return getValue(remoteConfig, key).asString();
  } catch (e) {
    return '';
  }
};

// ── Firebase Cloud Storage Helper ──────────────────────────────────
export const uploadAssetToStorage = async (
  userId: string,
  file: File | Blob,
  path: string
): Promise<string> => {
  const storageRef = ref(storage, `users/${userId}/${path}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

// ── OAuth Providers ──────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const githubProvider = new GithubAuthProvider();
export const signInWithGithub = () => signInWithPopup(auth, githubProvider);

// ── Email / Password ─────────────────────────────────────────
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

// ── Phone (SMS OTP) ──────────────────────────────────────────
export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  });
  return verifier;
};

export const sendOTP = (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> =>
  signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);

// ── Common ────────────────────────────────────────────────────
export const signOutUser = () => signOut(auth);
export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

export type { User, ConfirmationResult };
