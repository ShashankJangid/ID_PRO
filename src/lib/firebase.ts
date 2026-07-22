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

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── OAuth Providers ──────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

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
