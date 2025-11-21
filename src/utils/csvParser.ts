import Papa from 'papaparse';

export interface QuestionRow {
  CATEGORY: string;
  'SUB-CATEGORY': string;
  PRIORITY: string;
  'KEY EVALUATION QUESTIONS': string;
  'SCORING GUIDE': string;
}

export interface WeightRow {
  category: string;
  weight: number;
}

export interface CriterionOption {
  value: number;
  label: string;
}

export interface CriterionDefinition {
  category: string;
  subCategory: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  question: string;
  options: CriterionOption[];
  maxScore: number;
}

export interface CategoryWeight {
  categoryId: string;
  categoryName: string;
  weight: number;
}

/**
 * Normalize a score from one scale to 1-4 scale
 * @param oldValue Original score value
 * @param oldMax Maximum value in original scale
 * @returns Normalized score (1-4)
 */
function normalizeScore(oldValue: number, oldMax: number): number {
  // Validate inputs
  if (isNaN(oldValue) || isNaN(oldMax) || oldMax < 1 || oldValue < 1) {
    console.warn(`Invalid score values: oldValue=${oldValue}, oldMax=${oldMax}`);
    return 1; // Default to minimum score
  }
  
  if (oldMax === 4) {
    // Already on 1-4 scale
    return oldValue;
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
  if (oldMax <= 1) {
    return 1; // Can't interpolate if max is 1
  }
  const normalized = 1 + (oldValue - 1) * (3 / (oldMax - 1));
  return Math.max(1, Math.min(4, Math.round(normalized)));
}

// Parse scoring guide string into options array and normalize to 1-4 scale
function parseScoringGuide(guide: string): CriterionOption[] {
  const options: CriterionOption[] = [];
  
  // First, try splitting by newlines (for multi-line format)
  const lines = guide.split('\n').map(l => l.trim()).filter(l => l);
  
  // If we have multiple lines, process each line
  if (lines.length > 1) {
    for (const line of lines) {
      // Match patterns like "4=Label" or "4 = Label"
      const match = line.match(/^(\d+)\s*=\s*(.+)$/);
      if (match) {
        const oldValue = parseInt(match[1]);
        const label = match[2].trim();
        options.push({ value: oldValue, label });
      }
    }
  } else if (lines.length === 1) {
    // Single line - could be comma-separated format like "1=No, 2=Limited, 3=Partial, 4=Fully repairable"
    const line = lines[0];
    
    // Use regex to match all "number=label" patterns
    // Pattern: (\d+)\s*=\s* captures "number = "
    // ([^=]+?) captures the label (non-greedy, stops at next "=")
    // (?=\s*\d+\s*=|$) lookahead: stops at next "number=" or end of string
    // This correctly handles commas inside labels (e.g., "ISO 9001 (Quality Management Systems) or others")
    const pattern = /(\d+)\s*=\s*([^=]+?)(?=\s*\d+\s*=|$)/g;
    let match;
    const foundMatches: Array<{value: number, label: string}> = [];
    
    while ((match = pattern.exec(line)) !== null) {
      const oldValue = parseInt(match[1]);
      let label = match[2].trim();
      // Remove trailing comma and whitespace if present (from comma separator between options)
      label = label.replace(/,\s*$/, '').trim();
      if (label && !isNaN(oldValue) && oldValue > 0) {
        foundMatches.push({ value: oldValue, label });
      }
    }
    
    // If we found matches, use them
    if (foundMatches.length > 0) {
      options.push(...foundMatches.map(m => ({ value: m.value, label: m.label })));
    } else {
      // Fallback: try splitting by comma when followed by digit and equals
      // Split pattern: ", " or "," followed by "digit ="
      // This is a simpler approach for basic comma-separated formats
      const parts = line.split(/,\s*(?=\d+\s*=)/).map(p => p.trim()).filter(p => p);
      for (const part of parts) {
        const partMatch = part.match(/^(\d+)\s*=\s*(.+)$/);
        if (partMatch) {
          const oldValue = parseInt(partMatch[1]);
          const label = partMatch[2].trim();
          if (!isNaN(oldValue) && oldValue > 0 && label) {
            options.push({ value: oldValue, label });
          }
        }
      }
    }
  }
  
  if (options.length === 0) {
    return [];
  }
  
  // Sort by value descending (highest first) to find max
  options.sort((a, b) => b.value - a.value);
  const oldMax = options[0].value;
  
  // Normalize all options to 1-4 scale
  // Map each option with its original value for duplicate handling
  const optionsWithOriginal = options.map(opt => ({
    originalValue: opt.value,
    normalizedValue: normalizeScore(opt.value, oldMax),
    label: opt.label
  }));
  
  // Remove duplicates (in case normalization creates same values)
  // Keep the option with the highest original value for each normalized value
  const uniqueOptionsMap = new Map<number, { option: CriterionOption; originalValue: number }>();
  
  for (const opt of optionsWithOriginal) {
    const existing = uniqueOptionsMap.get(opt.normalizedValue);
    if (!existing || opt.originalValue > existing.originalValue) {
      uniqueOptionsMap.set(opt.normalizedValue, {
        option: {
          value: opt.normalizedValue,
          label: opt.label
        },
        originalValue: opt.originalValue
      });
    }
  }
  
  // Convert map to array and sort by normalized value descending
  const uniqueOptions = Array.from(uniqueOptionsMap.values()).map(item => item.option);
  return uniqueOptions.sort((a, b) => b.value - a.value);
}

// Extract category ID from category string
function extractCategoryId(category: string): string {
  const match = category.match(/^(\d+)\./);
  return match ? match[1] : '';
}

// Extract category name (without ID)
function extractCategoryName(category: string): string {
  return category.replace(/^\d+\.\s*/, '').trim();
}

// Generate criterion ID based on category, subcategory, and question index within subcategory
function generateCriterionId(categoryId: string, questionIndex: number, subCategory: string): string {
  // Try to extract pattern like "1a", "1b", "2c", etc. from subcategory
  // The subcategory already includes the category number (e.g., "1d" has "1" in it)
  const subMatch = subCategory.match(/(\d+)([a-z])/i);
  if (subMatch) {
    const subNum = categoryId || subMatch[1];
    const subLetter = subMatch[2].toLowerCase();
    // Format: subcategory.questionNumber (e.g., "1d.1", "1d.2") - no need to duplicate category
    return `${subNum}${subLetter}.${questionIndex}`;
  }
  
  // Fallback: if no pattern found, use cleaned subcategory and question index
  const cleanSub = subCategory.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) || 'q';
  const prefix = categoryId ? `${categoryId}.` : '';
  return `${prefix}${cleanSub}.${questionIndex}`;
}

