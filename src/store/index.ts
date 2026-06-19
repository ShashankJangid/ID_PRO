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

// ─── Firestore Cloud Sync Helpers ─────────────────────────────
const saveTemplateToFirestore = async (userId: string, template: CardTemplate) => {
  try {
    const docRef = doc(db, 'users', userId, 'templates', template.id);
    await setDoc(docRef, {
      ...template,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error saving template to Firestore:', e);
  }
};

const deleteTemplateFromFirestore = async (userId: string, templateId: string) => {
  try {
    const docRef = doc(db, 'users', userId, 'templates', templateId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting template from Firestore:', e);
  }
};

const saveProfileToFirestore = async (userId: string, org: Organization, cards: CardData[]) => {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      organization: org,
      cardDataList: cards,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.error('Error saving profile to Firestore:', e);
  }
};

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
            saveProfileToFirestore(userId, newOrg, state.cardDataList);
          }
          return { organization: newOrg };
        }),
      hasSetup: false,
      setHasSetup: (v) => set({ hasSetup: v }),
      templates: [],
      activeTemplateId: null,
      addTemplate: (t) =>
        set((state) => {
          const fitted = autoFitTemplate(t);
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveTemplateToFirestore(userId, fitted);
          }
          return { templates: [...state.templates, fitted] };
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
          return { templates: newTemplates };
        }),
      deleteTemplate: (id) =>
        set((state) => {
          const userId = auth.currentUser?.uid;
          if (userId) {
            deleteTemplateFromFirestore(userId, id);
          }
          return {
            templates: state.templates.filter((t) => t.id !== id),
            activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
          };
        }),
      setActiveTemplate: (id) => set({ activeTemplateId: id }),
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
            saveProfileToFirestore(userId, state.organization, list);
          }
          return { cardDataList: list, activeCardIndex: 0 };
        }),
      addCardData: (data) =>
        set((state) => {
          const newList = [...state.cardDataList, data];
          const userId = auth.currentUser?.uid;
          if (userId) {
            saveProfileToFirestore(userId, state.organization, newList);
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
            saveProfileToFirestore(userId, state.organization, list);
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
      darkMode: false,
      setDarkMode: (v) => set({ darkMode: v }),
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
    // 1. Fetch remote user profile (organization and cards)
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    let remoteOrg: Organization | null = null;
    let remoteCards: CardData[] | null = null;
    let remoteProfileUpdatedAt: string | null = null;

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      remoteOrg = data.organization || null;
      remoteCards = data.cardDataList || null;
      remoteProfileUpdatedAt = data.updatedAt || null;
    }

    // 2. Fetch remote templates
    const templatesColRef = collection(db, 'users', userId, 'templates');
    const templatesSnap = await getDocs(templatesColRef);
    const remoteTemplates: CardTemplate[] = [];
    templatesSnap.forEach((doc) => {
      remoteTemplates.push(doc.data() as CardTemplate);
    });

    // 3. Get current local state
    const localState = useAppStore.getState();
    const localTemplates = localState.templates;
    const localOrg = localState.organization;
    const localCards = localState.cardDataList;

    // 4. Merge profile (organization & cards)
    let mergedOrg = localOrg;
    let mergedCards = localCards;
    
    const isLocalOrgDefault = !localOrg.name && !localOrg.tagline;
    if (remoteOrg && (isLocalOrgDefault || !remoteProfileUpdatedAt)) {
      mergedOrg = remoteOrg;
      mergedCards = remoteCards || localCards;
    } else if (remoteOrg) {
      mergedOrg = remoteOrg;
      mergedCards = remoteCards || localCards;
    } else {
      // Remote does not exist: upload local profile to Firestore
      await saveProfileToFirestore(userId, localOrg, localCards);
    }

    // 5. Merge templates
    const mergedTemplates = [...localTemplates].map((t) => autoFitTemplate(t));

    // Upload local custom templates that don't exist in remote
    for (const localT of localTemplates) {
      if (localT.isBuiltIn) continue; // Built-in templates are not uploaded
      const remoteT = remoteTemplates.find((t) => t.id === localT.id);
      if (!remoteT) {
        await saveTemplateToFirestore(userId, autoFitTemplate(localT));
      }
    }

    // Download remote templates that don't exist locally or are newer
    for (const remoteT of remoteTemplates) {
      const fittedRemoteT = autoFitTemplate(remoteT);
      const localTIdx = mergedTemplates.findIndex((t) => t.id === fittedRemoteT.id);
      if (localTIdx === -1) {
        mergedTemplates.push(fittedRemoteT);
      } else {
        const localT = mergedTemplates[localTIdx];
        const localTime = new Date(localT.createdAt || 0).getTime();
        const remoteTime = new Date(fittedRemoteT.updatedAt || fittedRemoteT.createdAt || 0).getTime();
        if (remoteTime > localTime) {
          mergedTemplates[localTIdx] = fittedRemoteT;
        }
      }
    }

    // 6. Update Zustand store
    useAppStore.setState({
      organization: mergedOrg,
      cardDataList: mergedCards,
      templates: mergedTemplates,
      hasSetup: mergedOrg.name ? true : localState.hasSetup,
    });

    console.log('Firestore sync completed successfully!');
  } catch (e) {
    console.error('Error syncing store with Firestore:', e);
  }
}

export async function switchStoreUser(userId: string | null) {
  const name = userId ? `idcard-studio-storage-${userId}` : 'idcard-studio-storage-guest';
  useAppStore.persist.setOptions({ name });
  await useAppStore.persist.rehydrate();
  if (userId) {
    syncStoreWithFirestore(userId);
  }
}
