import React from 'react';
import { Upload, Trash2, Settings } from 'lucide-react';
import type { CardTemplate } from '@/types';
import { readFileAsBase64 } from '@/lib/file-utils';

interface TemplatePropertiesPanelProps {
  currentTemplate: CardTemplate;
  onUpdateTemplate: (template: CardTemplate) => void;
}

export const TemplatePropertiesPanel: React.FC<TemplatePropertiesPanelProps> = ({
  currentTemplate,
  onUpdateTemplate,
}) => {
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      const updated = { ...currentTemplate };
      if (side === 'front') {
        updated.backgroundImage = base64;
      } else {
        updated.backgroundImageBack = base64;
      }
      onUpdateTemplate(updated);
    } catch (err) {
      console.error('Failed to read background image:', err);
    }
  };

  const handleBgRemove = (side: 'front' | 'back') => {
    const updated = { ...currentTemplate };
    if (side === 'front') {
      updated.backgroundImage = undefined;
    } else {
      updated.backgroundImageBack = undefined;
    }
    onUpdateTemplate(updated);
  };

  const handleNameChange = (name: string) => {
    onUpdateTemplate({ ...currentTemplate, name });
  };

  return (
    <div className="w-72 glass-panel border-l border-gray-200/10 overflow-y-auto select-none">
      <div className="p-4 flex flex-col h-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/10">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-emerald-550" />
            Template Settings
          </h3>
        </div>

        {/* Template Name */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Template Name
          </label>
          <input
            type="text"
            value={currentTemplate.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. My ID Template"
            className="w-full px-2.5 py-1.5 glass-input rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        {/* Front Background */}
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Front Background Image
          </label>
          {currentTemplate.backgroundImage ? (
            <div className="border border-gray-200/10 rounded-lg p-2.5 bg-gray-500/5 space-y-2">
              <div className="relative aspect-[3/4] max-h-36 bg-gray-500/10 rounded-md overflow-hidden border border-gray-200/10">
                <img
                  src={currentTemplate.backgroundImage}
                  alt="Front background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <label className="flex-1 px-3 py-1.5 glass-btn rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center cursor-pointer transition-colors flex items-center justify-center gap-1 hover:text-emerald-500">
                  <Upload className="w-3.5 h-3.5" />
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBgUpload(e, 'front')}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => handleBgRemove('front')}
                  className="px-2.5 py-1.5 border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-600 hover:text-red-500 rounded-lg transition-colors"
                  title="Remove Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-xl p-6 cursor-pointer transition-all group">
              <div className="w-9 h-9 bg-gray-500/10 group-hover:bg-emerald-500/20 text-gray-400 group-hover:text-emerald-500 rounded-full flex items-center justify-center transition-all mb-2">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-gray-750 dark:text-gray-200">Upload Image</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Supports PNG, JPG</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBgUpload(e, 'front')}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Back Background */}
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Back Background Image
          </label>
          {currentTemplate.backgroundImageBack ? (
            <div className="border border-gray-200/10 rounded-lg p-2.5 bg-gray-500/5 space-y-2">
              <div className="relative aspect-[3/4] max-h-36 bg-gray-500/10 rounded-md overflow-hidden border border-gray-200/10">
                <img
                  src={currentTemplate.backgroundImageBack}
                  alt="Back background"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <label className="flex-1 px-3 py-1.5 glass-btn rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center cursor-pointer transition-colors flex items-center justify-center gap-1 hover:text-emerald-500">
                  <Upload className="w-3.5 h-3.5" />
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBgUpload(e, 'back')}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => handleBgRemove('back')}
                  className="px-2.5 py-1.5 border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-600 hover:text-red-500 rounded-lg transition-colors"
                  title="Remove Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-xl p-6 cursor-pointer transition-all group">
              <div className="w-9 h-9 bg-gray-500/10 group-hover:bg-emerald-500/20 text-gray-400 group-hover:text-emerald-500 rounded-full flex items-center justify-center transition-all mb-2">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-gray-750 dark:text-gray-200">Upload Image</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Supports PNG, JPG</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBgUpload(e, 'back')}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Canvas Specifications Info */}
        <div className="pt-4 border-t border-gray-200/10 space-y-2">
          <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Canvas Info
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-650 dark:text-gray-300 bg-gray-500/5 rounded-lg p-2.5 border border-gray-200/5">
            <div>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-medium">Width</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{currentTemplate.cardWidth} px</span>
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-medium">Height</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{currentTemplate.cardHeight} px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePropertiesPanel;
