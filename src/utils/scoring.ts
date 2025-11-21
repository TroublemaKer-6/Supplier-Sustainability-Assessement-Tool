// Scoring utilities with weight support

import { CriterionDefinition } from './csvParser';

export interface ScoreCalculation {
  totalScore: number;
  weightedScore: number;
  categoryScores: Record<string, number>;
  weightedCategoryScores: Record<string, number>;
}

/**
 * Calculate total score (simple average)
 */
export function calculateTotalScore(
  scores: Record<string, number | null>,
  criteria?: Record<string, CriterionDefinition>
): number {
  const validScores = Object.entries(scores)
    .filter(([id, score]) => {
      if (score === null || score === undefined) return false;
      if (criteria && criteria[id]) {
        return score >= 1 && score <= criteria[id].maxScore;
      }
      return score >= 1 && score <= 4;
    })
    .map(([, score]) => score as number);
  
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return sum / validScores.length;
}

/**
 * Calculate category score (average of all criteria in category)
 */
export function getCategoryScore(
  scores: Record<string, number | null>,
  categoryId: string,
  criteria?: Record<string, CriterionDefinition>
): number {
  const categoryScores = Object.entries(scores)
    .filter(([key, value]) => {
      // Filter out null/undefined scores
      if (value === null || value === undefined) return false;
      
      // Match category ID from criterion ID
      // New format: "1d.1", "1d.2" - extract first digit(s) which is the category
      // Old format: "1.1", "1.2" - also extract first digit(s)
      const match = key.match(/^(\d+)/);
      if (match && match[1] === categoryId) {
        return true;
      }
      
      // Also check if criteria is provided and match by category name
      if (criteria && criteria[key]) {
        const criterionCategoryId = criteria[key].category.match(/^(\d+)/)?.[1];
        return criterionCategoryId === categoryId;
      }
      
      return false;
    })
    .map(([, value]) => value as number);
  
  if (categoryScores.length === 0) return 0;
  const total = categoryScores.reduce((sum, score) => sum + score, 0);
  return total / categoryScores.length;
}

/**
 * Calculate weighted total score using category weights
 */
export function calculateWeightedScore(
  scores: Record<string, number | null>,
  weights: Record<string, number>,
  criteria?: Record<string, CriterionDefinition>
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(weights).forEach(([categoryId, weight]) => {
    const categoryScore = getCategoryScore(scores, categoryId, criteria);
    if (categoryScore > 0) {
      weightedSum += categoryScore * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate all scores (total, weighted, category breakdowns)
 */
export function calculateAllScores(
  scores: Record<string, number | null>,
  weights: Record<string, number>,
  criteria?: Record<string, CriterionDefinition>
): ScoreCalculation {
  const categoryScores: Record<string, number> = {};
  const weightedCategoryScores: Record<string, number> = {};
  
  Object.keys(weights).forEach(categoryId => {
    const categoryScore = getCategoryScore(scores, categoryId, criteria);
    categoryScores[categoryId] = categoryScore;
    weightedCategoryScores[categoryId] = categoryScore * weights[categoryId];
  });
  
  const totalScore = calculateTotalScore(scores, criteria);
  const weightedScore = calculateWeightedScore(scores, weights, criteria);
  
  return {
    totalScore,
    weightedScore,
    categoryScores,
    weightedCategoryScores
  };
}

/**
 * Normalize weights to sum to 1.0
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total === 0) return weights;
  
  const normalized: Record<string, number> = {};
  Object.entries(weights).forEach(([key, value]) => {
    normalized[key] = value / total;
  });
  
  return normalized;
}

