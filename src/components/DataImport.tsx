import React, { useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Database,
  Upload,
  Check,
  ArrowRight,
  Edit3,
  Trash2,
  X,
  UserCircle2,
  Images,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, suggestMappings } from '@/store';
import { readFileAsBase64 } from '@/lib/file-utils';

let xlsxLib: any = null;

async function loadXLSX(): Promise<any> {
  if (xlsxLib) return xlsxLib;
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      xlsxLib = (window as any).XLSX;
      resolve(xlsxLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    script.onload = () => {
      xlsxLib = (window as any).XLSX;
      resolve(xlsxLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
import type { CardData, DataField } from '@/types';

const fieldLabels: Record<DataField, string> = {
  name: 'Full Name *',
  role: 'Role / Designation',
  code: 'ID Code *',
  dob: 'Date of Birth',
  blood: 'Blood Group',
  contact: 'Contact Number',
  address: 'Address',
  issued: 'Issued Date',
  valid: 'Valid Until',
  emergency: 'Emergency Contact',
  orgName: 'Organization Name',
  orgAddress: 'Org Address',
  orgPhone: 'Org Phone',
  orgEmail: 'Org Email',
  orgWebsite: 'Org Website',
  orgTagline: 'Org Tagline',
  orgEmergency: 'Org Emergency Contact',
  custom1: 'Custom Field 1',
  custom2: 'Custom Field 2',
  custom3: 'Custom Field 3',
  static: 'Static Text',
};

const DataImport: React.FC = () => {
  const {
    cardDataList,
    setCardDataList,
    activeCardIndex,
    setActiveCardIndex,
    updateActiveCard,
    showToast,
  } = useAppStore(
    useShallow((s) => ({
      cardDataList: s.cardDataList,
      setCardDataList: s.setCardDataList,
      activeCardIndex: s.activeCardIndex,
      setActiveCardIndex: s.setActiveCardIndex,
      updateActiveCard: s.updateActiveCard,
      showToast: s.showToast,
    }))
  );
  const [columnMappings, setColumnMappings] = useState<{ excelColumn: string; field: DataField }[]>([]);

  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [importedData, setImportedData] = useState<CardData[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CardData>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const bulkPhotoRef = useRef<HTMLInputElement>(null);
  const [bulkPhotoStats, setBulkPhotoStats] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const [bulkPhotoLoading, setBulkPhotoLoading] = useState(false);

  const activeCard = cardDataList[activeCardIndex] || cardDataList[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    let XLSX: any;
    try {
      XLSX = await loadXLSX();
    } catch {
      showToast('Failed to load XLSX library', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

        if (jsonData.length < 2) {
          showToast('File must have at least a header row and one data row', 'error');
          return;
        }

        const hdrs = jsonData[0].map((h) => String(h || '').trim());
        const dataRows = jsonData
          .slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''))
          .map((r) => r.map((c) => String(c || '').trim()));

        setHeaders(hdrs);
        setRows(dataRows);

        // Auto-suggest mappings
        const suggested = suggestMappings(hdrs);
        setColumnMappings(suggested);

        setStep('map');
        showToast(`Found ${dataRows.length} records with ${hdrs.length} columns`, 'success');
      } catch (err) {
        showToast('Error parsing file: ' + (err as Error).message, 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (excelCol: string, field: DataField) => {
    const filtered = columnMappings.filter((m) => m.excelColumn !== excelCol);
    if (field) {
      filtered.push({ excelColumn: excelCol, field });
    }
    setColumnMappings(filtered);
  };

  const getMappedField = (excelCol: string): DataField | '' => {
    const mapping = columnMappings.find((m) => m.excelColumn === excelCol);
    return mapping?.field || '';
  };

  const processImport = () => {
    const nameMapping = columnMappings.find((m) => m.field === 'name');
    const codeMapping = columnMappings.find((m) => m.field === 'code');

    if (!nameMapping || !codeMapping) {
      showToast('Name and Code fields must be mapped', 'error');
      return;
    }

    const nameIdx = headers.indexOf(nameMapping.excelColumn);
    const codeIdx = headers.indexOf(codeMapping.excelColumn);

    if (nameIdx < 0 || codeIdx < 0) {
      showToast('Invalid column mapping', 'error');
      return;
    }

    const getValue = (row: string[], field: DataField): string => {
      const mapping = columnMappings.find((m) => m.field === field);
      if (!mapping) return '';
      const idx = headers.indexOf(mapping.excelColumn);
      if (idx < 0 || idx >= row.length) return '';
      return row[idx] || '';
    };

    const parseDate = (val: string): string => {
      if (!val) return '';
      // Handle Excel serial dates
      const num = parseFloat(val);
      if (!isNaN(num) && num > 30000 && num < 50000) {
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
      // Try DD-MM-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(val)) return val;
      // Try DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const p = val.split('/');
        return `${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[2]}`;
      }
      return val;
    };

    const parsed: CardData[] = rows.map((row, idx) => ({
      id: `card_${idx}`,
      name: row[nameIdx] || '',
      role: getValue(row, 'role'),
      code: row[codeIdx] || '',
      dob: parseDate(getValue(row, 'dob')),
      blood: getValue(row, 'blood'),
      contact: getValue(row, 'contact'),
      address: getValue(row, 'address'),
      issued: parseDate(getValue(row, 'issued')),
      valid: parseDate(getValue(row, 'valid')),
      emergency: getValue(row, 'emergency'),
      custom1: getValue(row, 'custom1'),
      custom2: getValue(row, 'custom2'),
      custom3: getValue(row, 'custom3'),
    }));

    setImportedData(parsed);
    setStep('preview');
  };

  const confirmImport = () => {
    setCardDataList(importedData);
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRows([]);
    showToast(`Successfully imported ${importedData.length} records!`, 'success');
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditForm({ ...cardDataList[idx] });
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const list = [...cardDataList];
    list[editingIndex] = { ...list[editingIndex], ...editForm } as CardData;
    setCardDataList(list);
    setEditingIndex(null);
    showToast('Record updated!', 'success');
  };

  const deleteRecord = (idx: number) => {
    const list = cardDataList.filter((_, i) => i !== idx);
    setCardDataList(list);
    if (activeCardIndex >= list.length) {
      setActiveCardIndex(Math.max(0, list.length - 1));
    }
    showToast('Record deleted', 'info');
  };

  // ── Bulk Photo Auto-Match ────────────────────────────────
  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (cardDataList.length === 0) {
      showToast('Import card data first before uploading photos.', 'error');
      return;
    }

    setBulkPhotoLoading(true);
    setBulkPhotoStats(null);

    // Build a lookup map: normalised filename (no extension) → index in cardDataList
    const codeMap = new Map<string, number>();
    cardDataList.forEach((card, idx) => {
      if (card.code) codeMap.set(card.code.trim().toLowerCase(), idx);
    });

    let matched = 0;
    const unmatched: string[] = [];
    const updatedList = [...cardDataList];

    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    for (const file of Array.from(files)) {
      // Strip extension from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim().toLowerCase();
      const idx = codeMap.get(nameWithoutExt);
      if (idx !== undefined) {
        try {
          const b64 = await toBase64(file);
          updatedList[idx] = { ...updatedList[idx], photo: b64 };
          matched++;
        } catch {
          unmatched.push(file.name);
        }
      } else {
        unmatched.push(file.name);
      }
    }

    setCardDataList(updatedList);
    setBulkPhotoStats({ matched, unmatched });
    setBulkPhotoLoading(false);
    showToast(`${matched} photo(s) matched & assigned automatically!`, matched > 0 ? 'success' : 'info');
    e.target.value = '';
  };

  React.useEffect(() => {
    if (editingIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingIndex]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Database className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Import card data from Excel or CSV files, or manage records manually.
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['upload', 'map', 'preview'].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${step === s
                  ? 'bg-emerald-600 text-white'
                  : i < ['upload', 'map', 'preview'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
            >
              {s === 'upload' && '1. Upload'}
              {s === 'map' && '2. Map Columns'}
              {s === 'preview' && '3. Preview'}
            </div>
            {i < 2 && <ArrowRight className="w-4 h-4 text-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Upload Excel or CSV File</h3>
            <p className="text-sm text-gray-500 mb-2">
              Drag and drop or click to browse (.xlsx, .xls, .csv)
            </p>
            <p className="text-xs text-gray-400">
              Your file should have column headers in the first row
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Manual entry */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Manual Entry</h3>
            <p className="text-xs text-gray-500 mb-4">Edit the current card data directly:</p>
            <div className="flex gap-6 mb-4">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => photoRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-emerald-50/30 transition-all"
                >
                  {activeCard?.photo ? (
                    <img
                      src={activeCard.photo}
                      alt="Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Photo</span>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      showToast('Image must be under 5MB', 'error');
                      return;
                    }
                     const base64 = await readFileAsBase64(file);
                     updateActiveCard({ photo: base64 });
                     showToast('Photo updated!', 'success');
                     e.target.value = '';
                  }}
                />
                {activeCard?.photo && (
                  <button
                    onClick={() => updateActiveCard({ photo: undefined })}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Text fields */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                {Object.entries(activeCard || {})
                  .filter(([key]) => !['id', 'photo', 'custom1', 'custom2', 'custom3'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={value || ''}
                        onChange={(e) =>
                          updateActiveCard({ [key]: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* ── Bulk Photo Upload ── */}
          {cardDataList.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900">Bulk Photo Auto-Match</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Smart</span>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Name your photo files exactly as the <strong className="text-gray-700">Employee ID / Roll No. / Admission No.</strong> of each person (e.g. <code className="bg-gray-100 px-1 rounded">EMP001.jpg</code>, <code className="bg-gray-100 px-1 rounded">ROLL42.png</code>). Upload them all at once and photos will be assigned automatically.
                </p>
                <div
                  onClick={() => bulkPhotoRef.current?.click()}
                  className="border-2 border-dashed border-emerald-200 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-all"
                >
                  {bulkPhotoLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-emerald-600 font-medium">Matching photos…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm font-semibold text-gray-700">Click to select photos folder</p>
                      <p className="text-[10px] text-gray-400">Supports JPG, PNG, WEBP — multiple files</p>
                    </div>
                  )}
                </div>
                <input
                  ref={bulkPhotoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleBulkPhotoUpload}
                />

                {/* Match results */}
                {bulkPhotoStats && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      {bulkPhotoStats.matched} photo(s) matched &amp; assigned
                    </div>
                    {bulkPhotoStats.unmatched.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                          {bulkPhotoStats.unmatched.length} file(s) had no matching ID:
                        </p>
                        <ul className="text-[10px] text-amber-600 space-y-0.5 max-h-24 overflow-y-auto">
                          {bulkPhotoStats.unmatched.map((name) => (
                            <li key={name} className="font-mono">• {name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Existing records */}
          {cardDataList.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  Existing Records ({cardDataList.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {cardDataList.map((card, idx) => (
                  <div
                    key={idx}
                    className={`px-5 py-2.5 flex items-center gap-3 ${idx === activeCardIndex ? 'bg-emerald-50' : ''
                      }`}
                  >
                    <span className="text-xs text-gray-400 w-8">{idx + 1}</span>
                    {card.photo ? (
                      <img src={card.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <UserCircle2 className="w-8 h-8 text-gray-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{card.name}</p>
                      <p className="text-xs text-gray-500">
                        {card.code} • {card.role}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(idx)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRecord(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Map Columns</h3>
              <p className="text-xs text-gray-500">
                Match Excel columns to card fields. Name and Code are required.
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {fileName}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {headers.map((header, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{header}</p>
                  <p className="text-xs text-gray-400">
                    Sample: {rows[0]?.[idx] || 'N/A'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <select
                  value={getMappedField(header)}
                  onChange={(e) => handleMappingChange(header, e.target.value as DataField)}
                  className="w-48 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Skip --</option>
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <option key={field} value={field}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={processImport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              Preview Data
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Preview ({importedData.length} records)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Code</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Role</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Contact</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">DOB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importedData.slice(0, 20).map((card, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{card.name}</td>
                      <td className="px-3 py-2 text-gray-600">{card.code}</td>
                      <td className="px-3 py-2 text-gray-600">{card.role}</td>
                      <td className="px-3 py-2 text-gray-600">{card.contact}</td>
                      <td className="px-3 py-2 text-gray-600">{card.dob}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importedData.length > 20 && (
                <p className="px-5 py-2 text-xs text-gray-400 text-center">
                  ... and {importedData.length - 20} more records
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep('map')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={confirmImport}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Import {importedData.length} Records
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingIndex !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingIndex(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-record-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="edit-record-title" className="text-base font-bold text-gray-900">Edit Record</h3>
              <button
                onClick={() => setEditingIndex(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {/* Photo upload in modal */}
              <div className="col-span-2 flex items-center gap-4 pb-3 border-b border-gray-100">
                <div
                  onClick={() => editPhotoRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-emerald-50/30 transition-all flex-shrink-0"
                >
                  {editForm.photo ? (
                    <img src={editForm.photo} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-9 h-9 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Profile Photo</p>
                  <p className="text-[10px] text-gray-400 mb-2">JPG, PNG or WEBP · Max 5MB</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editPhotoRef.current?.click()}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      {editForm.photo ? 'Change' : 'Upload'}
                    </button>
                    {editForm.photo && (
                      <button
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, photo: undefined }))}
                        className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[10px] font-semibold hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={editPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        showToast('Image must be under 5MB', 'error');
                        return;
                      }
                       const base64 = await readFileAsBase64(file);
                       setEditForm((prev) => ({ ...prev, photo: base64 }));
                       e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {Object.entries(editForm)
                .filter(([key]) => key !== 'id' && key !== 'photo')
                .map(([key, value]) => (
                  <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingIndex(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImport;
