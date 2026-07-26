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
  Globe,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { getBuiltInTemplates } from '@/templates/built-in';
import { trackAnalyticsEvent } from '@/lib/firebase';
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
  const [uploadTab, setUploadTab] = useState<'canva' | 'image' | 'json'>('canva');
  const [fetchUrl, setFetchUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [uploadBg, setUploadBg] = useState<string | null>(null);       // base64 front bg
  const [uploadBgBack, setUploadBgBack] = useState<string | null>(null); // base64 back bg
  const [uploadJson, setUploadJson] = useState('');
  const [uploadJsonError, setUploadJsonError] = useState('');
  const [uploadName, setUploadName] = useState('');
  const bgRef = useRef<HTMLInputElement>(null);
  const bgBackRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  // ── Canva / Web URL Fetcher ─────────────────────────────────────
  const handleFetchFromUrl = async () => {
    const trimmed = fetchUrl.trim();
    if (!trimmed) {
      showToast('Please enter an image or design URL', 'error');
      return;
    }
    setIsFetchingUrl(true);
    try {
      if (trimmed.includes('canva.com/design/')) {
        showToast('Canva link detected! For best results, download PNG from Canva and paste image link.', 'info');
      }

      // Try image element proxy load
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setUploadBg(dataUrl);
          if (!uploadName) {
            setUploadName('Canva Imported Template');
          }
          showToast('Successfully fetched Canva/URL design background!', 'success');
        }
        setIsFetchingUrl(false);
      };
      img.onerror = async () => {
        // Fallback: blob fetch
        try {
          const res = await fetch(trimmed);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = reader.result as string;
            setUploadBg(b64);
            if (!uploadName) {
              setUploadName('Canva Imported Template');
            }
            showToast('Successfully loaded design background!', 'success');
            setIsFetchingUrl(false);
          };
          reader.readAsDataURL(blob);
        } catch (fetchErr) {
          showToast('Could not load image directly due to CORS. Please download the PNG from Canva and upload it directly below.', 'error');
          setIsFetchingUrl(false);
        }
      };
      img.src = trimmed;
    } catch (e) {
      showToast('Error fetching design URL.', 'error');
      setIsFetchingUrl(false);
    }
  };

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
    trackAnalyticsEvent('select_template', { template_id: template.id, template_name: template.name });
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

  // ─── Create Template from Canva / Image Background ────────────────
  const handleCreateBlank = async () => {
    if (!uploadBg) { showToast('Please upload or fetch a background image first', 'error'); return; }

    // Detect real image dimensions so elements placed later align correctly
    const { w, h } = await getImageDimensions(uploadBg);
    const isPortrait = w <= h;

    const cardWidth = isPortrait ? 638 : 1010;
    const cardHeight = isPortrait ? 1010 : 638;

    const initialFrontElements = isPortrait
      ? [
          {
            id: 'el_photo',
            type: 'image' as const,
            label: 'Student Photo',
            imageSource: 'photo' as const,
            x: 219,
            y: 180,
            width: 200,
            height: 250,
            style: { borderRadius: 16, border: '3px solid #10b981' },
          },
          {
            id: 'el_name',
            type: 'text' as const,
            label: 'Full Name',
            field: 'name' as const,
            x: 50,
            y: 470,
            width: 538,
            height: 40,
            style: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
          },
          {
            id: 'el_role',
            type: 'text' as const,
            label: 'Role / Designation',
            field: 'role' as const,
            x: 50,
            y: 520,
            width: 538,
            height: 28,
            style: { fontSize: 16, fontWeight: '700', color: '#059669', textAlign: 'center' },
          },
          {
            id: 'el_qr',
            type: 'qr' as const,
            label: 'QR Code',
            field: 'code' as const,
            x: 259,
            y: 780,
            width: 120,
            height: 120,
            style: {},
          },
        ]
      : [
          {
            id: 'el_photo',
            type: 'image' as const,
            label: 'Student Photo',
            imageSource: 'photo' as const,
            x: 60,
            y: 160,
            width: 180,
            height: 220,
            style: { borderRadius: 14, border: '3px solid #10b981' },
          },
          {
            id: 'el_name',
            type: 'text' as const,
            label: 'Full Name',
            field: 'name' as const,
            x: 270,
            y: 160,
            width: 450,
            height: 40,
            style: { fontSize: 26, fontWeight: '800', color: '#111827' },
          },
          {
            id: 'el_role',
            type: 'text' as const,
            label: 'Role / Designation',
            field: 'role' as const,
            x: 270,
            y: 210,
            width: 450,
            height: 28,
            style: { fontSize: 16, fontWeight: '700', color: '#059669' },
          },
          {
            id: 'el_qr',
            type: 'qr' as const,
            label: 'QR Code',
            field: 'code' as const,
            x: 770,
            y: 160,
            width: 130,
            height: 130,
            style: {},
          },
        ];

    const newTemplate: CardTemplate = {
      id: `custom_${Date.now()}`,
      name: uploadName || 'Canva Custom Template',
      description: 'Imported Canva background design with auto-fitted editable fields',
      category: 'custom',
      cardWidth,
      cardHeight,
      dpi: 300,
      frontElements: initialFrontElements as any,
      backElements: [],
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      backgroundImage: uploadBg,
      backgroundImageBack: uploadBgBack || undefined,
    };

    addTemplate(newTemplate);
    setActiveTemplate(newTemplate.id);
    showToast(`Template "${newTemplate.name}" created! You can now customize fields in Designer.`, 'success');
    setShowUpload(false);
    setUploadBg(null);
    setUploadBgBack(null);
    setUploadJson('');
    setUploadName('');
    setFetchUrl('');
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
          {/* ✅ Canva / URL Fetcher button */}
          <button
            onClick={() => { setUploadTab('canva'); setShowUpload(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
            Fetch from Canva / URL
          </button>
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
            onClick={() => { setUploadTab('image'); setShowUpload(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Custom Template
          </button>
        </div>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Choose from pre-built templates, fetch design assets from Canva/web, or upload your own template.
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
                style={{ height: 260, padding: 16 }}
                onClick={() => setPreviewTemplate(template)}
              >
                <ScaledPreview template={template} demoCard={demoCard} organization={organization} side="front" scale={0.24} />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                  <span className="px-3 py-1.5 bg-white/90 text-gray-900 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5">
                    Preview & Details
                  </span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryColors[template.category] || categoryColors.custom}`}>
                      <CatIcon className="w-3 h-3" />
                      {template.category}
                    </span>
                    {template.isBuiltIn ? (
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Built-in</span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-500">Custom</span>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 md:p-8 animate-in fade-in duration-200" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{previewTemplate.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                    📐 {previewTemplate.cardWidth} × {previewTemplate.cardHeight} px
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{previewTemplate.description}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-8 justify-center items-start py-4 flex-wrap">
              {(['front', 'back'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{s}</p>
                  <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-700/60 dark:border-slate-800 shadow-2xl flex items-center justify-center">
                    <ScaledPreview template={previewTemplate} demoCard={demoCard} organization={organization} side={s} scale={0.5} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { handleSelect(previewTemplate); setPreviewTemplate(null); }}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                Use This Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import / Fetch Custom Template Modal ───────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 md:p-6 animate-in fade-in duration-200" onClick={() => setShowUpload(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/10">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Import & Fetch Custom Template
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fetch designs from Canva, image URL links, or upload template assets</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-1.5 hover:bg-gray-500/10 rounded-lg text-gray-500 dark:text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200/10 px-6 pt-3 gap-2 bg-gray-500/5">
              <button
                onClick={() => setUploadTab('canva')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                  uploadTab === 'canva'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Fetch Canva / Web URL
              </button>
              <button
                onClick={() => setUploadTab('image')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                  uploadTab === 'image'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                Upload Image File
              </button>
              <button
                onClick={() => setUploadTab('json')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                  uploadTab === 'json'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <FileJson className="w-3.5 h-3.5 text-blue-500" />
                JSON Layout Code
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. My Canva Corporate Template"
                  className="w-full px-3 py-2 glass-input rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* ══ TAB 1: CANVA & URL FETCHER ══════════════════════════ */}
              {uploadTab === 'canva' && (
                <div className="space-y-4">
                  {/* Canva Quick Tutorial */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-purple-700 dark:text-purple-300">
                      <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-400" /> How to Fetch from Canva:</span>
                      <a href="https://canva.com" target="_blank" rel="noreferrer" className="text-[11px] underline flex items-center gap-1 hover:text-purple-400">
                        Open Canva <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-purple-300/80 leading-relaxed">
                      1. In Canva, click <strong>Share ➔ Download ➔ PNG/JPG</strong> (or right-click image to copy image address).<br />
                      2. Paste the image link or fetch URL below.<br />
                      3. Card Gen auto-detects resolution & creates editable fields for Name, Photo & QR code!
                    </p>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Canva Design Image Link or Web URL</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url"
                          value={fetchUrl}
                          onChange={(e) => setFetchUrl(e.target.value)}
                          placeholder="https://... (Canva image link or web URL)"
                          className="w-full pl-9 pr-3 py-2 glass-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleFetchFromUrl}
                        disabled={isFetchingUrl}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-60 transition-all active:scale-[0.98]"
                      >
                        {isFetchingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                        Fetch Design
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ TAB 1 & 2: IMAGE DISPLAY & FILE DROPZONE ═══════════ */}
              {(uploadTab === 'canva' || uploadTab === 'image') && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {/* Front BG */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      Front Design Background <span className="text-gray-400 dark:text-gray-500 font-normal">(PNG/JPG)</span>
                    </label>
                    <div
                      onClick={() => bgRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                        uploadBg ? 'border-purple-500 bg-purple-500/5' : 'border-gray-300 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-500/5'
                      }`}
                    >
                      {uploadBg ? (
                        <div className="relative">
                          <img src={uploadBg} className="w-full h-28 object-contain rounded-lg shadow-sm" alt="Front Preview" />
                          <button onClick={(e) => { e.stopPropagation(); setUploadBg(null); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">×</button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload Canva PNG/JPG</p>
                        </>
                      )}
                    </div>
                    <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 10 * 1024 * 1024) { showToast('Max 10MB', 'error'); return; }
                      setUploadBg(await readFileAsBase64(f)); e.target.value = '';
                    }} />
                  </div>

                  {/* Back BG */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      Back Design Background <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                    </label>
                    <div
                      onClick={() => bgBackRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 cursor-pointer text-center transition-all ${
                        uploadBgBack ? 'border-purple-500 bg-purple-500/5' : 'border-gray-300 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-500/5'
                      }`}
                    >
                      {uploadBgBack ? (
                        <div className="relative">
                          <img src={uploadBgBack} className="w-full h-28 object-contain rounded-lg shadow-sm" alt="Back Preview" />
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
                      if (f.size > 10 * 1024 * 1024) { showToast('Max 10MB', 'error'); return; }
                      setUploadBgBack(await readFileAsBase64(f)); e.target.value = '';
                    }} />
                  </div>
                </div>
              )}

              {/* ══ TAB 3: JSON CODE ══════════════════════════════════ */}
              {uploadTab === 'json' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300">JSON Layout Definition</label>
                    <button
                      onClick={() => jsonRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      <FileJson className="w-3.5 h-3.5" />Upload .json file
                    </button>
                  </div>
                  <textarea
                    value={uploadJson}
                    onChange={(e) => { setUploadJson(e.target.value); setUploadJsonError(''); }}
                    rows={8}
                    placeholder={JSON_EXAMPLE}
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                  <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const text = await readFileAsText(f);
                    setUploadJson(text); setUploadJsonError('');
                    e.target.value = '';
                  }} />
                  {uploadJsonError && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-500 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadJsonError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200/10 flex gap-3 justify-end items-center bg-gray-500/5">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 glass-btn rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300">
                Cancel
              </button>
              {uploadTab === 'json' ? (
                <button
                  onClick={handleImportTemplate}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON Layout
                </button>
              ) : (
                <button
                  onClick={handleCreateBlank}
                  disabled={!uploadBg}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  Generate Canva Template
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Removed Canva Import Modal */}
    </div>
  );
};

export default TemplateGallery;
