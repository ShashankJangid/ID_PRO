import React, { useState, useCallback, useRef } from 'react';
import {
  PenTool,
  Type,
  Image,
  Shapes,
  QrCode,
  Trash2,
  Copy,
  Save,
  Palette,
} from 'lucide-react';
import { useAppStore } from '@/store';
import CardRenderer from './CardRenderer';
import type { CardElement, CardTemplate, DataField } from '@/types';

const dataFieldOptions: { value: DataField; label: string }[] = [
  { value: 'name', label: 'Full Name' },
  { value: 'role', label: 'Role / Designation' },
  { value: 'code', label: 'ID Code / Roll No.' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'blood', label: 'Blood Group' },
  { value: 'contact', label: 'Contact Number' },
  { value: 'address', label: 'Address' },
  { value: 'issued', label: 'Issued Date' },
  { value: 'valid', label: 'Valid Until' },
  { value: 'emergency', label: 'Emergency Contact' },
  { value: 'orgName', label: 'Organization Name' },
  { value: 'orgAddress', label: 'Organization Address' },
  { value: 'orgPhone', label: 'Organization Phone' },
  { value: 'orgEmail', label: 'Organization Email' },
  { value: 'custom1', label: 'Custom Field 1' },
  { value: 'custom2', label: 'Custom Field 2' },
  { value: 'custom3', label: 'Custom Field 3' },
  { value: 'static', label: 'Static Text' },
];

