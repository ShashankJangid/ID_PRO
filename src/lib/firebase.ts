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
  apiKey: "AIzaSyBmGQOdp9agyTxgcFS_xMXI9pvoBF2fb1E",
  authDomain: "id-card-login.firebaseapp.com",
  projectId: "id-card-login",
  storageBucket: "id-card-login.firebasestorage.app",
  messagingSenderId: "196978536104",
  appId: "1:196978536104:web:a14cb81df8218191c31c9d",
  measurementId: "G-DL9NVBTLX9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── OAuth Providers ──────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
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
