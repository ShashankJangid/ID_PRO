import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Palette,
  PenTool,
  Database,
  Eye,
  HelpCircle,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import type { AppTab } from '@/types';
import type { User } from '@/lib/firebase';
import sidebarLogo from '@/assets/sidebar_logo.png';

const navItems: {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  requiresSetup?: boolean;
  requiresTemplate?: boolean;
}[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'templates', label: 'Templates', icon: Palette },
    { id: 'designer', label: 'Designer', icon: PenTool, requiresTemplate: true },
    { id: 'data', label: 'Data Import', icon: Database },
    { id: 'preview', label: 'Preview & Export', icon: Eye, requiresTemplate: true },
  ];

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onSignOut: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onSignOut }) => {
  const { activeTab, setActiveTab, hasSetup, activeTemplateId, organization, showToast } =
    useAppStore(
      useShallow((s) => ({
        activeTab: s.activeTab,
        setActiveTab: s.setActiveTab,
        hasSetup: s.hasSetup,
        activeTemplateId: s.activeTemplateId,
        organization: s.organization,
        showToast: s.showToast,
      }))
    );

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.requiresSetup && !hasSetup) {
      showToast('Please set up your organization first!', 'error');
      setActiveTab('organization');
      return;
    }
    if (item.requiresTemplate && !activeTemplateId) {
      showToast('Please select a template first!', 'error');
      setActiveTab('templates');
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm p-1.5 border border-gray-100">
              <img src={sidebarLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Card Gen</h1>
              <p className="text-[10px] text-gray-400 font-medium">Card Generator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled =
              (item.requiresSetup && !hasSetup) ||
              (item.requiresTemplate && !activeTemplateId);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                disabled={isDisabled}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-emerald-600' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-emerald-500" />}
              </button>
            );
          })}
        </nav>

        {/* Organization quick info */}
        {hasSetup && organization.name && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              {organization.logo ? (
                <img
                  src={organization.logo}
                  alt=""
                  className="w-7 h-7 rounded object-contain bg-white"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{organization.name}</p>
                <p className="text-[10px] text-gray-400 truncate">
                  {organization.tagline || 'Organization'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help + user */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-1">
          <button
            onClick={() => useAppStore.getState().setShowHelp(true)}
            aria-label="Open Help & Guide"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <HelpCircle className="w-4.5 h-4.5" />
            <span>Help & Guide</span>
          </button>

          {/* Signed-in user row */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
