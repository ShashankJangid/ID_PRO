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
  Terminal,
  Globe,
  Link2,
  DownloadCloud,
  Sparkles,
} from 'lucide-react';
import { useAppStore, suggestMappings } from '@/store';
import { readFileAsBase64 } from '@/lib/file-utils';

// Parse a curl command line into a RequestInit and URL
export function parseCurl(curlString: string): { url: string; options: RequestInit } {
  // Normalize line continuations and spaces
  const cleanCmd = curlString.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();

  // Find URL
  const urlRegex = /(?:https?:\/\/)[^\s'"]+/i;
  const urlMatch = cleanCmd.match(urlRegex);
  let url = urlMatch ? urlMatch[0] : '';
  url = url.replace(/['"\\]+$/, ''); // clean trailing quote/backslash

  const headers: Record<string, string> = {};
  let method = 'GET';
  let body: string | undefined = undefined;

  // Extract headers
  const headerRegex = /(?:-H|--header)\s+('[^']*'|"[^"]*"|[^\s\\]+)/gi;
  let match;
  while ((match = headerRegex.exec(cleanCmd)) !== null) {
    const rawVal = match[1];
    const headerVal = rawVal.replace(/^['"]|['"]$/g, '').trim();
    const colonIdx = headerVal.indexOf(':');
    if (colonIdx > 0) {
      const name = headerVal.substring(0, colonIdx).trim();
      const value = headerVal.substring(colonIdx + 1).trim();
      headers[name] = value;
    }
  }

  // Extract method
  const methodRegex = /(?:-X|--request)\s+('[^']*'|"[^"]*"|[^\s\\]+)/i;
  const methodMatch = cleanCmd.match(methodRegex);
  if (methodMatch) {
    method = methodMatch[1].replace(/^['"]|['"]$/g, '').trim().toUpperCase();
  }

  // Extract body
  const bodyRegex = /(?:-d|--data|--data-raw|--data-binary)\s+('[^']*'|"[^"]*"|[^\s\\]+)/i;
  const bodyMatch = cleanCmd.match(bodyRegex);
  if (bodyMatch) {
    body = bodyMatch[1].replace(/^['"]|['"]$/g, '').trim();
    if (method === 'GET') {
      method = 'POST';
    }
  }

  return {
    url,
    options: {
      method,
      headers,
      body,
    }
  };
}

// Format any address array or object into a single formatted string representation
export function formatAddressValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => formatAddressValue(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    const parts: string[] = [];
    const collect = (o: any) => {
      if (o === null || o === undefined) return;
      if (typeof o !== 'object') {
        parts.push(String(o).trim());
        return;
      }
      if (Array.isArray(o)) {
        o.forEach(item => collect(item));
        return;
      }
      for (const k of Object.keys(o)) {
        collect(o[k]);
      }
    };
    collect(val);
    return parts.filter(Boolean).join(', ');
  }
  return String(val).trim();
}

// Helper to check if an object contains nested objects (excluding arrays/null)
function hasNestedObject(o: any): boolean {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  return Object.values(o).some(v => v !== null && typeof v === 'object' && !Array.isArray(v));
}

// Try to parse string values that contain JSON structures
function tryParseJSON(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return val;
    }
  }
  return val;
}

// Flatten nested object keys into a single-level object using dot-notation
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  if (!obj || typeof obj !== 'object') {
    return result;
  }

  for (const key of Object.keys(obj)) {
    let val = obj[key];
    val = tryParseJSON(val);
    const newKey = prefix ? `${prefix}.${key}` : key;
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('address') && !hasNestedObject(val)) {
      result[newKey] = formatAddressValue(val);
    } else if (Array.isArray(val)) {
      // Check if it's an array of objects that have designation/name properties
      const isArrayOfObjects = val.length > 0 && val.every(item => item && typeof item === 'object' && ('name' in item || 'label' in item || 'value' in item || 'title' in item));
      if (isArrayOfObjects) {
        const getObjectStringValue = (item: any) => {
          if (!item || typeof item !== 'object') return '';
          return String(item.name || item.label || item.value || item.title || '').trim();
        };
        result[newKey] = val.map(getObjectStringValue).filter(Boolean).join(', ');
      } else {
        result[newKey] = val;
      }
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, newKey));
    } else {
      result[newKey] = val;
    }
  }

  return result;
}

const userApprovedDomains = new Set<string>();

// Sanitize and validate target URL for SSRF protection
export function validateTargetUrl(urlString: string) {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    throw new Error('The target URL is invalid or not an absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must use http: or https: protocol.');
  }

  const hostname = parsed.hostname.toLowerCase();
  
  if (!hostname || hostname.trim() === '') {
    throw new Error('The target URL is invalid or has an empty hostname.');
  }

  const isLocal =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname === '[::]' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.');

  if (isLocal) {
    if (!userApprovedDomains.has(hostname)) {
      const proceed = window.confirm(
        `Security Notice: The target URL "${urlString}" points to a local or private address. Do you want to trust "${hostname}" for this session?`
      );
      if (proceed) {
        userApprovedDomains.add(hostname);
      } else {
        throw new Error('Request cancelled by user due to private IP warning.');
      }
    }
  } else {
    // Known trusted public endpoints & Cloud Storage / ERP CDNs
    const trustedDomains = [
      'jsonplaceholder.typicode.com',
      'reqres.in',
      'api.github.com',
      'amazonaws.com',
      's3.amazonaws.com',
      'cloudfront.net',
      'googleapis.com',
      'googleusercontent.com',
      'windows.net',
      'azureedge.net',
      'cloudinary.com',
      'imgix.net',
      'supabase.co',
      'onrender.com',
      'vercel.app',
    ];

    const isTrusted =
      trustedDomains.some((d) => hostname === d || hostname.endsWith('.' + d)) ||
      userApprovedDomains.has(hostname) ||
      Array.from(userApprovedDomains).some((d) => hostname.endsWith('.' + d));

    if (!isTrusted) {
      const proceed = window.confirm(
        `Security Notice: Do you trust external domain "${hostname}" for this session?\n\nClick OK to allow and trust all requests to "${hostname}" for all records in this batch.`
      );
      if (proceed) {
        userApprovedDomains.add(hostname);
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          const rootDomain = parts.slice(-2).join('.');
          userApprovedDomains.add(rootDomain);
        }
      } else {
        throw new Error('Request cancelled by user due to untrusted domain warning.');
      }
    }
  }
}

