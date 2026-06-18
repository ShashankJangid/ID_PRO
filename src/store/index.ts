import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  CardTemplate, Organization, CardData, ColumnMapping,
  AppTab, ExportFormat, DataField,
} from '@/types';

interface AppState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  organization: Organization;
  updateOrganization: (org: Partial<Organization>) => void;
  hasSetup: boolean;
  setHasSetup: (v: boolean) => void;
  templates: CardTemplate[];
  activeTemplateId: string | null;
  addTemplate: (t: CardTemplate) => void;
  updateTemplate: (id: string, t: Partial<CardTemplate>) => void;
  deleteTemplate: (id: string) => void;
  setActiveTemplate: (id: string) => void;
  getActiveTemplate: () => CardTemplate | undefined;
  cardDataList: CardData[];
  activeCardIndex: number;
  setCardDataList: (list: CardData[]) => void;
  addCardData: (data: CardData) => void;
  updateActiveCard: (data: Partial<CardData>) => void;
  setActiveCardIndex: (idx: number) => void;
  getActiveCard: () => CardData | undefined;
  columnMappings: ColumnMapping[];
  setColumnMappings: (m: ColumnMapping[]) => void;
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  exportProgress: number;
  setExportProgress: (p: number) => void;
  designerSide: 'front' | 'back';
  setDesignerSide: (s: 'front' | 'back') => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  zoom: number;
  setZoom: (z: number) => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

const defaultOrg: Organization = {
  name: '',
  tagline: '',
  primaryColor: '#1a5c2a',
  secondaryColor: '#2e7d32',
  accentColor: '#f9c623',
  brandColorsEnabled: true,
  logos: [],
  signatures: [],
  assets: [],
  signature1Label: 'Admin',
  signature2Label: 'Principal',
  customFields: [],
  defaultQRFields: ['name', 'role', 'code'],
};

const defaultCardData: CardData = {
  name: 'John Doe', role: 'Manager', code: 'EMP001',
  dob: '01-01-1990', blood: 'O+', contact: '9876543210',
  address: '123 Main St, City', issued: '01-01-2024',
  valid: '31-12-2025', emergency: '9876543211',
};

const getIDBDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('idcard-studio-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getIDBDatabase();
      const value = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.get(name);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      // Migrate from localStorage if not found in IndexedDB
      if (value === null) {
        const localValue = localStorage.getItem(name);
        if (localValue !== null) {
          console.log('Migrating localStorage to IndexedDB storage...');
          await idbStorage.setItem(name, localValue);
          localStorage.removeItem(name);
          return localValue;
        }
      }

      // If guest store is not found, check if old global key 'idcard-studio-storage' exists in IndexedDB and migrate it
      if (value === null && name === 'idcard-studio-storage-guest') {
        const oldVal = await new Promise<string | null>((resolve) => {
          const tx = db.transaction('keyval', 'readonly');
          const store = tx.objectStore('keyval');
          const req = store.get('idcard-studio-storage');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (oldVal !== null) {
          console.log('Migrating old global storage to guest storage...');
          await idbStorage.setItem(name, oldVal);
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          store.delete('idcard-studio-storage');
          return oldVal;
        }
      }
      return value;
    } catch (e) {
      console.warn('IndexedDB getItem failed, falling back to localStorage:', e);
      return localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getIDBDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.put(value, name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB setItem failed, falling back to localStorage:', e);
      try {
        localStorage.setItem(name, value);
      } catch (err) {
        console.error('LocalStorage quota exceeded on fallback:', err);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getIDBDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.delete(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB removeItem failed, falling back to localStorage:', e);
      localStorage.removeItem(name);
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      organization: defaultOrg,
      updateOrganization: (org) =>
        set((state) => ({ organization: { ...state.organization, ...org } })),
      hasSetup: false,
      setHasSetup: (v) => set({ hasSetup: v }),
      templates: [],
      activeTemplateId: null,
      addTemplate: (t) => set((state) => ({ templates: [...state.templates, t] })),
      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
        })),
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
        })),
      setActiveTemplate: (id) => set({ activeTemplateId: id }),
      getActiveTemplate: () => {
        const { templates, activeTemplateId } = get();
        return templates.find((t) => t.id === activeTemplateId);
      },
      cardDataList: [defaultCardData],
      activeCardIndex: 0,
      setCardDataList: (list) => set({ cardDataList: list, activeCardIndex: 0 }),
      addCardData: (data) =>
        set((state) => ({ cardDataList: [...state.cardDataList, data] })),
      updateActiveCard: (data) =>
        set((state) => {
          const list = [...state.cardDataList];
          if (list[state.activeCardIndex]) {
            list[state.activeCardIndex] = { ...list[state.activeCardIndex], ...data };
          }
          return { cardDataList: list };
        }),
      setActiveCardIndex: (idx) => set({ activeCardIndex: idx }),
      getActiveCard: () => {
        const { cardDataList, activeCardIndex } = get();
        return cardDataList[activeCardIndex];
      },
      columnMappings: [],
      setColumnMappings: (m) => set({ columnMappings: m }),
      exportFormat: 'pdf',
      setExportFormat: (f) => set({ exportFormat: f }),
      isExporting: false,
      setIsExporting: (v) => set({ isExporting: v }),
      exportProgress: 0,
      setExportProgress: (p) => set({ exportProgress: p }),
      designerSide: 'front',
      setDesignerSide: (s) => set({ designerSide: s }),
      selectedElementId: null,
      setSelectedElementId: (id) => set({ selectedElementId: id }),
      zoom: 0.65,
      setZoom: (z) => set({ zoom: Math.max(0.2, Math.min(2, z)) }),
      showHelp: false,
      setShowHelp: (v) => set({ showHelp: v }),
      toast: null,
      showToast: (message, type = 'info') => set({ toast: { message, type } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'idcard-studio-storage-guest',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          // Deduplicate templates by ID
          const uniqueTemplates = state.templates.filter(
            (t, index, self) => self.findIndex((x) => x.id === t.id) === index
          );
          if (uniqueTemplates.length !== state.templates.length) {
            useAppStore.setState({ templates: uniqueTemplates });
          }

          if (uniqueTemplates.length === 0) {
            import('@/templates/built-in').then(({ getBuiltInTemplates }) => {
              const builtIns = getBuiltInTemplates();
              builtIns.forEach((t) => {
                if (!useAppStore.getState().templates.some(x => x.id === t.id)) {
                  useAppStore.getState().addTemplate(t);
                }
              });
            });
          }
        }
      },
      partialize: (state) => ({
        organization: state.organization,
        hasSetup: state.hasSetup,
        templates: state.templates,
        activeTemplateId: state.activeTemplateId,
        cardDataList: state.cardDataList,
        activeCardIndex: state.activeCardIndex,
        columnMappings: state.columnMappings,
        exportFormat: state.exportFormat,
        designerSide: state.designerSide,
        zoom: state.zoom,
      }),
    }
  )
);

