import React, { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Building2, Plus, Trash2, Image, PenTool,
  Layers, QrCode, ChevronDown, ChevronUp, Tag, Save
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { CustomFieldDef, OrgAsset, OrgSignature, OrgLogo, QRFieldKey } from '@/types';
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true, logos: true, signatures: true, assets: true, qr: true, custom: true,
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
    // Input validation
    const name = (localOrg.name || '').trim();
    const tagline = (localOrg.tagline || '').trim();
    const phone = (localOrg.phone || '').trim();
    const email = (localOrg.email || '').trim();
    const website = (localOrg.website || '').trim();
    const emergencyContact = (localOrg.emergencyContact || '').trim();
    const address = (localOrg.address || '').trim();

    if (!name) {
      showToast('Organization Name is required', 'error');
      return;
    }
    if (name.length > 100) {
      showToast('Organization Name cannot exceed 100 characters', 'error');
      return;
    }
    if (tagline.length > 100) {
      showToast('Tagline cannot exceed 100 characters', 'error');
      return;
    }
    if (phone.length > 20) {
      showToast('Phone number cannot exceed 20 characters', 'error');
      return;
    }
    if (emergencyContact.length > 20) {
      showToast('Emergency Contact cannot exceed 20 characters', 'error');
      return;
    }
    if (email.length > 255) {
      showToast('Email cannot exceed 255 characters', 'error');
      return;
    }
    if (website.length > 255) {
      showToast('Website URL cannot exceed 255 characters', 'error');
      return;
    }
    if (address.length > 255) {
      showToast('Address cannot exceed 255 characters', 'error');
      return;
    }

    // Email format check
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    // Website format check
    if (website) {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)\/?$/i;
      if (!urlPattern.test(website)) {
        showToast('Please enter a valid website URL', 'error');
        return;
      }
    }

    updateOrganization({
      ...localOrg,
      name,
      tagline,
      phone,
      email,
      website,
      emergencyContact,
      address,
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
    <div className="p-8 max-w-4xl mx-auto relative z-10">
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Setup</h1>
      </div>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
        Configure your organization details. These will be used across all your ID card templates.
      </p>

      <div className="space-y-4">
        {/* ── BASIC INFO ── */}
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <SectionHeader id="basic" title="Basic Information" icon={<Building2 className="w-4 h-4" />} />
          {expandedSections.basic && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { field: 'name', label: 'Organization Name *', placeholder: 'e.g., Acme Corporation', full: false, maxLength: 100 },
                { field: 'tagline', label: 'Tagline / Subtitle', placeholder: 'e.g., Innovation & Trust', full: false, maxLength: 100 },
                { field: 'phone', label: 'Phone', placeholder: '+91-XXXXXXXXXX', full: false, maxLength: 20 },
                { field: 'email', label: 'Email', placeholder: 'contact@organization.com', full: false, maxLength: 255 },
                { field: 'website', label: 'Website', placeholder: 'www.organization.com', full: false, maxLength: 255 },
                { field: 'emergencyContact', label: 'Emergency Contact', placeholder: 'Emergency phone number', full: false, maxLength: 20 },
                { field: 'address', label: 'Address', placeholder: 'Full address', full: true, maxLength: 255 },
              ].map(({ field, label, placeholder, full, maxLength }) => (
                <div key={field} className={full ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={(localOrg as any)[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className="w-full px-3 py-2 glass-input rounded-lg text-sm outline-none transition-all dark:text-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── LOGOS ── */}
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="logos" title="Logos" icon={<Image className="w-4 h-4" />} />
            <button
              onClick={addLogo}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 glass-btn text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:scale-102 border-slate-200/60 dark:border-white/10"
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
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="signatures" title="Signatures" icon={<PenTool className="w-4 h-4" />} />
            <button
              onClick={addSignature}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 glass-btn text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:scale-102 border-slate-200/60 dark:border-white/10"
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
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="assets" title="Assets" icon={<Layers className="w-4 h-4" />} />
            <button
              onClick={addAsset}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 glass-btn text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:scale-102 border-slate-200/60 dark:border-white/10"
            >
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </button>
          </div>
          {expandedSections.assets && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
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
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <SectionHeader id="qr" title="QR Code Fields" icon={<QrCode className="w-4 h-4" />} />
          {expandedSections.qr && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Choose which fields to encode in the QR code on ID cards. Selected fields will appear as a structured list in the QR.
              </p>
              <QRFieldPicker
                selectedFields={qrFields}
                onChange={handleQRFieldsChange}
                columns={3}
              />
              {qrFields.length > 0 && (
                <div className="mt-3 p-3 bg-slate-500/5 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">QR Preview Format</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {qrFields.map(k => k).join(' | ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CUSTOM FIELDS ── */}
        <div className="glass-panel rounded-xl border-slate-200/50 dark:border-white/10 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader id="custom" title="Custom Fields" icon={<Tag className="w-4 h-4" />} />
            <button
              onClick={addCustomField}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 glass-btn text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold hover:scale-102 border-slate-200/60 dark:border-white/10"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
          {expandedSections.custom && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                Define custom fields available in your card templates. Labels appear in the Designer for selection.
              </p>
              {customFields.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No custom fields yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-1 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    <span className="w-28">Field Key</span>
                    <span className="flex-1">Display Label (shown in Designer)</span>
                    <span className="w-28">Default Value</span>
                    <span className="w-8"></span>
                  </div>
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                        placeholder="Field key"
                        maxLength={100}
                        className="w-28 px-3 py-2 glass-input rounded-lg text-sm outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                        placeholder="Display label (shown in Designer)"
                        maxLength={100}
                        className="flex-1 px-3 py-2 glass-input rounded-lg text-sm outline-none"
                      />
                      <input
                        type="text"
                        value={field.defaultValue || ''}
                        onChange={(e) => updateCustomField(idx, { defaultValue: e.target.value })}
                        placeholder="Default"
                        maxLength={100}
                        className="w-28 px-3 py-2 glass-input rounded-lg text-sm outline-none"
                      />
                      <button
                        onClick={() => removeCustomField(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
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
            className="flex items-center gap-2 px-6 py-3 glass-btn bg-emerald-600/90 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 hover:scale-[1.01] border-transparent shadow-lg shadow-emerald-500/20 transition-all"
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
