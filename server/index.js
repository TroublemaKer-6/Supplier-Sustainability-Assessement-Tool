/**
 * Simple Backend Server for OpenAI API Integration
 * This keeps the API key secure on the server side
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables!');
  console.error('Please create a .env file with your OpenAI API key.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// AI Assessment endpoint
app.post('/api/assess', async (req, res) => {
  try {
    const { supplierName, location, materials, website, additionalNotes, criteria } = req.body;

    if (!supplierName) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    // Build context for AI
    let context = `Supplier Information:\n`;
    context += `- Name: ${supplierName}\n`;
    if (location) context += `- Location: ${location}\n`;
    if (materials && materials.length > 0) {
      context += `- Materials: ${materials.join(', ')}\n`;
    }
    if (website) context += `- Website: ${website}\n`;
    if (additionalNotes) context += `- Additional Notes: ${additionalNotes}\n`;

    const results = {};

    let totalTokens = 0;

    // Process each criterion
    for (const [criterionId, criterion] of Object.entries(criteria)) {
      try {
        const prompt = `You are evaluating a supplier for sustainability practices.

${context}

Question: ${criterion.question}

Scoring Options:
${criterion.options.map(opt => `- ${opt.value}: ${opt.label}`).join('\n')}

IMPORTANT INSTRUCTIONS:
- Only provide a score if you find ACTUAL, VERIFIABLE information about this supplier online
- If you cannot find any information about this supplier online, return score as null
- DO NOT make up or guess scores based on assumptions
- DO NOT generate random scores if no information is available
- For sources, provide specific URLs, document links, or page references when available
- Include links to specific sections of websites, PDFs, or reports when possible
- Format sources as: "https://example.com/page#section" or "Company Sustainability Report 2023, page 12" or "https://example.com/certification.pdf"

Based on publicly available information about this supplier, provide:
1. A score (1-${criterion.maxScore}) that best matches their performance, OR null if no information found
2. A brief reasoning (2-3 sentences). If no information found, state "No information found online about this supplier regarding [topic]"
3. Confidence level (high/medium/low). Use "low" if no information found
4. List specific sources with URLs/links when available, or ["Not found online"] if no information

Respond in JSON format:
{
  "score": <number or null if no information found>,
  "reasoning": "<brief explanation or 'No information found online about this supplier regarding [topic]'>",
  "confidence": "<high|medium|low>",
  "sources": ["<url or specific source>", "<another source>"]
}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Using cheaper model, can upgrade to gpt-4 if needed
          messages: [
            {
              role: 'system',
              content: 'You are an expert sustainability assessor. Provide accurate, evidence-based evaluations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent results
          response_format: { type: 'json_object' }
        });

        if (completion.usage) {
          totalTokens += completion.usage.total_tokens || 0;
        }

        const responseText = completion.choices[0].message.content;
        const assessment = JSON.parse(responseText);

        results[criterionId] = {
          criterionId,
          score: assessment.score,
          confidence: assessment.confidence || 'medium',
          reasoning: assessment.reasoning || 'No reasoning provided',
          sources: assessment.sources || [],
          needsReview: assessment.score === null || assessment.confidence === 'low'
        };

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing criterion ${criterionId}:`, error);
        results[criterionId] = {
          criterionId,
          score: null,
          confidence: 'low',
          reasoning: `Error assessing this criterion: ${error.message}`,
          sources: [],
          needsReview: true
        };
      }
    }

    // Calculate cost (gpt-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens)
    // Simplified calculation using average
    const estimatedCost = (totalTokens / 1000000) * 0.15;

    res.json({
      results,
      totalCost: estimatedCost,
      totalCalls: Object.keys(criteria).length,
      totalTokens
    });
  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({ 
      error: 'Failed to complete assessment',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure OPENAI_API_KEY is set in .env file`);
});

