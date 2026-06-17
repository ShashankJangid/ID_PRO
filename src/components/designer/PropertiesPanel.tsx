import React from 'react';
import { Copy, Trash2, Image } from 'lucide-react';
import type { CardElement, CardTemplate, Organization, DataField, QRFieldKey } from '@/types';
import { QR_FIELD_OPTIONS } from '@/types';
import QRFieldPicker from '../shared/QRFieldPicker';

interface PropertiesPanelProps {
  selectedElement: CardElement;
  currentTemplate: CardTemplate;
  organization: Organization;
  onElementUpdate: (id: string, updates: Partial<CardElement>) => void;
  onDuplicateElement: (el: CardElement) => void;
  onDeleteElement: (id: string) => void;
}

const dataFieldOptions: { value: DataField; label: string; group?: string }[] = [
  // Person fields
  { value: 'name', label: 'Full Name', group: 'Person' },
  { value: 'role', label: 'Role / Designation', group: 'Person' },
  { value: 'code', label: 'ID Code / Roll No.', group: 'Person' },
  { value: 'dob', label: 'Date of Birth', group: 'Person' },
  { value: 'blood', label: 'Blood Group', group: 'Person' },
  { value: 'contact', label: 'Contact Number', group: 'Person' },
  { value: 'address', label: 'Address', group: 'Person' },
  { value: 'issued', label: 'Issued Date', group: 'Person' },
  { value: 'valid', label: 'Valid Until', group: 'Person' },
  { value: 'emergency', label: 'Emergency Contact', group: 'Person' },
  // Org fields
  { value: 'orgName', label: 'Org Name', group: 'Organization' },
  { value: 'orgAddress', label: 'Org Address', group: 'Organization' },
  { value: 'orgPhone', label: 'Org Phone', group: 'Organization' },
  { value: 'orgEmail', label: 'Org Email', group: 'Organization' },
  { value: 'orgWebsite', label: 'Org Website', group: 'Organization' },
  { value: 'orgTagline', label: 'Org Tagline', group: 'Organization' },
  { value: 'orgEmergency', label: 'Org Emergency', group: 'Organization' },
  // Custom fields (labels from org)
  { value: 'custom1', label: 'Custom Field 1', group: 'Custom' },
  { value: 'custom2', label: 'Custom Field 2', group: 'Custom' },
  { value: 'custom3', label: 'Custom Field 3', group: 'Custom' },
  { value: 'static', label: 'Static Text', group: 'Other' },
];

