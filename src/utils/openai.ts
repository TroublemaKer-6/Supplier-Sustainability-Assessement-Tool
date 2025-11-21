// OpenAI API integration placeholder
// Replace this with actual OpenAI API calls when ready

import { loadSettings } from './storage';
import { CriterionDefinition } from './csvParser';

export interface AIAssessmentRequest {
  supplierName: string;
  location?: string;
  materials?: string[];
  website?: string;
  uploadedDocs?: string[];
  additionalNotes?: string;
}

export interface AIAssessmentResult {
  criterionId: string;
  score: number | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  sources: string[];
  needsReview: boolean;
}

export interface AIAssessmentResponse {
  results: Record<string, AIAssessmentResult>;
  totalCost?: number;
  totalCalls?: number;
}

/**
 * Placeholder for OpenAI API integration
 * 
 * TODO: Replace this function with actual OpenAI API calls
 * 
 * Steps to implement:
 * 1. Get API key from settings: loadSettings().openaiApiKey
 * 2. For each criterion, make an API call to OpenAI with:
 *    - The question text
 *    - Supplier information
 *    - Web search context (if available)
 *    - Uploaded documents (if any)
 * 3. Parse the response to extract score and reasoning
 * 4. Return structured results
 * 
 * Example implementation:
 * ```typescript
 * import OpenAI from 'openai';
 * 
 * const settings = loadSettings();
 * if (!settings.openaiApiKey) {
 *   throw new Error('OpenAI API key not configured');
 * }
 * 
 * const openai = new OpenAI({
 *   apiKey: settings.openaiApiKey,
 *   dangerouslyAllowBrowser: true // Only for client-side, consider using a backend proxy
 * });
 * 
 * // Make API calls for each criterion
 * // ...
 * ```
 * 
 * Note: For production, consider using a backend proxy to keep API keys secure
 */
/**
 * Run AI assessment via backend API
 * The API key is stored securely on the backend server
 */
export async function runAIAssessment(
  request: AIAssessmentRequest,
  criteria: Record<string, CriterionDefinition>
): Promise<AIAssessmentResponse> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${API_URL}/api/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplierName: request.supplierName,
        location: request.location,
        materials: request.materials,
        website: request.website,
        additionalNotes: request.additionalNotes,
        criteria: criteria
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results,
      totalCost: data.totalCost,
      totalCalls: data.totalCalls
    };
  } catch (error: any) {
    // Check if it's a network error (backend not running)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend server. Make sure the server is running on port 3001.');
    }
    throw error;
  }
}


