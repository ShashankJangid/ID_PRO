import { lazy, Suspense, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { onAuthChange, signOutUser, type User } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Toast from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import './App.css';

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
  const { activeTab, showToast, hasSetup } = useAppStore(
    useShallow((s) => ({ activeTab: s.activeTab, showToast: s.showToast, hasSetup: s.hasSetup }))
  );

  // ─── Auth State ───
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // ─── Initialize built-in templates ───
  useEffect(() => {
    const { templates: existingTemplates } = useAppStore.getState();
    if (existingTemplates.length === 0) {
      import('@/templates/built-in').then(({ getBuiltInTemplates }) => {
        const builtIns = getBuiltInTemplates();
        builtIns.forEach((t) => useAppStore.getState().addTemplate(t));
      });
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>}>
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
