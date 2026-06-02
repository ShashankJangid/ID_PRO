import React, { useState } from 'react';
import { signInWithGoogle, signInWithGithub } from '@/lib/firebase';
import { Layers, Github, AlertCircle, Loader2 } from 'lucide-react';

// Google SVG icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading('google');
    setError('');
    try {
      await signInWithGoogle();
      onLogin();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleGithub = async () => {
    setLoading('github');
    setError('');
    try {
      await signInWithGithub();
      onLogin();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('GitHub sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ID Pro</h1>
            <p className="text-emerald-100 text-sm mt-1">Design. Import. Export.</p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to continue to your workspace</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {loading === 'google' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>

              {/* GitHub */}
              <button
                onClick={handleGithub}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border-2 border-gray-900 rounded-xl text-sm font-semibold text-white hover:bg-gray-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === 'github' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                Continue with GitHub
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              By signing in you agree to our{' '}
              <span className="text-emerald-600 cursor-pointer hover:underline">Terms</span>{' '}
              and{' '}
              <span className="text-emerald-600 cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          ID Pro · All data stored locally in your browser
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
