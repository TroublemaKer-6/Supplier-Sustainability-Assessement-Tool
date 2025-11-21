import { Search, MapPin, Award, Edit, X, Settings, Leaf, Cog, RefreshCw, Users, Shield, Star } from 'lucide-react';
import { Supplier } from '../utils/storage';
import { CriterionDefinition } from '../utils/csvParser';
import { calculateAllScores, getCategoryScore } from '../utils/scoring';

interface DashboardProps {
  suppliers: Supplier[];
  filteredSuppliers: Supplier[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedMaterials: string[];
  setSelectedMaterials: (materials: string[]) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  allMaterials: string[];
  getSupplierScore: (supplier: Supplier) => number;
  onSupplierClick: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: number) => void;
  onViewChange: (view: string) => void;
  criteriaDefinitions: Record<string, CriterionDefinition>;
  categoryWeights: Record<string, number>;
}

// Category icons mapping
const categoryIcons: Record<string, any> = {
  '1': Leaf,
  '2': Cog,
  '3': RefreshCw,
  '4': Users,
  '5': Shield,
  '6': Star
};

const categoryNames: Record<string, string> = {
  '1': 'Material Sourcing',
  '2': 'Operations',
  '3': 'Product Design',
  '4': 'Commitment',
  '5': 'Compliance',
  '6': 'Performance'
};

