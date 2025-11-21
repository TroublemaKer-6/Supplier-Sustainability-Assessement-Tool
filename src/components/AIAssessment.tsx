import { useState } from 'react';
import { ChevronRight, X, AlertCircle, CheckCircle } from 'lucide-react';
import { CriterionDefinition } from '../utils/csvParser';
import { Supplier } from '../utils/storage';

// Clean category name - remove number prefix and extra formatting
function cleanCategoryName(categoryName: string): string {
  // Remove number prefix like "1. " or "1."
  let cleaned = categoryName.replace(/^\d+\.\s*/, '').trim();
  // Remove any content in brackets/parentheses
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return cleaned;
}

interface AIAssessmentResult {
  criterionId: string;
  score: number | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  sources: string[];
  needsReview: boolean;
}

interface AIAssessmentProps {
  supplierName: string;
  location: string;
  materials: string[];
  website: string;
  additionalNotes: string;
  processing: boolean;
  results: Record<string, AIAssessmentResult> | null;
  criteriaDefinitions: Record<string, CriterionDefinition>;
  allMaterials: string[];
  onSupplierNameChange: (name: string) => void;
  onLocationChange: (location: string) => void;
  onMaterialsChange: (materials: string[]) => void;
  onWebsiteChange: (website: string) => void;
  onAdditionalNotesChange: (notes: string) => void;
  onRunAssessment: () => void;
  onSaveAssessment: (supplier: Omit<Supplier, 'id'>) => void;
  onReset: () => void;
  onBack: () => void;
}

