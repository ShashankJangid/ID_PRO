import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';

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
      done: hasSetup,
      action: () => setActiveTab('organization'),
    },
    {
      id: 'template',
      title: 'Choose a Template',
      desc: 'Select from 6+ pre-built designs or create your own custom template.',
      icon: Palette,
      done: !!activeTemplateId,
      action: () => setActiveTab('templates'),
    },
    {
      id: 'data',
      title: 'Import Card Data',
      desc: 'Upload Excel/CSV files or enter card details manually.',
      icon: Database,
      done: cardDataList.length > 1,
      action: () => setActiveTab('data'),
    },
    {
      id: 'export',
      title: 'Preview & Export',
      desc: 'Preview your cards and export as PDF, PNG, or print directly.',
      icon: Eye,
      done: false,
      action: () => setActiveTab('preview'),
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Card Gen</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Create professional ID cards for any organization — schools, offices, hospitals, events, and more.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{templates.length}</p>
              <p className="text-xs text-gray-500">Templates</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{cardDataList.length}</p>
              <p className="text-xs text-gray-500">Card Records</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{hasSetup ? '1' : '0'}</p>
              <p className="text-xs text-gray-500">Organization</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{activeTemplate ? 'Ready' : 'Pending'}</p>
              <p className="text-xs text-gray-500">Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Steps */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Start Guide</h2>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`bg-white rounded-xl border ${step.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200'} p-4 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {step.done ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Icon className={`w-6 h-6 ${idx === 0 || (idx > 0 && steps[idx - 1].done) ? 'text-gray-700' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold ${step.done ? 'text-emerald-800' : 'text-gray-900'}`}>
                    {idx + 1}. {step.title}
                  </h3>
                  <p className={`text-xs mt-0.5 ${step.done ? 'text-emerald-600' : 'text-gray-500'}`}>{step.desc}</p>
                </div>
                <button
                  onClick={step.action}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${step.done
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                >
                  {step.done ? 'Edit' : 'Start'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Status */}
      {(hasSetup || activeTemplateId) && (
        <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
          <h3 className="text-base font-bold mb-2">Your Setup Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {hasSetup && (
              <div>
                <p className="text-emerald-100 text-xs uppercase tracking-wider">Organization</p>
                <p className="font-semibold">{organization.name}</p>
              </div>
            )}
            {activeTemplate && (
              <div>
                <p className="text-emerald-100 text-xs uppercase tracking-wider">Active Template</p>
                <p className="font-semibold">{activeTemplate.name}</p>
              </div>
            )}
            {cardDataList.length > 0 && (
              <div>
                <p className="text-emerald-100 text-xs uppercase tracking-wider">Records</p>
                <p className="font-semibold">{cardDataList.length} card(s) ready</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
