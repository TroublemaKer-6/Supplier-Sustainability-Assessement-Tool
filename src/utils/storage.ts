// Storage utilities for saving/loading data as JSON

export interface Supplier {
  id: number;
  name: string;
  location: string;
  distance: number;
  materials: string[];
  contactEmail: string;
  scores: Record<string, number | null>;
  certifications: string[];
  completedCriteria: string[];
  documents: Record<string, any>;
  additionalNotes: Record<string, string>;
  aiFlags: any[];
  aiAssessed?: boolean;
  lastUpdated: string;
}

const STORAGE_KEY = 'powerhouse-suppliers-v1';
const WEIGHTS_STORAGE_KEY = 'powerhouse-category-weights-v1';
const SETTINGS_STORAGE_KEY = 'powerhouse-settings-v1';
const MATERIALS_STORAGE_KEY = 'powerhouse-materials-v1';

export function saveSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  } catch (error) {
    console.error('Error saving suppliers:', error);
  }
}

export function loadSuppliers(): Supplier[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading suppliers:', error);
    return [];
  }
}

export function saveCategoryWeights(weights: Record<string, number>): void {
  try {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
  } catch (error) {
    console.error('Error saving weights:', error);
  }
}

export function loadCategoryWeights(): Record<string, number> | null {
  try {
    const saved = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading weights:', error);
    return null;
  }
}

export interface AppSettings {
  openaiApiKey?: string;
  [key: string]: any;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading settings:', error);
    return {};
  }
}

// Export suppliers to JSON file
export function exportSuppliersToJSON(suppliers: Supplier[]): void {
  const dataStr = JSON.stringify(suppliers, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `suppliers-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Save materials list
export function saveMaterials(materials: string[]): void {
  try {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  } catch (error) {
    console.error('Error saving materials:', error);
  }
}

// Load materials list
export function loadMaterials(): string[] {
  try {
    const saved = localStorage.getItem(MATERIALS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading materials:', error);
    return [];
  }
}

// Import suppliers from JSON file
export function importSuppliersFromJSON(file: File): Promise<Supplier[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const suppliers = JSON.parse(e.target?.result as string);
        resolve(suppliers);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