const CardDesigner: React.FC = () => {
  const {
    getActiveTemplate,
    updateTemplate,
    addTemplate,
    organization,
    cardDataList,
    designerSide,
    setDesignerSide,
    selectedElementId,
    setSelectedElementId,
    zoom,
    setZoom,
    showToast,
  } = useAppStore();

  const activeTemplate = getActiveTemplate();
  const [editingTemplate, setEditingTemplate] = useState<CardTemplate | null>(null);
  const [draggedEl, setDraggedEl] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  // Alignment guide lines shown while dragging
  const [guides, setGuides] = useState<{ x?: number; y?: number }[]>([]);

  const currentTemplate = editingTemplate || activeTemplate;

  const demoCard = cardDataList[0] || {
    name: 'John Doe',
    role: 'Manager',
    code: 'EMP001',
    dob: '01-01-1990',
    blood: 'O+',
    contact: '9876543210',
    address: '123 Main St',
    issued: '01-01-2024',
    valid: '31-12-2025',
    emergency: '9876543211',
  };

  const elements = currentTemplate
    ? designerSide === 'front'
      ? currentTemplate.frontElements
      : currentTemplate.backElements
    : [];

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<CardElement>) => {
      if (!currentTemplate) return;
      const newTemplate = { ...currentTemplate };
      const sideElements =
        designerSide === 'front' ? [...newTemplate.frontElements] : [...newTemplate.backElements];
      const idx = sideElements.findIndex((el) => el.id === id);
      if (idx >= 0) {
        sideElements[idx] = { ...sideElements[idx], ...updates };
        if (designerSide === 'front') {
          newTemplate.frontElements = sideElements;
        } else {
          newTemplate.backElements = sideElements;
        }
        setEditingTemplate(newTemplate);
      }
    },
    [currentTemplate, designerSide]
  );

  const handleMouseDown = (e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    if (!currentTemplate) return;
    const el = elements.find((el) => el.id === elId);
    if (!el) return;
    // Store where inside the element the user clicked (in card coords)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    });
    setDraggedEl(elId);
    setSelectedElementId(elId);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedEl || !currentTemplate) return;
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      // Position in card-space coordinates
      let x = (e.clientX - rect.left) / zoom - dragOffset.x;
      let y = (e.clientY - rect.top) / zoom - dragOffset.y;
      x = Math.max(0, Math.round(x));
      y = Math.max(0, Math.round(y));

      const dragged = elements.find((el) => el.id === draggedEl);
      if (!dragged) return;

      const cardW = currentTemplate.cardWidth;
      const cardH = currentTemplate.cardHeight;
      const elW = dragged.width;
      const elH = dragged.height;
      const SNAP = 6; // snap threshold in card-px

      const newGuides: { x?: number; y?: number }[] = [];

      // ── Snap & guide targets ──
      const xTargets = [
        { val: 0, guide: 0 },                        // left edge
        { val: (cardW - elW) / 2, guide: cardW / 2 },               // center-x
        { val: cardW - elW, guide: cardW },                    // right edge
      ];
      const yTargets = [
        { val: 0, guide: 0 },
        { val: (cardH - elH) / 2, guide: cardH / 2 },
        { val: cardH - elH, guide: cardH },
      ];

      // Also snap to other elements edges
      elements.forEach((other) => {
        if (other.id === draggedEl) return;
        xTargets.push(
          { val: other.x, guide: other.x },
          { val: other.x + other.width, guide: other.x + other.width },
          { val: other.x - elW, guide: other.x },
          { val: other.x + (other.width - elW) / 2, guide: other.x + other.width / 2 },
        );
        yTargets.push(
          { val: other.y, guide: other.y },
          { val: other.y + other.height, guide: other.y + other.height },
          { val: other.y - elH, guide: other.y },
          { val: other.y + (other.height - elH) / 2, guide: other.y + other.height / 2 },
        );
      });

      for (const t of xTargets) {
        if (Math.abs(x - t.val) <= SNAP) { x = t.val; newGuides.push({ x: t.guide }); break; }
      }
      for (const t of yTargets) {
        if (Math.abs(y - t.val) <= SNAP) { y = t.val; newGuides.push({ y: t.guide }); break; }
      }

      setGuides(newGuides);
      handleElementUpdate(draggedEl, { x, y });
    },
    [draggedEl, dragOffset, zoom, handleElementUpdate, currentTemplate, elements]
  );

  const handleMouseUp = () => {
    setDraggedEl(null);
    setGuides([]);
  };

  const addElement = (type: CardElement['type']) => {
    if (!currentTemplate) return;
    const newEl: CardElement = {
      id: `el_${Date.now()}`,
      type,
      label: `New ${type}`,
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : type === 'qr' ? 100 : 150,
      height: type === 'text' ? 30 : type === 'qr' ? 100 : 150,
      style: {
        fontSize: 14,
        color: '#000000',
        fontWeight: '400',
        backgroundColor: type === 'shape' ? '#cccccc' : undefined,
      },
    };
    const newTemplate = { ...currentTemplate };
    if (designerSide === 'front') {
      newTemplate.frontElements = [...newTemplate.frontElements, newEl];
    } else {
      newTemplate.backElements = [...newTemplate.backElements, newEl];
    }
    setEditingTemplate(newTemplate);
    setSelectedElementId(newEl.id);
  };

  const deleteElement = (id: string) => {
    if (!currentTemplate) return;
    const newTemplate = { ...currentTemplate };
    if (designerSide === 'front') {
      newTemplate.frontElements = newTemplate.frontElements.filter((e) => e.id !== id);
    } else {
      newTemplate.backElements = newTemplate.backElements.filter((e) => e.id !== id);
    }
    setEditingTemplate(newTemplate);
    setSelectedElementId(null);
  };

  const duplicateElement = (el: CardElement) => {
    if (!currentTemplate) return;
    const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 20, y: el.y + 20 };
    const newTemplate = { ...currentTemplate };
    if (designerSide === 'front') {
      newTemplate.frontElements = [...newTemplate.frontElements, newEl];
    } else {
      newTemplate.backElements = [...newTemplate.backElements, newEl];
    }
    setEditingTemplate(newTemplate);
    setSelectedElementId(newEl.id);
  };

  const handleSave = () => {
    if (!editingTemplate || !activeTemplate) return;

    if (editingTemplate.isBuiltIn) {
      // Save as new custom template
      const newTemplate: CardTemplate = {
        ...editingTemplate,
        id: `custom_${Date.now()}`,
        name: `${editingTemplate.name} (Custom)`,
        isBuiltIn: false,
        category: 'custom',
        createdAt: new Date().toISOString(),
      };
      addTemplate(newTemplate);
      useAppStore.getState().setActiveTemplate(newTemplate.id);
      showToast('Saved as new custom template!', 'success');
    } else {
      // Update existing custom template
      updateTemplate(editingTemplate.id, editingTemplate);
      showToast('Template updated!', 'success');
    }
    setEditingTemplate(null);
  };

  const handleDiscard = () => {
    setEditingTemplate(null);
    setSelectedElementId(null);
  };

  if (!activeTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <PenTool className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No template selected</p>
          <p className="text-gray-400 text-sm mt-1">Select a template from the gallery first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 z-10">
        <button
          onClick={() => addElement('text')}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          title="Add Text"
        >
          <Type className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('image')}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          title="Add Image"
        >
          <Image className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('shape')}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          title="Add Shape"
        >
          <Shapes className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('qr')}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          title="Add QR Code"
        >
          <QrCode className="w-5 h-5" />
        </button>
        <div className="w-8 h-px bg-gray-200 my-1" />
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-xs font-bold"
          title="Zoom Out"
        >
          -
        </button>
        <span className="text-[10px] text-gray-500 font-medium">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-xs font-bold"
          title="Zoom In"
        >
          +
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900">
              {currentTemplate?.name}
              {editingTemplate && <span className="text-amber-500 ml-2 text-xs">(Editing)</span>}
            </span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setDesignerSide('front')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${designerSide === 'front' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
              >
                Front
              </button>
              <button
                onClick={() => setDesignerSide('back')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${designerSide === 'back' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
              >
                Back
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingTemplate && (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div
          id="designer-canvas"
          className="flex-1 overflow-auto flex items-start justify-center p-8"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {currentTemplate && (
            <div
              style={{
                width: currentTemplate.cardWidth * zoom,
                height: currentTemplate.cardHeight * zoom,
                position: 'relative',
              }}
            >
              {/* Card preview */}
              <div ref={cardRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                <CardRenderer
                  template={currentTemplate}
                  cardData={demoCard}
                  organization={organization}
                  side={designerSide}
                  scale={1}
                />
              </div>

              {/* Selection overlays */}
              {elements.map((el) => (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  className={`absolute cursor-move transition-colors ${selectedElementId === el.id
                      ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                      : 'hover:bg-white/5'
                    }`}
                  style={{
                    left: el.x * zoom,
                    top: el.y * zoom,
                    width: el.width * zoom,
                    height: el.height * zoom,
                  }}
                  title={el.label}
                />
              ))}
              {/* Alignment guide lines */}
              {guides.map((g, i) => (
                <React.Fragment key={i}>
                  {g.x !== undefined && (
                    <div
                      style={{
                        position: 'absolute',
                        left: g.x * zoom,
                        top: 0,
                        width: 1,
                        height: currentTemplate.cardHeight * zoom,
                        background: '#10b981',
                        pointerEvents: 'none',
                        zIndex: 100,
                        opacity: 0.8,
                      }}
                    />
                  )}
                  {g.y !== undefined && (
                    <div
                      style={{
                        position: 'absolute',
                        top: g.y * zoom,
                        left: 0,
                        height: 1,
                        width: currentTemplate.cardWidth * zoom,
                        background: '#10b981',
                        pointerEvents: 'none',
                        zIndex: 100,
                        opacity: 0.8,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
        {selectedElement ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Properties</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => duplicateElement(selectedElement)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Common */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Label</label>
                <input
                  type="text"
                  value={selectedElement.label}
                  onChange={(e) => handleElementUpdate(selectedElement.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Alignment quick-actions */}
              {currentTemplate && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Align on Card</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button title="Align Left" onClick={() => handleElementUpdate(selectedElement.id, { x: 0 })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="1.5" height="10" rx="0.5" fill="currentColor" /><rect x="3.5" y="4" width="7" height="2.5" rx="0.5" fill="currentColor" /><rect x="3.5" y="7.5" width="5" height="2.5" rx="0.5" fill="currentColor" /></svg>
                      Left
                    </button>
                    <button title="Center Horizontally" onClick={() => handleElementUpdate(selectedElement.id, { x: Math.round((currentTemplate.cardWidth - selectedElement.width) / 2) })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="6.25" y="1" width="1.5" height="12" rx="0.5" fill="currentColor" /><rect x="2" y="3.5" width="10" height="2.5" rx="0.5" fill="currentColor" /><rect x="3.5" y="7" width="7" height="2.5" rx="0.5" fill="currentColor" /></svg>
                      H-Center
                    </button>
                    <button title="Align Right" onClick={() => handleElementUpdate(selectedElement.id, { x: currentTemplate.cardWidth - selectedElement.width })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="11.5" y="2" width="1.5" height="10" rx="0.5" fill="currentColor" /><rect x="3.5" y="4" width="7" height="2.5" rx="0.5" fill="currentColor" /><rect x="5.5" y="7.5" width="5" height="2.5" rx="0.5" fill="currentColor" /></svg>
                      Right
                    </button>
                    <button title="Align Top" onClick={() => handleElementUpdate(selectedElement.id, { y: 0 })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="1.5" rx="0.5" fill="currentColor" /><rect x="3.5" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" /><rect x="8" y="3.5" width="2.5" height="5" rx="0.5" fill="currentColor" /></svg>
                      Top
                    </button>
                    <button title="Center Vertically" onClick={() => handleElementUpdate(selectedElement.id, { y: Math.round((currentTemplate.cardHeight - selectedElement.height) / 2) })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="6.25" width="12" height="1.5" rx="0.5" fill="currentColor" /><rect x="3.5" y="2" width="2.5" height="10" rx="0.5" fill="currentColor" /><rect x="8" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" /></svg>
                      V-Center
                    </button>
                    <button title="Align Bottom" onClick={() => handleElementUpdate(selectedElement.id, { y: currentTemplate.cardHeight - selectedElement.height })}
                      className="px-1 py-1.5 border border-gray-200 rounded text-[9px] text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all flex flex-col items-center gap-0.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" /><rect x="3.5" y="3.5" width="2.5" height="7" rx="0.5" fill="currentColor" /><rect x="8" y="5.5" width="2.5" height="5" rx="0.5" fill="currentColor" /></svg>
                      Bottom
                    </button>
                  </div>
                </div>
              )}

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">X</label>
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => handleElementUpdate(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Y</label>
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => handleElementUpdate(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">W</label>
                  <input
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) => handleElementUpdate(selectedElement.id, { width: parseInt(e.target.value) || 10 })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">H</label>
                  {selectedElement.type === 'text' ? (
                    <div className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-400 italic">
                      auto
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => handleElementUpdate(selectedElement.id, { height: parseInt(e.target.value) || 10 })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Field binding (for text and QR) */}
              {(selectedElement.type === 'text' || selectedElement.type === 'qr') && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Data Field</label>
                  <select
                    value={selectedElement.field || ''}
                    onChange={(e) =>
                      handleElementUpdate(selectedElement.id, {
                        field: (e.target.value as DataField) || undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">None (Static)</option>
                    {dataFieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Static text */}
              {selectedElement.type === 'text' && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Static Text</label>
                  <input
                    type="text"
                    value={selectedElement.staticText || ''}
                    onChange={(e) => handleElementUpdate(selectedElement.id, { staticText: e.target.value })}
                    placeholder="Text when no field is bound"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Image source */}
              {selectedElement.type === 'image' && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Image Source</label>
                  <select
                    value={selectedElement.imageSource || 'custom'}
                    onChange={(e) =>
                      handleElementUpdate(selectedElement.id, {
                        imageSource: e.target.value as CardElement['imageSource'],
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="photo">Person Photo</option>
                    <option value="logo">Organization Logo</option>
                    <option value="signature1">Signature 1</option>
                    <option value="signature2">Signature 2</option>
                    <option value="custom">Custom (Upload)</option>
                  </select>

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
                              handleElementUpdate(selectedElement.id, {
                                staticImageUrl: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {selectedElement.staticImageUrl && (
                        <button
                          className="mt-1 w-full text-[10px] text-red-400 hover:text-red-600 hover:underline transition-colors"
                          onClick={() => handleElementUpdate(selectedElement.id, { staticImageUrl: undefined })}
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Style Properties */}
              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Style</h4>

                {selectedElement.type === 'text' && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Size</label>
                        <input
                          type="number"
                          value={selectedElement.style.fontSize || 14}
                          onChange={(e) =>
                            handleElementUpdate(selectedElement.id, {
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
                            handleElementUpdate(selectedElement.id, {
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
                    <div className="mb-2">
                      <label className="block text-[10px] text-gray-500 mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.style.color || '#000000'}
                          onChange={(e) =>
                            handleElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, color: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedElement.style.color || '#000000'}
                          onChange={(e) =>
                            handleElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, color: e.target.value },
                            })
                          }
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-[10px] text-gray-500 mb-1">Align</label>
                      <div className="flex bg-gray-100 rounded p-0.5">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            onClick={() =>
                              handleElementUpdate(selectedElement.id, {
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
                    <div className="mb-2">
                      <label className="block text-[10px] text-gray-500 mb-1">Transform</label>
                      <select
                        value={selectedElement.style.textTransform || 'none'}
                        onChange={(e) =>
                          handleElementUpdate(selectedElement.id, {
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

                {selectedElement.type === 'shape' && (
                  <>
                    <div className="mb-2">
                      <label className="block text-[10px] text-gray-500 mb-1">Background</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.style.backgroundColor || '#cccccc'}
                          onChange={(e) =>
                            handleElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, backgroundColor: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedElement.style.backgroundColor || '#cccccc'}
                          onChange={(e) =>
                            handleElementUpdate(selectedElement.id, {
                              style: { ...selectedElement.style, backgroundColor: e.target.value },
                            })
                          }
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-[10px] text-gray-500 mb-1">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedElement.style.opacity ?? 1}
                        onChange={(e) =>
                          handleElementUpdate(selectedElement.id, {
                            style: { ...selectedElement.style, opacity: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {/* Border radius for applicable types */}
                {(selectedElement.type === 'image' || selectedElement.type === 'shape') && (
                  <div className="mb-2">
                    <label className="block text-[10px] text-gray-500 mb-1">Border Radius</label>
                    <input
                      type="number"
                      value={selectedElement.style.borderRadius || 0}
                      onChange={(e) =>
                        handleElementUpdate(selectedElement.id, {
                          style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Palette className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Select an element</p>
            <p className="text-xs text-gray-400 mt-1">Click on any element in the canvas to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardDesigner;
