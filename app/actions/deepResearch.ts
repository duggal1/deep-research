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

// Update to higher token limit and better temperature for detailed analysis
const GEMINI_CONFIG = {
  model: "gemini-2.0-flash",
  temperature: 0.4,
  maxTokens: 8000,  
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
  markdown?: string;   // Add markdown content property
  html?: string;       // Add HTML content property
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
    let combinedPrompt = `You are a research assistant providing detailed analysis. 
Analyze the following web sources in relation to the query: "${query}"

IMPORTANT: Provide comprehensive, detailed analyses with multiple paragraphs for each source. Include as much relevant information as possible.
\n\n`;
    
    // Filter sources that have enough content to analyze
    const sourcesWithContent = sources.filter(source => {
      const content = source.processedContent || source.content || source.description || '';
      return content.length >= 50;
    });
    
    console.log(`Analyzing ${sourcesWithContent.length} sources out of ${sources.length} total sources`);
    
    // Process each source to build the prompt
    sourcesWithContent.forEach((source, index) => {
      const contentToAnalyze = source.processedContent || source.content || source.description || '';
      
      // Add source info with clear separation
      combinedPrompt += `\n--- SOURCE ${index + 1} ---\n`;
      combinedPrompt += `URL: ${source.url}\n`;
      combinedPrompt += `TITLE: ${source.title || 'Untitled'}\n`;
      
      // Take more content for analysis - up to 4000 chars for a more detailed analysis
      combinedPrompt += `CONTENT: ${contentToAnalyze.substring(0, 4000)}\n`;
    });

    // For sources with no content, try to generate synthetic content from metadata
    sources.forEach((source, index) => {
      if (!sourcesWithContent.includes(source)) {
        combinedPrompt += `\n--- SOURCE ${sources.indexOf(source) + 1} (LIMITED INFO) ---\n`;
        combinedPrompt += `URL: ${source.url}\n`;
        combinedPrompt += `TITLE: ${source.title || 'Untitled'}\n`;
        combinedPrompt += `NOTE: Limited content available for this source. Please infer what you can from the URL and title.\n`;
      }
    });
    
    combinedPrompt += `\nFor each source, provide:
1. Key insights relevant to the query (be very detailed)
2. Relevance to query (high/medium/low) with explanation
3. Main takeaways (at least 3-5 detailed points)
4. Any contradictions with other sources
5. Additional context that helps understand the topic

Format your response as follows:
SOURCE 1:
[Your detailed, multi-paragraph analysis here]

SOURCE 2:
[Your detailed, multi-paragraph analysis here]

Continue for all sources...

REMEMBER: Your analyses should be comprehensive, thorough and detailed - at least 300-500 words per source.`;

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.model });
    
    // Configure generation parameters - provide more context for better analysis
    const genParams = {
      temperature: GEMINI_CONFIG.temperature,
      maxOutputTokens: GEMINI_CONFIG.maxTokens,
      topK: GEMINI_CONFIG.topK,
      topP: GEMINI_CONFIG.topP,
    };

    // Create a system prompt for better context
    const systemPrompt = `You are an advanced research assistant analyzing sources about: "${query}".
Your analysis must be extremely detailed and comprehensive.
For each source, extract all relevant information and insights, organized into clear sections.
Use multiple paragraphs with specific details from the source.
Your goal is to provide the most thorough, information-rich analysis possible.`;

    // Implement retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds initial delay

    // Make a single call to Gemini
    let analysisText;
    while (true) {
      try {
        // Make the API call with proper system prompt and user prompt
        const result = await model.generateContent({
          contents: [
            { role: 'system', parts: [{ text: systemPrompt }] },
            { role: 'user', parts: [{ text: combinedPrompt }] }
          ],
          generationConfig: genParams,
        });
        
        analysisText = result.response.text();
        console.log(`Received Gemini analysis of ${analysisText.length} characters`);
        break;
      } catch (err: any) {
        console.error("Gemini API error:", err);
        
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
    
    // Pre-process sources to ensure we have content
    const validSources = sources.map(source => {
      // Primary source content (prefer content, fall back to description)
      const sourceContent = source.content || source.description || '';
      
      // Log an issue if we have neither
      if (!sourceContent && source.url) {
        console.log(`No usable content for source: ${source.url}`);
      }
      
      return {
        ...source,
        // Store the best available content for Gemini analysis
        processedContent: sourceContent,
      };
    });
    
    // Count how many sources have usable content
    const sourcesWithContent = validSources.filter(s => s.processedContent && s.processedContent.length > 50).length;
    console.log(`Sources with substantial content: ${sourcesWithContent}/${sources.length}`);
    
    // Get analysis for all sources in one call
    const sourceAnalyses = await analyzeAllSourcesWithGemini(validSources, query);
    
    // Enhance each source with its analysis
    const enhancedSources = validSources.map((source: any) => {
      return {
        url: source.url || '',
        title: source.title || 'Untitled',
        content: source.processedContent || '',  // Use our pre-processed content
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

// Main deep research function with enhanced source content handling
export async function performDeepResearch(
  query: string,
  params: ResearchParams = {}
): Promise<ResearchResult> {
  try {
    // Merge default params with provided params
    let researchParams = {
      ...DEFAULT_PARAMS,
      ...params,
      fullContent: true, // Always ensure fullContent is true
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
      researchParams, // Use standard parameters only
      onActivity
    ) as FirecrawlSuccessResponse;
    
    // Log the complete raw response for debugging
    console.log("Raw API response received");
    try {
      // Log full response structure (for debugging)
      console.log("Response structure:", JSON.stringify(Object.keys(rawResults), null, 2));
      console.log("Data structure:", rawResults.data ? JSON.stringify(Object.keys(rawResults.data), null, 2) : 'No data object');
      
      // Log sources count
      const sourcesCount = Array.isArray(rawResults.data?.sources) 
        ? rawResults.data.sources.length 
        : Array.isArray(rawResults.sources) 
          ? rawResults.sources.length 
          : 0;
      console.log(`Found ${sourcesCount} sources in response`);
      
      // Log first source sample (if exists)
      if (sourcesCount > 0) {
        const firstSource = Array.isArray(rawResults.data?.sources) 
          ? rawResults.data.sources[0]
          : Array.isArray(rawResults.sources)
            ? rawResults.sources[0]
            : null;
        if (firstSource) {
          // Create a more detailed source sample log
          console.log("First source sample details:");
          console.log("- URL:", firstSource.url);
          console.log("- Title:", firstSource.title);
          console.log("- Has content:", !!firstSource.content);
          console.log("- Content length:", firstSource.content ? firstSource.content.length : 0);
          console.log("- Has markdown:", !!firstSource.markdown);
          console.log("- Markdown length:", firstSource.markdown ? firstSource.markdown.length : 0);
          console.log("- Has HTML:", !!firstSource.html);
          console.log("- HTML length:", firstSource.html ? firstSource.html.length : 0);
          console.log("- Has description:", !!firstSource.description);
          console.log("- Description length:", firstSource.description ? firstSource.description.length : 0);
          
          // Log a sample of the content if available
          if (firstSource.content && firstSource.content.length > 0) {
            console.log("- Content preview:", firstSource.content.substring(0, 150) + "...");
          } else if (firstSource.markdown && firstSource.markdown.length > 0) {
            console.log("- Markdown preview:", firstSource.markdown.substring(0, 150) + "...");
          } else if (firstSource.description && firstSource.description.length > 0) {
            console.log("- Description preview:", firstSource.description.substring(0, 150) + "...");
          }
        }
      }
      
      // Log final analysis length
      const finalAnalysis = rawResults.data?.finalAnalysis || rawResults.finalAnalysis || '';
      console.log(`Final analysis length: ${finalAnalysis.length} characters`);
    } catch (logError) {
      console.error("Error logging API response:", logError);
    }

    if (isFirecrawlError(rawResults)) {
      throw new Error(rawResults.error);
    }

    // Get jobId from response
    const jobId = rawResults.id || rawResults.jobId || 'direct-response';
    
    // Get status - default to 'completed' if processing was synchronous
    const status = rawResults.status || 'completed';
    
    // Extract sources and activities from the response, handling different formats
    let sources = Array.isArray(rawResults.data?.sources) 
      ? rawResults.data.sources 
      : Array.isArray(rawResults.sources) 
        ? rawResults.sources 
        : [];
    
    // Log source details to help debug
    console.log(`Raw source count: ${sources.length}`);
    if (sources.length > 0) {
      // Check if sources have content
      const sourcesWithContent = sources.filter(s => 
        (s.content && s.content.length > 100) || 
        (s.markdown && s.markdown.length > 100) || 
        (s.html && s.html.length > 100)
      ).length;
      
      console.log(`Sources with significant content: ${sourcesWithContent}/${sources.length}`);
      
      // Enrich source objects with better content
      sources = sources.map(source => {
        // If we have markdown or html but no content, use those
        const bestContent = source.content || source.markdown || source.html || '';
        const description = source.description || '';
        
        return {
          ...source,
          content: bestContent,
          // If content is still empty but we have description, use that as content
          ...(bestContent.length < 50 && description.length > 50 ? { content: description } : {})
        };
      });
    }
        
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