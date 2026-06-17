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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, setShowHelp]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 id="help-guide-title" className="text-lg font-bold text-gray-900">Help & Guide</h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            aria-label="Close help guide"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Getting Started</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              IDCard Studio helps you create professional ID cards for any organization. Follow these steps to generate your cards:
            </p>
          </section>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">1. Set up your Organization</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  Go to the Organization tab and enter your company/school details including name, address, logo, brand colors, and signatures. These details will appear on all your cards.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">2. Choose a Template</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  Browse the Template Gallery with 6+ pre-built designs for schools, corporates, hospitals, events, and more. Click any template to preview and select it.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">3. Import Card Data</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  Upload an Excel or CSV file with your card data. Map the columns to the appropriate fields (Name, Code, etc.). You can also enter data manually.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <PenTool className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">4. Customize (Optional)</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  Use the Designer tab to customize your template. Move elements, change colors, add text, images, shapes, or QR codes. Your changes are saved as a new custom template.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">5. Preview & Export</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                  Preview your cards in the Preview & Export tab. Export individual cards or all cards at once as PDF, PNG images, or print directly.
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <section className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Pro Tips</h3>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                Use square photos (1:1 ratio) for best results on card layouts.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                For bulk export, PDF format combines front and back in one file per person.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                Duplicate any built-in template to create your own customized version.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                All your data is saved locally in your browser - nothing is uploaded to any server.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 font-bold">&bull;</span>
                The Excel importer supports .xlsx, .xls, and .csv formats with auto column detection.
              </li>
            </ul>
          </section>

          {/* Excel format */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Excel File Format</h3>
            <p className="text-sm text-gray-600 mb-2">
              Your Excel file should have headers in the first row. Supported column names (case-insensitive):
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
              <div className="bg-gray-50 px-2 py-1 rounded">Name / Full Name / Student Name</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Code / Emp Code / Roll No / ID</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Role / Designation / Class / Department</div>
              <div className="bg-gray-50 px-2 py-1 rounded">DOB / Date of Birth / Birth Date</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Blood / Blood Group</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Contact / Phone / Mobile</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Address / Addr</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Issue / Issued / Issued On</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Valid / Valid Up To / Expiry</div>
              <div className="bg-gray-50 px-2 py-1 rounded">Emergency / Emergency Contact</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpDialog;
