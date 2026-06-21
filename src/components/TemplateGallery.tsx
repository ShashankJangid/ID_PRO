import React, { useState, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Palette,
  Search,
  Check,
  Building2,
  GraduationCap,
  Heart,
  Calendar,
  Minimize2,
  Sparkles,
  Copy,
  Trash2,
  Upload,
  FileJson,
  Image as ImageIcon,
  X,
  Plus,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { getBuiltInTemplates } from '@/templates/built-in';
import CardRenderer from './CardRenderer';
import type { CardTemplate } from '@/types';
import { readFileAsBase64, readFileAsText, getImageDimensions } from '@/lib/file-utils';
import { rescaleElements, getStandardDimensions } from '@/lib/templateAutoFit';

const categoryIcons: Record<string, React.ElementType> = {
  corporate: Building2,
  school: GraduationCap,
  medical: Heart,
  event: Calendar,
  minimal: Minimize2,
  custom: Sparkles,
};

const categoryColors: Record<string, string> = {
  corporate: 'bg-blue-50 text-blue-700 border-blue-200',
  school: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medical: 'bg-red-50 text-red-700 border-red-200',
  event: 'bg-purple-50 text-purple-700 border-purple-200',
  minimal: 'bg-gray-50 text-gray-700 border-gray-200',
  custom: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── Scaled preview container ─────────────────────────────────────
// Using explicit width/height so CSS scale doesn't leave ghost space
const ScaledPreview: React.FC<{
  template: CardTemplate;
  demoCard: any;
  organization: any;
  side: 'front' | 'back';
  scale: number;
}> = ({ template, demoCard, organization, side, scale }) => (
  <div
    style={{
      width: template.cardWidth * scale,
      height: template.cardHeight * scale,
      position: 'relative',
      flexShrink: 0,
    }}
  >
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute' }}>
      <CardRenderer template={template} cardData={demoCard} organization={organization} side={side} scale={1} />
    </div>
  </div>
);

// ─── JSON Schema hint for the upload modal ────────────────────────
const JSON_EXAMPLE = `{
  "name": "My Template",
  "description": "Custom card",
  "category": "custom",
  "cardWidth": 340,
  "cardHeight": 214,
  "frontElements": [
    {
      "id": "el_1",
      "type": "text",
      "label": "Name",
      "field": "name",
      "x": 20, "y": 80,
      "width": 200, "height": 28,
      "style": { "fontSize": 16, "fontWeight": "700", "color": "#111" }
    }
  ],
  "backElements": []
}`;



const TemplateGallery: React.FC = () => {
  const {
    templates: userTemplates,
    activeTemplateId,
    setActiveTemplate,
    addTemplate,
    deleteTemplate,
    organization,
    cardDataList,
    showToast,
  } = useAppStore(
    useShallow((s) => ({
      templates: s.templates,
      activeTemplateId: s.activeTemplateId,
      setActiveTemplate: s.setActiveTemplate,
      addTemplate: s.addTemplate,
      deleteTemplate: s.deleteTemplate,
      organization: s.organization,
      cardDataList: s.cardDataList,
      showToast: s.showToast,
    }))
  );

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  // ── Upload modal state ──
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBg, setUploadBg] = useState<string | null>(null);       // base64 front bg
  const [uploadBgBack, setUploadBgBack] = useState<string | null>(null); // base64 back bg
  const [uploadJson, setUploadJson] = useState('');
  const [uploadJsonError, setUploadJsonError] = useState('');
  const [uploadName, setUploadName] = useState('');
  const bgRef = useRef<HTMLInputElement>(null);
  const bgBackRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  // ── Template File Input Ref ──
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  const builtInTemplates = useMemo(() => getBuiltInTemplates(), []);
  // Merge built-ins with user/store templates, deduplicating by ID
  const allTemplates = useMemo(() => {
    const seen = new Set<string>();
    const result: CardTemplate[] = [];
    for (const t of builtInTemplates) {
      if (!seen.has(t.id)) { seen.add(t.id); result.push(t); }
    }
    for (const t of userTemplates) {
      if (!seen.has(t.id)) { seen.add(t.id); result.push(t); }
    }
    return result;
  }, [builtInTemplates, userTemplates]);

  const filtered = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allTemplates, search, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, [allTemplates]);

  const demoCard = cardDataList[0] || {
    name: 'Sample Name', role: 'Designation', code: 'DEMO-001',
    dob: '01-01-2000', blood: 'A+', contact: '+91-XXXXXXXXXX',
    address: 'School Address, City', issued: '01-06-2025',
    valid: '31-05-2026', emergency: '+91-XXXXXXXXXX',
  };

  const handleSelect = (template: CardTemplate) => {
    // Built-in templates only exist in getBuiltInTemplates(), not the persisted
    // store, so getActiveTemplate() returns undefined unless we upsert first.
    const alreadyInStore = useAppStore.getState().templates.some((t) => t.id === template.id);
    if (!alreadyInStore) {
      addTemplate(template);
    }
    setActiveTemplate(template.id);
    showToast(`Template "${template.name}" selected!`, 'success');
  };

  const handleDuplicate = (template: CardTemplate) => {
    const newTemplate: CardTemplate = {
      ...template,
      id: `custom_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isBuiltIn: false,
      category: 'custom',
      createdAt: new Date().toISOString(),
    };
    addTemplate(newTemplate);
    showToast('Template duplicated! You can now customize it.', 'success');
  };

  // ─── Validate the JSON layout ───────────────────────────────────
  const validateLayout = (json: string): string => {
    try {
      const parsed = JSON.parse(json);
      const required = ['id', 'type', 'x', 'y', 'width', 'height'];
      
      const checkElements = (els: any[], name: string) => {
        if (!Array.isArray(els)) return '';
        for (const el of els) {
          for (const f of required) {
            if (el[f] === undefined) return `Element in ${name} missing field: "${f}"`;
          }
        }
        return '';
      };

      if (parsed.frontElements) {
        const err = checkElements(parsed.frontElements, 'frontElements');
        if (err) return err;
      }
      if (parsed.backElements) {
        const err = checkElements(parsed.backElements, 'backElements');
        if (err) return err;
      }
      return '';
    } catch (e: any) {
      return `JSON parse error: ${e.message}`;
    }
  };

  // Helper: Auto-scale template dimensions and element coordinates to standard printable sizes
  const rescaleTemplate = async (parsed: Partial<CardTemplate>, uploadBgUrl?: string | null) => {
    let cardWidth = parsed.cardWidth || 0;
    let cardHeight = parsed.cardHeight || 0;

    const bgUrl = uploadBgUrl || parsed.backgroundImage || parsed.backgroundImageBack;

    // If no width/height in JSON, get background image dimensions
    if ((!cardWidth || !cardHeight) && bgUrl) {
      try {
        const dims = await getImageDimensions(bgUrl);
        cardWidth = dims.w;
        cardHeight = dims.h;
      } catch (e) {
        console.warn('Failed to get background image dimensions:', e);
      }
    }

    // Guess orientation from elements if still unknown
    if (!cardWidth || !cardHeight) {
      const allElements = [...(parsed.frontElements || []), ...(parsed.backElements || [])];
      let maxX = 0;
      let maxY = 0;
      allElements.forEach((el) => {
        const right = (el.x || 0) + (el.width || 0);
        const bottom = (el.y || 0) + (el.height || 0);
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      });

      if (maxX > 0 || maxY > 0) {
        if (maxX <= 340 && maxY <= 214) {
          cardWidth = 340;
          cardHeight = 214;
        } else if (maxX <= 214 && maxY <= 340) {
          cardWidth = 214;
          cardHeight = 340;
        } else if (maxX > maxY) {
          cardWidth = 1010;
          cardHeight = 638;
        } else {
          cardWidth = 638;
          cardHeight = 1010;
        }
      }
    }

    // Default fallbacks if dimensions are still unresolvable
    if (!cardWidth || !cardHeight) {
      cardWidth = 638;
      cardHeight = 1010;
    }

    // Determine standard printable targets based on aspect ratio
    const { w: targetW, h: targetH } = getStandardDimensions(cardWidth, cardHeight);

    const scaledFront = rescaleElements(parsed.frontElements, cardWidth, cardHeight, targetW, targetH);
    const scaledBack = rescaleElements(parsed.backElements, cardWidth, cardHeight, targetW, targetH);

    return {
      cardWidth: targetW,
      cardHeight: targetH,
      frontElements: scaledFront,
      backElements: scaledBack,
    };
  };

  // ─── Import custom template ─────────────────────────────────────
  const handleImportTemplate = async () => {
    if (!uploadJson.trim()) {
      setUploadJsonError('Please paste your JSON layout or upload a .json file');
      return;
    }
    const err = validateLayout(uploadJson);
    if (err) { setUploadJsonError(err); return; }

    let parsed: Partial<CardTemplate>;
    try { parsed = JSON.parse(uploadJson); } catch { return; }

    // Auto-scale layout dimensions and coordinates to standard printable sizes
    const rescaled = await rescaleTemplate(parsed, uploadBg);

    const newTemplate: CardTemplate = {
      id: `custom_${Date.now()}`,
      name: uploadName || parsed.name || 'Custom Template',
      description: parsed.description || 'User-uploaded template',
      category: 'custom',
      cardWidth: rescaled.cardWidth,
      cardHeight: rescaled.cardHeight,
      dpi: 300,
      frontElements: rescaled.frontElements,
      backElements: rescaled.backElements,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      backgroundImage: uploadBg || parsed.backgroundImage || undefined,
      backgroundImageBack: uploadBgBack || parsed.backgroundImageBack || undefined,
    };

    addTemplate(newTemplate);
    setActiveTemplate(newTemplate.id);
    showToast(`Template "${newTemplate.name}" imported and auto-scaled!`, 'success');

    // reset
    setShowUpload(false);
    setUploadBg(null);
    setUploadBgBack(null);
    setUploadJson('');
    setUploadName('');
    setUploadJsonError('');
  };

  // ─── Blank template (image-only, no elements) ───────────────────
  const handleCreateBlank = async () => {
    if (!uploadBg) { showToast('Please upload a front background image first', 'error'); return; }

    // Detect real image dimensions so elements placed later align correctly
    const { w, h } = await getImageDimensions(uploadBg);
    const isPortrait = w < h;

    const newTemplate: CardTemplate = {
      id: `custom_${Date.now()}`,
      name: uploadName || 'Image Template',
      description: 'Image background — add fields in the Designer',
      category: 'custom',
      cardWidth: isPortrait ? 638 : 1010,
      cardHeight: isPortrait ? 1010 : 638,
      dpi: 300,
      frontElements: [],
      backElements: [],
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      backgroundImage: uploadBg,
      backgroundImageBack: uploadBgBack || undefined,
    };

    addTemplate(newTemplate);
    setActiveTemplate(newTemplate.id);
    showToast('Template created! Open Designer to add fields.', 'success');
    setShowUpload(false);
    setUploadBg(null);
    setUploadBgBack(null);
    setUploadJson('');
    setUploadName('');
  };

  const handleDownloadTemplate = (template: CardTemplate) => {
    try {
      const exportable = {
        ...template,
        isBuiltIn: false,
        updatedAt: new Date().toISOString(),
      };
      const jsonString = JSON.stringify(exportable, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_template.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Template "${template.name}" exported successfully!`, 'success');
    } catch (error: any) {
      console.error('Failed to download template:', error);
      showToast(`Failed to export template: ${error.message || error}`, 'error');
    }
  };

  const handleUploadTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const parsed = JSON.parse(text);

      if (!parsed.frontElements || !Array.isArray(parsed.frontElements)) {
        showToast('Invalid template: frontElements is missing or invalid', 'error');
        return;
      }
      if (!parsed.cardWidth || !parsed.cardHeight) {
        showToast('Invalid template: card dimensions are missing', 'error');
        return;
      }

      const newTemplate: CardTemplate = {
        ...parsed,
        id: `custom_${Date.now()}`,
        isBuiltIn: false,
        category: parsed.category || 'custom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addTemplate(newTemplate);
      setActiveTemplate(newTemplate.id);
      showToast(`Template "${newTemplate.name}" imported and activated successfully!`, 'success');
    } catch (err: any) {
      showToast(`Failed to parse template file: ${err.message || err}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Gallery</h1>
        </div>
        <div className="flex gap-2">
          {/* ✅ Import Template File button */}
          <button
            onClick={() => templateFileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold glass-btn shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Template File
          </button>
          <input
            ref={templateFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleUploadTemplateFile}
          />
          {/* ✅ Upload custom template button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Custom Template
          </button>
        </div>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Choose from pre-built templates, upload your own, or duplicate and customize.
      </p>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2.5 glass-input rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                    : 'glass-btn text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-3 gap-5">
        {filtered.map((template) => {
          const isActive = activeTemplateId === template.id;
          const CatIcon = categoryIcons[template.category] || Sparkles;
          return (
            <div
              key={template.id}
              className={`glass-panel rounded-xl transition-all overflow-hidden flex flex-col ${
                isActive ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20' : ''
              }`}
            >
              {/* ✅ FIX: proper scaled preview — no ghost space */}
              <div
                className="bg-gray-50/40 dark:bg-gray-900/40 border-b border-gray-200/10 dark:border-gray-800/10 flex justify-center items-start cursor-pointer overflow-hidden relative group"
                style={{ height: template.cardHeight * 0.35 + 24 }}
                onClick={() => setPreviewTemplate(template)}
              >
                <div style={{ paddingTop: 12 }}>
                  <ScaledPreview template={template} demoCard={demoCard} organization={organization} side="front" scale={0.35} />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-900/90 text-gray-850 dark:text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md backdrop-blur-sm transition-all duration-300">
                    Preview Layout
                  </span>
                </div>
              </div>

              <div className="px-4 pb-4 pt-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize border ${categoryColors[template.category] || categoryColors.custom}`}>
                      <CatIcon className="w-3 h-3" />{template.category}
                    </span>
                    {template.isBuiltIn && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-150/40 text-gray-600 dark:text-gray-300 border border-gray-200/10">Built-in</span>
                    )}
                    {template.backgroundImage && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />BG
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">{template.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(template)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97] ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                    }`}
                  >
                    {isActive ? <><Check className="w-3.5 h-3.5" />Selected</> : 'Select'}
                  </button>
                  <button
                    onClick={() => handleDownloadTemplate(template)}
                    className="p-2 glass-btn rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400"
                    title="Download Template File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-2 glass-btn rounded-lg text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!template.isBuiltIn && (
                    <button
                      onClick={() => { deleteTemplate(template.id); showToast('Template deleted', 'info'); }}
                      className="p-2 glass-btn rounded-lg text-red-400 dark:text-red-500 hover:bg-red-500/10 hover:border-red-500/20"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Palette className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No templates found</p>
        </div>
      )}

      {/* ─── Preview Modal ─────────────────────────────────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-8" onClick={() => setPreviewTemplate(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{previewTemplate.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{previewTemplate.description}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-gray-500/10 rounded-lg text-gray-550 dark:text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-8 justify-center items-start py-4">
              {(['front', 'back'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{s}</p>
                  <div className="p-2 bg-gray-500/5 rounded-xl border border-gray-200/10 shadow-inner">
                    <ScaledPreview template={previewTemplate} demoCard={demoCard} organization={organization} side={s} scale={0.5} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6 pt-4 border-t border-gray-200/10">
              <button
                onClick={() => { handleSelect(previewTemplate); setPreviewTemplate(null); }}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-500/15 active:scale-[0.98] transition-all"
              >
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Upload Custom Template Modal ───────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
          <div className="glass-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/10">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Upload Custom Template</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload a background image + JSON layout, or image-only</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-gray-500/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Template name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. My Company Card"
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Background images */}
              <div className="grid grid-cols-2 gap-4">
                {/* Front BG */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    Front Background Image <span className="text-gray-400 dark:text-gray-500 font-normal">(PNG/JPG)</span>
                  </label>
                  <div
                    onClick={() => bgRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                      uploadBg ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5'
                    }`}
                  >
                    {uploadBg ? (
                      <div className="relative">
                        <img src={uploadBg} className="w-full h-24 object-contain rounded-lg" />
                        <button onClick={(e) => { e.stopPropagation(); setUploadBg(null); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">×</button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload front BG</p>
                      </>
                    )}
                  </div>
                  <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { showToast('Max 5MB', 'error'); return; }
                    setUploadBg(await readFileAsBase64(f)); e.target.value = '';
                  }} />
                </div>

                {/* Back BG */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    Back Background Image <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <div
                    onClick={() => bgBackRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                      uploadBgBack ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5'
                    }`}
                  >
                    {uploadBgBack ? (
                      <div className="relative">
                        <img src={uploadBgBack} className="w-full h-24 object-contain rounded-lg" />
                        <button onClick={(e) => { e.stopPropagation(); setUploadBgBack(null); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">×</button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload back BG</p>
                      </>
                    )}
                  </div>
                  <input ref={bgBackRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { showToast('Max 5MB', 'error'); return; }
                    setUploadBgBack(await readFileAsBase64(f)); e.target.value = '';
                  }} />
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex-1 h-px bg-gray-200/10" />
                <span>JSON Field Layout (optional — needed for auto-fill)</span>
                <div className="flex-1 h-px bg-gray-200/10" />
              </div>

              {/* JSON upload or paste */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">JSON Layout</label>
                  <button
                    onClick={() => jsonRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    <FileJson className="w-3.5 h-3.5" />Upload .json file
                  </button>
                </div>
                <textarea
                  value={uploadJson}
                  onChange={(e) => { setUploadJson(e.target.value); setUploadJsonError(''); }}
                  rows={8}
                  placeholder={JSON_EXAMPLE}
                  className="w-full px-3 py-2.5 glass-input rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
                <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const text = await readFileAsText(f);
                  setUploadJson(text); setUploadJsonError('');
                  e.target.value = '';
                }} />
                {uploadJsonError && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-650 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadJsonError}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">How it works:</p>
                <p>• <strong>Image only</strong> → Upload your designed card image. Fields are positioned in the Designer afterwards.</p>
                <p>• <strong>Image + JSON</strong> → Upload image as background and JSON to define where each field goes. The app auto-fills data at export time.</p>
                <p>• <strong>JSON only</strong> → Programmatic template with no image background.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200/10 flex gap-3 justify-end">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 glass-btn rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300">
                Cancel
              </button>
              {/* Image-only (no JSON) */}
              {uploadBg && !uploadJson.trim() && (
                <button
                  onClick={handleCreateBlank}
                  className="px-4 py-2 border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
                >
                  Create (Image Only)
                </button>
              )}
              {/* With JSON */}
              <button
                onClick={handleImportTemplate}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Template
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Removed Canva Import Modal */}
    </div>
  );
};

export default TemplateGallery;
