/**
 * Utility functions to normalize existing scores from various scales to 1-4 scale
 * This is useful for migrating existing supplier data
 */

/**
 * Normalize a score from one scale to 1-4 scale
 * @param oldValue Original score value
 * @param oldMax Maximum value in original scale (3, 4, or 5)
 * @returns Normalized score (1-4)
 */
export function normalizeScore(oldValue: number | null | undefined, oldMax: number): number | null {
  if (oldValue === null || oldValue === undefined) {
    return null;
  }
  
  if (oldMax === 4) {
    // Already on 1-4 scale
    return Math.max(1, Math.min(4, oldValue));
  }
  
  if (oldMax === 3) {
    // Convert 1-3 to 1-4: linear interpolation
    // Formula: new = 1 + (old - 1) * (3 / 2)
    const normalized = 1 + (oldValue - 1) * 1.5;
    return Math.max(1, Math.min(4, Math.round(normalized)));
  }
  
  if (oldMax === 5) {
    // Convert 1-5 to 1-4: linear interpolation
    // Formula: new = 1 + (old - 1) * (3 / 4)
    const normalized = 1 + (oldValue - 1) * 0.75;
    return Math.max(1, Math.min(4, Math.round(normalized)));
  }
  
  // For any other scale, use general linear interpolation
  const normalized = 1 + (oldValue - 1) * (3 / (oldMax - 1));
  return Math.max(1, Math.min(4, Math.round(normalized)));
}

/**
 * Normalize all scores in a supplier's score object
 * Attempts to detect the original scale for each criterion
 * @param scores Score object with criterion IDs as keys
 * @param criteriaDefinitions Optional criteria definitions to help detect scales
 * @returns Normalized score object
 */
export function normalizeSupplierScores(
  scores: Record<string, number | null>,
  criteriaDefinitions?: Record<string, { maxScore?: number }>
): Record<string, number | null> {
  const normalized: Record<string, number | null> = {};
  
  Object.entries(scores).forEach(([criterionId, score]) => {
    if (score === null || score === undefined) {
      normalized[criterionId] = null;
      return;
    }
    
    // Try to detect original scale
    let oldMax = 4; // Default assumption
    
    if (criteriaDefinitions?.[criterionId]?.maxScore) {
      oldMax = criteriaDefinitions[criterionId].maxScore;
    } else {
      // Heuristic: if score is 5, likely was 1-5 scale
      // if score is 3 and no 4 exists, might be 1-3 scale
      // For now, assume 4 if score <= 4, else 5
      oldMax = score > 4 ? 5 : 4;
    }
    
    normalized[criterionId] = normalizeScore(score, oldMax);
  });
  
  return normalized;
}

