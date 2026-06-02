import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { getBuiltInTemplates } from '@/templates/built-in';
import { onAuthChange, signOutUser, type User } from '@/lib/firebase';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import OrganizationSetup from '@/components/OrganizationSetup';
import TemplateGallery from '@/components/TemplateGallery';
import CardDesigner from '@/components/CardDesigner';
import DataImport from '@/components/DataImport';
import PreviewExport from '@/components/PreviewExport';
import HelpDialog from '@/components/HelpDialog';
import Toast from '@/components/Toast';
import LoginPage from '@/components/LoginPage';
import { Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const { activeTab, showToast, hasSetup } = useAppStore();

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
      const builtIns = getBuiltInTemplates();
      builtIns.forEach((t) => useAppStore.getState().addTemplate(t));
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
    return <LoginPage onLogin={() => {}} />;
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
        {renderContent()}
      </Layout>
      <HelpDialog />
      <Toast />
    </>
  );
}

export default App;