// Download image from URL and convert it to base64 Data URL
export async function imageUrlToBase64(url: string): Promise<string> {
  // Validate target URL against SSRF before fetching
  validateTargetUrl(url);

  // Direct fetch only
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Direct image fetch failed:', errMsg);
    throw new Error(errMsg);
  }
}

// Recursively find the first array containing objects in an arbitrary JSON structure
export function findDataArray(obj: any): any[] | null {
  if (Array.isArray(obj)) {
    return obj;
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val;
      }
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const found = findDataArray(val);
        if (found) return found;
      }
    }
  }
  return null;
}

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
  photo: 'Photo (Image URL)',
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
  const [bulkIssued, setBulkIssued] = useState('');
  const [bulkValid, setBulkValid] = useState('');
  const [bulkEmergency, setBulkEmergency] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CardData>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const bulkPhotoRef = useRef<HTMLInputElement>(null);
  const [bulkPhotoStats, setBulkPhotoStats] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const [bulkPhotoLoading, setBulkPhotoLoading] = useState(false);

  // ERP API State
  const [importMethod, setImportMethod] = useState<'file' | 'api' | 'both'>('file');
  const [curlInput, setCurlInput] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Both Mode States
  const [erpHeaders, setErpHeaders] = useState<string[]>([]);
  const [erpRows, setErpRows] = useState<string[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [erpJoinKey, setErpJoinKey] = useState<string>('');
  const [excelJoinKey, setExcelJoinKey] = useState<string>('');
  const [bothJoinMode, setBothJoinMode] = useState<'inner' | 'outer'>('inner');
  const [bothMappings, setBothMappings] = useState<Record<DataField, { source: 'erp' | 'excel' | 'none'; column: string }>>(() => {
    const initial: Partial<Record<DataField, { source: 'erp' | 'excel' | 'none'; column: string }>> = {};
    return initial as Record<DataField, { source: 'erp' | 'excel' | 'none'; column: string }>;
  });

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

  // Removed local validateTargetUrl in favor of module-scope validateTargetUrl

  const handleFetchERP = async () => {
    setApiError('');
    const input = curlInput.trim();
    if (!input) {
      setApiError('Please paste your curl command first.');
      return;
    }

    setApiLoading(true);
    // Clear input immediately to prevent shoulder surfing
    setCurlInput('');

    try {
      const { url, options } = parseCurl(input);

      if (!url) {
        throw new Error('Could not extract URL from the curl command.');
      }

      // Sanitize and validate target URL
      validateTargetUrl(url);

      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      // Find the array of objects in the response
      const records = findDataArray(json);
      if (!records || records.length === 0) {
        throw new Error('Could not find any data array in the API response. Make sure the response contains a list of records.');
      }

      // Flatten nested objects recursively
      const flattenedRecords = records.map((rec: any) => {
        if (rec && typeof rec === 'object') {
          return flattenObject(rec);
        }
        return rec;
      });

      // Convert objects to headers and rows
      const allKeys = new Set<string>();
      flattenedRecords.forEach((rec: any) => {
        if (rec && typeof rec === 'object') {
          Object.keys(rec).forEach((k) => allKeys.add(k));
        }
      });

      const hdrs = Array.from(allKeys);
      if (hdrs.length === 0) {
        throw new Error('No fields found in the API records.');
      }

      const dataRows = flattenedRecords.map((rec: any) => {
        return hdrs.map((key) => {
          const val = rec[key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val).trim();
        });
      });

      setFileName('ERP API Response');
      setHeaders(hdrs);
      setRows(dataRows);

      // Auto-suggest mappings
      const suggested = suggestMappings(hdrs);
      setColumnMappings(suggested);

      setStep('map');
      showToast(`Fetched ${dataRows.length} records successfully!`, 'success');
    } catch (err: any) {
      // Ensure input is cleared in case of validation exception/cancellation/failure
      setCurlInput('');
      const errMsg = err?.message || 'An error occurred while fetching data.';
      console.error('Fetch ERP failed:', errMsg);
      setApiError(errMsg);
    } finally {
      setApiLoading(false);
    }
  };

  const findJoinKeySuggestion = (hdrs: string[]): string => {
    const keys = ['code', 'id', 'emp_code', 'employee_code', 'roll_no', 'rollno', 'id_no', 'emp_id', 'employee_id'];
    for (const k of keys) {
      const found = hdrs.find(h => h.toLowerCase().trim() === k || h.toLowerCase().trim().includes(k));
      if (found) return found;
    }
    return hdrs[0] || '';
  };

  const handleBothExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          showToast('Excel file must have at least a header row and one data row', 'error');
          return;
        }

        const hdrs = jsonData[0].map((h) => String(h || '').trim());
        const dataRows = jsonData
          .slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''))
          .map((r) => r.map((c) => String(c || '').trim()));

        setExcelHeaders(hdrs);
        setExcelRows(dataRows);

        const suggestedKey = findJoinKeySuggestion(hdrs);
        setExcelJoinKey(suggestedKey);

        showToast(`Loaded ${dataRows.length} records from Excel`, 'success');
      } catch (err) {
        showToast('Error parsing Excel: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBothFetchERP = async () => {
    setApiError('');
    const input = curlInput.trim();
    if (!input) {
      setApiError('Please paste your curl command first.');
      return;
    }

    setApiLoading(true);
    // Clear input immediately to prevent shoulder surfing
    setCurlInput('');

    try {
      const { url, options } = parseCurl(input);

      if (!url) {
        throw new Error('Could not extract URL from the curl command.');
      }

      // Sanitize and validate target URL
      validateTargetUrl(url);

      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const records = findDataArray(json);
      if (!records || records.length === 0) {
        throw new Error('Could not find any data array in the API response.');
      }

      const flattenedRecords = records.map((rec: any) => {
        if (rec && typeof rec === 'object') {
          return flattenObject(rec);
        }
        return rec;
      });

      const allKeys = new Set<string>();
      flattenedRecords.forEach((rec: any) => {
        if (rec && typeof rec === 'object') {
          Object.keys(rec).forEach((k) => allKeys.add(k));
        }
      });

      const hdrs = Array.from(allKeys);
      if (hdrs.length === 0) {
        throw new Error('No fields found in the API records.');
      }

      const dataRows = flattenedRecords.map((rec: any) => {
        return hdrs.map((key) => {
          const val = rec[key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val).trim();
        });
      });

      setErpHeaders(hdrs);
      setErpRows(dataRows);

      const suggestedKey = findJoinKeySuggestion(hdrs);
      setErpJoinKey(suggestedKey);

      showToast(`Fetched ${dataRows.length} records from ERP!`, 'success');
    } catch (err: any) {
      // Ensure input is cleared in case of validation exception/cancellation/failure
      setCurlInput('');
      const errMsg = err?.message || 'An error occurred while fetching data.';
      console.error('Both Fetch ERP failed:', errMsg);
      setApiError(errMsg);
    } finally {
      setApiLoading(false);
    }
  };

  const autoSuggestBothMappings = (erpCols: string[], excelCols: string[]) => {
    const erpSuggestions = suggestMappings(erpCols);
    const excelSuggestions = suggestMappings(excelCols);

    const mappings: Record<string, { source: 'erp' | 'excel' | 'none'; column: string }> = {};

    Object.keys(fieldLabels).forEach((f) => {
      mappings[f] = { source: 'none', column: '' };
    });

    erpSuggestions.forEach((s) => {
      mappings[s.field] = { source: 'erp', column: s.excelColumn };
    });

    excelSuggestions.forEach((s) => {
      if (mappings[s.field].source === 'none') {
        mappings[s.field] = { source: 'excel', column: s.excelColumn };
      }
    });

    return mappings as Record<DataField, { source: 'erp' | 'excel' | 'none'; column: string }>;
  };

  const handleStartBothMapping = () => {
    if (erpRows.length === 0) {
      showToast('Please fetch ERP data first', 'error');
      return;
    }
    if (excelRows.length === 0) {
      showToast('Please upload an Excel file first', 'error');
      return;
    }
    if (!erpJoinKey) {
      showToast('Please select ERP Join Key', 'error');
      return;
    }
    if (!excelJoinKey) {
      showToast('Please select Excel Join Key', 'error');
      return;
    }

    const suggested = autoSuggestBothMappings(erpHeaders, excelHeaders);
    setBothMappings(suggested);
    setStep('map');
  };

  const processBothImport = () => {
    const nameMap = bothMappings.name;
    const codeMap = bothMappings.code;

    if (!nameMap || nameMap.source === 'none' || !nameMap.column) {
      showToast('Name field must be mapped to a source and column', 'error');
      return;
    }
    if (!codeMap || codeMap.source === 'none' || !codeMap.column) {
      showToast('Code field must be mapped to a source and column', 'error');
      return;
    }

    if (!erpJoinKey || !excelJoinKey) {
      showToast('ERP and Excel Join Keys must be configured', 'error');
      return;
    }

    const erpJoinIdx = erpHeaders.indexOf(erpJoinKey);
    const excelJoinIdx = excelHeaders.indexOf(excelJoinKey);

    if (erpJoinIdx < 0 || excelJoinIdx < 0) {
      showToast('Selected join key columns not found in datasets', 'error');
      return;
    }

    const parseDate = (val: string): string => {
      if (!val) return '';
      const num = parseFloat(val);
      if (!isNaN(num) && num > 30000 && num < 50000) {
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
      if (val.includes('T') && val.endsWith('Z')) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          const istMs = date.getTime() + (5.5 * 60 * 60 * 1000);
          const istDate = new Date(istMs);
          const day = String(istDate.getUTCDate()).padStart(2, '0');
          const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
          const year = istDate.getUTCFullYear();
          return `${day}-${month}-${year}`;
        }
      }
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(val)) return val;
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const p = val.split('/');
        return `${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}-${p[2]}`;
      }
      return val;
    };

    const normalizeKey = (val: any): string => {
      if (val === undefined || val === null) return '';
      let k = String(val).trim();
      if (/^\d+(\.0+)?$/.test(k)) {
        const numVal = parseFloat(k);
        if (!isNaN(numVal)) {
          return String(numVal);
        }
      }
      return k.toLowerCase();
    };

    const erpMap = new Map<string, string[]>();
    erpRows.forEach((row) => {
      const keyVal = normalizeKey(row[erpJoinIdx]);
      if (keyVal) {
        erpMap.set(keyVal, row);
      }
    });

    const excelMap = new Map<string, string[]>();
    excelRows.forEach((row) => {
      const keyVal = normalizeKey(row[excelJoinIdx]);
      if (keyVal) {
        excelMap.set(keyVal, row);
      }
    });

    let allKeys: string[] = [];
    if (bothJoinMode === 'inner') {
      allKeys = Array.from(erpMap.keys()).filter((k) => excelMap.has(k));
    } else {
      allKeys = Array.from(new Set([...erpMap.keys(), ...excelMap.keys()]));
    }

    if (allKeys.length === 0) {
      showToast('No records found to merge.', 'error');
      return;
    }

    const getValue = (erpRow: string[] | undefined, excelRow: string[] | undefined, field: DataField): string => {
      const map = bothMappings[field];
      if (!map || map.source === 'none' || !map.column) return '';

      if (map.source === 'erp') {
        if (!erpRow) return '';
        const idx = erpHeaders.indexOf(map.column);
        return idx >= 0 ? erpRow[idx] || '' : '';
      } else {
        if (!excelRow) return '';
        const idx = excelHeaders.indexOf(map.column);
        return idx >= 0 ? excelRow[idx] || '' : '';
      }
    };

    const parsed: CardData[] = allKeys.map((key, idx) => {
      const erpRow = erpMap.get(key);
      const excelRow = excelMap.get(key);

      const cardName = getValue(erpRow, excelRow, 'name');
      const cardCode = getValue(erpRow, excelRow, 'code');

      const finalCode = cardCode || key.toUpperCase();
      const finalName = cardName || `Record ${finalCode}`;

      return {
        id: `card_both_${idx}`,
        name: finalName,
        role: getValue(erpRow, excelRow, 'role'),
        code: finalCode,
        dob: parseDate(getValue(erpRow, excelRow, 'dob')),
        blood: getValue(erpRow, excelRow, 'blood'),
        contact: getValue(erpRow, excelRow, 'contact'),
        address: getValue(erpRow, excelRow, 'address'),
        issued: parseDate(getValue(erpRow, excelRow, 'issued')),
        valid: parseDate(getValue(erpRow, excelRow, 'valid')),
        emergency: getValue(erpRow, excelRow, 'emergency'),
        custom1: getValue(erpRow, excelRow, 'custom1'),
        custom2: getValue(erpRow, excelRow, 'custom2'),
        custom3: getValue(erpRow, excelRow, 'custom3'),
        photo: getValue(erpRow, excelRow, 'photo'),
      };
    });

    setImportedData(parsed);
    setStep('preview');
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
      
      // Handle ISO UTC timestamps (convert to IST date: UTC + 5:30)
      if (val.includes('T') && val.endsWith('Z')) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          const istMs = date.getTime() + (5.5 * 60 * 60 * 1000);
          const istDate = new Date(istMs);
          const day = String(istDate.getUTCDate()).padStart(2, '0');
          const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
          const year = istDate.getUTCFullYear();
          return `${day}-${month}-${year}`; // Returns DD-MM-YYYY
        }
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
      photo: getValue(row, 'photo'),
    }));

    setImportedData(parsed);
    setStep('preview');
  };

  const handleBulkApply = () => {
    if (!bulkIssued.trim() && !bulkValid.trim() && !bulkEmergency.trim()) {
      showToast('Please enter at least one value to apply.', 'info');
      return;
    }
    setImportedData(prev => prev.map(card => {
      const updated = { ...card };
      if (bulkIssued.trim()) updated.issued = bulkIssued.trim();
      if (bulkValid.trim()) updated.valid = bulkValid.trim();
      if (bulkEmergency.trim()) updated.emergency = bulkEmergency.trim();
      return updated;
    }));
    showToast('Applied common values to all imported cards!', 'success');
  };

  const confirmImport = async () => {
    setIsConfirming(true);
    showToast('Importing records and downloading photos...', 'info');

    const isPhotoUrl = (val: string) =>
      val.startsWith('http://') || val.startsWith('https://') || val.startsWith('//');

    const normalisePhotoUrl = (val: string) =>
      val.startsWith('//') ? `https:${val}` : val;

    try {
      const updatedList = await Promise.all(
        importedData.map(async (card) => {
          if (card.photo && isPhotoUrl(card.photo)) {
            try {
              const b64 = await imageUrlToBase64(normalisePhotoUrl(card.photo));
              return { ...card, photo: b64 };
            } catch {
              // Photo download failed — keep card but clear the broken URL
              return { ...card, photo: undefined };
            }
          }
          return card;
        })
      );

      setCardDataList(updatedList);
      setStep('upload');
      setFileName('');
      setHeaders([]);
      setRows([]);
      setErpHeaders([]);
      setErpRows([]);
      setExcelHeaders([]);
      setExcelRows([]);
      setErpJoinKey('');
      setExcelJoinKey('');
      setBothMappings({} as any);
      showToast(`Successfully imported ${updatedList.length} records!`, 'success');
    } catch (err: any) {
      showToast('Error during import: ' + err.message, 'error');
    } finally {
      setIsConfirming(false);
    }
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

  // ── ERP Photo Fetch via cURL / URL Link ──
  const [showErpPhotoModal, setShowErpPhotoModal] = useState(false);
  const [erpFetchMode, setErpFetchMode] = useState<'existing_urls' | 'url_pattern'>('existing_urls');
  const [erpPhotoUrlPattern, setErpPhotoUrlPattern] = useState('https://aws-sfs.s3.ap-south-1.amazonaws.com/dpsindp/{code}.jpeg');
  const [erpPhotoProgress, setErpPhotoProgress] = useState<{ current: number; total: number; matched: number } | null>(null);
  const [erpPhotoLoading, setErpPhotoLoading] = useState(false);

  const handleFetchERPPhotos = async () => {
    if (cardDataList.length === 0) {
      showToast('Import card data first before fetching photos.', 'error');
      return;
    }

    setErpPhotoLoading(true);
    let matchedCount = 0;
    const updatedList = [...cardDataList];
    const total = updatedList.length;

    setErpPhotoProgress({ current: 0, total, matched: 0 });

    for (let i = 0; i < updatedList.length; i++) {
      const card = { ...updatedList[i] };
      let photoUrl = '';

      if (erpFetchMode === 'url_pattern' && erpPhotoUrlPattern.trim()) {
        const codeVal = card.code || card.id || card.name || '';
        photoUrl = erpPhotoUrlPattern
          .replace(/{code}/gi, encodeURIComponent(codeVal))
          .replace(/{id}/gi, encodeURIComponent(codeVal))
          .replace(/{name}/gi, encodeURIComponent(card.name || ''));
      } else {
        photoUrl = card.photo || '';
      }

      if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
        try {
          const base64 = await imageUrlToBase64(photoUrl);
          card.photo = base64;
          matchedCount++;
        } catch (err) {
          console.warn(`Failed to fetch photo for ${card.name} (${photoUrl}):`, err);
        }
      }

      updatedList[i] = card;
      setErpPhotoProgress({ current: i + 1, total, matched: matchedCount });
    }

    setCardDataList(updatedList);
    setErpPhotoLoading(false);
    setShowErpPhotoModal(false);
    setErpPhotoProgress(null);
    showToast(`Successfully fetched & embedded ${matchedCount} photo(s) from ERP!`, matchedCount > 0 ? 'success' : 'info');
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
          {/* Tab selector */}
          <div className="flex bg-gray-100 dark:bg-[hsl(222,47%,13%)] rounded-xl p-1 max-w-md">
            <button
              onClick={() => setImportMethod('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                importMethod === 'file'
                  ? 'bg-white dark:bg-[hsl(222,47%,9%)] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-[hsl(213,31%,65%)] dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Excel / CSV File
            </button>
            <button
              onClick={() => setImportMethod('api')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                importMethod === 'api'
                  ? 'bg-white dark:bg-[hsl(222,47%,9%)] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-[hsl(213,31%,65%)] dark:hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              ERP API (curl)
            </button>
            <button
              onClick={() => setImportMethod('both')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                importMethod === 'both'
                  ? 'bg-white dark:bg-[hsl(222,47%,9%)] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-[hsl(213,31%,65%)] dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              Both (ERP + Excel)
            </button>
          </div>

          {importMethod === 'file' ? (
            /* Upload zone */
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Upload Excel or CSV File</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Drag and drop or click to browse (.xlsx, .xls, .csv)
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
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
          ) : importMethod === 'api' ? (
            /* ERP curl fetch zone */
            <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">ERP API curl Integration</h3>
              </div>

              <div>
                <textarea
                  value={curlInput}
                  onChange={(e) => {
                    setCurlInput(e.target.value);
                    setApiError('');
                  }}
                  rows={5}
                  placeholder={`curl --location 'https://api.your-erp.com/v1/employees' \\
--header 'Authorization: Bearer YOUR_API_KEY'`}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-gray-50 dark:bg-[hsl(222,47%,13%)] text-gray-800 dark:text-white"
                />
              </div>

              {apiError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-xs space-y-1">
                  <p className="font-bold">Fetch Failed:</p>
                  <p>{apiError}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={apiLoading}
                  onClick={handleFetchERP}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {apiLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Fetching Data...
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      Fetch ERP Data
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Both (ERP + Excel) hybrid upload zone */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: ERP Integration */}
                <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        1. Fetch ERP Data
                      </h3>
                      {erpRows.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                          <Check className="w-3 h-3" />
                          {erpRows.length} Records Loaded
                        </span>
                      )}
                    </div>

                    <textarea
                      value={curlInput}
                      onChange={(e) => {
                        setCurlInput(e.target.value);
                        setApiError('');
                      }}
                      rows={4}
                      placeholder={`curl --location 'https://api.your-erp.com/v1/employees' \\
--header 'Authorization: Bearer YOUR_API_KEY'`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-gray-50 dark:bg-[hsl(222,47%,13%)] text-gray-800 dark:text-white"
                    />

                    {apiError && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-lg p-2.5 text-[10px]">
                        {apiError}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={apiLoading}
                      onClick={handleBothFetchERP}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {apiLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          {erpRows.length > 0 ? 'Refetch ERP Data' : 'Fetch ERP Data'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right side: Excel Upload */}
                <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        2. Upload Excel / CSV
                      </h3>
                      {excelRows.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                          <Check className="w-3 h-3" />
                          {excelRows.length} Records Loaded
                        </span>
                      )}
                    </div>

                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 transition-all flex flex-col items-center justify-center min-h-[120px]"
                    >
                      <Upload className="w-6 h-6 text-emerald-500 mb-2" />
                      <p className="text-xs font-semibold text-gray-700 dark:text-white mb-1">
                        {excelRows.length > 0 ? 'Upload Different File' : 'Upload Excel or CSV File'}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-505">
                        Supports .xlsx, .xls, .csv
                      </p>
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleBothExcelUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Match Keys Selection (shows only when both sources have records loaded) */}
              {erpRows.length > 0 && excelRows.length > 0 && (
                <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] p-6 shadow-sm space-y-4 animate-in">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    3. Configure Join Columns
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select the key column in both datasets to match records (e.g. Employee ID, Roll Number, etc.).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        ERP Join Key Column
                      </label>
                      <select
                        value={erpJoinKey}
                        onChange={(e) => setErpJoinKey(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[hsl(222,47%,13%)] border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                      >
                        {erpHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Excel Join Key Column
                      </label>
                      <select
                        value={excelJoinKey}
                        onChange={(e) => setExcelJoinKey(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[hsl(222,47%,13%)] border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                      >
                        {excelHeaders.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Merge Mode
                      </label>
                      <select
                        value={bothJoinMode}
                        onChange={(e) => setBothJoinMode(e.target.value as 'inner' | 'outer')}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-[hsl(222,47%,13%)] border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                      >
                        <option value="inner">Matching Records Only (Inner Join)</option>
                        <option value="outer">All Records (Outer Join / Union)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleStartBothMapping}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      Configure Field Mapping &amp; Merge
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Assign photos using local folder files OR fetch them directly from your ERP cURL link/image URLs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Local Folder Upload */}
                  <div
                    onClick={() => bulkPhotoRef.current?.click()}
                    className="border-2 border-dashed border-emerald-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    {bulkPhotoLoading ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-emerald-600 font-medium">Matching photos…</p>
                      </div>
                    ) : (
                      <>
                        <FolderOpen className="w-6 h-6 text-emerald-500" />
                        <p className="text-xs font-bold text-gray-800">Select Local Photos Folder</p>
                        <p className="text-[10px] text-gray-400">Filename must match ID / Roll No.</p>
                      </>
                    )}
                  </div>

                  {/* ERP cURL / URL Link Fetch Button */}
                  <div
                    onClick={() => setShowErpPhotoModal(true)}
                    className="border-2 border-dashed border-cyan-200 bg-cyan-50/20 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/60 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Globe className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    <p className="text-xs font-bold text-gray-800">Fetch Photos via ERP cURL / Link</p>
                    <p className="text-[10px] text-cyan-600 font-medium">Auto-fetch from cURL image URLs</p>
                  </div>
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
            <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-[hsl(222,47%,18%)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Existing Records ({cardDataList.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all imported records? This action cannot be undone.')) {
                      setCardDataList([]);
                      showToast('All records cleared successfully', 'success');
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded border border-red-200 dark:border-red-900/50 transition-colors"
                >
                  Clear All
                </button>
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
        importMethod === 'both' ? (
          <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-[hsl(222,47%,18%)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Map Columns</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select the source and corresponding column for each card field. Name and Code are required.
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Merging on key: ERP column "{erpJoinKey}" ⟷ Excel column "{excelJoinKey}"
                </p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-[hsl(222,47%,13%)] dark:text-gray-400 px-2 py-1 rounded">
                Hybrid Import (ERP + Excel)
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[hsl(222,47%,18%)] max-h-[450px] overflow-y-auto">
              {Object.entries(fieldLabels).map(([fieldKey, fieldLabel]) => {
                const mapping = bothMappings[fieldKey as DataField] || { source: 'none', column: '' };
                const isRequired = fieldKey === 'name' || fieldKey === 'code';

                let sampleVal = 'N/A';
                if (mapping.source === 'erp' && mapping.column) {
                  const colIdx = erpHeaders.indexOf(mapping.column);
                  if (colIdx >= 0 && erpRows.length > 0) {
                    sampleVal = erpRows[0][colIdx] || 'empty';
                  }
                } else if (mapping.source === 'excel' && mapping.column) {
                  const colIdx = excelHeaders.indexOf(mapping.column);
                  if (colIdx >= 0 && excelRows.length > 0) {
                    sampleVal = excelRows[0][colIdx] || 'empty';
                  }
                }

                return (
                  <div key={fieldKey} className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-[hsl(222,47%,13%)]/20 transition-all">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {fieldLabel}
                        {isRequired && <span className="text-red-500">*</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Sample: <span className="font-mono text-gray-600 dark:text-gray-300">{sampleVal}</span>
                      </p>
                    </div>

                    {/* Source Toggle */}
                    <div className="flex bg-gray-100 dark:bg-[hsl(222,47%,13%)] rounded-lg p-0.5 max-w-[280px]">
                      {(['none', 'erp', 'excel'] as const).map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setBothMappings((prev) => ({
                              ...prev,
                              [fieldKey]: {
                                source: src,
                                column: src === 'none' ? '' : src === 'erp' ? erpHeaders[0] || '' : excelHeaders[0] || '',
                              },
                            }));
                          }}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                            mapping.source === src
                              ? 'bg-white dark:bg-[hsl(222,47%,9%)] text-emerald-600 dark:text-emerald-400 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          {src === 'none' && 'Skip'}
                          {src === 'erp' && 'ERP API'}
                          {src === 'excel' && 'Excel'}
                        </button>
                      ))}
                    </div>

                    {/* Column Dropdown */}
                    <div className="w-52">
                      {mapping.source !== 'none' ? (
                        <select
                          value={mapping.column}
                          onChange={(e) => {
                            setBothMappings((prev) => ({
                              ...prev,
                              [fieldKey]: {
                                ...mapping,
                                column: e.target.value,
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[hsl(222,47%,13%)] border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-lg text-xs text-gray-900 dark:text-white outline-none"
                        >
                          {(mapping.source === 'erp' ? erpHeaders : excelHeaders).map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-505 italic px-2.5 py-1.5">
                          Field ignored
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-[hsl(222,47%,18%)] flex justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={processBothImport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-2"
              >
                Preview Merged Data
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[hsl(222,47%,9%)] rounded-xl border border-gray-200 dark:border-[hsl(222,47%,18%)] shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-[hsl(222,47%,18%)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Map Columns</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Match Excel columns to card fields. Name and Code are required.
                </p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-[hsl(222,47%,13%)] dark:text-gray-400 px-2 py-1 rounded">
                {fileName}
              </span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-[hsl(222,47%,18%)] max-h-96 overflow-y-auto">
              {headers.map((header, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{header}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Sample: {rows[0]?.[idx] || 'N/A'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                  <select
                    value={getMappedField(header)}
                    onChange={(e) => handleMappingChange(header, e.target.value as DataField)}
                    className="w-48 px-2.5 py-1.5 bg-white dark:bg-[hsl(222,47%,13%)] border border-gray-300 dark:border-[hsl(222,47%,18%)] rounded-lg text-xs text-gray-900 dark:text-white outline-none"
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
            <div className="px-5 py-3 border-t border-gray-100 dark:border-[hsl(222,47%,18%)] flex justify-between">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
        )
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Bulk Apply Common Values */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 animate-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider text-emerald-950">Bulk Apply Common Values</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Issued Date</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={bulkIssued}
                  onChange={(e) => setBulkIssued(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Valid Upto</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={bulkValid}
                  onChange={(e) => setBulkValid(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Emergency Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 99999 99999"
                  value={bulkEmergency}
                  onChange={(e) => setBulkEmergency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleBulkApply}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-100/50"
              >
                Apply to All Cards
              </button>
            </div>
          </div>

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
              disabled={isConfirming}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downloading Photos...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Import {importedData.length} Records
                </>
              )}
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
      {/* ── ERP PHOTO FETCH MODAL ── */}
      {showErpPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[hsl(222,47%,11%)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Fetch Photos from ERP cURL / Link</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Batch fetch student/employee photos directly from your ERP URL link</p>
                </div>
              </div>
              <button
                onClick={() => setShowErpPhotoModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Select Fetch Source Mode:</label>

                {/* Option 1: Existing URLs */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${erpFetchMode === 'existing_urls' ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-500/10' : 'border-gray-200 dark:border-gray-800'}`}>
                  <input
                    type="radio"
                    name="erp_mode"
                    checked={erpFetchMode === 'existing_urls'}
                    onChange={() => setErpFetchMode('existing_urls')}
                    className="mt-0.5 text-cyan-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Auto-Convert Photo URLs in Imported cURL Records</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                      Batch downloads and converts image URLs present in your {cardDataList.length} card records into high-res Base64 photos.
                    </span>
                  </div>
                </label>

                {/* Option 2: ERP URL Pattern */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${erpFetchMode === 'url_pattern' ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-500/10' : 'border-gray-200 dark:border-gray-800'}`}>
                  <input
                    type="radio"
                    name="erp_mode"
                    checked={erpFetchMode === 'url_pattern'}
                    onChange={() => setErpFetchMode('url_pattern')}
                    className="mt-0.5 text-cyan-600"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">Fetch from ERP URL Pattern Link</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                      Constructs photo URLs dynamically for each person using their Employee ID / Roll No.
                    </span>
                  </div>
                </label>
              </div>

              {erpFetchMode === 'url_pattern' && (
                <div className="space-y-1.5 pl-7">
                  <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">ERP Photo URL Pattern:</label>
                  <input
                    type="text"
                    value={erpPhotoUrlPattern}
                    onChange={(e) => setErpPhotoUrlPattern(e.target.value)}
                    placeholder="https://aws-sfs.s3.ap-south-1.amazonaws.com/dpsindp/{code}.jpeg"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400">
                    Use <code className="text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-1 rounded">{'{code}'}</code>, <code className="text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-1 rounded">{'{id}'}</code>, or <code className="text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-1 rounded">{'{name}'}</code> as placeholders.
                  </p>
                </div>
              )}

              {/* Progress bar during fetch */}
              {erpPhotoLoading && erpPhotoProgress && (
                <div className="space-y-2 bg-cyan-50 dark:bg-cyan-950/40 p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                  <div className="flex justify-between items-center text-xs font-bold text-cyan-800 dark:text-cyan-200">
                    <span>Fetching ERP Photos…</span>
                    <span>{erpPhotoProgress.current} / {erpPhotoProgress.total} ({Math.round((erpPhotoProgress.current / erpPhotoProgress.total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-cyan-200 dark:bg-cyan-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 transition-all duration-200 rounded-full"
                      style={{ width: `${(erpPhotoProgress.current / erpPhotoProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-cyan-700 dark:text-cyan-300 font-medium">
                    {erpPhotoProgress.matched} photo(s) successfully attached so far.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowErpPhotoModal(false)}
                disabled={erpPhotoLoading}
                className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFetchERPPhotos}
                disabled={erpPhotoLoading || (erpFetchMode === 'url_pattern' && !erpPhotoUrlPattern.trim())}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {erpPhotoLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching Photos…</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Start ERP Photo Fetch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImport;
