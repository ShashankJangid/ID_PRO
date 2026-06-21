import React from 'react';
import { X, Building2, Palette, Database, PenTool, Eye, Lightbulb } from 'lucide-react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';

const HelpDialog: React.FC = () => {
  const { showHelp, setShowHelp } = useAppStore(
    useShallow((s) => ({ showHelp: s.showHelp, setShowHelp: s.setShowHelp }))
  );

  React.useEffect(() => {
    if (!showHelp) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowHelp(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, setShowHelp]);

  if (!showHelp) return null;

  const steps = [
    { icon: Building2, color: 'blue', bg: 'bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20', iconCls: 'text-blue-600 dark:text-blue-400', title: '1. Set up your Organization', desc: 'Go to the Organization tab and enter your company/school details including name, address, logo, brand colors, and signatures. These details will appear on all your cards.' },
    { icon: Palette,   color: 'emerald', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20', iconCls: 'text-emerald-600 dark:text-emerald-400', title: '2. Choose a Template', desc: 'Browse the Template Gallery with 6+ pre-built designs for schools, corporates, hospitals, events, and more. Click any template to preview and select it.' },
    { icon: Database,  color: 'purple', bg: 'bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20', iconCls: 'text-purple-600 dark:text-purple-400', title: '3. Import Card Data', desc: 'Upload an Excel or CSV file with your card data. Map the columns to the appropriate fields. You can also enter data manually.' },
    { icon: PenTool,   color: 'amber', bg: 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20', iconCls: 'text-amber-600 dark:text-amber-400', title: '4. Customize (Optional)', desc: 'Use the Designer tab to customize your template. Move elements, change colors, add text, images, shapes, or QR codes.' },
    { icon: Eye,       color: 'red', bg: 'bg-red-500/10 dark:bg-red-500/15 border border-red-500/20', iconCls: 'text-red-600 dark:text-red-400', title: '5. Preview & Export', desc: 'Preview your cards in the Preview & Export tab. Export individual cards or all cards at once as PDF, PNG images, or print directly.' },
  ];

  const excelCols = [
    'Name / Full Name / Student Name',
    'Code / Emp Code / Roll No / ID',
    'Role / Designation / Class / Department',
    'DOB / Date of Birth / Birth Date',
    'Blood / Blood Group',
    'Contact / Phone / Mobile',
    'Address / Addr',
    'Issue / Issued / Issued On',
    'Valid / Valid Up To / Expiry',
    'Emergency / Emergency Contact',
  ];

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/55 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="glass-card rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 id="help-guide-title" className="text-lg font-bold text-gray-900 dark:text-white">Help & Guide</h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            aria-label="Close help guide"
            className="p-2 hover:bg-slate-500/10 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500 dark:text-[hsl(215,16%,50%)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Getting Started</h3>
            <p className="text-sm text-gray-600 dark:text-[hsl(215,16%,55%)] leading-relaxed">
              Card Gen helps you create professional ID cards for any organization. Follow these steps to generate your cards:
            </p>
          </section>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map(({ icon: Icon, bg, iconCls, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconCls}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-[hsl(213,31%,88%)]">{title}</h4>
                  <p className="text-sm text-gray-500 dark:text-[hsl(215,16%,50%)] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <section className="bg-slate-500/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Pro Tips</h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-[hsl(215,16%,55%)]">
              {[
                'Use square photos (1:1 ratio) for best results on card layouts.',
                'For bulk export, PDF format combines front and back in one file per person.',
                'Duplicate any built-in template to create your own customized version.',
                'All your data is synced to your Firebase account — nothing is lost on logout.',
                'The Excel importer supports .xlsx, .xls, and .csv formats with auto column detection.',
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="text-emerald-500 font-bold">&bull;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          {/* Excel format */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Excel File Format</h3>
            <p className="text-sm text-gray-600 dark:text-[hsl(215,16%,55%)] mb-2">
              Your Excel file should have headers in the first row. Supported column names (case-insensitive):
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-[hsl(215,16%,50%)]">
              {excelCols.map((col) => (
                <div key={col} className="bg-slate-500/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-2 py-1 rounded">{col}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpDialog;
