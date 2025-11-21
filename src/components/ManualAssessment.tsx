import { useState, useEffect } from 'react';
import { ChevronRight, X, AlertCircle } from 'lucide-react';
import { CriterionDefinition } from '../utils/csvParser';

const categoryNames: Record<string, string> = {
  '1': 'Material Sourcing',
  '2': 'Operations',
  '3': 'Product Design',
  '4': 'Commitment',
  '5': 'Compliance',
  '6': 'Performance'
};

// Clean category name - remove number prefix and extra formatting
function cleanCategoryName(categoryName: string): string {
  // Remove number prefix like "1. " or "1."
  let cleaned = categoryName.replace(/^\d+\.\s*/, '').trim();
  // Remove any content in brackets/parentheses
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, '').trim();
  // If we have a mapping, use it; otherwise use cleaned name
  const categoryId = categoryName.match(/^(\d+)/)?.[1] || '';
  return categoryNames[categoryId] || cleaned;
}

interface ManualAssessmentProps {
  formData: {
    name: string;
    location: string;
    distance: string | number;
    materials: string[];
    contactEmail: string;
    scores: Record<string, number | null>;
    documents: Record<string, File[]>;
    additionalNotes: Record<string, string>;
    certifications: string[];
  };
  criteriaDefinitions: Record<string, CriterionDefinition>;
  allMaterials: string[];
  editingSupplier: any;
  onInputChange: (field: string, value: any) => void;
  onScoreChange: (criterionId: string, score: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onBack: () => void;
}

export const ManualAssessment = ({
  formData,
  criteriaDefinitions,
  allMaterials,
  editingSupplier,
  onInputChange,
  onScoreChange,
  onSubmit,
  onCancel,
  onBack
}: ManualAssessmentProps) => {
  // Priority filter state
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  // Status filter state (only used in edit mode)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'NEEDS_REVIEW' | 'NO_SCORE'>('ALL');
  // AI flags from supplier (if editing an AI-assessed supplier)
  const aiFlags = editingSupplier?.aiFlags || [];

  // Determine question status
  const getQuestionStatus = (criterionId: string): 'COMPLETED' | 'NEEDS_REVIEW' | 'NO_SCORE' => {
    const score = formData.scores[criterionId];
    if (score !== null && score !== undefined) {
      // Check if this question needs review (from AI assessment)
      const aiFlag = aiFlags.find((flag: any) => flag.criterionId === criterionId);
      if (aiFlag?.needsReview) {
        return 'NEEDS_REVIEW';
      }
      return 'COMPLETED';
    }
    return 'NO_SCORE';
  };

  // Ensure all criteria have an initial score entry to avoid undefined lookups
  useEffect(() => {
    if (!criteriaDefinitions || Object.keys(criteriaDefinitions).length === 0) return;
    const nextScores = { ...formData.scores };
    let changed = false;
    Object.keys(criteriaDefinitions).forEach((id) => {
      if (nextScores[id] === undefined) {
        nextScores[id] = null;
        changed = true;
      }
    });
    if (changed) {
      onInputChange('scores', nextScores);
    }
  }, [criteriaDefinitions, formData.scores, onInputChange]);

  // Group criteria by category and filter by priority and status (if in edit mode)
  const groupedCriteria: Record<string, Array<[string, CriterionDefinition]>> = {};
  Object.entries(criteriaDefinitions).forEach(([id, criterion]) => {
    // Apply priority filter
    if (priorityFilter !== 'ALL' && criterion.priority !== priorityFilter) {
      return;
    }
    
    // Apply status filter (only in edit mode)
    if (editingSupplier && statusFilter !== 'ALL') {
      const status = getQuestionStatus(id);
      if (status !== statusFilter) {
        return;
      }
    }
    
    if (!groupedCriteria[criterion.category]) {
      groupedCriteria[criterion.category] = [];
    }
    groupedCriteria[criterion.category].push([id, criterion]);
  });

  // Calculate progress
  const totalQuestions = Object.keys(criteriaDefinitions).length;
  const answeredQuestions = Object.values(formData.scores).filter(score => score !== null && score !== undefined).length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-black mb-6 hover:underline flex items-center">
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-light text-black mb-3">Manual Assessment</h1>
        <div className="h-px bg-black w-24"></div>
      </div>

      {/* Basic Information Section */}
      <section className="mb-12">
        <h2 className="text-xl font-light text-black mb-6">Basic Information</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Supplier Name *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => onInputChange('name', e.target.value)} 
              className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent" 
              placeholder="Enter supplier name" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Location</label>
              <input 
                type="text" 
                value={formData.location} 
                onChange={(e) => onInputChange('location', e.target.value)} 
                className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent" 
                placeholder="City, State" 
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Distance (km)</label>
              <input 
                type="number" 
                value={formData.distance} 
                onChange={(e) => onInputChange('distance', e.target.value)} 
                className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent" 
                placeholder="0" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Contact Email</label>
            <input 
              type="email" 
              value={formData.contactEmail} 
              onChange={(e) => onInputChange('contactEmail', e.target.value)} 
              className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent" 
              placeholder="contact@supplier.com" 
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-600 mb-3">Materials Supplied</label>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                id="custom-material-form-input"
                placeholder="Add custom material..."
                className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !formData.materials.includes(value)) {
                      onInputChange('materials', [...formData.materials, value]);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('custom-material-form-input') as HTMLInputElement;
                  const value = input.value.trim();
                  if (value && !formData.materials.includes(value)) {
                    onInputChange('materials', [...formData.materials, value]);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-black text-white text-xs uppercase hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
            </div>
            
            {formData.materials.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {formData.materials.map(material => (
                    <div key={material} className="inline-flex items-center px-3 py-1.5 bg-black text-white text-sm">
                      <span>{material}</span>
                      <button
                        type="button"
                        onClick={() => onInputChange('materials', formData.materials.filter(m => m !== material))}
                        className="ml-2 hover:text-gray-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 mb-2">Or select from common materials:</div>
            <div className="flex flex-wrap gap-2">
              {allMaterials.filter(material => !formData.materials.includes(material)).map(material => (
                <button
                  key={material}
                  type="button"
                  onClick={() => onInputChange('materials', [...formData.materials, material])}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-black hover:border-black transition-colors"
                >
                  {material}
                </button>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-600 mb-3">Certifications & Standards</label>
            <p className="text-xs text-gray-500 mb-3">Add any certifications, standards, or accreditations the supplier holds</p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                id="cert-input"
                placeholder="e.g., B Corp, ISO 14001, Green Star..."
                className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !formData.certifications.includes(value)) {
                      onInputChange('certifications', [...formData.certifications, value]);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('cert-input') as HTMLInputElement;
                  const value = input.value.trim();
                  if (value && !formData.certifications.includes(value)) {
                    onInputChange('certifications', [...formData.certifications, value]);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-black text-white text-xs uppercase hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
            </div>
            
            {formData.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map(cert => (
                  <div key={cert} className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-800 text-sm">
                    <span>{cert}</span>
                    <button
                      type="button"
                      onClick={() => onInputChange('certifications', formData.certifications.filter(c => c !== cert))}
                      className="ml-2 text-green-900 hover:text-green-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sustainability Assessment Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-black">Sustainability Assessment</h2>
        </div>

        {/* Progress and Priority Filter */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Progress</div>
              <div className="text-2xl font-light text-black">
                {answeredQuestions} <span className="text-gray-400">/ {totalQuestions}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{progressPercentage}% completed</div>
            </div>
            <div className="flex-1 max-w-xs ml-8">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-600 mr-2">Filter by Priority:</span>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('ALL')}
                  className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                    priorityFilter === 'ALL'
                      ? 'bg-black text-white'
                      : 'bg-white text-black border border-gray-300 hover:border-black'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('HIGH')}
                  className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                    priorityFilter === 'HIGH'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-red-800 border border-red-300 hover:border-red-600'
                  }`}
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('MEDIUM')}
                  className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                    priorityFilter === 'MEDIUM'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white text-yellow-800 border border-yellow-300 hover:border-yellow-500'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('LOW')}
                  className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                    priorityFilter === 'LOW'
                      ? 'bg-gray-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-600'
                  }`}
                >
                  Low
                </button>
              </div>
              
              {/* Status filter - only show in edit mode */}
              {editingSupplier && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-600 mr-2">Filter by Status:</span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                      statusFilter === 'ALL'
                        ? 'bg-black text-white'
                        : 'bg-white text-black border border-gray-300 hover:border-black'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('COMPLETED')}
                    className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                      statusFilter === 'COMPLETED'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-800 border border-green-300 hover:border-green-600'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('NEEDS_REVIEW')}
                    className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                      statusFilter === 'NEEDS_REVIEW'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-white text-yellow-800 border border-yellow-300 hover:border-yellow-600'
                    }`}
                  >
                    Needs Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('NO_SCORE')}
                    className={`px-3 py-1.5 text-xs uppercase transition-colors ${
                      statusFilter === 'NO_SCORE'
                        ? 'bg-gray-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-600'
                    }`}
                  >
                    No Score
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grouped Criteria by Category */}
        {Object.entries(groupedCriteria).map(([categoryName, criteria]) => (
          <div key={categoryName} className="mb-12">
            <div className="mb-6 pb-3 border-b-2 border-black sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-light text-black">{cleanCategoryName(categoryName)}</h3>
            </div>
            
            <div className="space-y-8">
              {criteria.map(([criterionId, criterion]) => (
                <div key={criterionId} className="pb-8 border-b border-gray-200 last:border-0">
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-wrap">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono">{criterionId}</span>
                        <span className={`text-xs uppercase px-2 py-0.5 ${
                          criterion.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                          criterion.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {criterion.priority}
                        </span>
                        {(() => {
                          const status = getQuestionStatus(criterionId);
                          if (status === 'NEEDS_REVIEW') {
                            return (
                              <span className="text-xs uppercase px-2 py-0.5 bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Needs Review
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {criterion.subCategory && (
                          <span className="text-xs text-gray-500">{criterion.subCategory}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-base text-black mb-2">{criterion.question}</p>
                  </div>
                  
                  {criterion.options.length > 0 ? (
                    <div className="space-y-2">
                      <div className={`grid gap-2 ${criterion.options.length === 1 ? 'grid-cols-1 max-w-xs' : criterion.options.length === 2 ? 'grid-cols-2' : criterion.options.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {criterion.options.map(option => {
                          // Ensure option.value is a valid number
                          const optionValue = typeof option.value === 'number' && !isNaN(option.value) ? option.value : 1;
                          const currentScore = formData.scores[criterionId];
                          const isSelected = currentScore !== null && currentScore !== undefined && currentScore === optionValue;
                          return (
                            <button 
                              key={optionValue} 
                              type="button"
                              onClick={() => {
                                // Toggle: if already selected, clear it; otherwise set it
                                if (isSelected) {
                                  onInputChange('scores', { ...formData.scores, [criterionId]: null });
                                } else {
                                  onScoreChange(criterionId, optionValue);
                                }
                              }} 
                              className={`py-3 px-2 text-xs transition-all ${
                                isSelected
                                  ? 'bg-black text-white' 
                                  : 'bg-white text-black border border-gray-300 hover:border-black'
                              }`}
                            >
                              <div className="text-lg font-light mb-1">{optionValue}</div>
                              <div className="text-[10px] opacity-75 leading-tight">{option.label || 'No label'}</div>
                            </button>
                          );
                        })}
                      </div>
                      {formData.scores[criterionId] !== null && formData.scores[criterionId] !== undefined && (
                        <button
                          type="button"
                          onClick={() => onInputChange('scores', { ...formData.scores, [criterionId]: null })}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                      No scoring options available for this criterion. Please check the CSV file.
                    </div>
                  )}
                  
                  {/* Additional Notes for this criterion */}
                  <div className="mt-4">
                    <textarea
                      value={formData.additionalNotes[criterionId] || ''}
                      onChange={(e) => {
                        onInputChange('additionalNotes', {
                          ...formData.additionalNotes,
                          [criterionId]: e.target.value
                        });
                      }}
                      placeholder="Add notes or evidence for this criterion..."
                      className="w-full px-3 py-2 border border-gray-300 focus:border-black focus:outline-none text-sm resize-y min-h-[60px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Submit Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-300">
        <div className="text-sm text-gray-600">
          {answeredQuestions < totalQuestions && (
            <span>
              You can submit with {totalQuestions - answeredQuestions} unanswered questions. 
              Unanswered questions will be marked as "No score".
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {editingSupplier && (
            <button 
              onClick={onCancel} 
              className="px-12 py-4 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={onSubmit} 
            disabled={!formData.name}
            className="px-12 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingSupplier ? 'Update Supplier' : 'Submit Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
};