export const Dashboard = ({
  suppliers,
  filteredSuppliers,
  searchTerm,
  setSearchTerm,
  selectedMaterials,
  setSelectedMaterials,
  sortBy,
  setSortBy,
  allMaterials,
  getSupplierScore,
  onSupplierClick,
  onEditSupplier,
  onDeleteSupplier,
  onViewChange,
  criteriaDefinitions,
  categoryWeights
}: DashboardProps) => {
  // Calculate category scores for a supplier
  const getCategoryScores = (supplier: Supplier) => {
    const scores: Record<string, number> = {};
    Object.keys(categoryNames).forEach(categoryId => {
      scores[categoryId] = getCategoryScore(supplier.scores, categoryId, criteriaDefinitions);
    });
    return scores;
  };

  // Calculate completion percentage (excluding questions that need review)
  const getCompletionPercentage = (supplier: Supplier) => {
    const totalQuestions = Object.keys(criteriaDefinitions).length;
    // Count only completed questions (have score and don't need review)
    const completedQuestions = Object.entries(supplier.scores).filter(([criterionId, score]) => {
      // Must have a score
      if (score === null || score === undefined) return false;
      // Must not be marked as needing review
      const aiFlag = supplier.aiFlags?.find((flag: any) => flag.criterionId === criterionId);
      if (aiFlag?.needsReview) return false;
      return true;
    }).length;
    return totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;
  };
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 md:mb-6 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl md:text-5xl font-extralight text-black tracking-tight mb-3">Supplier Directory</h1>
            <div className="h-px bg-black w-24 md:w-32"></div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <button onClick={() => onViewChange('settings')} className="w-full md:w-auto px-4 py-2 border-2 border-gray-400 text-gray-700 hover:border-black hover:text-black transition-colors text-xs uppercase flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button onClick={() => onViewChange('ai-assessment')} className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 border-2 border-black bg-black text-white hover:bg-gray-900 transition-colors text-xs md:text-sm uppercase tracking-widest">
              AI Assessment
            </button>
            <button onClick={() => onViewChange('supplier-form')} className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest">
              Manual Assessment
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 md:mb-12">
        <div className="mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search suppliers..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-6 md:pl-8 pr-4 py-3 md:py-4 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-base md:text-lg bg-transparent" 
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-3">Filter by Materials</label>
          <div className="flex flex-wrap gap-2">
            {allMaterials.map(material => (
              <button 
                key={material} 
                onClick={() => {
                  if (selectedMaterials.includes(material)) {
                    setSelectedMaterials(selectedMaterials.filter(m => m !== material));
                  } else {
                    setSelectedMaterials([...selectedMaterials, material]);
                  }
                }} 
                className={`px-3 py-1.5 text-xs transition-colors ${selectedMaterials.includes(material) ? 'bg-black text-white' : 'border border-gray-300 text-black hover:border-black'}`}
              >
                {material}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-3">Sort by</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'score', label: 'Highest Score' },
              { value: 'materials', label: 'Most Materials' },
              { value: 'date', label: 'Most Recent' },
              { value: 'name', label: 'Name (A-Z)' }
            ].map(sort => (
              <button 
                key={sort.value} 
                onClick={() => setSortBy(sort.value)} 
                className={`px-3 py-1.5 text-xs transition-colors ${sortBy === sort.value ? 'bg-black text-white' : 'border border-gray-300 text-black hover:border-black'}`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs md:text-sm text-gray-600 text-center md:text-right">
          {filteredSuppliers.length} of {suppliers.length} suppliers
          {selectedMaterials.length > 0 && ` • ${selectedMaterials.length} material${selectedMaterials.length > 1 ? 's' : ''} selected`}
        </div>
      </div>

      {suppliers.length > 0 && (
        <div className="mb-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-light text-black mb-2">Assessment Reports</h2>
              <div className="h-px bg-black w-16"></div>
            </div>
            <div className="text-xs uppercase text-gray-500">{filteredSuppliers.length} Reports</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map(supplier => {
              const totalScore = getSupplierScore(supplier);
              const scoreDisplay = totalScore.toFixed(1);
              const categoryScores = getCategoryScores(supplier);
              const completionPercentage = getCompletionPercentage(supplier);
              const scorePercentage = (totalScore / 4) * 100;
              
              return (
                <div 
                  key={supplier.id} 
                  className="bg-white border-2 border-gray-200 hover:border-black transition-all p-6 cursor-pointer group" 
                  onClick={() => onSupplierClick(supplier)}
                >
                  {/* Header with name and location */}
                  <div className="mb-6">
                    <h3 className="text-xl font-light text-black mb-2 group-hover:underline">{supplier.name}</h3>
                    <div className="text-sm text-gray-600 flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{supplier.location}</span>
                      {supplier.distance > 0 && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>{supplier.distance} km from Sydney</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Circular Score Indicator */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#000000"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - scorePercentage / 100)}`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-light text-black">{scoreDisplay}</div>
                        <div className="text-xs text-gray-500">OUT OF 4</div>
                      </div>
                    </div>
                  </div>


                  {/* Completion Status */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide text-gray-600">Completion</span>
                      <span className="text-sm text-black">{completionPercentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Materials Preview */}
                  {supplier.materials.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">{supplier.materials.length} Material{supplier.materials.length !== 1 ? 's' : ''}</div>
                      <div className="flex flex-wrap gap-1">
                        {supplier.materials.slice(0, 3).map(material => (
                          <span key={material} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs">{material}</span>
                        ))}
                        {supplier.materials.length > 3 && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs">+{supplier.materials.length - 3}</span>}
                      </div>
                    </div>
                  )}

                  {/* Certifications Preview */}
                  {supplier.certifications && supplier.certifications.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">{supplier.certifications.length} Certification{supplier.certifications.length !== 1 ? 's' : ''}</div>
                      <div className="flex flex-wrap gap-1">
                        {supplier.certifications.slice(0, 3).map(cert => (
                          <span key={cert} className="px-2 py-0.5 bg-green-50 text-green-800 text-xs border border-green-200">{cert}</span>
                        ))}
                        {supplier.certifications.length > 3 && <span className="px-2 py-0.5 bg-green-50 text-green-800 text-xs border border-green-200">+{supplier.certifications.length - 3}</span>}
                      </div>
                    </div>
                  )}
                  
                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">{supplier.lastUpdated}</div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onEditSupplier(supplier); 
                        }} 
                        className="p-1.5 border border-gray-300 hover:border-black text-gray-600 hover:text-black transition-colors" 
                        title="Edit"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onDeleteSupplier(supplier.id); 
                        }} 
                        className="p-1.5 border border-red-300 hover:border-red-600 text-red-600 hover:text-red-700 transition-colors" 
                        title="Delete"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