export function getFieldValue(
  card: CardData | undefined,
  field: DataField | undefined,
  org: Organization
): string {
  if (!field) return '';
  if (field === 'orgName') return org.name || '';
  if (field === 'orgAddress') return org.address || '';
  if (field === 'orgPhone') return org.phone || '';
  if (field === 'orgEmail') return org.email || '';
  if (field === 'orgWebsite') return org.website || '';
  if (field === 'orgTagline') return org.tagline || '';
  if (field === 'orgEmergency') return org.emergencyContact || '';
  if (!card) return '';
  return card[field] || '';
}

export function suggestMappings(headers: string[]): ColumnMapping[] {
  const suggestions: ColumnMapping[] = [];
  const fieldPatterns: Record<DataField, string[]> = {
    name: ['name', 'full name', 'employee name', 'student name', 'first name'],
    role: ['role', 'designation', 'class', 'post', 'department', 'position', 'title'],
    code: ['code', 'emp code', 'employee code', 'roll no', 'rollno', 'id', 'id no', 'roll number', 'registration'],
    dob: ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b'],
    blood: ['blood', 'blood group', 'bld grp'],
    contact: ['contact', 'contact no', 'phone', 'mobile', 'tel', 'cell'],
    address: ['address', 'addr', 'residence', 'location'],
    issued: ['issue', 'issued', 'issued on', 'issue date'],
    valid: ['valid', 'valid up to', 'valid upto', 'expiry', 'expiry date', 'valid till'],
    emergency: ['emergency', 'emergency contact', 'emergency no', 'alt contact'],
    orgName: ['organization', 'company', 'institute', 'school'],
    orgAddress: ['org address', 'company address'],
    orgPhone: ['org phone', 'company phone'],
    orgEmail: ['org email', 'company email'],
    orgWebsite: ['org website', 'company website'],
    orgTagline: ['tagline', 'subtitle'],
    orgEmergency: ['org emergency'],
    custom1: ['custom1', 'field1', 'extra1'],
    custom2: ['custom2', 'field2', 'extra2'],
    custom3: ['custom3', 'field3', 'extra3'],
    static: [],
  };
  headers.forEach((header) => {
    const h = header.toLowerCase().trim();
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some((p) => h.includes(p))) {
        suggestions.push({ excelColumn: header, field: field as DataField });
        break;
      }
    }
  });
  return suggestions;
}

export async function switchStoreUser(userId: string | null) {
  const name = userId ? `idcard-studio-storage-${userId}` : 'idcard-studio-storage-guest';
  useAppStore.persist.setOptions({ name });
  await useAppStore.persist.rehydrate();
}
