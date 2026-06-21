import React, { useMemo, useState } from 'react';
import {
  Building2,
  Palette,
  Database,
  Eye,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import BotGuide from './shared/BotGuide';

const Dashboard: React.FC = () => {
  const { hasSetup, organization, activeTemplateId, cardDataList, setActiveTab, templates } = useAppStore(
    useShallow((s) => ({
      hasSetup: s.hasSetup,
      organization: s.organization,
      activeTemplateId: s.activeTemplateId,
      cardDataList: s.cardDataList,
      setActiveTab: s.setActiveTab,
      templates: s.templates,
    }))
  );

  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId),
    [templates, activeTemplateId]
  );

  const steps = [
    {
      id: 'org',
      title: 'Set up Organization',
      desc: 'Configure your company/school details, logo, and branding colors.',
      icon: Building2,
      color: 'purple',
      done: hasSetup,
      action: () => setActiveTab('organization'),
    },
    {
      id: 'template',
      title: 'Choose a Template',
      desc: 'Select from 6+ pre-built designs or create your own custom template.',
      icon: Palette,
      color: 'blue',
      done: !!activeTemplateId,
      action: () => setActiveTab('templates'),
    },
    {
      id: 'data',
      title: 'Import Card Data',
      desc: 'Upload Excel/CSV files, connect your ERP API, or enter card details manually.',
      icon: Database,
      color: 'amber',
      done: cardDataList.length > 1,
      action: () => setActiveTab('data'),
    },
    {
      id: 'export',
      title: 'Preview & Export',
      desc: 'Preview your cards and export as PDF, PNG, or print directly.',
      icon: Eye,
      color: 'primary',
      done: false,
      action: () => setActiveTab('preview'),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = (doneCount / steps.length) * 100;

  const colorMap: Record<string, { bg: string; icon: string; ring: string; bar: string }> = {
    purple:  { bg: 'bg-purple-500/10 dark:bg-purple-500/15', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-500/20', bar: 'bg-purple-500' },
    blue:    { bg: 'bg-blue-500/10 dark:bg-blue-500/15',   icon: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-500/20',   bar: 'bg-blue-500'   },
    amber:   { bg: 'bg-amber-500/10 dark:bg-amber-500/15',  icon: 'text-amber-600 dark:text-amber-400',  ring: 'ring-amber-500/20',  bar: 'bg-amber-500'  },
    primary: { bg: 'bg-primary-500/10 dark:bg-primary-500/15', icon: 'text-primary',                  ring: 'ring-primary/20',                       bar: 'bg-primary'    },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Hero Header ── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 p-6 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-24 h-24 rounded-full bg-teal-400/20 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">Welcome to Card Gen</h1>
            </div>
            <p className="text-emerald-100 text-sm max-w-lg leading-relaxed">
              Create professional ID cards for any organization — schools, offices, hospitals, events, and more.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <BotGuide
              hasSetup={hasSetup}
              hasTemplate={!!activeTemplateId}
              hasData={cardDataList.length > 1}
            />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Templates', value: templates.length, icon: Palette, color: 'blue', sub: 'available' },
          { label: 'Card Records', value: cardDataList.length, icon: Users, color: 'primary', sub: 'imported' },
          { label: 'Organization', value: hasSetup ? '1' : '0', icon: Building2, color: 'purple', sub: 'configured' },
          { label: 'Status', value: activeTemplate ? 'Ready' : 'Pending', icon: FileText, color: 'amber', sub: activeTemplate ? '✓ all set' : 'needs setup' },
        ].map(({ label, value, icon: Icon, color, sub }) => {
          const c = colorMap[color];
          return (
            <div
              key={label}
              className="glass-panel rounded-2xl border border-slate-200/50 dark:border-white/10 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              {/* Top color bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 ${c.bg} ring-4 ${c.ring} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-[hsl(215,16%,50%)] mt-0.5">{label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-[hsl(215,16%,40%)] mt-0.5">{sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick Start Steps ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Quick Start Guide</h2>
        <span className="text-xs text-gray-400 dark:text-[hsl(215,16%,40%)] font-medium">{doneCount} of {steps.length} completed</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-500/10 dark:bg-white/5 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === step.id;
          const isCurrent = !step.done && (idx === 0 || steps[idx - 1].done);
          const c = colorMap[step.color];

          return (
            <div
              key={step.id}
              className={`glass-panel rounded-2xl border transition-all duration-200 overflow-hidden
                ${step.done
                  ? 'border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : isCurrent
                    ? 'border-slate-350 dark:border-white/20 shadow-md ring-1 ring-emerald-500/30 dark:ring-emerald-500/20'
                    : 'border-slate-200/50 dark:border-white/5 opacity-80'
                }
                hover:shadow-md hover:-translate-y-0.5
              `}
            >
              {/* Main row ─ always visible, clickable to expand */}
              <button
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                aria-expanded={isExpanded}
              >
                {/* Step number / icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                    ${step.done ? 'bg-emerald-500/15 dark:bg-emerald-500/25' : isCurrent ? `${c.bg} ring-4 ${c.ring} ${isCurrent ? 'animate-pulse' : ''}` : 'bg-slate-500/10 dark:bg-white/5'}
                  `}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isCurrent ? c.icon : 'text-gray-400 dark:text-[hsl(215,16%,40%)]'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${step.done ? 'text-emerald-500' : 'text-gray-400 dark:text-[hsl(215,16%,40%)]'}`}>
                      Step {idx + 1}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                        Next
                      </span>
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold mt-0.5 ${step.done ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                    {step.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); step.action(); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all glass-btn
                      ${step.done
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/40 border-emerald-500/30'
                        : isCurrent
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 shadow-sm border-transparent'
                          : 'bg-slate-500/5 dark:bg-white/5 text-gray-500 dark:text-[hsl(215,16%,50%)] hover:bg-slate-500/10 dark:hover:bg-white/10'
                      }`}
                  >
                    {step.done ? 'Edit' : 'Start'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-[hsl(215,16%,40%)]" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-[hsl(215,16%,40%)]" />
                  }
                </div>
              </button>

              {/* Expandable description */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-white/5">
                  <p className={`text-xs leading-relaxed mt-3 ${step.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-[hsl(215,16%,50%)]'}`}>
                    {step.desc}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Setup Summary ── */}
      {(hasSetup || activeTemplateId) && (
        <div className="mt-8 relative rounded-2xl overflow-hidden shadow-lg border border-white/20">
          {/* Glassmorphism bg */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-sm" />

          {/* Decorative */}
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              Your Setup Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {hasSetup && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                  <p className="text-emerald-200 text-[10px] uppercase tracking-wider font-semibold">Organization</p>
                  <p className="font-semibold text-white text-sm mt-0.5 truncate">{organization.name}</p>
                </div>
              )}
              {activeTemplate && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                  <p className="text-emerald-200 text-[10px] uppercase tracking-wider font-semibold">Active Template</p>
                  <p className="font-semibold text-white text-sm mt-0.5 truncate">{activeTemplate.name}</p>
                </div>
              )}
              {cardDataList.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5">
                  <p className="text-emerald-200 text-[10px] uppercase tracking-wider font-semibold">Records</p>
                  <p className="font-semibold text-white text-sm mt-0.5">{cardDataList.length} card(s) ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