const assetUrl = (file: string) => {
  // import.meta.env.BASE_URL is set by Vite and includes trailing slash (e.g., "/repo/")
  const base = (import.meta as any).env?.BASE_URL || '/';
  // Build a relative URL (safe for GitHub Pages subpaths)
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/${file}`;
};

export async function loadQuestions(): Promise<Record<string, CriterionDefinition>> {
  try {
    const response = await fetch(assetUrl('questions.csv'));
    const text = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<QuestionRow>(text, {
        header: true,
        skipEmptyLines: false, // Don't skip empty lines as they might be part of multi-line fields
        newline: '\n',
        quoteChar: '"',
        escapeChar: '"',
        transformHeader: (header) => header.trim(), // Trim whitespace from headers
        complete: (results) => {
          const criteria: Record<string, CriterionDefinition> = {};
          const categoryCounts: Record<string, number> = {};
          const subCategoryCounts: Record<string, number> = {}; // Track questions per subcategory
          
          let skippedCount = 0;
          const skippedReasons: Record<string, number> = {};
          
          results.data.forEach((row, idx) => {
            // Skip rows that are completely empty or only have whitespace
            const hasCategory = row.CATEGORY && row.CATEGORY.trim().length > 0;
            const hasQuestion = row['KEY EVALUATION QUESTIONS'] && row['KEY EVALUATION QUESTIONS'].trim().length > 0;
            
            if (!hasCategory || !hasQuestion) {
              skippedCount++;
              const reason = !hasCategory ? 'No CATEGORY' : 'No KEY EVALUATION QUESTIONS';
              skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
              if (idx < 5 || skippedCount <= 3) {
                console.debug(`Skipping row ${idx + 1}: ${reason}`, { category: row.CATEGORY?.substring(0, 50), question: row['KEY EVALUATION QUESTIONS']?.substring(0, 50) });
              }
              return;
            }
            
            const categoryId = extractCategoryId(row.CATEGORY);
            if (!categoryId) {
              skippedCount++;
              skippedReasons['No category ID'] = (skippedReasons['No category ID'] || 0) + 1;
              console.warn(`Skipped row ${idx + 1}: No category ID found`, row.CATEGORY);
              return;
            }
            
            const categoryName = extractCategoryName(row.CATEGORY);
            const priority = (row.PRIORITY || 'MEDIUM').toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
            const question = row['KEY EVALUATION QUESTIONS'].trim();
            const scoringGuide = row['SCORING GUIDE'] || '';
            
            const options = parseScoringGuide(scoringGuide);
            if (options.length === 0) {
              // If no options parsed, create default 1-4 scale
              console.warn(`No options parsed for question: ${question.substring(0, 50)}... Using default options.`);
              options.push(
                { value: 4, label: 'Excellent' },
                { value: 3, label: 'Good' },
                { value: 2, label: 'Fair' },
                { value: 1, label: 'Poor' }
              );
            }
            
            // Validate all options have valid values
            const validOptions = options.filter(opt => typeof opt.value === 'number' && !isNaN(opt.value) && opt.value >= 1 && opt.value <= 4);
            if (validOptions.length === 0) {
              console.error(`No valid options for question: ${question.substring(0, 50)}...`);
              skippedCount++;
              skippedReasons['No valid options'] = (skippedReasons['No valid options'] || 0) + 1;
              return;
            }
            
            // All scores are now normalized to 1-4, so maxScore is always 4
            const maxScore = 4;
            
            // Generate unique ID - use sequential numbering within each subcategory
            const subCategory = row['SUB-CATEGORY'] || '';
            const subCategoryKey = `${categoryId}-${subCategory}`;
            
            if (!subCategoryCounts[subCategoryKey]) {
              subCategoryCounts[subCategoryKey] = 0;
            }
            subCategoryCounts[subCategoryKey]++;
            
            // Also track category counts for backward compatibility
            if (!categoryCounts[categoryId]) {
              categoryCounts[categoryId] = 0;
            }
            categoryCounts[categoryId]++;
            
            // Generate ID: category.subcategory.questionNumber (e.g., "1.1d.1", "1.1d.2")
            const criterionId = generateCriterionId(categoryId, subCategoryCounts[subCategoryKey], subCategory);
            
            criteria[criterionId] = {
              category: categoryName,
              subCategory: row['SUB-CATEGORY'] || '',
              priority,
              question,
              options: validOptions,
              maxScore
            };
          });
          
          if (skippedCount > 0) {
            console.warn(`Skipped ${skippedCount} rows during parsing. Reasons:`, skippedReasons);
          }
          
          const totalLoaded = Object.keys(criteria).length;
          console.log(`Successfully loaded ${totalLoaded} questions from CSV (out of ${results.data.length} total rows)`);
          if (totalLoaded < 60) {
            console.warn(`Expected ~68 questions but only loaded ${totalLoaded}. Check CSV parsing.`);
            console.warn(`Total rows parsed: ${results.data.length}, Skipped: ${skippedCount}, Loaded: ${totalLoaded}`);
          }
          
          resolve(criteria);
        },
        error: (error: unknown) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading questions:', error);
    throw error;
  }
}

export async function loadWeights(): Promise<Record<string, number>> {
  try {
    const response = await fetch(assetUrl('weights.csv'));
    const text = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<WeightRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const weights: Record<string, number> = {};
          
          results.data.forEach((row) => {
            if (!row.category) return;
            const categoryId = extractCategoryId(row.category);
            if (categoryId) {
              weights[categoryId] = parseFloat(String(row.weight)) || 0;
            }
          });
          
          resolve(weights);
        },
        error: (error: unknown) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading weights:', error);
    throw error;
  }
}

export function getCategoryWeights(weights: Record<string, number>): CategoryWeight[] {
  const categoryNames: Record<string, string> = {
    '1': 'Material Sourcing',
    '2': 'Operational Practices & Resource Efficiency',
    '3': 'Product Design & Lifecycle',
    '4': 'Commitment & Collaboration',
    '5': 'Compliance & Governance',
    '6': 'Overall Performance & References'
  };
  
  return Object.entries(weights).map(([categoryId, weight]) => ({
    categoryId,
    categoryName: categoryNames[categoryId] || `Category ${categoryId}`,
    weight
  }));
}
