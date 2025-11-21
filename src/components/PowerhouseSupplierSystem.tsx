/**
 * POWERHOUSE MUSEUM SUSTAINABLE SUPPLIER EVALUATION SYSTEM
 * Version: 1.0.0
 * 
 * Features:
 * - CSV-based question loading with automatic normalization to 1-4 scale
 * - Weighted scoring system with adjustable category weights
 * - OpenAI API integration placeholder
 * - Settings view for weights and API key configuration
 * - JSON/CSV data storage
 */

import { useState, useEffect, useMemo } from 'react';
import { loadQuestions, loadWeights, CriterionDefinition } from '../utils/csvParser';
import { saveSuppliers, loadSuppliers, saveCategoryWeights, loadCategoryWeights, exportSuppliersToJSON, importSuppliersFromJSON, saveMaterials, loadMaterials, Supplier } from '../utils/storage';
import { calculateTotalScore, normalizeWeights, calculateAllScores } from '../utils/scoring';
import { runAIAssessment } from '../utils/openai';
import { Dashboard } from './Dashboard';
import { Settings } from './Settings';
import { ManualAssessment } from './ManualAssessment';
import { AIAssessment } from './AIAssessment';
import { ReportView } from './ReportView';

const PowerhouseSupplierSystem = () => {
  // Initialize view from URL hash or default to dashboard
  const getViewFromHash = (): string => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    const validViews = ['dashboard', 'settings', 'ai-assessment', 'supplier-form', 'report'];
    if (hash && validViews.includes(hash.split('?')[0])) {
      return hash.split('?')[0];
    }
    return 'dashboard';
  };

  // View state - initialize from URL
  const [view, setView] = useState(() => getViewFromHash());
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, supplierId: null as number | null, inputValue: '' });
  
  // Data state
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadSuppliers());
  const [criteriaDefinitions, setCriteriaDefinitions] = useState<Record<string, CriterionDefinition>>({});
  const [categoryWeights, setCategoryWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // Filter/Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [maxDistance] = useState(2000);
  const [minScore] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    distance: '',
    materials: [] as string[],
    contactEmail: '',
    scores: {} as Record<string, number | null>,
    documents: {} as Record<string, any>,
    additionalNotes: {} as Record<string, string>,
    certifications: [] as string[]
  });
  
  // AI Assessment state
  const [aiAssessment, setAiAssessment] = useState({
    supplierName: '',
    location: '',
    materials: [] as string[],
    website: '',
    uploadedDocs: [] as string[],
    additionalNotes: '',
    processing: false,
    results: null as Record<string, any> | null,
    resultFilter: 'all'
  });
  
  // Settings state
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({});
  
  // Default materials list
  const defaultMaterials = [
    "Timber", "Bamboo", "Cork", "Recycled Steel", "Recycled Plastic", 
    "Glass", "Organic Cotton", "Hemp", "Linen", "Wool", "Recycled Aluminum",
    "Cardboard", "Paper", "Stone", "Ceramic", "Concrete"
  ];
  
  // Materials list - load from storage or use defaults
  const [allMaterials, setAllMaterials] = useState<string[]>(() => {
    const saved = loadMaterials();
    if (saved.length > 0) {
      return saved;
    }
    // Initialize with defaults if nothing saved
    saveMaterials(defaultMaterials);
    return defaultMaterials;
  });
  
  // Update materials list from existing suppliers when suppliers change
  useEffect(() => {
    if (suppliers.length > 0) {
      // Extract all unique materials from existing suppliers
      const allSupplierMaterials = new Set<string>();
      suppliers.forEach(supplier => {
        supplier.materials?.forEach(material => {
          if (material) allSupplierMaterials.add(material);
        });
      });
      
      // Merge with current materials list using functional update
      setAllMaterials(prevMaterials => {
        const mergedMaterials = Array.from(new Set([...prevMaterials, ...Array.from(allSupplierMaterials)])).sort();
        
        if (mergedMaterials.length > prevMaterials.length) {
          saveMaterials(mergedMaterials);
          return mergedMaterials;
        }
        return prevMaterials;
      });
    }
  }, [suppliers]); // Update when suppliers change
  
  // Load questions and weights on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [questions, weights] = await Promise.all([
          loadQuestions(),
          loadWeights()
        ]);
        
        setCriteriaDefinitions(questions);
        
        // Log loaded questions count for verification
        const questionCount = Object.keys(questions).length;
        console.log(`Loaded ${questionCount} questions from CSV`);
        
        // Load saved weights or use defaults
        const savedWeights = loadCategoryWeights();
        const finalWeights = savedWeights || weights;
        setCategoryWeights(finalWeights);
        setTempWeights(finalWeights);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading questions or weights. Please check that questions.csv and weights.csv are in the public folder.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Initialize URL hash if not present
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#dashboard');
    }
  }, []);
  
  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const viewFromHash = getViewFromHash();
      
      if (viewFromHash !== view) {
        setView(viewFromHash);
        
        // If navigating to report, try to load supplier from URL
        if (viewFromHash === 'report') {
          const urlParams = new URLSearchParams(hash.split('?')[1]);
          const supplierId = urlParams.get('id');
          if (supplierId) {
            const supplier = suppliers.find(s => s.id === parseInt(supplierId));
            if (supplier) {
              setSelectedSupplier(supplier);
            }
          }
        } else if (viewFromHash !== 'report') {
          // Clear selected supplier when navigating away from report
          setSelectedSupplier(null);
        }
      }
    };

    // Listen for hash changes (back/forward buttons)
    window.addEventListener('hashchange', handleHashChange);
    
    // Also check on mount in case we're loading with a hash
    if (window.location.hash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [view, suppliers]);
  
  // Save suppliers to localStorage
  useEffect(() => {
    saveSuppliers(suppliers);
  }, [suppliers]);
  
  // Helper function to navigate to a view and update URL
  const navigateToView = (newView: string, supplierId?: number) => {
    setView(newView);
    if (supplierId) {
      window.history.pushState(null, '', `#${newView}?id=${supplierId}`);
    } else {
      window.history.pushState(null, '', `#${newView}`);
    }
  };
  
  // Calculate scores with weights
  const getSupplierScore = (supplier: Supplier) => {
    if (Object.keys(categoryWeights).length > 0) {
      // Calculate weighted score using the scoring utility
      const scoreCalculation = calculateAllScores(supplier.scores, categoryWeights, criteriaDefinitions);
      // Return weighted score if available, otherwise return total score
      return scoreCalculation.weightedScore > 0 ? scoreCalculation.weightedScore : scoreCalculation.totalScore;
    }
    return calculateTotalScore(supplier.scores, criteriaDefinitions);
  };
  
  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    const filtered = suppliers.filter(supplier => {
      const normalizedSearch = searchTerm.toLowerCase().replace(/\s+/g, '');
      const normalizedName = supplier.name.toLowerCase().replace(/\s+/g, '');
      const matchesName = normalizedName.includes(normalizedSearch);
      const matchesMaterials = searchTerm.length > 0 ? supplier.materials.some(mat => mat.toLowerCase().replace(/\s+/g, '').includes(normalizedSearch)) : false;
      const matchesSearch = matchesName || matchesMaterials;
      const matchesMaterialFilter = selectedMaterials.length === 0 || selectedMaterials.some(mat => supplier.materials.includes(mat));
      const matchesDistance = supplier.distance <= maxDistance;
      const score = getSupplierScore(supplier);
      const matchesScore = score >= minScore;
      return matchesSearch && matchesMaterialFilter && matchesDistance && matchesScore;
    });
    
    return filtered.sort((a, b) => {
      switch(sortBy) {
        case 'score':
          return getSupplierScore(b) - getSupplierScore(a);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'materials':
          return b.materials.length - a.materials.length;
        case 'date':
        default:
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
    });
  }, [suppliers, searchTerm, selectedMaterials, maxDistance, minScore, sortBy, categoryWeights]);
  
  // Handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleScoreChange = (criterionId: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [criterionId]: score }
    }));
  };
  
  const handleSubmit = () => {
    // Extract materials from form data
    const supplierMaterials = formData.materials || [];
    
    // Add any new materials to the materials list
    const newMaterials = supplierMaterials.filter(material => material && !allMaterials.includes(material));
    if (newMaterials.length > 0) {
      const updatedMaterials = [...allMaterials, ...newMaterials].sort();
      setAllMaterials(updatedMaterials);
      saveMaterials(updatedMaterials);
    }
    
    if (editingSupplier) {
      const updatedSupplier: Supplier = {
        ...editingSupplier,
        ...formData,
        distance: typeof formData.distance === 'string' ? parseFloat(formData.distance) || 0 : formData.distance,
        certifications: formData.certifications || [],
        completedCriteria: editingSupplier.completedCriteria || [],
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? updatedSupplier : s));
      setSelectedSupplier(updatedSupplier);
      setEditingSupplier(null);
      navigateToView('report', updatedSupplier.id);
    } else {
      const newSupplier: Supplier = {
        id: suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1,
        ...formData,
        distance: typeof formData.distance === 'string' ? parseFloat(formData.distance) || 0 : formData.distance,
        certifications: formData.certifications || [],
        completedCriteria: [],
        lastUpdated: new Date().toISOString().split('T')[0],
        aiFlags: []
      };
      setSuppliers([...suppliers, newSupplier]);
      navigateToView('dashboard');
    }
    setFormData({ name: '', location: '', distance: '', materials: [], contactEmail: '', scores: {}, documents: {}, additionalNotes: {}, certifications: [] });
  };
  
  const handleDeleteSupplier = (supplierId: number) => {
    setDeleteConfirmation({ show: true, supplierId, inputValue: '' });
  };
  
  const confirmDelete = () => {
    if (deleteConfirmation.inputValue.toLowerCase() === 'delete' && deleteConfirmation.supplierId) {
      setSuppliers(suppliers.filter(s => s.id !== deleteConfirmation.supplierId));
      setDeleteConfirmation({ show: false, supplierId: null, inputValue: '' });
      setView('dashboard');
    }
  };
  
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      location: supplier.location,
      distance: String(supplier.distance),
      materials: supplier.materials,
      contactEmail: supplier.contactEmail,
      scores: supplier.scores,
      documents: supplier.documents || {},
      additionalNotes: supplier.additionalNotes || {},
      certifications: supplier.certifications || []
    });
    navigateToView('supplier-form');
  };
  
  // Settings handlers
  const handleSaveWeights = () => {
    const normalized = normalizeWeights(tempWeights);
    setCategoryWeights(normalized);
    setTempWeights(normalized);
    saveCategoryWeights(normalized);
    alert('Category weights saved successfully!');
  };
  
  
  const handleExportData = () => {
    exportSuppliersToJSON(suppliers);
  };
  
  const handleImportData = (file: File) => {
    importSuppliersFromJSON(file)
      .then(imported => {
        setSuppliers(imported);
        alert(`Successfully imported ${imported.length} suppliers`);
      })
      .catch(error => {
        alert(`Error importing data: ${error.message}`);
      });
  };
  
  // AI Assessment handler
  const handleRunAIAssessment = async () => {
    if (!aiAssessment.supplierName) {
      alert('Please enter a supplier name.');
      return;
    }
    
    setAiAssessment(prev => ({ ...prev, processing: true }));
    
    try {
      const results = await runAIAssessment(
        {
          supplierName: aiAssessment.supplierName,
          location: aiAssessment.location,
          materials: aiAssessment.materials,
          website: aiAssessment.website,
          uploadedDocs: aiAssessment.uploadedDocs,
          additionalNotes: aiAssessment.additionalNotes
        },
        criteriaDefinitions
      );
      
      setAiAssessment(prev => ({
        ...prev,
        processing: false,
        results: results.results
      }));
    } catch (error: any) {
      console.error('AI Assessment Error:', error);
      alert(error.message || 'Error during AI assessment. Please make sure the backend server is running.');
      setAiAssessment(prev => ({ ...prev, processing: false }));
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-black">Loading questions and weights...</div>
        </div>
      </div>
    );
  }
  
  // Reset weights handler
  const handleResetWeights = () => {
    loadWeights().then(weights => {
      setTempWeights(weights);
      setCategoryWeights(weights);
    });
  };

  // Save AI assessment handler
  const handleSaveAIAssessment = (supplierData: Omit<Supplier, 'id'>) => {
    // Extract materials from supplier data
    const supplierMaterials = supplierData.materials || [];
    
    // Add any new materials to the materials list
    const newMaterials = supplierMaterials.filter(material => material && !allMaterials.includes(material));
    if (newMaterials.length > 0) {
      const updatedMaterials = [...allMaterials, ...newMaterials].sort();
      setAllMaterials(updatedMaterials);
      saveMaterials(updatedMaterials);
    }
    
    const newSupplier: Supplier = {
      id: suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1,
      ...supplierData
    };
    setSuppliers([...suppliers, newSupplier]);
    // After saving, switch to edit mode for revision
    setEditingSupplier(newSupplier);
    setFormData({
      name: newSupplier.name,
      location: newSupplier.location,
      distance: String(newSupplier.distance),
      materials: newSupplier.materials,
      contactEmail: newSupplier.contactEmail,
      scores: newSupplier.scores,
      documents: newSupplier.documents || {},
      additionalNotes: newSupplier.additionalNotes || {},
      certifications: newSupplier.certifications || []
    });
    setAiAssessment({
      supplierName: '',
      location: '',
      materials: [],
      website: '',
      uploadedDocs: [],
      additionalNotes: '',
      processing: false,
      results: null,
      resultFilter: 'all'
    });
    navigateToView('supplier-form'); // Switch to manual assessment for revision
  };

  
  return (
    <div className="min-h-screen bg-white py-8 md:py-16 px-4 md:px-8">
      {view === 'dashboard' && (
            <Dashboard
              suppliers={suppliers}
              filteredSuppliers={filteredSuppliers}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
              sortBy={sortBy}
            setSortBy={setSortBy}
            allMaterials={allMaterials}
            getSupplierScore={getSupplierScore}
            onSupplierClick={(supplier) => { setSelectedSupplier(supplier); navigateToView('report', supplier.id); }}
            onEditSupplier={handleEditSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onViewChange={(view) => navigateToView(view)}
            criteriaDefinitions={criteriaDefinitions}
          />
      )}
      {view === 'settings' && (
        <Settings
          tempWeights={tempWeights}
          setTempWeights={setTempWeights}
          onSaveWeights={handleSaveWeights}
          onResetWeights={handleResetWeights}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onBack={() => navigateToView('dashboard')}
        />
      )}
      {view === 'ai-assessment' && (
        <AIAssessment
          supplierName={aiAssessment.supplierName}
          location={aiAssessment.location}
          materials={aiAssessment.materials}
          website={aiAssessment.website}
          additionalNotes={aiAssessment.additionalNotes}
          processing={aiAssessment.processing}
          results={aiAssessment.results}
          criteriaDefinitions={criteriaDefinitions}
          allMaterials={allMaterials}
          onSupplierNameChange={(name) => setAiAssessment(prev => ({ ...prev, supplierName: name }))}
          onLocationChange={(location) => setAiAssessment(prev => ({ ...prev, location }))}
          onMaterialsChange={(materials) => setAiAssessment(prev => ({ ...prev, materials }))}
          onWebsiteChange={(website) => setAiAssessment(prev => ({ ...prev, website }))}
          onAdditionalNotesChange={(notes) => setAiAssessment(prev => ({ ...prev, additionalNotes: notes }))}
          onRunAssessment={handleRunAIAssessment}
          onSaveAssessment={handleSaveAIAssessment}
          onReset={() => setAiAssessment({
            supplierName: '',
            location: '',
            materials: [],
            website: '',
            uploadedDocs: [],
            additionalNotes: '',
            processing: false,
            results: null,
            resultFilter: 'all'
          })}
          onBack={() => navigateToView('dashboard')}
        />
      )}
      {view === 'supplier-form' && (
        <ManualAssessment
          formData={formData}
          criteriaDefinitions={criteriaDefinitions}
          allMaterials={allMaterials}
          editingSupplier={editingSupplier}
          onInputChange={handleInputChange}
          onScoreChange={handleScoreChange}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditingSupplier(null);
            setFormData({ name: '', location: '', distance: '', materials: [], contactEmail: '', scores: {}, documents: {}, additionalNotes: {}, certifications: [] });
            navigateToView('dashboard');
          }}
          onBack={() => navigateToView('dashboard')}
        />
      )}
      {view === 'report' && selectedSupplier && (
        <ReportView
          supplier={selectedSupplier}
          criteriaDefinitions={criteriaDefinitions}
          categoryWeights={categoryWeights}
          onEdit={() => handleEditSupplier(selectedSupplier)}
          onBack={() => navigateToView('dashboard')}
        />
      )}
      
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-6 border-2 border-black">
            <h2 className="text-xl font-light text-black mb-4">Delete Supplier Report</h2>
            <p className="text-sm text-gray-700 mb-4">This action cannot be undone. This will permanently delete the supplier report and all associated data.</p>
            <p className="text-sm text-black mb-4">Please type <strong>delete</strong> to confirm:</p>
            <input type="text" value={deleteConfirmation.inputValue} onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, inputValue: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none mb-4" placeholder="Type 'delete' to confirm" autoFocus />
            <div className="flex space-x-3">
              <button onClick={confirmDelete} disabled={deleteConfirmation.inputValue.toLowerCase() !== 'delete'} className="flex-1 px-4 py-3 bg-red-600 text-white text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors">
                Delete Supplier
              </button>
              <button onClick={() => setDeleteConfirmation({ show: false, supplierId: null, inputValue: '' })} className="flex-1 px-4 py-3 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerhouseSupplierSystem;
