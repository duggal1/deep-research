import FirecrawlApp from 'firecrawl';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the clients
const firecrawl = new FirecrawlApp({ 
  apiKey: process.env.NEW_FIRECRAWL_API_KEY || 'fc-3b7cf5e06c444ecfb88f2e0ada9d5966' 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Default research parameters
const DEFAULT_PARAMS = {
  maxDepth: 5,  // Max allowed by API is 12
  timeLimit: 90,
  maxUrls: 20,
  fullContent: true  // Request full content when possible
};

// API limits
const API_LIMITS = {
  maxDepth: 5,
  timeLimit: 90,
  maxUrls: 20
};

const GEMINI_CONFIG = {
  model: "gemini-2.0-flash",
  temperature: 0.3,
  maxTokens: 3000,
  topK: 40,
  topP: 0.95
};

export interface ResearchParams {
  maxDepth?: number;
  timeLimit?: number;
  maxUrls?: number;
  fullContent?: boolean;
}

export interface ResearchActivity {
  type: string;
  message: string;
  timestamp?: string;
  status?: string;
  depth?: number;
}

export interface Source {
  url: string;
  title: string;
  content: string;
  relevance: number;
  description?: string;
  geminiAnalysis?: string;
}

export interface ResearchResult {
  jobId: string;
  status: string;
  data: {
    finalAnalysis: string;
    sources: Source[];
    activities: ResearchActivity[];
  };
  currentDepth?: number;
  maxDepth?: number;
  expiresAt?: string;
}

// Firecrawl API response types - updated to match actual API responses
interface FirecrawlSource {
  url: string;
  title?: string;
  content?: string;
  relevance?: number;
  description?: string;
}

interface FirecrawlData {
  finalAnalysis?: string;
  sources?: FirecrawlSource[];
  activities?: ResearchActivity[];
}

interface FirecrawlSuccessResponse {
  id?: string;
  jobId?: string;
  status?: string;
  data?: FirecrawlData;
  sources?: FirecrawlSource[];
  activities?: ResearchActivity[];
  finalAnalysis?: string;
  currentDepth?: number;
  maxDepth?: number;
  expiresAt?: string;
}

interface FirecrawlErrorResponse {
  error: string;
}

type FirecrawlResponse = FirecrawlSuccessResponse | FirecrawlErrorResponse;

function isFirecrawlError(response: any): response is FirecrawlErrorResponse {
  return response && typeof response === 'object' && 'error' in response;
}

function isFirecrawlSuccess(response: any): response is FirecrawlSuccessResponse {
  return response && typeof response === 'object' && !isFirecrawlError(response);
}

// Gemini Analysis - Process all sources in a single call
async function analyzeAllSourcesWithGemini(sources: any[], query: string): Promise<Record<string, string>> {
  try {
    if (sources.length === 0) {
      return {};
    }

    // Create a combined prompt with all sources
    let combinedPrompt = `Analyze the following web sources in relation to the query: "${query}"\n\n`;
    
    // Process each source to build the prompt
    sources.forEach((source, index) => {
      // Skip sources with no content
      const contentToAnalyze = source.content || source.description || '';
      if (contentToAnalyze.length < 50) {
        return;
      }
      
      // Add source info with clear separation
      combinedPrompt += `\n--- SOURCE ${index + 1} ---\n`;
      combinedPrompt += `URL: ${source.url}\n`;
      combinedPrompt += `TITLE: ${source.title || 'Untitled'}\n`;
      combinedPrompt += `CONTENT: ${contentToAnalyze.substring(0, 1000)}...\n`;
    });
    
    combinedPrompt += `\nFor each source, provide:
1. Key insights relevant to the query
2. Relevance to query (high/medium/low)
3. Main takeaways

Format your response as follows:
SOURCE 1:
[Your analysis here]

SOURCE 2:
[Your analysis here]

Continue for all sources...`;

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.model });
    
    // Implement retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds initial delay

    // Make a single call to Gemini
    let analysisText;
    while (true) {
      try {
        const result = await model.generateContent([combinedPrompt]);
        analysisText = result.response.text();
        break;
      } catch (err: any) {
        if (err?.status === 429 && retries < maxRetries) {
          // Rate limit hit, implement exponential backoff
          retries++;
          const delay = baseDelay * Math.pow(2, retries);
          console.log(`Gemini rate limit hit, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // If it's not a rate limit or we've exhausted retries, throw the error
        throw err;
      }
    }
    
    // Parse the response to extract individual source analyses
    const sourceAnalyses: Record<string, string> = {};
    
    if (!analysisText) {
      return sourceAnalyses;
    }
    
    // Split by source markers and assign to each source URL
    const analysisBlocks = analysisText.split(/SOURCE \d+:/);
    analysisBlocks.shift(); // Remove anything before the first source
    
    sources.forEach((source, index) => {
      if (index < analysisBlocks.length) {
        sourceAnalyses[source.url] = analysisBlocks[index].trim();
      } else {
        sourceAnalyses[source.url] = "No analysis available for this source.";
      }
    });
    
    return sourceAnalyses;
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    
    // Create a default response map for all sources
    const defaultAnalysis = `Analysis unavailable: ${error.message || 'API error'}. Please try again later.`;
    const sourceAnalyses: Record<string, string> = {};
    
    sources.forEach(source => {
      sourceAnalyses[source.url] = defaultAnalysis;
    });
    
    return sourceAnalyses;
  }
}

// Process sources with a single Gemini call
async function processSources(sources: any[], query: string): Promise<any[]> {
  try {
    // Skip processing if no sources
    if (sources.length === 0) {
      return [];
    }
    
    console.log(`Processing ${sources.length} sources with a single Gemini call`);
    
    // Get analysis for all sources in one call
    const sourceAnalyses = await analyzeAllSourcesWithGemini(sources, query);
    
    // Enhance each source with its analysis
    const enhancedSources = sources.map((source: any) => {
      // Try to ensure we have some content for analysis
      let sourceContent = source.content || source.description || '';
      
      // If we still don't have content, add a placeholder
      if (!sourceContent) {
        console.log(`No content available for source: ${source.url}`);
      }
      
      return {
        url: source.url || '',
        title: source.title || 'Untitled',
        content: sourceContent,
        relevance: source.relevance || 0,
        description: source.description || '',
        geminiAnalysis: sourceAnalyses[source.url] || "No analysis available for this source."
      };
    });
    
    return enhancedSources;
  } catch (error) {
    console.error('Error processing sources:', error);
    
    // Return sources without analysis in case of error
    return sources.map((source: any) => ({
      url: source.url || '',
      title: source.title || 'Untitled',
      content: source.content || source.description || '',
      relevance: source.relevance || 0,
      description: source.description || '',
      geminiAnalysis: "Analysis failed due to an error."
    }));
  }
}

/**
 * Extract all URLs from a research result
 * Returns an array of source URLs with their metadata
 */
export function extractResearchLinks(researchResult: FirecrawlResponse | ResearchResult): Array<{url: string, title: string, description?: string}> {
  if (isFirecrawlError(researchResult)) {
    return [];
  }

  // Extract sources according to different possible response formats
  const sources: Array<any> = [];
  
  // Check all possible locations for sources
  if (Array.isArray(researchResult.data?.sources)) {
    sources.push(...researchResult.data.sources);
  }
  
  // Check for sources at the top level (only in FirecrawlSuccessResponse)
  if ('sources' in researchResult && Array.isArray(researchResult.sources)) {
    sources.push(...researchResult.sources);
  }
  
  // Format and return the URLs with metadata
  return sources.map(source => ({
    url: source.url || '',
    title: source.title || 'Untitled',
    description: source.description || ''
  }));
}

// Main deep research function
export async function performDeepResearch(
  query: string,
  params: ResearchParams = {}
): Promise<ResearchResult> {
  try {
    // Merge default params with provided params
    let researchParams = {
      ...DEFAULT_PARAMS,
      ...params
    };

    // Ensure parameters are within API limits
    researchParams = {
      ...researchParams,
      maxDepth: Math.min(researchParams.maxDepth || DEFAULT_PARAMS.maxDepth, API_LIMITS.maxDepth),
      timeLimit: Math.min(researchParams.timeLimit || DEFAULT_PARAMS.timeLimit, API_LIMITS.timeLimit),
      maxUrls: Math.min(researchParams.maxUrls || DEFAULT_PARAMS.maxUrls, API_LIMITS.maxUrls),
    };

    console.log("Using research parameters:", researchParams);

    // Activity logging function
    const onActivity = (activity: ResearchActivity) => {
      console.log(`[${activity.type}] ${activity.message}`);
    };

    // Start the research
    console.log("Starting deep research with query:", query);
    const rawResults = await firecrawl.deepResearch(
      query,
      researchParams,
      onActivity
    ) as FirecrawlSuccessResponse;
    
    console.log("Raw API response:", JSON.stringify(rawResults, null, 2).substring(0, 500));

    if (isFirecrawlError(rawResults)) {
      throw new Error(rawResults.error);
    }

    // Get jobId from response
    const jobId = rawResults.id || rawResults.jobId || 'direct-response';
    
    // Get status - default to 'completed' if processing was synchronous
    const status = rawResults.status || 'completed';
    
    // Extract sources and activities from the response, handling different formats
    const sources = Array.isArray(rawResults.data?.sources) 
      ? rawResults.data.sources 
      : Array.isArray(rawResults.sources) 
        ? rawResults.sources 
        : [];
        
    const activities = Array.isArray(rawResults.data?.activities) 
      ? rawResults.data.activities 
      : Array.isArray(rawResults.activities) 
        ? rawResults.activities 
        : [];
        
    const finalAnalysis = rawResults.data?.finalAnalysis || 
                          rawResults.finalAnalysis || '';

    // Process all sources with a single Gemini call
    const enhancedSources = await processSources(sources, query);

    // Construct final result with proper typing
    const result: ResearchResult = {
      jobId,
      status,
      data: {
        finalAnalysis,
        sources: enhancedSources,
        activities
      },
      currentDepth: rawResults.currentDepth,
      maxDepth: rawResults.maxDepth,
      expiresAt: rawResults.expiresAt
    };

    return result;
  } catch (error) {
    console.error('Deep research error:', error);
    throw error;
  }
}

// Check research status
export async function checkResearchStatus(jobId: string): Promise<ResearchResult> {
  try {
    const rawStatus = await firecrawl.checkDeepResearchStatus(jobId) as FirecrawlSuccessResponse;
    console.log("Status API response:", JSON.stringify(rawStatus, null, 2).substring(0, 500));
    
    if (isFirecrawlError(rawStatus)) {
      throw new Error(rawStatus.error);
    }

    // Get status - default to 'pending' if not provided
    const status = rawStatus.status || 'pending';
    
    // Extract sources and activities from the response, handling different formats
    const sources = Array.isArray(rawStatus.data?.sources) 
      ? rawStatus.data.sources 
      : Array.isArray(rawStatus.sources) 
        ? rawStatus.sources 
        : [];
        
    const activities = Array.isArray(rawStatus.data?.activities) 
      ? rawStatus.data.activities 
      : Array.isArray(rawStatus.activities) 
        ? rawStatus.activities 
        : [];
        
    const finalAnalysis = rawStatus.data?.finalAnalysis || 
                           rawStatus.finalAnalysis || '';

    // Add Gemini analysis to completed research
    if (status === 'completed' && sources.length > 0) {
      // Process all sources with a single Gemini call
      const enhancedSources = await processSources(sources, '');

      // Construct properly typed result
      const result: ResearchResult = {
        jobId,
        status,
        data: {
          finalAnalysis,
          sources: enhancedSources,
          activities
        },
        currentDepth: rawStatus.currentDepth,
        maxDepth: rawStatus.maxDepth,
        expiresAt: rawStatus.expiresAt
      };

      return result;
    }

    // If not completed, return as is with proper typing
    return {
      jobId,
      status,
      data: {
        finalAnalysis,
        sources: [],
        activities
      },
      currentDepth: rawStatus.currentDepth,
      maxDepth: rawStatus.maxDepth,
      expiresAt: rawStatus.expiresAt
    };
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
} 