const Section: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-100 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors outline-none select-none"
      >
        <span>{title}</span>
        <svg
          className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  currentTemplate,
  organization,
  onElementUpdate,
  onDuplicateElement,
  onDeleteElement,
}) => {
  const [alignOpen, setAlignOpen] = React.useState(false);
  const [dimOpen, setDimOpen] = React.useState(true);
  const [dataOpen, setDataOpen] = React.useState(true);
  const [styleOpen, setStyleOpen] = React.useState(true);

  return (
    <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 flex flex-col h-full">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Properties</h3>
          <div className="flex gap-1">
            <button
              onClick={() => onDuplicateElement(selectedElement)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Duplicate Element"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete Element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Label (Always visible at the top) */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Label</label>
          <input
            type="text"
            value={selectedElement.label}
            onChange={(e) => onElementUpdate(selectedElement.id, { label: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Collapsible Accordion Sections */}
        <div className="flex-1 space-y-1">
          {/* Section 1: Dimensions & Position */}
          <Section title="Dimensions & Position" isOpen={dimOpen} onToggle={() => setDimOpen(!dimOpen)}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">X (px)</label>
                <input
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) => onElementUpdate(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Y (px)</label>
                <input
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) => onElementUpdate(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">W (px)</label>
                <input
                  type="number"
                  value={selectedElement.width}
                  onChange={(e) => onElementUpdate(selectedElement.id, { width: parseInt(e.target.value) || 10 })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">H (px)</label>
                <input
                  type="number"
                  value={selectedElement.height}
                  onChange={(e) => onElementUpdate(selectedElement.id, { height: parseInt(e.target.value) || 10 })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Rotation (deg)</label>
              <input
                type="number"
                min={-360} max={360}
                value={selectedElement.rotation || 0}
                onChange={(e) => onElementUpdate(selectedElement.id, { rotation: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </Section>

          {/* Section 2: Alignment Quick-Actions */}
          <Section title="Alignment on Card" isOpen={alignOpen} onToggle={() => setAlignOpen(!alignOpen)}>
            <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-3">
              {/* Edge Alignment Row */}
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Edge Align</p>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    title="Align Left Edge"
                    onClick={() => onElementUpdate(selectedElement.id, { x: 0 })}
                    className="px-1 py-1.5 border border-gray-200 bg-white rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="2" width="1.5" height="10" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="4" width="7" height="2.5" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="7.5" width="5" height="2.5" rx="0.5" fill="currentColor" />
                    </svg>
                    Left
                  </button>
                  <button
                    title="Align Right Edge"
                    onClick={() => onElementUpdate(selectedElement.id, { x: currentTemplate.cardWidth - selectedElement.width })}
                    className="px-1 py-1.5 border border-gray-200 bg-white rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="11.5" y="2" width="1.5" height="10" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="4" width="7" height="2.5" rx="0.5" fill="currentColor" />
                      <rect x="5.5" y="7.5" width="5" height="2.5" rx="0.5" fill="currentColor" />
                    </svg>
                    Right
                  </button>
                  <button
                    title="Center Horizontally"
                    onClick={() => onElementUpdate(selectedElement.id, { x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2) })}
                    className="px-1 py-1.5 border border-emerald-200 bg-emerald-50 rounded text-[9px] text-emerald-700 hover:bg-emerald-100 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="6.25" y="1" width="1.5" height="12" rx="0.5" fill="currentColor" />
                      <rect x="2" y="3.5" width="10" height="2.5" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="7" width="7" height="2.5" rx="0.5" fill="currentColor" />
                    </svg>
                    H-Mid
                  </button>
                  <button
                    title="Align Top Edge"
                    onClick={() => onElementUpdate(selectedElement.id, { y: 0 })}
                    className="px-1 py-1.5 border border-gray-200 bg-white rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="1" width="10" height="1.5" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" />
                      <rect x="8" y="3.5" width="2.5" height="5" rx="0.5" fill="currentColor" />
                    </svg>
                    Top
                  </button>
                  <button
                    title="Align Bottom Edge"
                    onClick={() => onElementUpdate(selectedElement.id, { y: currentTemplate.cardHeight - selectedElement.height })}
                    className="px-1 py-1.5 border border-gray-200 bg-white rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" />
                      <rect x="8" y="5.5" width="2.5" height="5" rx="0.5" fill="currentColor" />
                    </svg>
                    Bottom
                  </button>
                  <button
                    title="Center Vertically"
                    onClick={() => onElementUpdate(selectedElement.id, { y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2) })}
                    className="px-1 py-1.5 border border-emerald-200 bg-emerald-50 rounded text-[9px] text-emerald-700 hover:bg-emerald-100 transition-all flex flex-col items-center gap-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="6.25" width="12" height="1.5" rx="0.5" fill="currentColor" />
                      <rect x="3.5" y="2" width="2.5" height="10" rx="0.5" fill="currentColor" />
                      <rect x="8" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" />
                    </svg>
                    V-Mid
                  </button>
                </div>
              </div>

              {/* Center on Card */}
              <button
                title="Center on Card (both axes)"
                onClick={() => onElementUpdate(selectedElement.id, {
                  x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2),
                  y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2),
                })}
                className="w-full py-1.5 border border-emerald-300 bg-emerald-50 rounded text-[9px] text-emerald-700 font-semibold hover:bg-emerald-100 transition-all"
              >
                ⊕ Center on Card
              </button>

              {/* Quadrant grid */}
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Quadrant</p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '↖ TL', x: 0, y: 0 },
                    { label: '↑ TC', x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2), y: 0 },
                    { label: '↗ TR', x: currentTemplate.cardWidth - selectedElement.width, y: 0 },
                    { label: '← ML', x: 0, y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2) },
                    { label: '⊙ MC', x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2), y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2) },
                    { label: '→ MR', x: currentTemplate.cardWidth - selectedElement.width, y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2) },
                    { label: '↙ BL', x: 0, y: currentTemplate.cardHeight - selectedElement.height },
                    { label: '↓ BC', x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2), y: currentTemplate.cardHeight - selectedElement.height },
                    { label: '↘ BR', x: currentTemplate.cardWidth - selectedElement.width, y: currentTemplate.cardHeight - selectedElement.height },
                  ].map(({ label, x, y }) => (
                    <button
                      key={label}
                      title={label}
                      onClick={() => onElementUpdate(selectedElement.id, { x, y })}
                      className="py-1 border border-gray-200 bg-white rounded text-[9px] text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all font-mono"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stretch Actions */}
              <div>
                <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Stretch</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    title="Full Width"
                    onClick={() => onElementUpdate(selectedElement.id, { x: 0, width: currentTemplate.cardWidth })}
                    className="py-1 border border-gray-200 bg-white rounded text-[9px] text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    ↔ Full Width
                  </button>
                  <button
                    title="Full Height"
                    onClick={() => onElementUpdate(selectedElement.id, { y: 0, height: currentTemplate.cardHeight })}
                    className="py-1 border border-gray-200 bg-white rounded text-[9px] text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    ↕ Full Height
                  </button>
                  <button
                    title="Half Width Left"
                    onClick={() => onElementUpdate(selectedElement.id, { x: 0, width: Math.round(currentTemplate.cardWidth / 2) })}
                    className="py-1 border border-gray-200 bg-white rounded text-[9px] text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    ½W Left
                  </button>
                  <button
                    title="Half Width Right"
                    onClick={() => onElementUpdate(selectedElement.id, { x: Math.round(currentTemplate.cardWidth / 2), width: Math.round(currentTemplate.cardWidth / 2) })}
                    className="py-1 border border-gray-200 bg-white rounded text-[9px] text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  >
                    ½W Right
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 3: Data & Content */}
          <Section title="Data & Content" isOpen={dataOpen} onToggle={() => setDataOpen(!dataOpen)}>
            {/* Field binding — text only */}
            {selectedElement.type === 'text' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Data Field</label>
                  <select
                    value={selectedElement.field || ''}
                    onChange={(e) =>
                      onElementUpdate(selectedElement.id, {
                        field: (e.target.value as DataField) || undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">None (Static)</option>
                    <optgroup label="── Person ──">
                      {dataFieldOptions.filter(o => o.group === 'Person').map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="── Organization ──">
                      {dataFieldOptions.filter(o => o.group === 'Organization').map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="── Custom ──">
                      {(['custom1','custom2','custom3'] as DataField[]).map((f, i) => {
                        const cField = organization.customFields?.[i];
                        const label = cField?.label ? `${cField.label} (${f})` : `Custom Field ${i+1}`;
                        return <option key={f} value={f}>{label}</option>;
                      })}
                    </optgroup>
                    <optgroup label="── Other ──">
                      <option value="static">Static Text</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Static Text</label>
                  <input
                    type="text"
                    value={selectedElement.staticText || ''}
                    onChange={(e) => onElementUpdate(selectedElement.id, { staticText: e.target.value })}
                    placeholder="Text when no field is bound"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* QR Code Fields Picker */}
            {selectedElement.type === 'qr' && (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">
                    QR Encoded Fields
                  </label>
                  <p className="text-[9px] text-gray-400 mb-2">Select which fields to encode in this QR code. Overrides the org default.</p>
                  <QRFieldPicker
                    selectedFields={selectedElement.qrFields?.length
                      ? selectedElement.qrFields
                      : (organization.defaultQRFields || ['name', 'code'])}
                    onChange={(nextFields) => onElementUpdate(selectedElement.id, { qrFields: nextFields })}
                    columns={2}
                  />
                  {/* Preview */}
                  {(() => {
                    const fields: QRFieldKey[] = selectedElement.qrFields?.length
                      ? selectedElement.qrFields
                      : (organization.defaultQRFields || ['name', 'code']);
                    return fields.length > 0 ? (
                      <div className="mt-2 p-1.5 bg-white rounded border border-gray-200">
                        <p className="text-[9px] text-gray-400 font-mono truncate">
                          {fields.map(k => QR_FIELD_OPTIONS.find(o => o.key === k)?.label).join(' · ')}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[9px] text-red-400">⚠ No fields selected — QR will be empty</p>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => onElementUpdate(selectedElement.id, { qrFields: [] })}
                    className="mt-1.5 text-[9px] text-gray-400 hover:text-gray-600 underline transition-colors"
                  >
                    Reset to org defaults
                  </button>
                </div>
              </div>
            )}

            {/* Image source properties */}
            {selectedElement.type === 'image' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Image Source</label>
                  <select
                    value={selectedElement.imageSource || 'custom'}
                    onChange={(e) =>
                      onElementUpdate(selectedElement.id, {
                        imageSource: e.target.value as CardElement['imageSource'],
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="photo">Person Photo</option>
                    <optgroup label="── Logos ──">
                      {(organization.logos || []).length === 0 && (
                        <option value="logo" disabled>No logos (add in Organization)</option>
                      )}
                      {(organization.logos || []).map((logo, i) => (
                        <option key={logo.key} value={`logo_${i}`}>{logo.label || `Logo ${i+1}`}</option>
                      ))}
                      {(organization.logos || []).length === 0 && organization.logo && (
                        <option value="logo">Organization Logo</option>
                      )}
                    </optgroup>
                    <optgroup label="── Signatures ──">
                      {(organization.signatures || []).length === 0 && (
                        <option value="signature1" disabled>No signatures (add in Organization)</option>
                      )}
                      {(organization.signatures || []).map((sig, i) => (
                        <option key={sig.key} value={`signature_${i}`}>{sig.label || `Signature ${i+1}`}</option>
                      ))}
                      {(organization.signatures || []).length === 0 && organization.signature1 && (
                        <option value="signature1">Signature 1</option>
                      )}
                      {(organization.signatures || []).length === 0 && organization.signature2 && (
                        <option value="signature2">Signature 2</option>
                      )}
                    </optgroup>
                    <optgroup label="── Assets ──">
                      {(organization.assets || []).length === 0 && (
                        <option value="" disabled>No assets (add in Organization)</option>
                      )}
                      {(organization.assets || []).map((asset, i) => (
                        <option key={asset.key} value={`asset_${i}`}>{asset.label || `Asset ${i+1}`}</option>
                      ))}
                    </optgroup>
                    <option value="custom">Custom (Upload)</option>
                  </select>
                </div>

                {/* Custom image uploader */}
                {(selectedElement.imageSource === 'custom' || !selectedElement.imageSource) && (
                  <div className="mt-2">
                    <label className="cursor-pointer block">
                      <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                        {selectedElement.staticImageUrl ? (
                          <img
                            src={selectedElement.staticImageUrl}
                            alt="custom"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center px-2">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-1">
                              <Image className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">Click to upload image</p>
                            <p className="text-[9px] text-gray-300 mt-0.5">JPG, PNG, SVG</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            onElementUpdate(selectedElement.id, {
                              staticImageUrl: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {selectedElement.staticImageUrl && (
                      <button
                        type="button"
                        className="mt-1 w-full text-[10px] text-red-400 hover:text-red-600 hover:underline transition-colors"
                        onClick={() => onElementUpdate(selectedElement.id, { staticImageUrl: undefined })}
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Section 4: Style & Appearance */}
          <Section title="Style & Appearance" isOpen={styleOpen} onToggle={() => setStyleOpen(!styleOpen)}>
            {/* QR Code Styles */}
            {selectedElement.type === 'qr' && (
              <div className="space-y-3">
                {/* Background color */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Background</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedElement.style.backgroundColor || '#ffffff'}
                      onChange={(e) => onElementUpdate(selectedElement.id, {
                        style: { ...selectedElement.style, backgroundColor: e.target.value },
                      })}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedElement.style.backgroundColor || '#ffffff'}
                      onChange={(e) => onElementUpdate(selectedElement.id, {
                        style: { ...selectedElement.style, backgroundColor: e.target.value },
                      })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                    />
                  </div>
                </div>
                {/* Border Radius */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Border Radius</label>
                  <input
                    type="number"
                    min={0} max={40}
                    value={selectedElement.style.borderRadius || 0}
                    onChange={(e) => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) || 0 },
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                  />
                </div>
                {/* Border */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Border</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-0.5">Width</label>
                      <input
                        type="number"
                        min={0}
                        value={selectedElement.style.borderWidth || 0}
                        onChange={(e) => onElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, borderWidth: parseInt(e.target.value) || 0 },
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-0.5">Color</label>
                      <input
                        type="color"
                        value={selectedElement.style.borderColor || '#000000'}
                        onChange={(e) => onElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, borderColor: e.target.value },
                        })}
                        className="w-full h-[26px] rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                {/* Opacity */}
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">
                    Opacity: {Math.round((selectedElement.style.opacity ?? 1) * 100)}%
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={selectedElement.style.opacity ?? 1}
                    onChange={(e) => onElementUpdate(selectedElement.id, {
                      style: { ...selectedElement.style, opacity: parseFloat(e.target.value) },
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Non-QR Element Styles */}
            {selectedElement.type !== 'qr' && (
              <div className="space-y-3">
                {/* Text styles */}
                {selectedElement.type === 'text' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Size</label>
                        <input
                          type="number"
                          value={selectedElement.style.fontSize || 14}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, fontSize: parseInt(e.target.value) || 14 },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Weight</label>
                        <select
                          value={selectedElement.style.fontWeight || '400'}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, fontWeight: e.target.value as any },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        >
                          <option value="300">Light</option>
                          <option value="400">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">SemiBold</option>
                          <option value="700">Bold</option>
                          <option value="800">ExtraBold</option>
                          <option value="900">Black</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.style.color || '#000000'}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, color: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedElement.style.color || '#000000'}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, color: e.target.value },
                            })
                          }
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Align</label>
                      <div className="flex bg-gray-100 rounded p-0.5">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() =>
                              onElementUpdate(selectedElement.id, {
                                style: { ...selectedElement.style, textAlign: align as any },
                              })
                            }
                            className={`flex-1 py-1 rounded text-[10px] font-medium capitalize transition-all ${selectedElement.style.textAlign === align
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500'
                              }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Transform</label>
                      <select
                        value={selectedElement.style.textTransform || 'none'}
                        onChange={(e) =>
                          onElementUpdate(selectedElement.id, {
                            style: { ...selectedElement.style, textTransform: e.target.value as any },
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                      >
                        <option value="none">None</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                        <option value="capitalize">Capitalize</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Shape styles */}
                {selectedElement.type === 'shape' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Background</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.style.backgroundColor || '#cccccc'}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, backgroundColor: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedElement.style.backgroundColor || '#cccccc'}
                          onChange={(e) =>
                            onElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, backgroundColor: e.target.value },
                            })
                          }
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedElement.style.opacity ?? 1}
                        onChange={(e) =>
                          onElementUpdate(selectedElement.id, {
                            style: { ...selectedElement.style, opacity: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {/* Border Radius for shape/image */}
                {(selectedElement.type === 'image' || selectedElement.type === 'shape') && (
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Border Radius</label>
                    <input
                      type="number"
                      value={selectedElement.style.borderRadius || 0}
                      onChange={(e) =>
                        onElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
