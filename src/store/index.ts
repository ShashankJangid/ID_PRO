import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  CardTemplate, Organization, CardData, ColumnMapping,
  AppTab, ExportFormat, DataField,
} from '@/types';
import { doc, setDoc, deleteDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { autoFitTemplate } from '@/lib/templateAutoFit';

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
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  themeGradientColor: string;
  setThemeGradientColor: (color: string) => void;
  exportFullProjectBackup: () => void;
  importFullProjectBackup: (jsonData: string) => boolean;
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
  name: 'Sample Name', role: 'Designation', code: 'DEMO-001',
  dob: '01-01-2000', blood: 'A+', contact: '+91-XXXXXXXXXX',
  address: '123 Innovation Way, Tech City', issued: '01-06-2025',
  valid: '31-05-2026', emergency: '+91-XXXXXXXXXX',
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
          // Migrate localStorage → IndexedDB (silent)
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
          // Migrate old global storage to guest storage (silent)
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

// ─── Firestore Cloud Sync Helpers ─────────────────────────────
const sanitizeForFirestore = (obj: any): any => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
};

const saveTemplateToFirestore = async (userId: string, template: CardTemplate) => {
  if (!userId || !template || template.isBuiltIn) return;
  try {
    const docRef = doc(db, 'users', userId, 'templates', template.id);
    const dataToSave = sanitizeForFirestore({
      ...template,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, dataToSave);
  } catch (e) {
    console.error('Error saving template to Firestore:', e);
  }
};

const deleteTemplateFromFirestore = async (userId: string, templateId: string) => {
  if (!userId || !templateId) return;
  try {
    const docRef = doc(db, 'users', userId, 'templates', templateId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting template from Firestore:', e);
  }
};

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

const saveFullStateToFirestore = async (userId: string, partialOverrides?: any) => {
  if (!userId) return;
  try {
    const currentState = useAppStore.getState();
    const state = { ...currentState, ...partialOverrides };
    const docRef = doc(db, 'users', userId);
    const dataToSave = sanitizeForFirestore({
      organization: state.organization,
      hasSetup: state.hasSetup,
      cardDataList: state.cardDataList,
      activeTemplateId: state.activeTemplateId,
      columnMappings: state.columnMappings,
      exportFormat: state.exportFormat,
      darkMode: state.darkMode,
      themeColor: state.themeColor,
      themeGradientColor: state.themeGradientColor,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (e) {
    console.error('Error saving user state to Firestore:', e);
  }
};

const debouncedSaveFullStateToFirestore = debounce(saveFullStateToFirestore, 800);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      organization: defaultOrg,
      updateOrganization: (org) =>
        set((state) => {
          const newOrg = { ...state.organization, ...org };
          const userId = auth.currentUser?.uid;
          if (userId) {
            debouncedSaveFullStateToFirestore(userId, { organization: newOrg });
          }
          return { organization: newOrg };
        }),
      hasSetup: false,
      setHasSetup: (v) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { hasSetup: v });
          }
          return { hasSetup: v };
        }),
      templates: [],
      activeTemplateId: null,
      addTemplate: (t) =>
        set((state) => {
          const fitted = autoFitTemplate(t);
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveTemplateToFirestore(userId, fitted);
            saveFullStateToFirestore(userId, { templates: [...state.templates, fitted], activeTemplateId: fitted.id });
          }
          return { templates: [...state.templates, fitted], activeTemplateId: fitted.id };
        }),
      updateTemplate: (id, updates) =>
        set((state) => {
          const newTemplates = state.templates.map((t) => {
            if (t.id === id) {
              const updated = autoFitTemplate({ ...t, ...updates });
              const userId = auth.currentUser?.uid;
              if (userId) {
                saveTemplateToFirestore(userId, updated);
              }
              return updated;
            }
            return t;
          });
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { templates: newTemplates });
          }
          return { templates: newTemplates };
        }),
      deleteTemplate: (id) =>
        set((state) => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            deleteTemplateFromFirestore(userId, id);
          }
          const nextActiveId = state.activeTemplateId === id ? null : state.activeTemplateId;
          const nextTemplates = state.templates.filter((t) => t.id !== id);
          if (userId) {
            saveFullStateToFirestore(userId, { templates: nextTemplates, activeTemplateId: nextActiveId });
          }
          return {
            templates: nextTemplates,
            activeTemplateId: nextActiveId,
          };
        }),
      setActiveTemplate: (id) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { activeTemplateId: id });
          }
          return { activeTemplateId: id };
        }),
      getActiveTemplate: () => {
        const { templates, activeTemplateId } = get();
        return templates.find((t) => t.id === activeTemplateId);
      },
      cardDataList: [defaultCardData],
      activeCardIndex: 0,
      setCardDataList: (list) =>
        set((state) => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            debouncedSaveFullStateToFirestore(userId, { cardDataList: list });
          }
          return { cardDataList: list, activeCardIndex: 0 };
        }),
      addCardData: (data) =>
        set((state) => {
          const newList = [...state.cardDataList, data];
          const userId = auth.currentUser?.uid;
          if (userId) {
            debouncedSaveFullStateToFirestore(userId, { cardDataList: newList });
          }
          return { cardDataList: newList };
        }),
      updateActiveCard: (data) =>
        set((state) => {
          const list = [...state.cardDataList];
          if (list[state.activeCardIndex]) {
            list[state.activeCardIndex] = { ...list[state.activeCardIndex], ...data };
          }
          const userId = auth.currentUser?.uid;
          if (userId) {
            debouncedSaveFullStateToFirestore(userId, { cardDataList: list });
          }
          return { cardDataList: list };
        }),
      setActiveCardIndex: (idx) => set({ activeCardIndex: idx }),
      getActiveCard: () => {
        const { cardDataList, activeCardIndex } = get();
        return cardDataList[activeCardIndex];
      },
      columnMappings: [],
      setColumnMappings: (m) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { columnMappings: m });
          }
          return { columnMappings: m };
        }),
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
      darkMode: false,
      setDarkMode: (v) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { darkMode: v });
          }
          return { darkMode: v };
        }),
      themeColor: '#4165b4',
      setThemeColor: (color) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { themeColor: color, themeGradientColor: color });
          }
          return { themeColor: color, themeGradientColor: color };
        }),
      themeGradientColor: '#4165b4',
      setThemeGradientColor: (color) =>
        set(() => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveFullStateToFirestore(userId, { themeGradientColor: color });
          }
          return { themeGradientColor: color };
        }),
      exportFullProjectBackup: () => {
        const state = get();
        const backupData = {
          app: 'CardGenStudio',
          version: '1.0',
          exportedAt: new Date().toISOString(),
          organization: state.organization,
          hasSetup: state.hasSetup,
          templates: state.templates,
          activeTemplateId: state.activeTemplateId,
          cardDataList: state.cardDataList,
          activeCardIndex: state.activeCardIndex,
          columnMappings: state.columnMappings,
        };
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const orgName = (state.organization?.name || 'cardgen').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `${orgName}_project_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        get().showToast('Full project backup downloaded successfully!', 'success');
      },
      importFullProjectBackup: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData);
          if (!data || typeof data !== 'object') {
            get().showToast('Invalid backup file.', 'error');
            return false;
          }

          // Single Template import fallback
          if (data.cardWidth && data.cardHeight && (data.frontElements || data.backElements)) {
            const template = autoFitTemplate(data as CardTemplate);
            const exists = get().templates.some((t) => t.id === template.id);
            if (exists) {
              get().updateTemplate(template.id, template);
            } else {
              get().addTemplate(template);
            }
            get().setActiveTemplate(template.id);
            get().showToast(`Template "${template.name}" imported & set active!`, 'success');
            return true;
          }

          // Full Project Backup import
          const newOrg = data.organization || defaultOrg;
          const newTemplates = Array.isArray(data.templates) ? data.templates.map((t: any) => autoFitTemplate(t)) : [];
          const newCards = Array.isArray(data.cardDataList) ? data.cardDataList : [];
          const activeTId = data.activeTemplateId || (newTemplates[0]?.id || null);
          const activeCIdx = typeof data.activeCardIndex === 'number' ? data.activeCardIndex : 0;
          const colMappings = Array.isArray(data.columnMappings) ? data.columnMappings : [];
          const setup = typeof data.hasSetup === 'boolean' ? data.hasSetup : (!!newOrg.name);

          set({
            organization: newOrg,
            templates: newTemplates.length > 0 ? newTemplates : get().templates,
            cardDataList: newCards.length > 0 ? newCards : [defaultCardData],
            activeTemplateId: activeTId || get().activeTemplateId,
            activeCardIndex: activeCIdx,
            columnMappings: colMappings,
            hasSetup: setup,
          });

          const userId = auth.currentUser?.uid;
          if (userId) {
            newTemplates.forEach((t: CardTemplate) => {
              if (!t.isBuiltIn) {
                saveTemplateToFirestore(userId, t);
              }
            });
            saveProfileToFirestore(userId, newOrg, newCards.length > 0 ? newCards : [defaultCardData]);
          }

          get().showToast('Full project backup restored in 1 click! All templates, settings, and cards loaded.', 'success');
          return true;
        } catch (e) {
          console.error('Error importing project backup:', e);
          get().showToast('Failed to import backup. File must be valid JSON.', 'error');
          return false;
        }
      },
    }),
    {
      name: 'idcard-studio-storage-guest',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          const autoFitted = state.templates.map((t) => autoFitTemplate(t));
          // Deduplicate templates by ID
          const uniqueTemplates = autoFitted.filter(
            (t, index, self) => self.findIndex((x) => x.id === t.id) === index
          );
          useAppStore.setState({ templates: uniqueTemplates });

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
        darkMode: state.darkMode,
        themeColor: state.themeColor,
        themeGradientColor: state.themeGradientColor,
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
    name: ['name', 'full name', 'employee name', 'student name', 'first name', 'employeename', 'studentname'],
    role: ['role', 'designation', 'class', 'post', 'department', 'position', 'title', 'designations'],
    code: ['code', 'emp code', 'employee code', 'roll no', 'rollno', 'id', 'id no', 'roll number', 'registration', 'employeeid', 'studentid', 'admissionnumber', 'rollnumber'],
    dob: ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b', 'dateofbirth'],
    blood: ['blood', 'blood group', 'bld grp', 'bloodgroup'],
    contact: ['contact', 'contact no', 'phone', 'mobile', 'tel', 'cell', 'contactnumber', 'mobileno', 'primarymobileno'],
    address: ['address', 'addr', 'residence', 'location'],
    issued: ['issue', 'issued', 'issued on', 'issue date'],
    valid: ['valid', 'valid up to', 'valid upto', 'expiry', 'expiry date', 'valid till'],
    emergency: ['emergency', 'emergency contact', 'emergency no', 'alt contact', 'emergencycontact', 'emergencyno', 'emergencycontactnumber'],
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
    photo: ['photo', 'image', 'picture', 'path', 'avatar', 'pic'],
    static: [],
  };
  headers.forEach((header) => {
    const h = header.toLowerCase().trim();
    const parts = h.split('.');
    const lastPart = parts[parts.length - 1];

    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some((p) => {
        if (p === 'id') {
          return lastPart === 'id' || lastPart === 'id_no' || lastPart === 'idno';
        }
        return lastPart.includes(p);
      })) {
        suggestions.push({ excelColumn: header, field: field as DataField });
        break;
      }
    }
  });
  return suggestions;
}

export async function syncStoreWithFirestore(userId: string | null) {
  if (!userId) return;

  try {
    // 1. Fetch remote user profile document
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    let remoteData: any = null;

    if (userDocSnap.exists()) {
      remoteData = userDocSnap.data();
    }

    // 2. Fetch remote custom templates
    const templatesColRef = collection(db, 'users', userId, 'templates');
    const templatesSnap = await getDocs(templatesColRef);
    const remoteTemplates: CardTemplate[] = [];
    templatesSnap.forEach((doc) => {
      remoteTemplates.push(doc.data() as CardTemplate);
    });

    // 3. Get current local state
    const localState = useAppStore.getState();

    // 4. Merge templates (built-in + local custom + remote custom)
    const { getBuiltInTemplates } = await import('@/templates/built-in');
    const builtIns = getBuiltInTemplates();

    const mergedTemplatesMap = new Map<string, CardTemplate>();
    builtIns.forEach((t) => mergedTemplatesMap.set(t.id, autoFitTemplate(t)));
    localState.templates.forEach((t) => mergedTemplatesMap.set(t.id, autoFitTemplate(t)));
    remoteTemplates.forEach((t) => mergedTemplatesMap.set(t.id, autoFitTemplate(t)));

    const mergedTemplates = Array.from(mergedTemplatesMap.values());

    // Sync any local custom templates to remote if not yet uploaded
    for (const localT of localState.templates) {
      if (localT.isBuiltIn) continue;
      const remoteT = remoteTemplates.find((t) => t.id === localT.id);
      if (!remoteT) {
        await saveTemplateToFirestore(userId, autoFitTemplate(localT));
      }
    }

    // 5. Merge profile state
    if (remoteData) {
      const mergedOrg = remoteData.organization || localState.organization;
      const mergedCards = (remoteData.cardDataList && remoteData.cardDataList.length > 0) ? remoteData.cardDataList : localState.cardDataList;
      const mergedActiveTemplateId = remoteData.activeTemplateId || localState.activeTemplateId || mergedTemplates[0]?.id || null;
      const mergedHasSetup = typeof remoteData.hasSetup === 'boolean' ? remoteData.hasSetup : (!!mergedOrg.name || localState.hasSetup);
      const mergedColumnMappings = remoteData.columnMappings || localState.columnMappings;
      const mergedThemeColor = remoteData.themeColor || localState.themeColor;
      const mergedThemeGrad = remoteData.themeGradientColor || localState.themeGradientColor;
      const mergedDarkMode = typeof remoteData.darkMode === 'boolean' ? remoteData.darkMode : localState.darkMode;

      useAppStore.setState({
        organization: mergedOrg,
        cardDataList: mergedCards,
        templates: mergedTemplates,
        activeTemplateId: mergedActiveTemplateId,
        hasSetup: mergedHasSetup,
        columnMappings: mergedColumnMappings,
        themeColor: mergedThemeColor,
        themeGradientColor: mergedThemeGrad,
        darkMode: mergedDarkMode,
      });

      // Save merged state back to cloud to keep everything synchronized
      await saveFullStateToFirestore(userId);
    } else {
      // First time login on this account: upload local state to cloud
      await saveFullStateToFirestore(userId);
      for (const t of mergedTemplates) {
        if (!t.isBuiltIn) {
          await saveTemplateToFirestore(userId, t);
        }
      }
    }

    // Ensure active template is set
    const currentActiveId = useAppStore.getState().activeTemplateId;
    if (!currentActiveId && mergedTemplates.length > 0) {
      useAppStore.setState({ activeTemplateId: mergedTemplates[0].id });
    }
  } catch (e) {
    console.error('Error syncing store with Firestore:', e);
  }
}

const resetStoreToDefaults = () => {
  useAppStore.setState({
    organization: defaultOrg,
    hasSetup: false,
    templates: [],
    activeTemplateId: null,
    cardDataList: [defaultCardData],
    activeCardIndex: 0,
    columnMappings: [],
    selectedElementId: null,
    activeTab: 'dashboard',
  });
};

export async function switchStoreUser(userId: string | null) {
  // If signing out from a previous user, ensure their state is saved to Firestore before clearing memory
  const currentUserId = auth.currentUser?.uid;
  if (currentUserId && !userId) {
    await saveFullStateToFirestore(currentUserId);
  }

  // Reset memory state to defaults first to prevent data leakage between different users
  resetStoreToDefaults();

  if (userId) {
    // 1. Fetch guest data if any to migrate
    let guestData: any = null;
    try {
      const guestDataStr = await idbStorage.getItem('idcard-studio-storage-guest');
      if (guestDataStr) {
        guestData = JSON.parse(guestDataStr);
      }
    } catch (err) {
      console.warn('Failed to read guest storage for migration:', err);
    }

    // 2. Switch to user storage key in IndexedDB
    const name = `idcard-studio-storage-${userId}`;
    useAppStore.persist.setOptions({ name });
    await useAppStore.persist.rehydrate();

    // 3. Migrate guest state into user state if user state was empty
    if (guestData && guestData.state) {
      const localState = useAppStore.getState();
      const guestTemplates = guestData.state.templates || [];
      const guestOrg = guestData.state.organization;
      const guestCards = guestData.state.cardDataList || [];

      let needsSave = false;
      const newTemplates = [...localState.templates];

      guestTemplates.forEach((gt: CardTemplate) => {
        if (!gt.isBuiltIn && !newTemplates.some((t) => t.id === gt.id)) {
          newTemplates.push(gt);
          needsSave = true;
        }
      });

      let newOrg = localState.organization;
      if (!localState.organization.name && guestOrg && guestOrg.name) {
        newOrg = guestOrg;
        needsSave = true;
      }

      let newCards = localState.cardDataList;
      const isLocalCardsDefault =
        localState.cardDataList.length === 0 ||
        (localState.cardDataList.length === 1 && localState.cardDataList[0].code === 'DEMO-001');
      const isGuestCardsCustom = guestCards.length > 0 && guestCards[0].code !== 'DEMO-001';

      if (isLocalCardsDefault && isGuestCardsCustom) {
        newCards = guestCards;
        needsSave = true;
      }

      if (needsSave) {
        useAppStore.setState({
          templates: newTemplates,
          organization: newOrg,
          cardDataList: newCards,
          hasSetup: newOrg.name ? true : localState.hasSetup,
        });

        // Save migrated data to Firestore
        newTemplates.forEach((t) => {
          if (!t.isBuiltIn) {
            saveTemplateToFirestore(userId, t);
          }
        });
        saveFullStateToFirestore(userId, { organization: newOrg, cardDataList: newCards, templates: newTemplates });
      }

      // Clear guest storage after migration
      await idbStorage.removeItem('idcard-studio-storage-guest');
    }

    // 4. Sync with Firestore cloud storage bound to this user ID
    await syncStoreWithFirestore(userId);
  } else {
    const name = 'idcard-studio-storage-guest';
    useAppStore.persist.setOptions({ name });
    await useAppStore.persist.rehydrate();
  }
}
