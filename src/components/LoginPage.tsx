import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import {
  signInWithGoogle,
  signInWithGithub,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  setupRecaptcha,
  sendOTP,
  type ConfirmationResult,
} from '@/lib/firebase';
import {
  Github,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import iitjLogo from '@/assets/iitj_logo.png';
import dpsLogo from '@/assets/dps_logo.png';
import RobotAvatar from './shared/RobotAvatar';
import Logo from './shared/Logo';

// ── Google Icon ──────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { darkMode } = useAppStore(
    useShallow((s) => ({
      darkMode: s.darkMode,
    }))
  );
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ── Cursor spotlight state ──
  const cursorPos = useRef({ x: 0, y: 0 });
  const smoothPos = useRef({ x: 0, y: 0 });
  const bgRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!darkMode) {
      if (bgRef.current) {
        bgRef.current.style.background = '#f8fafc';
      }
      return;
    }

    // Default center so spotlight is visible before any mouse move
    cursorPos.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    smoothPos.current = { ...cursorPos.current };

    const onMove = (e: MouseEvent) => {
      cursorPos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    // Silky smooth lerp tracking
    const lerpFn = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      smoothPos.current.x = lerpFn(smoothPos.current.x, cursorPos.current.x, 0.07);
      smoothPos.current.y = lerpFn(smoothPos.current.y, cursorPos.current.y, 0.07);
      if (bgRef.current) {
        const { x, y } = smoothPos.current;
        // Three-layer dark green cursor glow:
        // 1. Tight bright emerald core  2. Wide forest-green halo  3. Ambient deep teal wash
        bgRef.current.style.background = [
          `radial-gradient(350px circle at ${x}px ${y}px,`,
          `  rgba(16,185,129, 0.18) 0%,`,
          `  rgba(5,150,105, 0.10) 40%,`,
          `  transparent 70%),`,
          `radial-gradient(800px circle at ${x}px ${y}px,`,
          `  rgba(4,120,87, 0.11) 0%,`,
          `  rgba(2,78,58, 0.06) 50%,`,
          `  transparent 75%),`,
          `radial-gradient(1400px circle at ${x}px ${y}px,`,
          `  rgba(6,95,70, 0.07) 0%,`,
          `  transparent 65%),`,
          `#000000`,
        ].join('');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [darkMode]);


  // ── Social loading ──
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  // ── Email state ──
  const [emailMode, setEmailMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // ── Phone state ──
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<any>(null);

  // ── Shared error/success ──
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear messages on mode switch
  useEffect(() => {
    setError('');
    setSuccess('');
    setResetSent(false);
  }, [isPhoneMode, emailMode]);

  const isLoading = emailLoading || socialLoading !== null || phoneLoading;

  // ── Handlers: Social ────────────────────────────────────────
  const handleGoogle = async () => {
    setSocialLoading('google');
    setError('');
    try {
      await signInWithGoogle();
      setIsSuccess(true);
      sessionStorage.setItem('logging_in', 'true');
      setTimeout(() => {
        onLogin();
      }, 1200);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGithub = async () => {
    setSocialLoading('github');
    setError('');
    try {
      await signInWithGithub();
      setIsSuccess(true);
      sessionStorage.setItem('logging_in', 'true');
      setTimeout(() => {
        onLogin();
      }, 1200);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('GitHub sign-in failed. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // ── Handlers: Email ─────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (emailMode === 'reset') {
      if (!email) return setError('Please enter your email address.');
      setEmailLoading(true);
      try {
        await resetPassword(email);
        setResetSent(true);
        setSuccess(`Password reset email sent to ${email}`);
      } catch (err: any) {
        setError(friendlyFirebaseError(err.code));
      } finally {
        setEmailLoading(false);
      }
      return;
    }

    if (!email || !password) return setError('Please fill in all fields.');
    if (emailMode === 'signup' && password !== confirmPassword)
      return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setEmailLoading(true);
    try {
      if (emailMode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      setIsSuccess(true);
      sessionStorage.setItem('logging_in', 'true');
      setTimeout(() => {
        onLogin();
      }, 1200);
    } catch (err: any) {
      setError(friendlyFirebaseError(err.code));
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Handlers: Phone ─────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone) return setError('Please enter a phone number.');
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+\d{7,15}$/.test(cleaned))
      return setError('Enter phone with country code, e.g. +91 98765 43210');

    setPhoneLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = setupRecaptcha('recaptcha-container');
      }
      const result = await sendOTP(cleaned, recaptchaRef.current);
      setConfirmation(result);
      setPhoneStep('otp');
    } catch (err: any) {
      setError(friendlyFirebaseError(err.code) || 'Failed to send OTP. Check the number and try again.');
      recaptchaRef.current = null;
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) return setError('Enter the 6-digit OTP.');
    if (!confirmation) return;

    setPhoneLoading(true);
    try {
      await confirmation.confirm(otp);
      setIsSuccess(true);
      sessionStorage.setItem('logging_in', 'true');
      setTimeout(() => {
        onLogin();
      }, 1200);
    } catch (err: any) {
      setError('Invalid OTP. Please check and try again.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Helper ───────────────────────────────────────────────────
  const friendlyFirebaseError = (code: string) => {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
      'auth/invalid-credential': 'Invalid credentials. Please check and retry.',
      'auth/invalid-verification-code': 'Wrong OTP code.',
      'auth/invalid-phone-number': 'Invalid phone number format.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  };

  return (
    <main
      ref={bgRef}
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-none"
      style={{ background: darkMode ? '#000000' : '#f8fafc', fontFamily: "'Inter', 'DM Sans', system-ui, -apple-system, sans-serif" }}
    >
      {/* Static faint grid overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 z-0"
        style={{
          backgroundImage: darkMode
            ? 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Ambient background decorative elements (glowing liquid blobs for Glassmorphism) */}
      <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-0 overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] animate-blob"
          style={{ background: darkMode ? 'hsla(var(--primary-h, 160), var(--primary-s, 84%), var(--primary-l, 39%), 0.08)' : 'hsla(var(--primary-h, 160), var(--primary-s, 84%), var(--primary-l, 39%), 0.04)' }} 
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[130px] animate-blob animation-delay-2000"
          style={{ background: darkMode ? 'hsla(calc(var(--primary-h, 160) + 40), var(--primary-s, 84%), var(--primary-l, 39%), 0.07)' : 'hsla(calc(var(--primary-h, 160) + 40), var(--primary-s, 84%), var(--primary-l, 39%), 0.03)' }} 
        />
        <div 
          className="absolute top-[40%] left-[50%] w-[35vw] h-[35vw] rounded-full blur-[110px] animate-blob animation-delay-4000"
          style={{ background: darkMode ? 'hsla(calc(var(--primary-h, 160) - 40), var(--primary-s, 84%), var(--primary-l, 39%), 0.06)' : 'hsla(calc(var(--primary-h, 160) - 40), var(--primary-s, 84%), var(--primary-l, 39%), 0.02)' }} 
        />
      </div>
      {/* Invisible reCAPTCHA anchor */}
      <div id="recaptcha-container" />

      <div className="relative z-10 w-full max-w-md md:max-w-5xl flex flex-col-reverse md:flex-row items-center justify-center gap-8 md:gap-16">
        
        {/* Left Center Panel: Marketing & Clients */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left text-slate-800 dark:text-white space-y-6">
          <div className="space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#34d399' }}>Enterprise Identity Suite</span>
            </div>
            <h2
              style={{
                fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                background: darkMode
                  ? 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 45%, #94a3b8 100%)'
                  : 'linear-gradient(135deg, #0f172a 0%, #334155 55%, #64748b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Design &amp; Generate<br />Cards Instantly
            </h2>
            <p
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '14px',
                lineHeight: '1.7',
                color: darkMode ? '#94a3b8' : '#475569',
                maxWidth: '360px',
                fontWeight: 400,
              }}
            >
              The ultimate enterprise identity card automation suite — minimize manpower, accelerate design speed, and integrate directly with your ERP.
            </p>
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
              {['⚡ Bulk Generation', '🔗 ERP Integration', '☁️ Cloud Sync', '🎨 Custom Templates'].map(f => (
                <span
                  key={f}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '11px',
                    fontWeight: 500,
                    color: darkMode ? '#cbd5e1' : '#334155',
                    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full border-t border-slate-800/60 pt-6">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-4">
              Trusted by Teams At
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
              {/* IIT Jodhpur */}
              <a
                href="https://www.iitj.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center md:items-start gap-1 group no-underline"
                title="Visit IIT Jodhpur"
              >
                <div className="h-16 w-36 flex items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-slate-200/50 dark:border-white/10 hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  <img
                    src={iitjLogo}
                    alt="Indian Institute of Technology Jodhpur"
                    className="max-h-12 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-xs font-bold text-slate-800 text-center">IIT Jodhpur</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition-colors font-semibold ml-1 flex items-center gap-0.5">
                  IIT Jodhpur
                  <svg width="9" height="9" viewBox="0 0 10 10" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>

              {/* DPS Indirapuram */}
              <a
                href="http://dpsindirapuram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center md:items-start gap-1 group no-underline"
                title="Visit DPS Indirapuram"
              >
                <div className="h-16 w-36 flex items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-slate-200/50 dark:border-white/10 hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  <img
                    src={dpsLogo}
                    alt="Delhi Public School Indirapuram"
                    className="max-h-12 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-xs font-bold text-slate-800 text-center">DPS Indirapuram</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition-colors font-semibold ml-1 flex items-center gap-0.5">
                  DPS Indirapuram
                  <svg width="9" height="9" viewBox="0 0 10 10" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card container */}
        <div className="w-full max-w-md flex flex-col">
          {/* Card */}
          <div 
            className="glass-card rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            style={{
              background: darkMode
                ? 'linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(3,3,3,0.92) 50%, rgba(8,8,8,0.95) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, hsla(var(--primary-h, 160), var(--primary-s, 84%), 98%, 0.55) 50%, rgba(255,255,255,0.94) 100%)',
            }}
          >
          
            {/* ── Gradient Header with Robot Avatar ── */}
            <div className="bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#141414] px-8 pt-8 pb-4 text-center relative overflow-hidden">
              {/* Glowing background blobs */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
                {/* Theme-synced Gradient Blobs in Header */}
                <div 
                  className="absolute -left-10 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full filter blur-3xl animate-pulse" 
                  style={{ background: 'linear-gradient(to bottom right, hsla(var(--primary-h, 160), var(--primary-s, 84%), var(--primary-l, 39%), 0.25), hsla(calc(var(--primary-h, 160) + 30), var(--primary-s, 84%), var(--primary-l, 39%), 0.12))' }}
                />
                <div 
                  className="absolute -right-10 top-1/3 -translate-y-1/2 w-56 h-56 rounded-full filter blur-3xl animate-pulse" 
                  style={{ animationDelay: '1.2s', background: 'linear-gradient(to bottom right, hsla(calc(var(--primary-h, 160) - 30), var(--primary-s, 84%), var(--primary-l, 39%), 0.2), hsla(var(--primary-h, 160), var(--primary-s, 84%), var(--primary-l, 39%), 0.08))' }} 
                />
              </div>
  
              {/* Robot Avatar */}
              <div className="relative z-10">
                <RobotAvatar
                  isPasswordFocused={isPasswordFocused}
                  isSuccess={isSuccess}
                  isLoading={isLoading}
                />
              </div>
  
              <div className="flex items-center justify-center gap-2 mt-2 relative z-10">
                <Logo className="w-6 h-6" />
                <h1 className="text-xl font-bold text-white tracking-wide">Card Gen</h1>
              </div>
              <p className="text-slate-400 dark:text-emerald-400 text-[10px] mt-0.5 font-semibold uppercase tracking-wider relative z-10">by JS AlphaSoft</p>
            </div>
  
            {/* ── Body ── */}
            <div className={`${darkMode ? 'login-dark-context' : ''} bg-gradient-to-b from-transparent to-emerald-500/5 dark:to-emerald-950/10 px-7 py-7`}>
            {/* Global error / success messages */}
            {error && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
                role="alert" aria-live="assertive"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
                {error}
              </div>
            )}
            {success && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
                style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.3)', color: '#6ee7b7' }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />
                {success}
              </div>
            )}

            {/* ══ PHONE LOGIN VIEW ════════════════════════════ */}
            {isPhoneMode ? (
              <div className="space-y-4">
                {phoneStep === 'input' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <p className="text-xs text-gray-500">Enter your phone number with country code to receive an OTP.</p>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        className="w-full pl-9 pr-4 py-2.5 glass-input rounded-xl text-sm outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 glass-btn bg-emerald-600/90 hover:bg-emerald-600 hover:scale-[1.01] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-md"
                    >
                      {phoneLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Send OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="text-center pb-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-800">OTP Sent!</p>
                      <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to <span className="font-medium text-gray-700">{phone}</span></p>
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="······"
                      className="w-full text-center tracking-[0.6em] text-xl font-bold py-3 glass-input rounded-xl outline-none transition-all"
                    />

                    <button
                      type="submit"
                      disabled={phoneLoading || otp.length < 6}
                      className="w-full flex items-center justify-center gap-2 py-2.5 glass-btn bg-emerald-600/90 hover:bg-emerald-600 hover:scale-[1.01] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-md"
                    >
                      {phoneLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Verify & Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPhoneStep('input'); setOtp(''); setError(''); recaptchaRef.current = null; }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change number
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ══ EMAIL & PASSWORD PRIMARY VIEW ═══════════════ */
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Sign In / Sign Up Mode selector */}
                <div
                  className="flex rounded-xl p-1 gap-1 mb-2 transition-all duration-200"
                  style={{
                    background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                    border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)'
                  }}
                >
                  {(['signin', 'signup'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => { setEmailMode(m); setError(''); setSuccess(''); }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={emailMode === m
                        ? {
                            background: darkMode ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.15)',
                            color: darkMode ? '#34d399' : '#059669',
                            boxShadow: darkMode ? '0 1px 4px rgba(52,211,153,0.15)' : '0 1px 4px rgba(16,185,129,0.1)'
                          }
                        : {
                            color: darkMode ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.75)'
                          }
                      }
                    >
                      {m === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                {/* Email field */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 glass-input rounded-xl text-sm outline-none transition-all"
                    disabled={emailMode === 'reset' && resetSent}
                  />
                </div>

                {/* Password field */}
                {emailMode !== 'reset' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Password"
                      autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full pl-9 pr-10 py-2.5 glass-input rounded-xl text-sm outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full transition-colors z-10 outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Confirm Password (only for Sign Up) */}
                {emailMode === 'signup' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 glass-input rounded-xl text-sm outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full transition-colors z-10 outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Submit Email Button */}
                <button
                  type="submit"
                  disabled={emailLoading || (emailMode === 'reset' && resetSent)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 glass-btn bg-emerald-600/90 hover:bg-emerald-600 hover:scale-[1.01] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                >
                  {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {emailMode === 'signin' && 'Sign In with Email'}
                  {emailMode === 'signup' && 'Create Account'}
                  {emailMode === 'reset' && (resetSent ? 'Email Sent ✓' : 'Send Reset Email')}
                </button>

                {/* Forgot password */}
                {emailMode === 'signin' && (
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <button
                      type="button"
                      onClick={() => setEmailMode('reset')}
                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </p>
                )}

                {/* Back from Reset */}
                {emailMode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => { setEmailMode('signin'); setResetSent(false); }}
                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to Sign In
                  </button>
                )}
              </form>
            )}

            {/* ══ DIVIDER ═════════════════════════════════════ */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/50 dark:border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-wider font-semibold">
                <span className="px-3 py-1 bg-slate-500/10 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200/50 dark:border-white/10 backdrop-blur-sm">Or continue with</span>
              </div>
            </div>

            {/* ══ SOCIAL SIGN-IN OPTIONS ══════════════════════ */}
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 glass-btn rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:scale-[1.01]"
              >
                {socialLoading === 'google' ? <Loader2 className="w-4 h-4 animate-spin text-slate-800 dark:text-white" /> : <GoogleIcon />}
                Sign In with Google
              </button>

              <button
                type="button"
                onClick={handleGithub}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 glass-btn bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                {socialLoading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                Sign In with GitHub
              </button>
            </div>

            {/* ══ SECONDARY VIEW SWITCHER ══════════════════════ */}
            <div className="text-center mt-5 pt-3 border-t border-slate-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => { setIsPhoneMode(!isPhoneMode); setError(''); setSuccess(''); }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-semibold transition-colors"
              >
                {isPhoneMode ? 'Sign In with Email & Password' : 'Sign In with Phone Number'}
              </button>
            </div>

            {/* Footer Note */}
            <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 mt-6">
              By signing in you agree to our{' '}
              <span className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Terms</span>{' '}
              and{' '}
              <span className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Privacy Policy</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          Card Gen · All data synced with your cloud account
        </p>
      </div>
    </div>
    </main>
  );
};

export default LoginPage;
