import React, { useState, useRef } from 'react';
import { Building2, Upload, Save, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import type { CustomFieldDef } from '@/types';

const OrganizationSetup: React.FC = () => {
  const { organization, updateOrganization, setHasSetup, showToast } = useAppStore();
  const [localOrg, setLocalOrg] = useState({ ...organization });
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(
    organization.customFields || []
  );
  const logoRef = useRef<HTMLInputElement>(null);
  const sig1Ref = useRef<HTMLInputElement>(null);
  const sig2Ref = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setLocalOrg((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileToBase64 = (file: File, callback: (b64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileToBase64(file, (b64) => handleChange('logo', b64));
  };

  const handleSig1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileToBase64(file, (b64) => handleChange('signature1', b64));
  };

  const handleSig2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileToBase64(file, (b64) => handleChange('signature2', b64));
  };

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { key: `custom${prev.length + 1}`, label: '', defaultValue: '' },
    ]);
  };

  const updateCustomField = (idx: number, updates: Partial<CustomFieldDef>) => {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...updates } : f))
    );
  };

  const removeCustomField = (idx: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    updateOrganization({
      ...localOrg,
      customFields,
    });
    setHasSetup(true);
    showToast('Organization details saved successfully!', 'success');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Organization Setup</h1>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        Configure your organization details. These will be used across all your ID card templates.
      </p>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Organization Name *</label>
              <input
                type="text"
                value={localOrg.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Delhi Public School"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tagline / Subtitle</label>
              <input
                type="text"
                value={localOrg.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g., Excellence in Education"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input
                type="text"
                value={localOrg.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                type="text"
                value={localOrg.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@organization.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
              <input
                type="text"
                value={localOrg.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="www.organization.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Emergency Contact</label>
              <input
                type="text"
                value={localOrg.emergencyContact || ''}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                placeholder="Emergency phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
              <input
                type="text"
                value={localOrg.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Brand Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localOrg.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localOrg.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localOrg.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localOrg.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={localOrg.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={localOrg.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
          {/* Color preview */}
          <div className="mt-4 flex rounded-lg overflow-hidden h-10">
            <div style={{ backgroundColor: localOrg.primaryColor }} className="flex-1" />
            <div style={{ backgroundColor: localOrg.secondaryColor }} className="flex-1" />
            <div style={{ backgroundColor: localOrg.accentColor }} className="flex-1" />
          </div>
        </div>

        {/* Logo & Signatures */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Logo & Signatures</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Organization Logo</label>
              <div
                onClick={() => logoRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                {localOrg.logo ? (
                  <img src={localOrg.logo} alt="Logo" className="w-full h-20 object-contain" />
                ) : (
                  <div className="py-4">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Click to upload logo</p>
                  </div>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            {/* Signature 1 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Signature 1</label>
              <div
                onClick={() => sig1Ref.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                {localOrg.signature1 ? (
                  <img src={localOrg.signature1} alt="Sig1" className="w-full h-20 object-contain" />
                ) : (
                  <div className="py-4">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Upload signature</p>
                  </div>
                )}
                <input ref={sig1Ref} type="file" accept="image/*" className="hidden" onChange={handleSig1Upload} />
              </div>
              <input
                type="text"
                value={localOrg.signature1Label || ''}
                onChange={(e) => handleChange('signature1Label', e.target.value)}
                placeholder="Label e.g., Principal"
                className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Signature 2 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Signature 2</label>
              <div
                onClick={() => sig2Ref.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
              >
                {localOrg.signature2 ? (
                  <img src={localOrg.signature2} alt="Sig2" className="w-full h-20 object-contain" />
                ) : (
                  <div className="py-4">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Upload signature</p>
                  </div>
                )}
                <input ref={sig2Ref} type="file" accept="image/*" className="hidden" onChange={handleSig2Upload} />
              </div>
              <input
                type="text"
                value={localOrg.signature2Label || ''}
                onChange={(e) => handleChange('signature2Label', e.target.value)}
                placeholder="Label e.g., Director"
                className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Custom Fields</h2>
            <button
              onClick={addCustomField}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Define custom fields that will be available in your card templates.
          </p>
          {customFields.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No custom fields yet. Click &quot;Add Field&quot; to create one.</p>
          ) : (
            <div className="space-y-2">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                    placeholder="Field key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                    placeholder="Display label"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <input
                    type="text"
                    value={field.defaultValue || ''}
                    onChange={(e) => updateCustomField(idx, { defaultValue: e.target.value })}
                    placeholder="Default"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    onClick={() => removeCustomField(idx)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2 pb-8">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
          >
            <Save className="w-4 h-4" />
            Save Organization
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
