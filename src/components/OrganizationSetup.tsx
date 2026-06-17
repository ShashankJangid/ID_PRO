import React, { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Building2, Plus, Trash2, Image, PenTool,
  Layers, QrCode, Palette, Eye, EyeOff, ChevronDown, ChevronUp, Tag, Save
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { CustomFieldDef, OrgAsset, OrgSignature, OrgLogo, QRFieldKey } from '@/types';
import ColorPicker from './shared/ColorPicker';
import QRFieldPicker from './shared/QRFieldPicker';
import ImageCollectionSection from './shared/ImageCollectionSection';
import { useImageCollection } from '@/hooks/useImageCollection';

const OrganizationSetup: React.FC = () => {
  const { organization, updateOrganization, setHasSetup, showToast } = useAppStore(
    useShallow((s) => ({
      organization: s.organization,
      updateOrganization: s.updateOrganization,
      setHasSetup: s.setHasSetup,
      showToast: s.showToast,
    }))
  );

  const [localOrg, setLocalOrg] = useState({ ...organization });
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>(organization.customFields || []);
  const [qrFields, setQrFields] = useState<QRFieldKey[]>(organization.defaultQRFields || ['name', 'role', 'code']);
  const [brandColorsEnabled, setBrandColorsEnabled] = useState(organization.brandColorsEnabled !== false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true, colors: true, logos: true, signatures: true, assets: true, qr: true, custom: true,
  });

  // Manage image collections with hook
  const {
    items: logos,
    addItem: addLogo,
    removeItem: removeLogo,
    updateItem: updateLogo,
  } = useImageCollection<OrgLogo>(organization.logos || [], 'logo');

  const {
    items: signatures,
    addItem: addSignature,
    removeItem: removeSignature,
    updateItem: updateSignature,
  } = useImageCollection<OrgSignature>(organization.signatures || [], 'sig');

  const {
    items: assets,
    addItem: addAsset,
    removeItem: removeAsset,
    updateItem: updateAsset,
  } = useImageCollection<OrgAsset>(organization.assets || [], 'asset');

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleChange = (field: string, value: string | boolean) =>
    setLocalOrg((prev) => ({ ...prev, [field]: value }));

  // ── Custom Fields ──
  const addCustomField = () =>
    setCustomFields(prev => [...prev, { key: `custom${prev.length + 1}`, label: '', defaultValue: '' }]);
  const updateCustomField = (idx: number, updates: Partial<CustomFieldDef>) =>
    setCustomFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  const removeCustomField = (idx: number) =>
    setCustomFields(prev => prev.filter((_, i) => i !== idx));

  // ── QR Fields ──
  const handleQRFieldsChange = (nextFields: QRFieldKey[]) => {
    setQrFields(nextFields);
  };

  const handleSave = () => {
    updateOrganization({
      ...localOrg,
      brandColorsEnabled,
      logos,
      signatures,
      assets,
      customFields,
      defaultQRFields: qrFields,
      // Keep legacy fields for backwards compatibility
      logo: logos[0]?.data,
      signature1: signatures[0]?.data,
      signature1Label: signatures[0]?.label,
      signature2: signatures[1]?.data,
      signature2Label: signatures[1]?.label,
    });
    setHasSetup(true);
    showToast('Organization details saved successfully!', 'success');
  };

  const SectionHeader = useCallback(({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between group"
    >
      <div className="flex items-center gap-2">
        <span className="text-emerald-600">{icon}</span>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{title}</h2>
      </div>
      {expandedSections[id]
        ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />}
    </button>
  ), [expandedSections]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Organization Setup</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Configure your organization details. These will be used across all your ID card templates.
      </p>

      <div className="space-y-4">
        {/* ── BASIC INFO ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader id="basic" title="Basic Information" icon={<Building2 className="w-4 h-4" />} />
          {expandedSections.basic && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { field: 'name', label: 'Organization Name *', placeholder: 'e.g., Delhi Public School', full: false },
                { field: 'tagline', label: 'Tagline / Subtitle', placeholder: 'e.g., Excellence in Education', full: false },
                { field: 'phone', label: 'Phone', placeholder: '+91-XXXXXXXXXX', full: false },
                { field: 'email', label: 'Email', placeholder: 'contact@organization.com', full: false },
                { field: 'website', label: 'Website', placeholder: 'www.organization.com', full: false },
                { field: 'emergencyContact', label: 'Emergency Contact', placeholder: 'Emergency phone number', full: false },
                { field: 'address', label: 'Address', placeholder: 'Full address', full: true },
              ].map(({ field, label, placeholder, full }) => (
                <div key={field} className={full ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={(localOrg as any)[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BRAND COLORS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="colors" title="Brand Colors" icon={<Palette className="w-4 h-4" />} />
            <button
              onClick={() => setBrandColorsEnabled(!brandColorsEnabled)}
              className={`ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                brandColorsEnabled
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {brandColorsEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {brandColorsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {expandedSections.colors && (
            <div className={`mt-4 transition-opacity ${brandColorsEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
              <div className="grid grid-cols-3 gap-4">
                <ColorPicker
                  label="Primary Color"
                  value={localOrg.primaryColor}
                  onChange={(val) => handleChange('primaryColor', val)}
                />
                <ColorPicker
                  label="Secondary Color"
                  value={localOrg.secondaryColor}
                  onChange={(val) => handleChange('secondaryColor', val)}
                />
                <ColorPicker
                  label="Accent Color"
                  value={localOrg.accentColor}
                  onChange={(val) => handleChange('accentColor', val)}
                />
              </div>
              <div className="mt-4 flex rounded-lg overflow-hidden h-8">
                <div style={{ backgroundColor: localOrg.primaryColor }} className="flex-1 transition-colors" />
                <div style={{ backgroundColor: localOrg.secondaryColor }} className="flex-1 transition-colors" />
                <div style={{ backgroundColor: localOrg.accentColor }} className="flex-1 transition-colors" />
              </div>
              {!brandColorsEnabled && (
                <p className="text-xs text-gray-400 mt-2 text-center">Brand colors are disabled — cards will use default styling</p>
              )}
            </div>
          )}
        </div>

        {/* ── LOGOS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="logos" title="Logos" icon={<Image className="w-4 h-4" />} />
            <button
              onClick={addLogo}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Logo
            </button>
          </div>
          {expandedSections.logos && (
            <div className="mt-4">
              <ImageCollectionSection
                items={logos}
                onRemove={removeLogo}
                onUpdate={updateLogo}
                emptyMessage="No logos added yet. Click 'Add Logo' to upload."
                prefix="logo"
                labelPlaceholder="Label (e.g., Main Logo)"
                showToast={showToast}
                columns={3}
              />
            </div>
          )}
        </div>

        {/* ── SIGNATURES ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="signatures" title="Signatures" icon={<PenTool className="w-4 h-4" />} />
            <button
              onClick={addSignature}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Signature
            </button>
          </div>
          {expandedSections.signatures && (
            <div className="mt-4">
              <ImageCollectionSection
                items={signatures}
                onRemove={removeSignature}
                onUpdate={updateSignature}
                emptyMessage="No signatures added yet. Click 'Add Signature' to upload."
                prefix="signature"
                labelPlaceholder="Label (e.g., Principal)"
                showToast={showToast}
                columns={3}
              />
            </div>
          )}
        </div>

        {/* ── ASSETS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="assets" title="Assets" icon={<Layers className="w-4 h-4" />} />
            <button
              onClick={addAsset}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </button>
          </div>
          {expandedSections.assets && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">
                Upload stamps, watermarks, banners, badges or any other image assets. Each gets a label so you can reference it by name in the Designer.
              </p>
              <ImageCollectionSection
                items={assets}
                onRemove={removeAsset}
                onUpdate={updateAsset}
                emptyMessage="No assets yet. Add stamps, watermarks, banners, etc."
                prefix="asset"
                labelPlaceholder="Asset label (used in Designer)"
                showToast={showToast}
                columns={4}
                showIconPicker={true}
              />
            </div>
          )}
        </div>

        {/* ── QR CODE FIELDS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <SectionHeader id="qr" title="QR Code Fields" icon={<QrCode className="w-4 h-4" />} />
          {expandedSections.qr && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">
                Choose which fields to encode in the QR code on ID cards. Selected fields will appear as a structured list in the QR.
              </p>
              <QRFieldPicker
                selectedFields={qrFields}
                onChange={handleQRFieldsChange}
                columns={3}
              />
              {qrFields.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">QR Preview Format</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {qrFields.map(k => k).join(' | ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CUSTOM FIELDS ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="custom" title="Custom Fields" icon={<Tag className="w-4 h-4" />} />
            <button
              onClick={addCustomField}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
          {expandedSections.custom && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">
                Define custom fields available in your card templates. Labels appear in the Designer for selection.
              </p>
              {customFields.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No custom fields yet.</p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                        placeholder="Field key"
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                        placeholder="Display label (shown in Designer)"
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
          )}
        </div>

        {/* ── SAVE ── */}
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
