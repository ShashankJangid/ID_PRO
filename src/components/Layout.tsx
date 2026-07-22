import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  Palette,
  PenTool,
  Database,
  Eye,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import type { User } from '@/lib/firebase';
import Logo from './shared/Logo';

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'organization', label: 'Organization',     icon: Building2 },
  { id: 'templates',    label: 'Templates',        icon: Palette },
  { id: 'designer',     label: 'Designer',         icon: PenTool,    requiresTemplate: true },
  { id: 'data',         label: 'Data Import',      icon: Database },
  { id: 'preview',      label: 'Preview & Export', icon: Eye,        requiresTemplate: true },
];

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onSignOut: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onSignOut }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorType, setColorType] = useState<'solid' | 'gradient'>(() => {
    return (localStorage.getItem('cardgen_accent_type') as 'solid' | 'gradient') || 'solid';
  });
  const [gradientAccent, setGradientAccent] = useState<string>(() => {
    return localStorage.getItem('cardgen_gradient_accent') || 'linear-gradient(135deg, #10b981, #14b8a6)';
  });

  const toggleColorType = (type: 'solid' | 'gradient') => {
    setColorType(type);
    localStorage.setItem('cardgen_accent_type', type);
  };

  const selectGradientAccent = (gradStr: string, primaryHex: string) => {
    setGradientAccent(gradStr);
    localStorage.setItem('cardgen_gradient_accent', gradStr);
    setThemeColor(primaryHex);
  };

  const bgRef = useRef<HTMLDivElement>(null);

  const { activeTab, setActiveTab, hasSetup, activeTemplateId, organization, showToast, darkMode, setDarkMode, themeColor, setThemeColor } =
    useAppStore(
      useShallow((s) => ({
        activeTab:             s.activeTab,
        setActiveTab:          s.setActiveTab,
        hasSetup:              s.hasSetup,
        activeTemplateId:      s.activeTemplateId,
        organization:          s.organization,
        showToast:             s.showToast,
        darkMode:              s.darkMode,
        setDarkMode:           s.setDarkMode,
        themeColor:            s.themeColor,
        setThemeColor:         s.setThemeColor,
      }))
    );

  useEffect(() => {
    if (!darkMode) {
      if (bgRef.current) {
        bgRef.current.style.background = '';
      }
      return;
    }

    const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const smoothPos = { ...cursorPos };
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      cursorPos.x = e.clientX;
      cursorPos.y = e.clientY;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      smoothPos.x = lerp(smoothPos.x, cursorPos.x, 0.08);
      smoothPos.y = lerp(smoothPos.y, cursorPos.y, 0.08);
      if (bgRef.current) {
        const { x, y } = smoothPos;
        bgRef.current.style.background = [
          `radial-gradient(600px circle at ${x}px ${y}px,`,
          `  hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.06) 0%,`,
          `  hsla(var(--primary-h), var(--primary-s), calc(var(--primary-l) - 5%), 0.03) 35%,`,
          `  transparent 70%),`,
          `radial-gradient(1200px circle at ${x}px ${y}px,`,
          `  hsla(var(--gradient-h), var(--gradient-s), var(--gradient-l, 50%), 0.04) 0%,`,
          `  transparent 60%),`,
          `#000000`,
        ].join('');
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, [darkMode]);

  const toggleTheme = (isDark: boolean) => {
    if (isDark === darkMode) return;
    const docT = document as any;
    if (!docT.startViewTransition) { setDarkMode(isDark); return; }
    docT.startViewTransition(() => setDarkMode(isDark));
  };

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if ((item as any).requiresSetup && !hasSetup) {
      showToast('Please set up your organization first!', 'error');
      setActiveTab('organization');
      return;
    }
    if (item.requiresTemplate && !activeTemplateId) {
      showToast('Please select a template first!', 'error');
      setActiveTab('templates');
      return;
    }
    setActiveTab(item.id as import('@/types').AppTab);
  };

  const userInitial = (user.displayName || user.email || '?')[0].toUpperCase();

  return (
    <div ref={bgRef} className="flex h-screen w-screen bg-slate-50 dark:bg-black overflow-hidden transition-colors duration-300 relative">

      {/* Sidebar Wrapper */}
      <div className="relative flex-shrink-0 z-40 flex">
        <aside
          className={`
            ${collapsed ? 'w-16' : 'w-64'}
            glass-panel
            border-r border-slate-200/50 dark:border-white/10
            shadow-[4px_0_24px_0_rgba(0,0,0,0.03)] dark:shadow-[8px_0_32px_0_rgba(0,0,0,0.25)]
            flex flex-col relative z-10
            transition-all duration-300 ease-in-out
            overflow-hidden rounded-none
          `}
          style={{ background: darkMode ? 'rgba(10, 10, 10, 0.45)' : 'rgba(255, 255, 255, 0.45)' }}
        >
          {/* Top gradient strip */}
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-teal-500 flex-shrink-0" />

          {/* Logo area */}
          <div className="px-3 py-4 border-b border-slate-200/50 dark:border-white/10 flex-shrink-0">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center flex-shrink-0">
                <Logo className="w-full h-full" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">Card Gen</h1>
                  <p className="text-[10px] text-gray-400 dark:text-[hsl(215,16%,45%)] font-medium whitespace-nowrap">Card Generator</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive   = activeTab === item.id;
              const isDisabled = ((item as any).requiresSetup && !hasSetup) || (item.requiresTemplate && !activeTemplateId);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  disabled={isDisabled}
                  className={`
                    sidebar-nav-item
                    w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200 relative
                    ${collapsed ? 'justify-center px-0' : 'px-3'}
                    ${
                      isActive
                        ? colorType === 'gradient'
                          ? 'border-l-4 text-white font-semibold shadow-sm backdrop-blur-sm'
                          : 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                        : isDisabled
                          ? 'text-gray-300 dark:text-[hsl(224,71%,20%)] cursor-not-allowed border-l-4 border-transparent'
                          : 'text-gray-600 dark:text-[hsl(213,31%,65%)] hover:bg-slate-500/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white border-l-4 border-transparent'
                    }
                  `}
                  style={isActive && colorType === 'gradient' ? { background: gradientAccent, borderLeftColor: themeColor } : undefined}
                >
                  <Icon
                    className={`flex-shrink-0 w-[18px] h-[18px] ${
                      isActive   ? 'text-emerald-600 dark:text-emerald-400'
                      : isDisabled ? 'text-gray-300 dark:text-[hsl(224,71%,20%)]'
                                  : 'text-gray-500 dark:text-[hsl(213,31%,50%)]'
                    }`}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {isActive && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Organization row */}
          {hasSetup && organization.name && !collapsed && (
            <div className="px-4 py-3 border-t border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                {organization.logo ? (
                  <img src={organization.logo} alt="" className="w-7 h-7 rounded object-contain bg-white flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-[hsl(213,31%,80%)] truncate">{organization.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-[hsl(215,16%,45%)] truncate">{organization.tagline || 'Organization'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom section */}
          <div className="px-2 py-3 border-t border-slate-200/50 dark:border-white/5 space-y-2 flex-shrink-0">
            {/* Theme switcher */}
            {!collapsed ? (
              <div className="space-y-3 px-1">
                <div className="theme-switch-container">
                  <div className="theme-switch-slider" />
                  <button
                    onClick={() => toggleTheme(false)}
                    className={`theme-switch-btn ${!darkMode ? 'active' : ''}`}
                    aria-label="Light mode"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => toggleTheme(true)}
                    className={`theme-switch-btn ${darkMode ? 'active' : ''}`}
                    aria-label="Dark mode"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                </div>

                {/* Collapsible Color Picker Toggle Header */}
                <div className="px-1 pt-1">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-[hsl(213,31%,60%)] bg-slate-500/5 dark:bg-white/5 hover:bg-slate-500/10 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 transition-all duration-200"
                    title={showColorPicker ? "Hide Color Section" : "Show Color Section"}
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border border-gray-300 dark:border-slate-700 overflow-hidden relative flex-shrink-0 animate-pulse" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor})` }}>
                        <Palette className="w-2 h-2 text-white mix-blend-difference" />
                      </div>
                      <span>{showColorPicker ? 'Hide Colors' : 'Accent Colors'}</span>
                    </span>
                    {showColorPicker ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Collapsible Colors Content */}
                <div
                  className={`transition-all duration-350 ease-in-out overflow-hidden ${
                    showColorPicker
                      ? 'max-h-48 opacity-100 mt-2 px-1'
                      : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="space-y-2 py-1">
                    {/* Segmented Control Pill: Solid vs Gradient */}
                    <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleColorType('solid')}
                        className={`py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          colorType === 'solid'
                            ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-xs'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleColorType('gradient')}
                        className={`py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          colorType === 'gradient'
                            ? 'bg-white dark:bg-emerald-600 text-gray-900 dark:text-white shadow-xs'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 inline-block" />
                        Gradient
                      </button>
                    </div>

                    {/* Color Swatches */}
                    {colorType === 'solid' ? (
                      <div className="flex items-center justify-between px-1 pt-1">
                        {[
                          { hex: '#4285f4', label: 'Google Blue' },
                          { hex: '#0f9d58', label: 'Google Green' },
                          { hex: '#ea4335', label: 'Google Red' },
                          { hex: '#a142f4', label: 'Google Purple' },
                          { hex: '#0f172a', label: 'Midnight Obsidian' },
                        ].map((color) => (
                          <button
                            key={color.hex}
                            onClick={() => setThemeColor(color.hex)}
                            title={color.label}
                            className={`w-4 h-4 rounded-full border transition-all duration-150 hover:scale-110 flex-shrink-0 cursor-pointer ${
                              themeColor.toLowerCase() === color.hex.toLowerCase()
                                ? 'border-gray-900 dark:border-white ring-2 ring-primary/20 scale-110'
                                : 'border-gray-200 dark:border-slate-800'
                            }`}
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                        <div
                          className={`relative w-4 h-4 rounded-full overflow-hidden border transition-all duration-150 hover:scale-110 flex-shrink-0 cursor-pointer ${
                            !['#4285f4', '#0f9d58', '#ea4335', '#a142f4', '#0f172a'].includes(themeColor.toLowerCase())
                              ? 'border-gray-900 dark:border-white ring-2 ring-primary/20 scale-110'
                              : 'border-gray-200 dark:border-slate-800'
                          }`}
                          style={{ background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)' }}
                          title="Custom primary color spectrum"
                        >
                          <input
                            type="color"
                            value={themeColor}
                            onChange={(e) => setThemeColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-1 pt-1">
                        {[
                          { name: 'Google Quantum Blue-Purple', grad: 'linear-gradient(135deg, #4285f4, #9b51e0)', primary: '#4285f4' },
                          { name: 'Google Emerald Mint', grad: 'linear-gradient(135deg, #0f9d58, #00c853)', primary: '#0f9d58' },
                          { name: 'Google Sunset Flame', grad: 'linear-gradient(135deg, #ea4335, #ff6d00)', primary: '#ea4335' },
                          { name: 'Google Cosmic Violet', grad: 'linear-gradient(135deg, #a142f4, #e040fb)', primary: '#a142f4' },
                          { name: 'Midnight Obsidian', grad: 'linear-gradient(135deg, #0f172a, #1e293b)', primary: '#0f172a' },
                        ].map((g) => (
                          <button
                            key={g.name}
                            type="button"
                            title={g.name}
                            onClick={() => selectGradientAccent(g.grad, g.primary)}
                            className={`w-4 h-4 rounded-full border transition-all duration-150 hover:scale-110 flex-shrink-0 cursor-pointer ${
                              gradientAccent === g.grad
                                ? 'border-gray-900 dark:border-white ring-2 ring-primary/20 scale-110'
                                : 'border-gray-200 dark:border-slate-800'
                            }`}
                            style={{ background: g.grad }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => toggleTheme(!darkMode)}
                  title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
                  aria-label={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
                  className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center text-gray-500 dark:text-[hsl(213,31%,70%)] hover:text-gray-900 dark:hover:text-white transition-all shadow-xs"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                </button>
              </div>
            )}

            {/* Help */}
            <button
              onClick={() => useAppStore.getState().setShowHelp(true)}
              title={collapsed ? 'Help & Guide' : undefined}
              aria-label="Help & Guide"
              className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-[hsl(215,16%,50%)] hover:bg-slate-500/5 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <HelpCircle className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>Help & Guide</span>}
            </button>

            {/* User row */}
            <div className={`pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {userInitial}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 mx-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-[hsl(213,31%,80%)] truncate">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-gray-400 dark:text-[hsl(215,16%,45%)] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Sign out"
                    aria-label="Sign out"
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-[hsl(215,16%,45%)] hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Toggle button ─ Fully functioning hit box z-50 */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            absolute top-6 -right-3.5 z-50
            w-7 h-7 rounded-full
            bg-white dark:bg-[hsl(222,47%,12%)]
            border border-slate-300 dark:border-slate-700
            shadow-lg
            flex items-center justify-center
            text-gray-700 dark:text-gray-200
            hover:text-emerald-600 dark:hover:text-emerald-400
            hover:scale-110 active:scale-95
            transition-all duration-200
            cursor-pointer pointer-events-auto
          "
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <main className="flex-1 overflow-y-auto bg-transparent transition-colors duration-300 relative z-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
