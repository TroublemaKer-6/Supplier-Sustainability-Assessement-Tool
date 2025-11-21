import { useState } from 'react';
import { ChevronRight, Edit, XCircle, AlertCircle } from 'lucide-react';
import { Supplier } from '../utils/storage';
import { CriterionDefinition } from '../utils/csvParser';
import { calculateAllScores } from '../utils/scoring';

interface ReportViewProps {
  supplier: Supplier;
  criteriaDefinitions: Record<string, CriterionDefinition>;
  categoryWeights: Record<string, number>;
  onEdit: () => void;
  onBack: () => void;
}

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

export const ReportView = ({
  supplier,
  criteriaDefinitions,
  categoryWeights,
  onEdit,
  onBack
}: ReportViewProps) => {
  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'NEEDS_REVIEW' | 'NO_SCORE'>('ALL');

  // Calculate all scores
  const scoreCalculation = calculateAllScores(supplier.scores, categoryWeights, criteriaDefinitions);

  // Group criteria by category
  const groupedCriteria: Record<string, Array<[string, CriterionDefinition]>> = {};
  Object.entries(criteriaDefinitions).forEach(([id, criterion]) => {
    if (!groupedCriteria[criterion.category]) {
      groupedCriteria[criterion.category] = [];
    }
    groupedCriteria[criterion.category].push([id, criterion]);
  });

  // Calculate category breakdowns
  const categoryBreakdowns: Record<string, {
    answered: number;
    total: number;
    averageScore: number;
    weightedScore: number;
  }> = {};

  Object.entries(groupedCriteria).forEach(([categoryName, criteria]) => {
    const categoryId = categoryName.match(/^(\d+)/)?.[1] || '';
    // Get scores for this category - only include answered questions
    const categoryScores = criteria
      .map(([id]) => supplier.scores[id])
      .filter((score): score is number => score !== null && score !== undefined);
    
    const answered = categoryScores.length;
    const total = criteria.length;
    // Calculate average of only answered questions in this category
    const averageScore = answered > 0 
      ? categoryScores.reduce((sum, score) => sum + score, 0) / answered 
      : 0;
    const weightedScore = averageScore * (categoryWeights[categoryId] || 0);

    categoryBreakdowns[categoryName] = {
      answered,
      total,
      averageScore,
      weightedScore
    };
  });

  // Get score label for display
  const getScoreLabel = (score: number | null): string => {
    if (score === null || score === undefined) return 'No score';
    if (score >= 3.5) return 'Excellent';
    if (score >= 2.5) return 'Good';
    if (score >= 1.5) return 'Fair';
    return 'Poor';
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-blue-600';
    if (score >= 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Count questions by status
  const totalQuestions = Object.keys(criteriaDefinitions).length;
  let completedCount = 0;
  let needsReviewCount = 0;
  let noScoreCount = 0;
  
  // Count questions that have scores
  Object.entries(supplier.scores).forEach(([criterionId, score]) => {
    const hasScore = score !== null && score !== undefined;
    if (!hasScore) {
      noScoreCount++;
      return;
    }
    
    // Check if this question needs review
    const aiFlag = supplier.aiFlags?.find((flag: any) => flag.criterionId === criterionId);
    const needsReview = aiFlag?.needsReview || false;
    
    if (needsReview) {
      needsReviewCount++;
    } else {
      completedCount++;
    }
  });
  
  // Count questions that don't have any score entry (not in supplier.scores)
  const questionsWithNoEntry = totalQuestions - Object.keys(supplier.scores).length;
  noScoreCount += questionsWithNoEntry;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={onBack} 
          className="text-sm text-black mb-6 hover:underline flex items-center"
        >
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Back to Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-light text-black mb-3">{supplier.name}</h1>
            <div className="h-px bg-black w-24 mb-4"></div>
            <div className="space-y-2 text-sm text-gray-600">
              {supplier.location && (
                <div>Location: <span className="text-black">{supplier.location}</span></div>
              )}
              {supplier.distance > 0 && (
                <div>Distance: <span className="text-black">{supplier.distance} km</span></div>
              )}
              {supplier.contactEmail && (
                <div>Email: <span className="text-black">{supplier.contactEmail}</span></div>
              )}
              <div>Last Updated: <span className="text-black">{supplier.lastUpdated}</span></div>
              {supplier.aiAssessed && (
                <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs uppercase">
                  AI Assessed
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Score Summary */}
      <section className="mb-12 p-6 bg-gray-50 border border-gray-200">
        <h2 className="text-2xl font-light text-black mb-6">Score Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white border-2 border-black">
            <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Score</div>
            <div className="text-4xl font-light text-black mb-1">
              {scoreCalculation.weightedScore.toFixed(2)}
              <span className="text-2xl text-gray-400"> / 4</span>
            </div>
            <div className={`text-sm ${getScoreColor(scoreCalculation.weightedScore)}`}>
              {getScoreLabel(scoreCalculation.weightedScore)}
            </div>
          </div>
          <div className="p-4 bg-white border-2 border-black">
            <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Completion</div>
            <div className="text-4xl font-light text-black mb-1">
              {completedCount}
              <span className="text-2xl text-gray-400"> / {totalQuestions}</span>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              {Math.round((completedCount / totalQuestions) * 100)}% completed
            </div>
            <div className="space-y-1.5">
              {needsReviewCount > 0 && (
                <div className="text-xs text-yellow-600">
                  {needsReviewCount} needs review
                </div>
              )}
              {noScoreCount > 0 && (
                <div className="text-xs text-gray-500">
                  {noScoreCount} no score
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="mb-12">
        <h2 className="text-2xl font-light text-black mb-6">Category Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(categoryBreakdowns).map(([categoryName, breakdown]) => {
            // Use the average score from breakdown (which only includes answered questions)
            const categoryScore = breakdown.averageScore;
            const displayName = cleanCategoryName(categoryName);
            
            return (
              <div key={categoryName} className="p-4 bg-white border border-gray-200">
                <div className="flex flex-col items-start">
                  <h3 className="text-sm font-light text-gray-600 mb-2">{displayName}</h3>
                  <div className="text-2xl font-light text-black">
                    {breakdown.answered > 0 ? categoryScore.toFixed(1) : '-'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Materials & Certifications */}
      {(supplier.materials.length > 0 || supplier.certifications.length > 0) && (
        <section className="mb-12">
          <h2 className="text-2xl font-light text-black mb-6">Materials & Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {supplier.materials.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wide text-gray-600 mb-3">Materials</h3>
                <div className="flex flex-wrap gap-2">
                  {supplier.materials.map(material => (
                    <span key={material} className="px-3 py-1.5 bg-black text-white text-sm">
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {supplier.certifications.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wide text-gray-600 mb-3">Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {supplier.certifications.map(cert => (
                    <span key={cert} className="px-3 py-1.5 bg-green-50 text-green-800 text-sm border border-green-200">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detailed Assessment Results */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-black">Detailed Assessment</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-600 mr-2">Filter by Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'COMPLETED' | 'NEEDS_REVIEW' | 'NO_SCORE')}
              className="px-3 py-1.5 text-xs border-2 border-gray-300 focus:border-black focus:outline-none bg-white"
            >
              <option value="ALL">All</option>
              <option value="COMPLETED">Completed</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="NO_SCORE">No Score</option>
            </select>
          </div>
        </div>
        
        {Object.entries(groupedCriteria).map(([categoryName, criteria]) => {
          // Filter criteria based on status filter
          const filteredCriteria = criteria.filter(([criterionId]) => {
            if (statusFilter === 'ALL') return true;
            const score = supplier.scores[criterionId];
            const hasScore = score !== null && score !== undefined;
            const aiFlag = supplier.aiFlags?.find((flag: any) => flag.criterionId === criterionId);
            const needsReview = aiFlag?.needsReview || false;
            const status = hasScore ? (needsReview ? 'NEEDS_REVIEW' : 'COMPLETED') : 'NO_SCORE';
            return status === statusFilter;
          });

          // Don't show category if no criteria match the filter
          if (filteredCriteria.length === 0 && statusFilter !== 'ALL') {
            return null;
          }

          return (
            <div key={categoryName} className="mb-12">
              <div className="mb-6 pb-3 border-b-2 border-black">
                <h3 className="text-2xl font-light text-black">{cleanCategoryName(categoryName)}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  {statusFilter === 'ALL' 
                    ? `${categoryBreakdowns[categoryName]?.answered || 0} of ${criteria.length} questions answered`
                    : `${filteredCriteria.length} question${filteredCriteria.length !== 1 ? 's' : ''} shown (${statusFilter})`
                  }
                </div>
              </div>
              
              <div className="space-y-6">
                {filteredCriteria.map(([criterionId, criterion]) => {
                  const score = supplier.scores[criterionId];
                  const notes = supplier.additionalNotes?.[criterionId] || '';
                  const hasScore = score !== null && score !== undefined;
                  const aiFlag = supplier.aiFlags?.find((flag: any) => flag.criterionId === criterionId);
                  const needsReview = aiFlag?.needsReview || false;
                  const status = hasScore ? (needsReview ? 'NEEDS_REVIEW' : 'COMPLETED') : 'NO_SCORE';
                  
                  return (
                    <div key={criterionId} className="pb-6 border-b border-gray-200 last:border-0" data-status={status}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono">
                              {criterionId}
                            </span>
                            <span className={`text-xs uppercase px-2 py-0.5 ${
                              criterion.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 
                              criterion.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {criterion.priority}
                            </span>
                            {needsReview && (
                              <span className="text-xs uppercase px-2 py-0.5 bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Needs Review
                              </span>
                            )}
                            {criterion.subCategory && (
                              <span className="text-xs text-gray-500">{criterion.subCategory}</span>
                            )}
                          </div>
                          <p className="text-base text-black mb-3">{criterion.question}</p>
                        </div>
                        <div className="ml-4 text-right">
                          {hasScore ? (
                            <div>
                              <div className={`text-3xl font-light ${getScoreColor(score)}`}>
                                {score}
                                <span className="text-xl text-gray-400"> / 4</span>
                              </div>
                              <div className={`text-xs mt-1 ${getScoreColor(score)}`}>
                                {getScoreLabel(score)}
                              </div>
                              {/* Show selected option label */}
                              {criterion.options.find(opt => opt.value === score) && (
                                <div className="text-xs text-gray-500 mt-1 max-w-[150px]">
                                  {criterion.options.find(opt => opt.value === score)?.label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              <XCircle className="w-6 h-6 mx-auto mb-1" />
                              <div className="text-xs">No score</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {notes && (
                        <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-400">
                          <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Notes</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">
                            {notes.split('\n').map((line, idx) => {
                              // Check if line contains a URL
                              const urlRegex = /(https?:\/\/[^\s]+)/g;
                              const parts = line.split(urlRegex);
                              return (
                                <div key={idx}>
                                  {parts.map((part, partIdx) => {
                                    // Check if part is a URL
                                    if (/^https?:\/\//.test(part)) {
                                      return (
                                        <a
                                          key={partIdx}
                                          href={part}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {part}
                                        </a>
                                      );
                                    }
                                    return <span key={partIdx}>{part}</span>;
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-300">
        <button
          onClick={onBack}
          className="px-8 py-3 border-2 border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase"
        >
          Back to Dashboard
        </button>
        <button
          onClick={onEdit}
          className="px-8 py-3 bg-black text-white text-xs uppercase hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Assessment
        </button>
      </div>
    </div>
  );
};
