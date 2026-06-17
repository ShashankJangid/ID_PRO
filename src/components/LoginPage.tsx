import React, { useState, useRef, useEffect } from 'react';
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
import logo from '@/assets/logo.png';

// ── Google Icon ──────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

type AuthTab = 'social' | 'email' | 'phone';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('social');

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

  // Clear messages on tab switch
  useEffect(() => {
    setError('');
    setSuccess('');
    setResetSent(false);
  }, [activeTab, emailMode]);

  // ── Handlers: Social ────────────────────────────────────────
  const handleGoogle = async () => {
    setSocialLoading('google');
    setError('');
    try {
      await signInWithGoogle();
      onLogin();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Google sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGithub = async () => {
    setSocialLoading('github');
    setError('');
    try {
      await signInWithGithub();
      onLogin();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError('GitHub sign-in failed. Please try again.');
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
      onLogin();
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
      onLogin();
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

  const tabs: { id: AuthTab; label: string; icon: React.ElementType }[] = [
    { id: 'social', label: 'Social', icon: () => <span className="text-base">🔗</span> },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'phone', label: 'Phone', icon: Phone },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Invisible reCAPTCHA anchor */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-gradient-to-br from-[#0a1628] via-[#0d2461] to-[#1a3a8f] px-8 py-8 text-center">
            <div
              className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 p-2"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
            >
              <img src={logo} alt="JS AlphaSoft" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Card Gen</h1>
            <p className="text-blue-200 text-xs mt-0.5 font-medium">by JS AlphaSoft</p>
          </div>

          {/* ── Tab switcher ── */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Body ── */}
          <div className="px-7 py-7">

            {/* Global error / success */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm" role="alert" aria-live="assertive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-4 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* ══ SOCIAL TAB ══════════════════════════════════ */}
            {activeTab === 'social' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 mb-4">Sign in with</p>

                <button
                  onClick={handleGoogle}
                  disabled={!!socialLoading}
                  aria-busy={socialLoading === 'google'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {socialLoading === 'google' ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <GoogleIcon />}
                  Continue with Google
                </button>

                <button
                  onClick={handleGithub}
                  disabled={!!socialLoading}
                  aria-busy={socialLoading === 'github'}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border-2 border-gray-900 rounded-xl text-sm font-semibold text-white hover:bg-gray-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {socialLoading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                  Continue with GitHub
                </button>
              </div>
            )}

            {/* ══ EMAIL TAB ═══════════════════════════════════ */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Mode selector */}
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-2">
                  {(['signin', 'signup'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => { setEmailMode(m); setError(''); setSuccess(''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        emailMode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
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
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    disabled={emailMode === 'reset' && resetSent}
                  />
                </div>

                {/* Password fields (hidden in reset mode) */}
                {emailMode !== 'reset' && (
                  <>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete={emailMode === 'signup' ? 'new-password' : 'current-password'}
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10 outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {emailMode === 'signup' && (
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                          className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10 outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={emailLoading || (emailMode === 'reset' && resetSent)}
                  aria-busy={emailLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {emailMode === 'signin' && 'Sign In with Email'}
                  {emailMode === 'signup' && 'Create Account'}
                  {emailMode === 'reset' && (resetSent ? 'Email Sent ✓' : 'Send Reset Email')}
                </button>

                {/* Forgot password link */}
                {emailMode === 'signin' && (
                  <p className="text-center text-xs text-gray-500">
                    <button
                      type="button"
                      onClick={() => setEmailMode('reset')}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </p>
                )}

                {/* Back from reset */}
                {emailMode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => { setEmailMode('signin'); setResetSent(false); }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to Sign In
                  </button>
                )}
              </form>
            )}

            {/* ══ PHONE TAB ═══════════════════════════════════ */}
            {activeTab === 'phone' && (
              <div className="space-y-4">
                {phoneStep === 'input' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <p className="text-sm text-gray-600">Enter your phone number with country code to receive an OTP.</p>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={phoneLoading}
                      aria-busy={phoneLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
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

                    {/* 6-digit OTP boxes */}
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="······"
                      className="w-full text-center tracking-[0.6em] text-xl font-bold py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />

                    <button
                      type="submit"
                      disabled={phoneLoading || otp.length < 6}
                      aria-busy={phoneLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-sm"
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
            )}

            {/* Footer note */}
            <p className="text-center text-[10px] text-gray-400 mt-6">
              By signing in you agree to our{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Terms</span>{' '}
              and{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Card Gen · All data stored locally in your browser
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
