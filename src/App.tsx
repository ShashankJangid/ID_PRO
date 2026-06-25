import { lazy, Suspense, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, switchStoreUser } from '@/store';
import { onAuthChange, signOutUser, type User } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import './App.css';
import './card_export_fix.css';

// Lazy-loaded components:
const Dashboard = lazy(() => import('@/components/Dashboard'));
const OrganizationSetup = lazy(() => import('@/components/OrganizationSetup'));
const TemplateGallery = lazy(() => import('@/components/TemplateGallery'));
const CardDesigner = lazy(() => import('@/components/CardDesigner'));
const DataImport = lazy(() => import('@/components/DataImport'));
const PreviewExport = lazy(() => import('@/components/PreviewExport'));
const HelpDialog = lazy(() => import('@/components/HelpDialog'));
const LoginPage = lazy(() => import('@/components/LoginPage'));

const LoadingFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
  </div>
);

function App() {
  const { activeTab, showToast, hasSetup, darkMode, themeColor, themeGradientColor } = useAppStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      showToast: s.showToast,
      hasSetup: s.hasSetup,
      darkMode: s.darkMode,
      themeColor: s.themeColor,
      themeGradientColor: s.themeGradientColor,
    }))
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const hexToHSL = (hex: string) => {
      hex = hex.replace(/^#/, '');
      let r = parseInt(hex.substring(0, 2), 16) / 255;
      let g = parseInt(hex.substring(2, 4), 16) / 255;
      let b = parseInt(hex.substring(4, 6), 16) / 255;
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let h = 0, s = 0;
      let l = (max + min) / 2;
      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      };
    };

    const p = hexToHSL(themeColor);
    document.documentElement.style.setProperty('--primary-h', `${p.h}`);
    document.documentElement.style.setProperty('--primary-s', `${p.s}%`);
    document.documentElement.style.setProperty('--primary-l', `${p.l}%`);

    const gr = hexToHSL(themeGradientColor);
    document.documentElement.style.setProperty('--gradient-h', `${gr.h}`);
    document.documentElement.style.setProperty('--gradient-s', `${gr.s}%`);
    document.documentElement.style.setProperty('--gradient-l', `${gr.l}%`);

    // Dynamically generate dynamic SVG Favicon with active colors
    const generateFavicon = (primary: string, gradient: string) => {
      const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${gradient}" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <style>
      .spin {
        animation: spin 25s linear infinite;
        transform-origin: 50px 50px;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
  </defs>
  <g class="spin">
    <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#orbitGrad)" stroke-width="2.2" opacity="0.85" filter="url(#logoGlow)" />
    <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#orbitGrad)" stroke-width="2.2" opacity="0.85" transform="rotate(60 50 50)" filter="url(#logoGlow)" />
    <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#orbitGrad)" stroke-width="2.2" opacity="0.85" transform="rotate(120 50 50)" filter="url(#logoGlow)" />
    <circle cx="50" cy="50" r="4" fill="url(#orbitGrad)" filter="url(#logoGlow)" />
  </g>
  <g transform="translate(32, 26) rotate(-8)">
    {/* Drop shadow */}
    <rect x="1" y="1" width="35" height="48" rx="4.5" fill="rgba(0,0,0,0.12)" />
    {/* Card base with gradient border */}
    <rect x="0" y="0" width="35" height="48" rx="4.5" fill="url(#cardGrad)" stroke="url(#orbitGrad)" stroke-width="1.2" />
    {/* Card top branding line */}
    <rect x="2" y="2" width="31" height="5" rx="1.5" fill="url(#orbitGrad)" opacity="0.9" />
    {/* Smart Chip */}
    <rect x="4" y="10" width="8" height="6.5" rx="1.5" fill="url(#chipGrad)" stroke="#b45309" stroke-width="0.4" />
    {/* Name and title lines */}
    <rect x="14" y="11" width="17" height="2" rx="0.5" fill="url(#orbitGrad)" opacity="0.85" />
    <rect x="14" y="14" width="11" height="1.5" rx="0.5" fill="#64748b" />
    {/* Avatar box */}
    <rect x="4" y="20" width="11" height="13" rx="1.5" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5" />
    <circle cx="9.5" cy="24" r="2.2" fill="#94a3b8" />
    <path d="M 5.5 31 Q 9.5 28 13.5 31" fill="#94a3b8" />
    {/* Info lines */}
    <rect x="18" y="21" width="13" height="1.5" rx="0.5" fill="#64748b" />
    <rect x="18" y="24" width="10" height="1.5" rx="0.5" fill="#94a3b8" />
    <rect x="18" y="27" width="8" height="1.5" rx="0.5" fill="#cbd5e1" />
    {/* Barcode section */}
    <rect x="4" y="37" width="27" height="6.5" rx="1" fill="#fafafa" stroke="#e2e8f0" stroke-width="0.4" />
    <g opacity="0.85">
      <line x1="6.5" y1="39" x2="6.5" y2="41.5" stroke="#334155" stroke-width="1.2" />
      <line x1="9" y1="39" x2="9" y2="41.5" stroke="#334155" stroke-width="0.5" />
      <line x1="11" y1="39" x2="11" y2="41.5" stroke="#334155" stroke-width="1.8" />
      <line x1="13.5" y1="39" x2="13.5" y2="41.5" stroke="#334155" stroke-width="0.5" />
      <line x1="15.5" y1="39" x2="15.5" y2="41.5" stroke="#334155" stroke-width="1.2" />
      <line x1="18" y1="39" x2="18" y2="41.5" stroke="#334155" stroke-width="0.5" />
      <line x1="20.5" y1="39" x2="20.5" y2="41.5" stroke="#334155" stroke-width="1.5" />
      <line x1="23.5" y1="39" x2="23.5" y2="41.5" stroke="#334155" stroke-width="0.5" />
      <line x1="25.5" y1="39" x2="25.5" y2="41.5" stroke="#334155" stroke-width="1.2" />
      <line x1="28.5" y1="39" x2="28.5" y2="41.5" stroke="#334155" stroke-width="0.8" />
    </g>
  </g>
</svg>
      `.trim();

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
      }
      link.href = url;
    };

    generateFavicon(themeColor, themeGradientColor);
  }, [themeColor, themeGradientColor]);

  // ─── Auth State ───
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (u) => {
      if (u) {
        await switchStoreUser(u.uid);
        const isLoggingIn = sessionStorage.getItem('logging_in') === 'true';
        if (isLoggingIn) {
          sessionStorage.removeItem('logging_in');
          setTimeout(() => {
            setUser(u);
            setAuthLoading(false);
          }, 1200);
        } else {
          setUser(u);
          setAuthLoading(false);
        }
      } else {
        await switchStoreUser(null);
        setUser(null);
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, []);



  // ─── Welcome toast ───
  useEffect(() => {
    if (user && !hasSetup) {
      const timer = setTimeout(() => {
        showToast(`Welcome ${user.displayName || ''}! Start by setting up your organization.`, 'info');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, hasSetup, showToast]);

  // ─── Loading state ───
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── Not signed in ───
  if (!user) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)]"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>}>
          <LoginPage onLogin={() => {}} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <Dashboard />;
      case 'organization': return <OrganizationSetup />;
      case 'templates':   return <TemplateGallery />;
      case 'designer':    return <CardDesigner />;
      case 'data':        return <DataImport />;
      case 'preview':     return <PreviewExport />;
      default:            return <Dashboard />;
    }
  };

  return (
    <>
      <Layout user={user} onSignOut={signOutUser}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {renderContent()}
          </Suspense>
        </ErrorBoundary>
      </Layout>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <HelpDialog />
        </Suspense>
      </ErrorBoundary>
      <Toast />
    </>
  );
}

export default App;
