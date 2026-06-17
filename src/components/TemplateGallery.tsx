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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { getBuiltInTemplates } from '@/templates/built-in';
import CardRenderer from './CardRenderer';
import type { CardTemplate, CardElement } from '@/types';
import { readFileAsBase64, readFileAsText, getImageDimensions } from '@/lib/file-utils';

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

  // ── Canva Import Modal State ──
  const [showCanvaImport, setShowCanvaImport] = useState(false);
  const [canvaEmbedCode, setCanvaEmbedCode] = useState('');
  const [canvaError, setCanvaError] = useState('');

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
    name: 'John Doe', role: 'Manager', code: 'EMP001',
    dob: '01-01-1990', blood: 'O+', contact: '9876543210',
    address: '123 Main Street, City', issued: '01-01-2024',
    valid: '31-12-2025', emergency: '9876543211',
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
      if (!Array.isArray(parsed.frontElements)) return 'Missing "frontElements" array';
      const required = ['id', 'type', 'label', 'x', 'y', 'width', 'height', 'style'];
      for (const el of parsed.frontElements) {
        for (const f of required) {
          if (el[f] === undefined) return `Element missing field: "${f}"`;
        }
      }
      return '';
    } catch (e: any) {
      return `JSON parse error: ${e.message}`;
    }
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

    // If JSON doesn't specify dimensions, derive from the uploaded background image
    let cardWidth = parsed.cardWidth || 340;
    let cardHeight = parsed.cardHeight || 214;
    if (uploadBg && !parsed.cardWidth) {
      const dims = await getImageDimensions(uploadBg);
      cardWidth = dims.w;
      cardHeight = dims.h;
    }

    const newTemplate: CardTemplate = {
      id: `custom_${Date.now()}`,
      name: uploadName || parsed.name || 'Custom Template',
      description: parsed.description || 'User-uploaded template',
      category: 'custom',
      cardWidth,
      cardHeight,
      frontElements: (parsed.frontElements || []) as CardElement[],
      backElements: (parsed.backElements || []) as CardElement[],
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      backgroundImage: uploadBg || undefined,
      backgroundImageBack: uploadBgBack || undefined,
    };

    addTemplate(newTemplate);
    setActiveTemplate(newTemplate.id);
    showToast(`Template "${newTemplate.name}" imported and selected!`, 'success');

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

    const newTemplate: CardTemplate = {
      id: `custom_${Date.now()}`,
      name: uploadName || 'Image Template',
      description: 'Image background — add fields in the Designer',
      category: 'custom',
      cardWidth: w,
      cardHeight: h,
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

  const handleCanvaImport = () => {
    setCanvaError('');
    if (!canvaEmbedCode.trim()) {
      setCanvaError('Please paste the Canva embed HTML code.');
      return;
    }

    // Extract iframe src
    const srcRegex = /src="([^"]+)"/;
    const srcMatch = canvaEmbedCode.match(srcRegex);
    let embedUrl = srcMatch ? srcMatch[1] : '';

    if (!embedUrl) {
      // Fallback: try to see if they just pasted a plain Canva URL
      const urlRegex = /(https?:\/\/[^\s]+canva\.com[^\s]+)/;
      const urlMatch = canvaEmbedCode.match(urlRegex);
      if (urlMatch) {
        embedUrl = urlMatch[1].split('?')[0] + '/watch?embed';
      } else {
        setCanvaError('Could not find any iframe or Canva design URL in the pasted code.');
        return;
      }
    }

    // Standardize URL to embed/watch
    if (embedUrl.includes('/design/') && !embedUrl.endsWith('embed')) {
      try {
        const parsedUrl = new URL(embedUrl);
        if (!parsedUrl.searchParams.has('embed')) {
          parsedUrl.search = '?embed';
          embedUrl = parsedUrl.toString();
        }
      } catch (err) {
        // ignore url parsing error and keep raw embedUrl
      }
    }

    // Extract title/design name
    const titleRegex = /alt="([^"]+)"|title="([^"]+)"/;
    const titleMatch = canvaEmbedCode.match(titleRegex);
    let name = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '') || '';

    if (!name) {
      const anchorRegex = />([^<]+)<\/a>\s+by/;
      const anchorMatch = canvaEmbedCode.match(anchorRegex);
      if (anchorMatch) {
        name = anchorMatch[1].trim();
      } else {
        name = 'Canva Design';
      }
    }

    // Guess orientation from padding-top ratio
    const paddingRegex = /padding-top:\s*([\d.]+)%/;
    const paddingMatch = canvaEmbedCode.match(paddingRegex);
    let isHorizontal = false;
    if (paddingMatch) {
      const padVal = parseFloat(paddingMatch[1]);
      if (padVal < 100) {
        isHorizontal = true;
      }
    }

    const newTemplate: CardTemplate = {
      id: `canva_${Date.now()}`,
      name: name,
      description: `Imported from Canva Embed Code`,
      category: 'custom',
      cardWidth: isHorizontal ? 1010 : 638,
      cardHeight: isHorizontal ? 638 : 1010,
      frontElements: [],
      backElements: [],
      canvaEmbedUrl: embedUrl,
      canvaEmbedUrlBack: embedUrl,
      createdAt: new Date().toISOString(),
    };

    addTemplate(newTemplate);
    setActiveTemplate(newTemplate.id);
    showToast('Canva Template imported successfully!', 'success');
    setShowCanvaImport(false);
    setCanvaEmbedCode('');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Template Gallery</h1>
        </div>
        <div className="flex gap-2">
          {/* ✅ Import Canva Embed button */}
          <button
            onClick={() => setShowCanvaImport(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-600 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Import Canva Embed
          </button>
          {/* ✅ Upload custom template button */}
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Custom Template
          </button>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-6">
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
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                categoryFilter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
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
              className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg overflow-hidden ${
                isActive ? 'border-emerald-500 shadow-md' : 'border-gray-200'
              }`}
            >
              {/* ✅ FIX: proper scaled preview — no ghost space */}
              <div
                className="bg-gray-50 flex justify-center items-start cursor-pointer overflow-hidden"
                style={{ height: template.cardHeight * 0.35 + 24 }}
                onClick={() => setPreviewTemplate(template)}
              >
                <div style={{ paddingTop: 12 }}>
                  <ScaledPreview template={template} demoCard={demoCard} organization={organization} side="front" scale={0.35} />
                </div>
              </div>

              <div className="px-4 pb-4 pt-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize border ${categoryColors[template.category] || categoryColors.custom}`}>
                    <CatIcon className="w-3 h-3" />{template.category}
                  </span>
                  {template.isBuiltIn && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">Built-in</span>
                  )}
                  {template.backgroundImage && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />BG
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">{template.name}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(template)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isActive ? <><Check className="w-3.5 h-3.5" />Selected</> : 'Select'}
                  </button>
                  <button onClick={() => handleDuplicate(template)} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!template.isBuiltIn && (
                    <button onClick={() => { deleteTemplate(template.id); showToast('Template deleted', 'info'); }} className="p-2 border border-red-200 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{previewTemplate.name}</h3>
                <p className="text-sm text-gray-500">{previewTemplate.description}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-8 justify-center items-start">
              {(['front', 'back'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s}</p>
                  <ScaledPreview template={previewTemplate} demoCard={demoCard} organization={organization} side={s} scale={0.5} />
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => { handleSelect(previewTemplate); setPreviewTemplate(null); }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Upload Custom Template Modal ───────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Upload Custom Template</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload a background image + JSON layout, or image-only</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Template name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. My Company Card"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Background images */}
              <div className="grid grid-cols-2 gap-4">
                {/* Front BG */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Front Background Image <span className="text-gray-400 font-normal">(PNG/JPG)</span>
                  </label>
                  <div
                    onClick={() => bgRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                      uploadBg ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/20'
                    }`}
                  >
                    {uploadBg ? (
                      <div className="relative">
                        <img src={uploadBg} className="w-full h-24 object-contain rounded-lg" />
                        <button onClick={(e) => { e.stopPropagation(); setUploadBg(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Click to upload front BG</p>
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Back Background Image <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div
                    onClick={() => bgBackRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                      uploadBgBack ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/20'
                    }`}
                  >
                    {uploadBgBack ? (
                      <div className="relative">
                        <img src={uploadBgBack} className="w-full h-24 object-contain rounded-lg" />
                        <button onClick={(e) => { e.stopPropagation(); setUploadBgBack(null); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Click to upload back BG</p>
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
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>JSON Field Layout (optional — needed for auto-fill)</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* JSON upload or paste */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600">JSON Layout</label>
                  <button
                    onClick={() => jsonRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline"
                  >
                    <FileJson className="w-3.5 h-3.5" />Upload .json file
                  </button>
                </div>
                <textarea
                  value={uploadJson}
                  onChange={(e) => { setUploadJson(e.target.value); setUploadJsonError(''); }}
                  rows={8}
                  placeholder={JSON_EXAMPLE}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-gray-50"
                />
                <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const text = await readFileAsText(f);
                  setUploadJson(text); setUploadJsonError('');
                  e.target.value = '';
                }} />
                {uploadJsonError && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadJsonError}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">How it works:</p>
                <p>• <strong>Image only</strong> → Upload your designed card image. Fields are positioned in the Designer afterwards.</p>
                <p>• <strong>Image + JSON</strong> → Upload image as background and JSON to define where each field goes. The app auto-fills data at export time.</p>
                <p>• <strong>JSON only</strong> → Programmatic template with no image background.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              {/* Image-only (no JSON) */}
              {uploadBg && !uploadJson.trim() && (
                <button
                  onClick={handleCreateBlank}
                  className="px-4 py-2 border-2 border-emerald-500 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-50"
                >
                  Create (Image Only)
                </button>
              )}
              {/* With JSON */}
              <button
                onClick={handleImportTemplate}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Template
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Canva Embed Import Modal ───────────────────────────── */}
      {showCanvaImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCanvaImport(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Import Canva Design</h3>
                <p className="text-xs text-gray-500 mt-0.5">Paste Canva HTML embed code to automatically create a template</p>
              </div>
              <button onClick={() => setShowCanvaImport(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Canva HTML Embed Code</label>
                <textarea
                  value={canvaEmbedCode}
                  onChange={(e) => setCanvaEmbedCode(e.target.value)}
                  placeholder={`e.g. <div style="position: relative; ..."><iframe src="https://www.canva.com/design/.../watch?embed" ...></iframe></div>...`}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {canvaError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {canvaError}
                </div>
              )}

              {/* Instructions / Warning */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-1.5">
                <p className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> How to get Canva Embed Code:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-amber-800 space-y-1">
                  <li>In Canva, click <strong>Share</strong> (top right) → <strong>More</strong></li>
                  <li>Select <strong>Embed</strong> option and click <strong>Embed</strong></li>
                  <li>Copy the <strong>HTML embed code</strong> block</li>
                </ol>
                <div className="border-t border-amber-200/50 mt-2 pt-2 text-[10px] text-amber-700 leading-normal">
                  ⚠️ <strong>Export Note:</strong> Due to CORS limitations, external interactive Canva iframes cannot be captured on PDF/PNG exports. For export builds, please upload your Canva layout as a standard static Background Image in the designer.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowCanvaImport(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCanvaImport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all"
              >
                Import Design
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;