export const AIAssessment = ({
  supplierName,
  location,
  materials,
  website,
  additionalNotes,
  processing,
  results,
  criteriaDefinitions,
  allMaterials,
  onSupplierNameChange,
  onLocationChange,
  onMaterialsChange,
  onWebsiteChange,
  onAdditionalNotesChange,
  onRunAssessment,
  onSaveAssessment,
  onReset,
  onBack
}: AIAssessmentProps) => {
  // State for manually marking questions as needs review
  const [manualReviewFlags, setManualReviewFlags] = useState<Record<string, boolean>>({});

  // Group results by category
  const groupedResults: Record<string, Array<[string, AIAssessmentResult]>> = {};
  if (results) {
    Object.entries(results).forEach(([criterionId, result]) => {
      const criterion = criteriaDefinitions[criterionId];
      if (criterion) {
        if (!groupedResults[criterion.category]) {
          groupedResults[criterion.category] = [];
        }
        groupedResults[criterion.category].push([criterionId, result]);
      }
    });
  }

  // Toggle needs review flag
  const toggleNeedsReview = (criterionId: string) => {
    setManualReviewFlags(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  }

  // Get final needs review status (AI flag or manual flag)
  const getNeedsReview = (criterionId: string, aiNeedsReview: boolean) => {
    return manualReviewFlags[criterionId] !== undefined 
      ? manualReviewFlags[criterionId] 
      : aiNeedsReview;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-black mb-6 hover:underline flex items-center">
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-light text-black mb-3">AI Assessment</h1>
        <div className="h-px bg-black w-24 mb-4"></div>
        <p className="text-sm text-gray-600">AI will search the internet to automatically answer all assessment questions</p>
      </div>

      {/* Input Section */}
      {!results && !processing && (
        <section className="mb-12">
          <h2 className="text-xl font-light text-black mb-6">Supplier Information</h2>
          
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Supplier Name *</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => onSupplierNameChange(e.target.value)}
                className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent"
                placeholder="Enter supplier company name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => onLocationChange(e.target.value)}
                  className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent"
                  placeholder="City, State/Country"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Website (Optional)</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => onWebsiteChange(e.target.value)}
                  className="w-full px-0 py-2 border-0 border-b-2 border-gray-300 focus:border-black focus:outline-none text-lg bg-transparent"
                  placeholder="www.supplier.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-600 mb-3">Materials Supplied (Optional)</label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  id="custom-material-ai-input"
                  placeholder="Add custom material..."
                  className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !materials.includes(value)) {
                        onMaterialsChange([...materials, value]);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('custom-material-ai-input') as HTMLInputElement;
                    const value = input.value.trim();
                    if (value && !materials.includes(value)) {
                      onMaterialsChange([...materials, value]);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-black text-white text-xs uppercase hover:bg-gray-800 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {materials.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {materials.map(material => (
                      <div key={material} className="inline-flex items-center px-3 py-1.5 bg-black text-white text-sm">
                        <span>{material}</span>
                        <button
                          onClick={() => onMaterialsChange(materials.filter(m => m !== material))}
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
                {allMaterials.filter(material => !materials.includes(material)).map(material => (
                  <button
                    key={material}
                    onClick={() => onMaterialsChange([...materials, material])}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-black hover:border-black transition-colors"
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Additional Notes (Optional)</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => onAdditionalNotesChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm resize-y min-h-[120px]"
                placeholder="Example: We know they have local partnerships in Melbourne area..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onRunAssessment}
              disabled={!supplierName}
              className="px-12 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start AI Assessment
            </button>
          </div>

          <div className="mt-8 p-6 bg-blue-50 border-l-4 border-blue-600">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How AI Assessment Works</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• AI analyzes supplier information using OpenAI</li>
              <li>• Evaluates all {Object.keys(criteriaDefinitions).length} criteria automatically</li>
              <li>• Provides scores, reasoning, and confidence levels</li>
              <li>• Takes approximately 30-60 seconds to complete</li>
              <li>• Requires backend server to be running</li>
            </ul>
          </div>
        </section>
      )}

      {/* Processing State */}
      {processing && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
          <div className="text-lg text-black mb-2">AI Analyzing {supplierName}</div>
          <div className="text-sm text-gray-600 text-center max-w-md mb-4">
            Evaluating all {Object.keys(criteriaDefinitions).length} sustainability criteria...
          </div>
          <div className="text-xs text-gray-500">This may take 30-60 seconds</div>
        </div>
      )}

      {/* Results Section */}
      {results && !processing && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-light text-black mb-2">AI Assessment Complete</h2>
              <p className="text-sm text-gray-600">Review results and save as supplier</p>
            </div>
            <button
              onClick={onReset}
              className="text-sm text-gray-600 hover:text-black"
            >
              Start New Assessment
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {(() => {
              const resultValues = Object.entries(results);
              const scored = resultValues.filter(([, r]) => r.score !== null);
              const needsReviewCount = resultValues.filter(([id, r]) => getNeedsReview(id, r.needsReview)).length;
              const avgScore = scored.length > 0 
                ? (scored.reduce((sum, [, r]) => sum + (r.score || 0), 0) / scored.length).toFixed(1)
                : 'N/A';

              return (
                <>
                  <div className="p-4 bg-black text-white">
                    <div className="text-xs uppercase tracking-wide opacity-75 mb-2">Average Score</div>
                    <div className="text-4xl font-light">{avgScore}</div>
                  </div>
                  <div className="p-4 border-2 border-gray-300">
                    <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Scored</div>
                    <div className="text-3xl font-light text-black">{scored.length}<span className="text-3xl font-light text-gray-400"> / {Object.keys(criteriaDefinitions).length}</span></div>
                  </div>
                  <div className="p-4 border-2 border-yellow-600 bg-yellow-50">
                    <div className="text-xs uppercase tracking-wide text-yellow-900 mb-2">Needs Review</div>
                    <div className="text-3xl font-light text-yellow-900">{needsReviewCount}<span className="text-3xl font-light text-yellow-700"> / {Object.keys(criteriaDefinitions).length}</span></div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Results by Category */}
          {Object.entries(groupedResults).map(([categoryName, categoryResults]) => (
            <div key={categoryName} className="mb-12">
              <div className="mb-6 pb-3 border-b-2 border-black sticky top-0 bg-white z-10">
                <h3 className="text-2xl font-light text-black">{cleanCategoryName(categoryName)}</h3>
              </div>
              
              <div className="space-y-6">
                {categoryResults.map(([criterionId, result]) => {
                  const criterion = criteriaDefinitions[criterionId];
                  if (!criterion) return null;

                  return (
                    <div key={criterionId} className="pb-6 border-b border-gray-200 last:border-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono">{criterionId}</span>
                            <span className={`text-xs uppercase px-2 py-0.5 ${
                              criterion.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                              criterion.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {criterion.priority}
                            </span>
                            <span className={`text-xs px-2 py-0.5 ${
                              result.confidence === 'high' ? 'bg-green-100 text-green-800' :
                              result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {result.confidence} confidence
                            </span>
                          </div>
                          <p className="text-base text-black mb-2">{criterion.question}</p>
                        </div>
                        <div className="ml-4 text-right">
                          {result.score !== null ? (
                            <div>
                              <div className={`text-3xl font-light ${
                                result.score >= 3.5 ? 'text-green-600' : 
                                result.score >= 2.5 ? 'text-blue-600' : 
                                result.score >= 1.5 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {result.score}
                                <span className="text-xl text-gray-400"> / 4</span>
                              </div>
                              {/* Show selected option label */}
                              {criterion.options.find(opt => opt.value === result.score) && (
                                <div className="text-xs text-gray-500 mt-1 max-w-[150px]">
                                  {criterion.options.find(opt => opt.value === result.score)?.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              <div className="text-lg font-light">No score</div>
                              <div className="text-xs mt-1">Not found</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Reasoning:</strong> {result.reasoning}
                        </div>
                      </div>
                      
                      {result.sources && result.sources.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">
                            <strong>Sources:</strong>
                          </div>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                            {result.sources.map((source, idx) => {
                              // Check if source is a URL
                              const isUrl = /^https?:\/\//.test(source);
                              return (
                                <li key={idx}>
                                  {isUrl ? (
                                    <a 
                                      href={source} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      {source}
                                    </a>
                                  ) : (
                                    source
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex-1">
                          {getNeedsReview(criterionId, result.needsReview) && (
                            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-600">
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 text-yellow-800 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-yellow-800">
                                  This criterion needs manual review. {result.needsReview ? 'Insufficient information found online.' : 'Marked for review.'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleNeedsReview(criterionId)}
                          className={`ml-4 px-3 py-2 text-xs uppercase transition-colors flex items-center gap-2 ${
                            getNeedsReview(criterionId, result.needsReview)
                              ? 'bg-yellow-600 text-white'
                              : 'bg-white text-yellow-800 border border-yellow-300 hover:border-yellow-600'
                          }`}
                        >
                          {getNeedsReview(criterionId, result.needsReview) ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Needs Review
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Mark for Review
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-300">
            <button
              onClick={() => {
                // Save with revision mode - store AI flags for later editing
                onSaveAssessment({
                  name: supplierName,
                  location: location || 'Not specified',
                  distance: 0,
                  materials: materials,
                  contactEmail: '',
                  scores: Object.fromEntries(
                    Object.entries(results).map(([id, result]) => [id, result.score])
                  ),
                  certifications: [],
                  completedCriteria: [],
                  documents: {},
                  additionalNotes: Object.fromEntries(
                    Object.entries(results).map(([id, result]) => {
                      let noteText = result.reasoning;
                      // Append sources to the notes if they exist
                      if (result.sources && result.sources.length > 0) {
                        noteText += '\n\nSources:\n';
                        result.sources.forEach((source, idx) => {
                          noteText += `${idx + 1}. ${source}\n`;
                        });
                      }
                      return [id, noteText];
                    })
                  ),
                  aiFlags: Object.entries(results)
                    .filter(([id, result]) => getNeedsReview(id, result.needsReview))
                    .map(([id, result]) => ({
                      criterionId: id,
                      needsReview: getNeedsReview(id, result.needsReview),
                      confidence: result.confidence,
                      reasoning: result.reasoning,
                      sources: result.sources
                    })),
                  aiAssessed: true,
                  lastUpdated: new Date().toISOString().split('T')[0]
                });
              }}
              className="px-12 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              Save & Review
            </button>
          </div>

          <div className="mt-6 p-6 bg-gray-50 border border-gray-200">
            <h3 className="text-sm font-semibold text-black mb-2">Running AI assessment for real</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>1) In `server/.env`, set `OPENAI_API_KEY=your-key` (keep it out of the frontend).</li>
              <li>2) From `server/`, run `npm install` then `npm start` (defaults to `http://localhost:3001`).</li>
              <li>3) Frontend will call `VITE_API_URL` if set (e.g., `http://localhost:3001`); otherwise it uses the default.</li>
              <li>4) Default model: `gpt-4o-mini` (approx $0.15 per 1M input tokens, $0.60 per 1M output). Full ~60-question runs typically cost only a few cents.</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};
