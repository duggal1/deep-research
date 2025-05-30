import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchResult, ResearchSource, ResearchPlan, ResearchFinding, CodeExample, ResearchConfidenceLevel, ResearchError } from './types';
// Import state update functions
import { addLog, clearLogs, updateMetrics, clearMetrics } from '../app/api/research/progress/route';

// Add embedding model
interface EmbeddingVector {
  values: number[];
  dimensions: number;
}

// --- Constants Adjustment ---
// Target more sources, higher parallelism, longer overall time, but keep individual request timeouts reasonable.
const MAX_TARGET_SOURCES = 150000; // Significantly increased to ensure we get more sources
const MAX_TOKEN_OUTPUT_TARGET = 400000; // **Dramatically Increased Token Output Target for 60-80K character output**
const MAX_PARALLEL_FETCHES = 300; // Increased for faster collection
const MAX_OVERALL_RESEARCH_TIME_MS = 270 * 1000; // Increase overall time (4.5 mins)
const FETCH_TIMEOUT_MS = 12000; // Keep as is
const MAX_FETCH_RETRIES = 3; // Keep as is
const RETRY_DELAY_MS = 1200; // Keep as is
const MAX_ANALYSIS_CONTEXT_CHARS = MAX_TOKEN_OUTPUT_TARGET * 2.5; // Increased multiplier to provide more context for analysis
// ---

// --- Increased Intra-Domain Crawl Limits ---
const SECOND_LEVEL_CRAWL_LIMIT = 100; // Significantly increased from 50 to 100
const SECOND_LEVEL_TOP_N_SOURCES = 25; // Increased from 15 to 25
// ---
const INITIAL_RELEVANCE_THRESHOLD = 0.30; // Further decreased from 0.35 to 0.30 to collect even more sources
const MINIMUM_REQUIRED_SOURCES = 100; // FORCE a minimum of 100 sources

// Add interface for research options
interface ResearchOptions {
  maxDepth?: number;
  timeLimit?: number;
  maxUrls?: number;
  useFirecrawl?: boolean;
  maxDomains?: number;
  maxSources?: number;
  highQuality?: boolean;
  minOutputLength?: number; // Already exists, will be used
  useGemini?: boolean; // Add new option for Gemini
}

// Update ResearchSource with optional additional data
interface EnhancedResearchSource extends ResearchSource {
  firecrawlSource?: boolean;
  fromActivity?: boolean;
  activityType?: string;
  custom?: Record<string, any>;
}

// Define ResearchMetrics type locally if not imported, or import it
interface ResearchMetrics {
  sourcesCount: number;
  domainsCount: number;
  dataSize: string; // e.g., "123.45KB"
  elapsedTime: number; // in milliseconds
}

export class ResearchEngine {
  private model: any;
  private embeddingModel: any;
  private cache: Map<string, { data: ResearchResult; timestamp: number }>;
  private CACHE_DURATION = 1000 * 60 * 60;
  private startTime: number = 0;
  private queryContext: Map<string, any> = new Map();
  private MAX_DATA_SOURCES = 400000; // Keep high URL limit
  private MAX_TOKEN_OUTPUT = 800000; // Allow very high internal token processing
  private CHUNK_SIZE = 60000;
  private SEARCH_DEPTH = 50; // Deeper search
  private MAX_PARALLEL_REQUESTS = 500; // More parallel requests
  private ADDITIONAL_DOMAINS = 150; // Target more domains
  private MAX_RESEARCH_TIME = 270000; // Allow up to 4.5 mins internal time
  private DEEP_RESEARCH_MODE = true;
  private MINIMUM_DOMAINS_REQUIRED = 100; // <--- New Minimum Domain Requirement
  private MINIMUM_SOURCES_REQUIRED = 120; // Increase min sources slightly above domains

  private firecrawlApiKey: string;
  private geminiApiKey: string; // Store Gemini API Key

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // Use a model known for larger context windows if possible and needed for large synthesis
    // Check Gemini documentation for best model choice for large input/output. Sticking with flash for speed for now.
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Using latest flash model
    this.embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    this.cache = new Map();
    // Check if AbortController exists, but DO NOT assign the polyfill directly
    // The runtime (like Edge) should provide its own compatible version.
    if (typeof globalThis.AbortController === 'undefined') {
       console.warn("Warning: globalThis.AbortController is not defined. Fetch timeouts might not work correctly.");
       // If truly needed in a specific env without native support, a more robust polyfill strategy might be required.
       // For Edge Runtime, this check is likely sufficient, and native AbortController should be used.
    }
    this.firecrawlApiKey = process.env.FIRECRAWL_API_KEY || '';
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || ''; // Ensure this env var is set

    if (!this.firecrawlApiKey) {
        console.warn("[ResearchEngine] Firecrawl API Key not found. Firecrawl features disabled.");
    }
    if (!this.geminiApiKey) {
        console.warn("[ResearchEngine] Google Gemini API Key not found. Gemini features disabled.");
    }

    // Initialize other components
  }

  // Public method to generate content using the model
  async generateContent(prompt: string): Promise<any> {
    try {
      return await this.model.generateContent(prompt);
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }

  // Generate embeddings for semantic understanding
  private async generateEmbedding(text: string): Promise<EmbeddingVector> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding;
      return {
        values: embedding.values,
        dimensions: embedding.values.length
      };
    } catch (error) {
      console.error("Error generating embedding:", error);
      // Return empty embedding in case of error
      return { values: [], dimensions: 0 };
    }
  }

  // Calculate semantic similarity between two embeddings (cosine similarity)
  private calculateSimilarity(embedding1: EmbeddingVector, embedding2: EmbeddingVector): number {
    if (embedding1.dimensions === 0 || embedding2.dimensions === 0) {
      return 0;
    }

    // Calculate dot product
    let dotProduct = 0;
    const minLength = Math.min(embedding1.values.length, embedding2.values.length);
    for (let i = 0; i < minLength; i++) {
      dotProduct += embedding1.values[i] * embedding2.values[i];
    }

    // Calculate magnitudes
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < embedding1.values.length; i++) {
      magnitude1 += embedding1.values[i] * embedding1.values[i];
    }
    for (let i = 0; i < embedding2.values.length; i++) {
      magnitude2 += embedding2.values[i] * embedding2.values[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    // Calculate cosine similarity
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Helper function to create a valid ResearchSource object from partial data
   */
  private createSourceObject(data: Partial<ResearchSource>): ResearchSource {
    return {
      url: data.url || '',
      title: data.title || this.extractTitleFromHTML(data.content || ''),
      content: data.content || '',
      relevance: data.relevance || 0.5,
      credibility: data.credibility || 0.5,
      validationScore: data.validationScore || 0.5,
      // Any additional fields should be added as custom properties
      ...(data as any) // Allow passing through additional properties
    };
  }

  // Update the return type to guarantee non-optional researchMetrics if not null
  private getCachedResult(query: string): ResearchResult | null {
    const cachedItem = this.cache.get(query);
    
    if (cachedItem && (Date.now() - cachedItem.timestamp) < this.CACHE_DURATION) {
      const cachedResult = cachedItem.data;
      
          // Check required fields
          if (!cachedResult.analysis || !cachedResult.researchPath || !cachedResult.plan || !cachedResult.researchMetrics) { // Added check for researchMetrics
              console.warn("Cached result missing core properties (analysis, path, plan, metrics). Invalidating cache.");
              this.cache.delete(query);
        return null;
      }
          // No need for default metrics addition as it's now mandatory

          return cachedResult; // Matches the ResearchResult type
      }
    return null;
  }

  private async createResearchPlan(query: string): Promise<ResearchPlan> {
    // First, analyze the query to understand what type of information is needed
    const queryAnalysisPrompt = `
      Analyze this research query: "${query}"
      
      Identify:
      1. The core subject/topic
      2. What type of information is being requested (facts, comparison, analysis, etc.)
      3. Any time constraints or specific aspects mentioned
      4. The likely purpose of this research (education, decision-making, problem-solving)
      
      Return in JSON format:
      {
        "topic": "core topic",
        "informationType": "type of information needed",
        "aspects": ["specific aspect 1", "specific aspect 2"],
        "purpose": "likely purpose",
        "expectedSources": ["domain type 1", "domain type 2"]
      }
    `;
    
    let queryAnalysis = {
      topic: query,
      informationType: "general information",
      aspects: ["overview"],
      purpose: "learning",
      expectedSources: ["websites", "articles"]
    };
    
    try {
      console.log("Analyzing research query:", query);
      const analysisResult = await this.model.generateContent(queryAnalysisPrompt);
      const analysisText = analysisResult.response.text();
      
      // Extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          queryAnalysis = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse query analysis:", e);
        }
      }
    } catch (error) {
      console.error("Error in query analysis:", error);
    }

    // Now create a structured research plan based on the query analysis
    const planPrompt = `
      Create a comprehensive research plan for investigating: "${query}"
      
      Query Analysis:
      - Core Topic: ${queryAnalysis.topic}
      - Information Type: ${queryAnalysis.informationType}
      - Key Aspects: ${queryAnalysis.aspects.join(', ')}
      - Research Purpose: ${queryAnalysis.purpose}
      - Expected Sources: ${queryAnalysis.expectedSources.join(', ')}
      
      Design a systematic research plan with:
      1. Specific research questions that will provide a complete understanding
      2. Key areas to investigate with specific, measurable objectives
      3. A logical approach to gathering reliable information
      
      Format your response as a valid JSON object, strictly following this format:
      {
        "mainQuery": "${query}",
        "objective": "clear statement of research goal",
        "subQueries": [
          {"question": "specific question 1", "purpose": "why this matters"},
          {"question": "specific question 2", "purpose": "why this matters"},
          {"question": "specific question 3", "purpose": "why this matters"}
        ],
        "researchAreas": ["area1", "area2", "area3"],
        "explorationStrategy": "specific approach",
        "priorityOrder": ["first focus", "second focus", "third focus"]
      }
    `;

    try {
      console.log("Creating structured research plan");
      const result = await this.model.generateContent(planPrompt);
      let planText = result.response.text();
      
      // Try to extract JSON if it's wrapped in backticks or other markers
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planText = jsonMatch[0];
      }
      
      try {
        // Parse the JSON response
        const parsedPlan = JSON.parse(planText);
        
        // Convert to our ResearchPlan format if needed
        const researchPlan: ResearchPlan = {
          mainQuery: parsedPlan.mainQuery || query,
          objective: parsedPlan.objective || "Gather comprehensive information",
          subQueries: Array.isArray(parsedPlan.subQueries) 
            ? parsedPlan.subQueries.map((sq: any) => 
                typeof sq === 'object' ? sq.question : sq)
            : [query],
          researchAreas: parsedPlan.researchAreas || ["general"],
          explorationStrategy: parsedPlan.explorationStrategy || "systematic investigation",
          priorityOrder: parsedPlan.priorityOrder || []
        };
        
        console.log("Research plan created successfully");
        return researchPlan;
      } catch (e) {
        console.error("Failed to parse research plan JSON:", planText);
        throw e;
      }
    } catch (error) {
      console.error("Failed to create research plan", error);
      return {
        mainQuery: query,
        objective: "Gather basic information",
        subQueries: [query],
        researchAreas: ["general"],
        explorationStrategy: "direct exploration",
        priorityOrder: []
      };
    }
  }

  /**
   * Extract authoritative domains for a given query
   */
  private getTopicalSearchUrls(query: string): string[] {
    const queryLower = query.toLowerCase();
    const urls: string[] = [];
    
    // Check for programming language specific content
    if (queryLower.includes('javascript') || queryLower.includes('js')) {
      urls.push(
        `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
        `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('python')) {
      urls.push(
        `https://docs.python.org/3/search.html?q=${encodeURIComponent(query)}`,
        `https://pypi.org/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    // More URL generation logic here
    
    return urls;
  }

  /**
   * Robust error-resilient content extraction with fallbacks - Slightly improved focus
   */
  private extractRelevantContent(html: string, query: string, url: string): string {
    try {
          // Basic check for main content areas (very simplified, adjust patterns as needed)
          let focusedHtml = html;
          const mainContentRegex = /<(?:main|article|body)[^>]*>([\s\S]*?)<\/(?:main|article|body)>/i;
          const mainMatch = html.match(mainContentRegex);
          if (mainMatch && mainMatch[1]) {
              focusedHtml = mainMatch[1]; // Focus extraction within these tags if found
          }

          // Remove script, style, head from the potentially focused HTML
          let cleanedHtml = focusedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '') // Remove nav
                                      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ''); // Remove footer
      
          // Remove all remaining HTML tags, keeping their content
      cleanedHtml = cleanedHtml.replace(/<[^>]*>/g, ' ');
      
      // Decode HTML entities
      cleanedHtml = cleanedHtml.replace(/&nbsp;/g, ' ')
                              .replace(/&amp;/g, '&')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'");
      
      // Normalize whitespace
      cleanedHtml = cleanedHtml.replace(/\s+/g, ' ').trim();
      
          // Keep keyword focusing logic for very large content
          if (cleanedHtml.length > 15000) { // Slightly increased length check
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
        const paragraphs = cleanedHtml.split(/\n\n|\r\n\r\n|\.\s+/);
        const relevantParagraphs = paragraphs.filter(p => {
          const lowerP = p.toLowerCase();
          return queryTerms.some(term => lowerP.includes(term));
        });
        
        if (relevantParagraphs.length > 0) {
              cleanedHtml = relevantParagraphs.slice(0, 25).join('\n\n'); // Take a bit more
        } else {
              cleanedHtml = paragraphs.slice(0, 15).join('\n\n') + '\n\n...\n\n' +
                      paragraphs.slice(Math.floor(paragraphs.length / 2), Math.floor(paragraphs.length / 2) + 10).join('\n\n');
        }
      }
      
      return cleanedHtml;
    } catch (e) {
          // ... (Fallback logic remains the same) ...
          return `Failed to extract content due to encoding issues. Query: ${query}`;
    }
  }

  /**
   * Escape special characters in a string for use in a regular expression
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Prioritize sources based on freshness and authority
   */
  private prioritizeSources(sources: ResearchSource[], query: string): ResearchSource[] {
    // Simplified scoring focusing on relevance and basic authority/freshness checks
    const now = Date.now();
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

    return sources
      .map(source => {
        let score = source.relevance || 0.5; // Base score on initial relevance
        let authorityScore = 0.3; // Default
        let freshnessScore = 0.5; // Default

        try {
          const domain = new URL(source.url).hostname;
          authorityScore = this.getDomainAuthorityScore(domain); // Use existing authority logic
          if (source.timestamp) {
             const age = now - new Date(source.timestamp).getTime();
             freshnessScore = age < ONE_YEAR_MS ? (1 - age / (ONE_YEAR_MS * 2)) : 0; // Higher score for fresher content (within 2 years)
          }
        } catch { /* ignore errors */ }

        // Weighted score - more weight on relevance
        score = (score * 0.6) + (authorityScore * 0.2) + (freshnessScore * 0.2);
        source.relevance = Math.min(1.0, Math.max(0, score)); // Update relevance
        return source;
      })
      .sort((a, b) => b.relevance - a.relevance); // Sort descending by relevance
  }

  /**
   * Improved web crawling with error resilience, adaptation, and second-level crawl
   */
  private async crawlWeb(
      initialQuery: string,
      overallAbortSignal: AbortSignal,
      options: ResearchOptions // Pass options down
  ): Promise<{ sources: ResearchSource[], crawledUrlCount: number, failedUrlCount: number, actualDomains: number }> {
      console.log(`[ResearchEngine] Starting crawl for "${initialQuery}" with min domains: ${this.MINIMUM_DOMAINS_REQUIRED}, min sources: ${this.MINIMUM_SOURCES_REQUIRED}`);

      let crawlResult: { sources: ResearchSource[], crawledUrlCount: number, failedUrlCount: number };

      // Option 1: Use Firecrawl (Recommended if API key is set)
      if (this.firecrawlApiKey && options.useFirecrawl !== false) {
        console.log("[ResearchEngine] Using Firecrawl for crawling.");
        addLog("[Engine] Using Firecrawl for data collection.");
        try {
            // --- FIX: Call the new firecrawlDeepResearch method ---
            crawlResult = await this.firecrawlDeepResearch(initialQuery, overallAbortSignal, options);
            // --- END FIX ---
        } catch (error: any) {
             console.error("[ResearchEngine] Firecrawl research failed:", error.message);
             addLog(`[Engine] Firecrawl failed: ${error.message}. Falling back to legacy crawler.`);
             // Fallback to legacy crawl on Firecrawl error
             console.log("[ResearchEngine] Falling back to Legacy Crawler due to Firecrawl error.");
             crawlResult = await this.legacyCrawlWeb(initialQuery, overallAbortSignal);
        }
      } else {
        // Option 2: Fallback to Legacy Crawl (If Firecrawl is disabled or key missing)
        console.log("[ResearchEngine] Using Legacy Crawler (less reliable).");
        addLog("[Engine] Using legacy crawler for data collection.");
        crawlResult = await this.legacyCrawlWeb(initialQuery, overallAbortSignal);
      }

      // Calculate actual unique domains from the result
      // Ensure domain extraction handles potential errors
      const uniqueDomains = new Set(
          crawlResult.sources.map(s => {
              try {
                  // Ensure URL is valid before parsing
                  let url = s.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      if (!url.includes('://')) url = 'https://' + url; // Basic protocol addition
                      else return null; // Skip if protocol is weird
                  }
                  return new URL(url).hostname.replace(/^www\./, '');
              } catch {
                  console.warn(`[crawlWeb] Skipping invalid URL for domain count: ${s.url}`);
                  return null; // Skip invalid URLs
              }
          }).filter((d): d is string => d !== null && d !== '') // Filter out nulls and empty strings
      );
      const actualDomainsCount = uniqueDomains.size;

      console.log(`[ResearchEngine] Crawl finished. Found ${crawlResult.sources.length} sources across ${actualDomainsCount} unique domains.`);

      // Optional: Add logic here to potentially trigger another crawl phase if minimums aren't met and time permits

      return { ...crawlResult, actualDomains: actualDomainsCount };
  }

  private async firecrawlDeepResearch(
    query: string,
    signal: AbortSignal,
    options: ResearchOptions
  ): Promise<{ sources: ResearchSource[], crawledUrlCount: number, failedUrlCount: number }> {
    if (!this.firecrawlApiKey) {
      throw new Error("Firecrawl API Key is missing.");
    }

    const firecrawlParams = {
      maxDepth: options.maxDepth || this.SEARCH_DEPTH,
      maxUrls: options.maxUrls || this.MAX_DATA_SOURCES,
      timeLimit: Math.min(options.timeLimit || (this.MAX_RESEARCH_TIME / 1000), 270), // Use shorter of engine limit or option, max 270s for Firecrawl safety
      // Add other params supported by Firecrawl deep-research endpoint if needed
    };

    addLog(`[Engine] Initiating Firecrawl deep research for "${query}" with params: ${JSON.stringify(firecrawlParams)}`);
    console.log(`[firecrawlDeepResearch] Calling Firecrawl POST /deep-research`);

    try {
      // --- Initiate the Deep Research Job ---
      const initResponse = await fetch('https://api.firecrawl.dev/v1/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.firecrawlApiKey}`,
        },
        body: JSON.stringify({
          query: query,
          research_params: firecrawlParams // Ensure nested structure if API expects it
          // If params are top-level, adjust body structure accordingly
        }),
        signal: signal, // Use the overall abort signal
      });

      if (signal.aborted) throw new Error("Research aborted during Firecrawl initiation.");

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error(`[firecrawlDeepResearch] Firecrawl initiation failed: ${initResponse.status} - ${errorText}`);
        addLog(`[Engine] Firecrawl initiation failed: ${initResponse.status}`);
        throw new Error(`Firecrawl initiation failed with status ${initResponse.status}`);
      }

      const initResult = await initResponse.json();
      const jobId = initResult?.jobId; // Adjust based on actual Firecrawl response structure

      if (!jobId) {
         console.error("[firecrawlDeepResearch] Firecrawl initiation response missing jobId:", initResult);
         addLog("[Engine] Firecrawl initiation response invalid.");
        throw new Error("Failed to get Job ID from Firecrawl initiation.");
      }

      addLog(`[Engine] Firecrawl job started with ID: ${jobId}. Polling for results...`);
      console.log(`[firecrawlDeepResearch] Firecrawl job ID: ${jobId}. Starting polling.`);

      // --- Poll for Results ---
      // Use the existing polling function
      return await this.pollFirecrawlResearch(jobId, signal);

    } catch (error: any) {
       if (error.name === 'AbortError' || error.message.includes('aborted')) {
            console.warn(`[firecrawlDeepResearch] Aborted: ${error.message}`);
            addLog(`[Engine] Firecrawl research aborted.`);
       } else {
            console.error(`[firecrawlDeepResearch] Error: ${error.message}`);
            addLog(`[Engine] Firecrawl research error: ${error.message}`);
       }
      // Ensure a consistent return type on error, allowing fallback if needed
      return { sources: [], crawledUrlCount: 0, failedUrlCount: 0 };
    }
  }

  private async pollFirecrawlResearch(jobId: string, signal: AbortSignal): Promise<{ 
    sources: ResearchSource[], 
    crawledUrlCount: number, 
    failedUrlCount: number 
  }> {
    const startTime = Date.now();
    const maxPollTime = 220000; // Reduced from 240000 to 220000ms
    const pollInterval = 2000; // Reduced from 3000 to 2000ms
    let elapsedTime = 0;

    while (elapsedTime < maxPollTime) {
      if (signal.aborted) {
        throw new Error("Research aborted during polling");
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsedTime = Date.now() - startTime;

        const response = await fetch(`https://api.firecrawl.dev/v1/deep-research/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.firecrawlApiKey}`
          },
          signal
        });

        if (!response.ok) {
        console.error(`Polling error: ${response.status} ${response.statusText}`);
          continue;
        }

        const result = await response.json();
        
        if (result.status === 'completed') {
          return this.processFirecrawlResults(result, startTime);
        }
        
        if (result.status === 'failed') {
          throw new Error(`Firecrawl research failed: ${result.error || 'Unknown error'}`);
        }
        
      console.log(`Polling Firecrawl research: ${result.currentDepth}/${result.maxDepth} complete`);
    }

    throw new Error("Firecrawl research timed out while polling");
  }

  private processFirecrawlResults(result: any, startTime: number): { 
    sources: ResearchSource[], 
    crawledUrlCount: number, 
    failedUrlCount: number 
  } {
    const sourcesCount = result.data?.sources?.length || 0;
    console.log(`Processing Firecrawl results: ${sourcesCount} sources found`);
    
    if (sourcesCount === 0) {
      console.log(`Firecrawl returned no sources. This may indicate an API limit issue or no relevant content found.`);
      // Return empty result - the caller will handle fallback
      return {
        sources: [],
        crawledUrlCount: 0,
        failedUrlCount: 0
      };
    }
    
    // Use Map to track domains and their favicons to prevent duplicates
    const domainFaviconMap = new Map<string, string>();
    
    // Extract sources from Firecrawl response with improved metadata extraction
    const sources: ResearchSource[] = (result.data?.sources || []).map((source: any) => {
      // Extract domain and favicon with improved accuracy
      let domain = '';
      let favicon = '';
      let cleanUrl = '';
      
      try {
        // Clean up the URL if needed
        let urlToProcess = source.url;
        if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
          urlToProcess = 'https://' + urlToProcess;
        }
        
        const urlObj = new URL(urlToProcess);
        domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. for cleaner domain
        
        // Check if we already have a favicon for this domain
        if (domainFaviconMap.has(domain)) {
          favicon = domainFaviconMap.get(domain)!;
        } else {
          // Generate high-quality favicon URL using domain-specific rules
          if (domain.includes('github.com')) {
            favicon = 'https://github.githubassets.com/favicons/favicon.svg';
          } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
            favicon = 'https://www.youtube.com/s/desktop/22617fde/img/favicon.ico';
          } else if (domain.includes('linkedin.com')) {
            favicon = 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca';
          } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
            favicon = 'https://abs.twimg.com/responsive-web/client-web/icon-svg.168b89d5.svg';
          } else if (domain.includes('medium.com') || domain.endsWith('medium.com')) {
            favicon = 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png';
          } else if (domain.includes('dev.to')) {
            favicon = 'https://dev.to/favicon.ico';
          } else if (domain.includes('nextjs.org')) {
            favicon = 'https://nextjs.org/static/favicon/favicon.ico';
          } else if (domain.includes('vercel.com')) {
            favicon = 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png';
          } else {
            // For other domains, use Google's favicon service with larger size and better caching
            favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
          }
          
          // Store the favicon in our map
          domainFaviconMap.set(domain, favicon);
        }
        
        // Store the clean URL with proper protocol
        cleanUrl = urlObj.toString();
      } catch (e) {
        domain = source.url || 'unknown-domain';
        cleanUrl = source.url || '';
        favicon = 'https://www.google.com/s2/favicons?domain=generic&sz=128';
      }
      
      // Create a more comprehensive source object with enhanced metadata
      const sourceObj = {
        url: cleanUrl || source.url, // Use cleaned URL if available
        title: source.title || this.extractTitleFromURL(source.url),
        content: source.description || "",
        relevance: 0.98, // Increased from 0.95 to 0.98 for better prioritization
        credibility: this.getDomainAuthorityScore(source.url) * 1.2, // Increase credibility by 20%
        validationScore: 0.95, // Increased from 0.92 to 0.95
        timestamp: new Date().toISOString(),
        domain: domain,
        favicon: favicon,
        // Add more metadata for better filtering and sorting
        dataType: source.type || 'webpage',
        isSecure: cleanUrl.startsWith('https'),
        sourcePriority: this.calculateSourcePriority(domain, source.title || '')
      };
      
      // Add Firecrawl metadata as custom property
      (sourceObj as any).firecrawlSource = true;
      
      return sourceObj;
    });

    // Extract activities for additional insights
    const activities = result.data?.activities || [];
    let additionalSources: ResearchSource[] = [];

    // Extract any URLs mentioned in activities but not in sources with improved parsing
    for (const activity of activities) {
      if (activity.message && typeof activity.message === 'string') {
        // More comprehensive URL regex to capture more varied URL formats
        const urlMatches = activity.message.match(/https?:\/\/[^\s"'<>()[\]{}|]+/g);
        if (urlMatches) {
          for (const url of urlMatches) {
            // Skip URLs that are clearly not content (e.g., tracking pixels, analytics)
            if (url.includes('tracking') || url.includes('analytics') || url.includes('pixel') || 
                url.includes('beacon') || url.includes('counter') || url.includes('favicon.ico')) {
              continue;
            }
            
            // Check if this URL is already in sources
            if (!sources.some(s => s.url === url)) {
              let domain = '';
              let favicon = '';
              let cleanUrl = '';
              
              try {
                // Clean up the URL if needed
                let urlToProcess = url;
                if (!urlToProcess.startsWith('http://') && !urlToProcess.startsWith('https://')) {
                  urlToProcess = 'https://' + urlToProcess;
                }
                
                const urlObj = new URL(urlToProcess);
                domain = urlObj.hostname.replace(/^www\./, '');
                favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                cleanUrl = urlObj.toString();
                
                // Handle special cases for common domains with custom favicon paths
                if (domain.includes('github.com')) {
                  favicon = 'https://github.com/favicon.ico';
                } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                  favicon = 'https://www.youtube.com/favicon.ico';
                } else if (domain.includes('linkedin.com')) {
                  favicon = 'https://www.linkedin.com/favicon.ico';
                } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
                  favicon = 'https://twitter.com/favicon.ico';
                }
              } catch (e) {
                domain = url || 'unknown-domain';
                cleanUrl = url;
                favicon = 'https://www.google.com/s2/favicons?domain=generic&sz=128';
              }
              
              // Extract a better content sample from the activity message
              let contentSample = activity.message;
              if (contentSample.length > 300) {
                // Try to find a relevant content snippet around the URL
                const urlIndex = contentSample.indexOf(url);
                if (urlIndex >= 0) {
                  const startIndex = Math.max(0, urlIndex - 150);
                  const endIndex = Math.min(contentSample.length, urlIndex + 150);
                  contentSample = contentSample.substring(startIndex, endIndex) + '...';
                } else {
                  // If URL not found in the content (shouldn't happen), just take the first part
                  contentSample = contentSample.substring(0, 300) + '...';
                }
              }
              
              const sourceObj = {
                url: cleanUrl || url,
                title: this.extractTitleFromURL(url),
                content: contentSample,
                relevance: 0.88, // Increased from 0.8 to 0.88
                credibility: this.getDomainAuthorityScore(url) * 1.1, // Increase credibility by 10%
                validationScore: 0.90, // Increased from 0.85 to 0.90
                timestamp: activity.timestamp || new Date().toISOString(),
                domain: domain,
                favicon: favicon,
                // Add more metadata for better filtering and sorting
                dataType: activity.type === 'search' ? 'search_result' : 'activity_reference',
                isSecure: cleanUrl.startsWith('https'),
                sourcePriority: this.calculateSourcePriority(domain, this.extractTitleFromURL(url))
              };
              
              // Add activity metadata as custom properties
              (sourceObj as any).fromActivity = true;
              (sourceObj as any).activityType = activity.type;
              (sourceObj as any).activityDepth = activity.depth || 0;
              
              additionalSources.push(sourceObj);
            }
          }
        }
      }
    }

    // Combine all sources and remove duplicates
    const allSources = [...sources, ...additionalSources];
    const uniqueSources = this.deduplicateSources(allSources);
    
    // Calculate metrics
    const elapsedTime = Date.now() - startTime;
    console.log(`Firecrawl processing completed in ${elapsedTime}ms, found ${uniqueSources.length} unique sources`);

    return {
      sources: uniqueSources,
      crawledUrlCount: uniqueSources.length,
      failedUrlCount: 0 // Firecrawl handles failures internally
    };
  }

  private deduplicateSources(sources: ResearchSource[]): ResearchSource[] {
    const urlMap = new Map<string, ResearchSource>();
    
    for (const source of sources) {
      if (source.url) {
        // If we already have this URL, keep the one with higher relevance or more content
        if (urlMap.has(source.url)) {
          const existing = urlMap.get(source.url)!;
          if (source.relevance > existing.relevance || 
              (source.content && (!existing.content || source.content.length > existing.content.length))) {
            urlMap.set(source.url, source);
          }
        } else {
          urlMap.set(source.url, source);
        }
      }
    }
    
    return Array.from(urlMap.values());
  }

  /**
   * Calculate priority score for a source based on domain and title relevance
   * Higher scores indicate more authoritative or relevant sources
   */
  private calculateSourcePriority(domain: string, title: string): number {
    let priorityScore = 0.5; // Default priority
    
    // Increase score for authoritative domains
    const authoritativeDomains = [
      'edu', 'gov', 'org', 'wikipedia.org', 'github.com', 'stackoverflow.com',
      'research', 'academic', 'journal', 'science', 'university', 'ieee.org',
      'acm.org', 'mit.edu', 'stanford.edu', 'harvard.edu', 'nature.com',
      'sciencedirect.com', 'springer.com', 'arxiv.org', 'semanticscholar.org',
      'ssrn.com', 'researchgate.net', 'scholar.google.com'
    ];
    
    // Check if domain contains any authoritative keywords
    for (const authDomain of authoritativeDomains) {
      if (domain.includes(authDomain)) {
        priorityScore += 0.3;
        break;
      }
    }
    
    // Adjust score based on title relevance indicators
    const qualityTitleIndicators = [
      'research', 'study', 'analysis', 'guide', 'tutorial',
      'review', 'comparison', 'official', 'documentation',
      'paper', 'journal', 'proceedings', 'conference'
    ];
    
    for (const indicator of qualityTitleIndicators) {
      if (title.toLowerCase().includes(indicator)) {
        priorityScore += 0.1;
        break;
      }
    }
    
    // Cap at 1.0
    return Math.min(priorityScore, 1.0);
  }

  private extractTitleFromURL(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        // Convert kebab or snake case to title case
        return lastSegment
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '') // Remove file extension
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      return parsedUrl.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  // Legacy fallback method if Firecrawl API isn't available
  private async legacyCrawlWeb(
      initialQuery: string,
      overallAbortSignal: AbortSignal
  ): Promise<{ sources: ResearchSource[], crawledUrlCount: number, failedUrlCount: number }> {
    console.log(`[crawlWeb] Starting deep crawl for: "${initialQuery}"`);
      const crawledUrls = new Set<string>();
      const initialSources: ResearchSource[] = []; // Store initial results separately
    let totalCrawledCount = 0;
    let totalFailedCount = 0;
      let intermediateDomains = new Set<string>();

    // --- Step 1: Fetch Search Engine Results ---
    const searchUrls = this.createSearchEngineUrls(initialQuery);
      addLog(`Phase 2.1: Fetching initial results from ${searchUrls.length} search engines.`);
      updateMetrics({ elapsedTime: Date.now() - this.startTime });
    const potentialPageLinks = new Set<string>();

      const serpFetchPromises = searchUrls.map(async (searchUrl) => {
          // ... (SERP fetching logic remains the same, using extractLinksFromHtml) ...
       try {
           const response = await this.fetchWithRetry(searchUrl, { signal: overallAbortSignal });
           const html = await response.text();
                // ... CAPTCHA check ...
                const extracted = this.extractLinksFromHtml(html, searchUrl); // Uses updated extractLinksFromHtml
           extracted.forEach(link => {
                     if (!crawledUrls.has(link) && link.length < 300 && !link.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js)$/i)) {
                   potentialPageLinks.add(link);
               }
           });
       } catch (error: any) {
                 // ... error handling ...
       }
      });
      await Promise.allSettled(serpFetchPromises);
    if (potentialPageLinks.size === 0) {
          addLog("WARN: No links extracted from initial search results. Crawling may be limited.");
    }

      // --- Step 2: Crawl Extracted Page Links (First Level) ---
    const pageUrlsToCrawl = Array.from(potentialPageLinks);
      addLog(`Phase 2.2: Found ${pageUrlsToCrawl.length} unique links. Starting Level 1 crawl (Parallelism: ${MAX_PARALLEL_FETCHES}).`);
      updateMetrics({ elapsedTime: Date.now() - this.startTime });

    const batches: string[][] = [];
    for (let i = 0; i < pageUrlsToCrawl.length; i += MAX_PARALLEL_FETCHES) {
        batches.push(pageUrlsToCrawl.slice(i, i + MAX_PARALLEL_FETCHES));
    }

    for (let i = 0; i < batches.length; i++) {
          if (overallAbortSignal.aborted || initialSources.length >= MAX_TARGET_SOURCES) break;

        const batch = batches[i];
          const batchNumber = i + 1;
          addLog(`Crawling Level 1 Batch ${batchNumber}/${batches.length} (${batch.length} URLs) | Total Sources: ${initialSources.length}`);

        const batchPromises = batch.map(async (url) => {
              if (overallAbortSignal.aborted || crawledUrls.has(url)) return null;
              // ---> ADD THIS <---
              let domain = 'unknown';
              try {
                  domain = new URL(url).hostname.replace(/^www\./, '');
                  if (domain && domain.length > 3 && domain.includes('.')) {
                     addLog(`Fetching L1: ${domain}...`); // Log domain fetch
                  }
              } catch { /* ignore logging errors */ }
              // ---> END ADD <---
              crawledUrls.add(url);
              totalCrawledCount++;
              try {
                  const response = await this.fetchWithRetry(url, { signal: overallAbortSignal });
                  const text = await response.text();
                  const relevantContent = this.extractRelevantContent(text, initialQuery, url); // Uses updated extractRelevantContent

                  if (relevantContent && relevantContent.length > 250) { // Slightly increased content length check
                      const title = this.extractTitleFromHTML(text) || new URL(response.url).pathname || url;
                      const relevance = this.calculateRelevanceLegacy(relevantContent, initialQuery);

                      if (relevance > INITIAL_RELEVANCE_THRESHOLD) { // Use constant threshold
                          const sourceObject = this.createSourceObject({
                              url: response.url, title, content: relevantContent, relevance,
                              timestamp: response.headers.get('last-modified') || response.headers.get('date') || new Date().toISOString()
                          });
                          try { intermediateDomains.add(new URL(sourceObject.url).hostname); } catch {}
                          return sourceObject;
                      }
                  }
              } catch (error: any) {
                   if (!error.message.includes('Overall research timeout exceeded')) { // Avoid double counting timeout fails
                       totalFailedCount++;
                   }
                  // ... simplified error logging as before ...
              }
              return null;
          });

          const results = await Promise.allSettled(batchPromises);
          let sourcesInBatch = 0;
          results.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                  if (initialSources.length < MAX_TARGET_SOURCES) {
                      initialSources.push(result.value);
                      sourcesInBatch++;
                  }
              }
          });
          addLog(`Level 1 Batch ${batchNumber} done. Added ${sourcesInBatch} sources. Total: ${initialSources.length}.`);
          updateMetrics({
              sourcesCount: initialSources.length, domainsCount: intermediateDomains.size,
              elapsedTime: Date.now() - this.startTime
          });
           if (!overallAbortSignal.aborted && i < batches.length - 1) {
               await new Promise(resolve => setTimeout(resolve, 200)); // Shorter delay between L1 batches
           }
      } // End Level 1 batch loop

      addLog(`Phase 2.3: Level 1 crawl complete. Found ${initialSources.length} initial sources.`);

      // --- Step 3: Prioritize and Select Top Sources for Deeper Crawl ---
      const prioritizedInitialSources = this.prioritizeSources([...initialSources], initialQuery); // Prioritize a copy
      const sourcesForLevel2 = prioritizedInitialSources.slice(0, SECOND_LEVEL_TOP_N_SOURCES);
      const level2LinksToCrawl = new Set<string>();

      if (!overallAbortSignal.aborted && sourcesForLevel2.length > 0) {
          addLog(`Phase 2.4: Extracting links from top ${sourcesForLevel2.length} sources for Level 2 crawl...`);
          sourcesForLevel2.forEach(source => {
              if (source.content) {
                  const extracted = this.extractLinksFromHtml(source.content, source.url); // Extract from content
                  extracted.forEach(link => {
                      if (!crawledUrls.has(link) && link.length < 300 && !link.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js)$/i)) {
                          // Basic check: avoid linking back to the same domain *too* much in level 2? Optional.
                          // try { if (new URL(link).hostname !== new URL(source.url).hostname) level2LinksToCrawl.add(link); } catch {}
                          level2LinksToCrawl.add(link);
                      }
                  });
              }
          });
      }

      // --- Step 4: Crawl Second Level Links ---
      const level2Urls = Array.from(level2LinksToCrawl).slice(0, SECOND_LEVEL_CRAWL_LIMIT * 2); // Fetch more initially as many will fail/be irrelevant
      const finalSources: ResearchSource[] = [...initialSources]; // Start final list with initial results

      if (!overallAbortSignal.aborted && level2Urls.length > 0) {
          addLog(`Phase 2.5: Starting Level 2 crawl for up to ${level2Urls.length} links (Limit: ${SECOND_LEVEL_CRAWL_LIMIT} successful).`);
          const level2Batches: string[][] = [];
          for (let i = 0; i < level2Urls.length; i += MAX_PARALLEL_FETCHES) {
              level2Batches.push(level2Urls.slice(i, i + MAX_PARALLEL_FETCHES));
          }

          let level2SuccessCount = 0;
          for (let i = 0; i < level2Batches.length; i++) {
              if (overallAbortSignal.aborted || finalSources.length >= MAX_TARGET_SOURCES || level2SuccessCount >= SECOND_LEVEL_CRAWL_LIMIT) break;

              const batch = level2Batches[i];
              const batchNumber = i + 1;
               addLog(`Crawling Level 2 Batch ${batchNumber}/${level2Batches.length} (${batch.length} URLs) | Total Sources: ${finalSources.length}`);

              const batchPromises = batch.map(async (url) => {
                  // Similar fetching logic as Level 1
                   if (overallAbortSignal.aborted || crawledUrls.has(url)) return null;
                   // ---> ADD THIS <---
                   let domain = 'unknown';
                   try {
                       domain = new URL(url).hostname.replace(/^www\./, '');
                        if (domain && domain.length > 3 && domain.includes('.')) {
                           addLog(`Fetching L2: ${domain}...`); // Log domain fetch
                        }
                   } catch { /* ignore logging errors */ }
                   // ---> END ADD <---
                   crawledUrls.add(url);
                   totalCrawledCount++;
            try {
                const response = await this.fetchWithRetry(url, { signal: overallAbortSignal });
                       const text = await response.text();
                const relevantContent = this.extractRelevantContent(text, initialQuery, url);

                       if (relevantContent && relevantContent.length > 250) {
                           const title = this.extractTitleFromHTML(text) || new URL(response.url).pathname || url;
                    const relevance = this.calculateRelevanceLegacy(relevantContent, initialQuery);

                           if (relevance > INITIAL_RELEVANCE_THRESHOLD + 0.05) { // Slightly higher threshold for L2?
                               const sourceObject = this.createSourceObject({
                                   url: response.url, title, content: relevantContent, relevance,
                                   timestamp: response.headers.get('last-modified') || response.headers.get('date') || new Date().toISOString()
                               });
                               try { intermediateDomains.add(new URL(sourceObject.url).hostname); } catch {}
                               return sourceObject;
                    }
                }
            } catch (error: any) {
                        if (!error.message.includes('Overall research timeout exceeded')) {
                    totalFailedCount++;
                }
                       // ... error logging ...
            }
                   return null;
        });

        const results = await Promise.allSettled(batchPromises);
        let sourcesInBatch = 0;
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                      if (finalSources.length < MAX_TARGET_SOURCES && level2SuccessCount < SECOND_LEVEL_CRAWL_LIMIT) {
                     finalSources.push(result.value);
                     sourcesInBatch++;
                          level2SuccessCount++;
                }
            }
        });
               addLog(`Level 2 Batch ${batchNumber} done. Added ${sourcesInBatch} sources. Total: ${finalSources.length}.`);
               updateMetrics({
                   sourcesCount: finalSources.length, domainsCount: intermediateDomains.size,
                   elapsedTime: Date.now() - this.startTime
               });
                if (!overallAbortSignal.aborted && i < level2Batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 250)); // Slightly longer delay between L2 batches
                }
          } // End Level 2 batch loop
          addLog(`Phase 2.6: Level 2 crawl complete. Added ${level2SuccessCount} sources.`);
      } else {
           addLog(`Phase 2.4/2.5: Skipped Level 2 crawl (No links found, timeout, or limit reached).`);
      }


      // --- Final Prioritization & Truncation ---
      addLog(`Phase 2.7: Prioritizing all ${finalSources.length} collected sources...`);
      const finalPrioritizedSources = this.prioritizeSources(finalSources, initialQuery);
      console.log(`[crawlWeb] Prioritization complete. Top source relevance: ${finalPrioritizedSources[0]?.relevance.toFixed(3) ?? 'N/A'}`);

      const finalTruncatedSources = finalPrioritizedSources.slice(0, MAX_TARGET_SOURCES);
      if (finalPrioritizedSources.length > finalTruncatedSources.length) {
          console.log(`[crawlWeb] Truncated sources from ${finalPrioritizedSources.length} to ${finalTruncatedSources.length} after prioritization.`);
          addLog(`Truncated sources from ${finalPrioritizedSources.length} to ${finalTruncatedSources.length} after prioritization.`);
      }

      // FINAL METRICS UPDATE (for progress API) before returning from crawl
      const finalDomains = new Set(finalTruncatedSources.map(s => { try { return new URL(s.url).hostname; } catch { return s.url; } }));
      updateMetrics({
          sourcesCount: finalTruncatedSources.length,
          domainsCount: finalDomains.size,
          elapsedTime: Date.now() - this.startTime
      });
    
    return {
        sources: finalTruncatedSources,
        crawledUrlCount: totalCrawledCount,
        failedUrlCount: totalFailedCount
    };
  }

  /**
   * Generate a diverse set of search queries based on the user query
   */
  private generateSearchQueries(query: string): string[] {
    // Extract main keywords
    const mainKeywords = query
      .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
      .replace(/['"]/g, '')  // Remove quotes
      .trim();
      
    // Check for version numbers/specific identifiers
    const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
    const versionMatch = query.match(versionRegex);
    const versionTag = versionMatch ? versionMatch[0] : '';
    
    // Identify if it's a code/programming query
    const isProgrammingQuery = /\b(code|function|api|library|framework|programming|developer|sdk|npm|package|class|method|interface|component|hook|module|dependency|import|export)\b/i.test(query);
    
    // Identify specific technology areas
    const webDev = /\b(html|css|javascript|typescript|react|vue|angular|svelte|dom|browser|frontend|web|responsive|node|express|nextjs|remix|gatsby)\b/i.test(query);
    const mobileDev = /\b(ios|android|react native|flutter|swift|kotlin|mobile app|mobile development)\b/i.test(query);
    const dataScience = /\b(python|machine learning|ml|ai|data science|tensorflow|pytorch|pandas|numpy|statistics|dataset|classification|regression|neural network)\b/i.test(query);
    const devOps = /\b(docker|kubernetes|ci\/cd|jenkins|github actions|aws|gcp|azure|cloud|serverless|lambda|deployment|container)\b/i.test(query);
    const database = /\b(sql|postgresql|mysql|mongodb|database|nosql|orm|query|joins|schema|data model|prisma|mongoose|sequelize)\b/i.test(query);
    
    // Check for request intent
    const wantsExamples = /\b(example|code|sample|snippet|demo|implementation|reference|how to use)\b/i.test(query);
    const wantsTutorial = /\b(tutorial|guide|walkthrough|step by step|learn|course|explain|how to)\b/i.test(query);
    const wantsComparison = /\b(vs|versus|comparison|compare|difference|better|alternative)\b/i.test(query);
    const wantsBestPractices = /\b(best practice|pattern|architecture|optimize|improve|clean|proper|correct way|standard)\b/i.test(query);
    
    // Generate query variants
    const queries = [
      mainKeywords, // Basic query
      `${mainKeywords}${versionTag ? ' ' + versionTag : ''}`, // With version tag if present
    ];
    
    // Add intent-specific queries
    if (wantsExamples) {
      queries.push(
        `${mainKeywords} example code`,
        `${mainKeywords} code sample`,
        `${mainKeywords} implementation example${versionTag ? ' ' + versionTag : ''}`
      );
    }
    
    if (wantsTutorial) {
      queries.push(
        `${mainKeywords} tutorial guide`,
        `how to use ${mainKeywords}${versionTag ? ' ' + versionTag : ''}`,
        `${mainKeywords} step by step guide`
      );
    }
    
    if (wantsComparison) {
      queries.push(
        `${mainKeywords} comparison alternatives`,
        `${mainKeywords} vs other${isProgrammingQuery ? ' libraries' : ''}`,
        `${mainKeywords} pros and cons`
      );
    }
    
    if (wantsBestPractices) {
      queries.push(
        `${mainKeywords} best practices`,
        `${mainKeywords} recommended patterns`,
        `${mainKeywords} optimization techniques`
      );
    }
    
    // Add technology-specific queries
    if (webDev) {
      queries.push(
        `${mainKeywords} web development`,
        `${mainKeywords} frontend ${isProgrammingQuery ? 'library' : 'usage'}`
      );
    }
    
    if (mobileDev) {
      queries.push(
        `${mainKeywords} mobile development`,
        `${mainKeywords} ${/ios|swift/i.test(query) ? 'iOS' : 'Android'} implementation`
      );
    }
    
    if (dataScience) {
      queries.push(
        `${mainKeywords} data science application`,
        `${mainKeywords} machine learning implementation`
      );
    }
    
    if (devOps) {
      queries.push(
        `${mainKeywords} devops integration`,
        `${mainKeywords} cloud deployment`
      );
    }
    
    if (database) {
      queries.push(
        `${mainKeywords} database usage`,
        `${mainKeywords} data modeling`
      );
    }
    
    // Documentation queries for technical topics
    if (isProgrammingQuery) {
      queries.push(
        `${mainKeywords} documentation${versionTag ? ' ' + versionTag : ''}`,
        `${mainKeywords} api reference`,
        `${mainKeywords} official docs`,
        `${mainKeywords} github`
      );
    }
    
    // Filter out duplicates and return
    return Array.from(new Set(queries));
  }

  /**
   * Identify the most relevant domains for a particular query
   */
  private identifyRelevantDomains(query: string): string[] {
    const domains: string[] = [];
    
    // General reference domains
    domains.push('stackoverflow.com', 'github.com');
    
    // Check for programming languages/technologies
    if (/\bjavascript\b|\bjs\b/i.test(query)) {
      domains.push('developer.mozilla.org', 'javascript.info', 'npmjs.com');
    }
    
    if (/\btypescript\b|\bts\b/i.test(query)) {
      domains.push('typescriptlang.org', 'typescript-eslint.io');
    }
    
    if (/\bpython\b/i.test(query)) {
      domains.push('docs.python.org', 'pypi.org', 'realpython.com');
    }
    
    if (/\bjava\b/i.test(query)) {
      domains.push('docs.oracle.com', 'maven.apache.org');
    }
    
    if (/\bc#\b|\bcsharp\b/i.test(query)) {
      domains.push('docs.microsoft.com', 'learn.microsoft.com');
    }
    
    if (/\bruby\b/i.test(query)) {
      domains.push('ruby-lang.org', 'rubygems.org');
    }
    
    if (/\bgo\b|\bgolang\b/i.test(query)) {
      domains.push('golang.org', 'go.dev');
    }
    
    if (/\brust\b/i.test(query)) {
      domains.push('rust-lang.org', 'crates.io');
    }
    
    // Check for frameworks/libraries
    if (/\breact\b/i.test(query)) {
      domains.push('reactjs.org', 'react.dev', 'legacy.reactjs.org');
    }
    
    if (/\bangular\b/i.test(query)) {
      domains.push('angular.io', 'angularjs.org');
    }
    
    if (/\bvue\b/i.test(query)) {
      domains.push('vuejs.org', 'v3.vuejs.org');
    }
    
    if (/\bsvelte\b/i.test(query)) {
      domains.push('svelte.dev');
    }
    
    if (/\bnextjs\b|\bnext\.js\b/i.test(query)) {
      domains.push('nextjs.org', 'vercel.com');
    }
    
    if (/\bnode\b|\bnode\.js\b/i.test(query)) {
      domains.push('nodejs.org', 'nodejs.dev');
    }
    
    if (/\bexpress\b/i.test(query)) {
      domains.push('expressjs.com');
    }
    
    if (/\bflutter\b/i.test(query)) {
      domains.push('flutter.dev', 'pub.dev');
    }
    
    if (/\bdjango\b/i.test(query)) {
      domains.push('djangoproject.com');
    }
    
    if (/\blaravel\b/i.test(query)) {
      domains.push('laravel.com');
    }
    
    if (/\bspring\b/i.test(query)) {
      domains.push('spring.io');
    }
    
    // Check for databases
    if (/\bsql\b|\bdatabase\b/i.test(query)) {
      domains.push('db-engines.com');
      
      if (/\bmysql\b/i.test(query)) {
        domains.push('dev.mysql.com');
      }
      
      if (/\bpostgresql\b|\bpostgres\b/i.test(query)) {
        domains.push('postgresql.org');
      }
      
      if (/\bmongodb\b/i.test(query)) {
        domains.push('mongodb.com');
      }
      
      if (/\bredis\b/i.test(query)) {
        domains.push('redis.io');
      }
    }
    
    // Check for cloud platforms/devops
    if (/\baws\b|\bamazon\s+web\s+services\b/i.test(query)) {
      domains.push('aws.amazon.com', 'docs.aws.amazon.com');
    }
    
    if (/\bazure\b|\bmicrosoft\s+azure\b/i.test(query)) {
      domains.push('azure.microsoft.com');
    }
    
    if (/\bgcp\b|\bgoogle\s+cloud\b/i.test(query)) {
      domains.push('cloud.google.com');
    }
    
    if (/\bdocker\b/i.test(query)) {
      domains.push('docs.docker.com');
    }
    
    if (/\bkubernetes\b|\bk8s\b/i.test(query)) {
      domains.push('kubernetes.io');
    }
    
    // Education platforms for broader topics
    domains.push(
      'medium.com',
      'dev.to',
      'freecodecamp.org',
      'geeksforgeeks.org',
      'w3schools.com',
      'javatpoint.com',
      'tutorialspoint.com'
    );
    
    // Research and academic sources if query seems academic
    if (/\bresearch\b|\bpaper\b|\bstudy\b|\btheory\b|\balgorithm\b|\bmathematical\b/i.test(query)) {
      domains.push(
        'arxiv.org',
        'scholar.google.com',
        'researchgate.net',
        'ieee.org',
        'acm.org'
      );
    }
    
    return domains;
  }

  /**
   * Check URL relevance to the query based on URL text
   */
  private checkUrlRelevance(url: string, query: string): number {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      const keywords = query.toLowerCase()
        .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
        .replace(/['"]/g, '')
        .trim()
        .split(/\s+/)
        .filter(kw => kw.length > 3);
      
      let relevanceScore = 0;
      
      // Check for keywords in path
      for (const keyword of keywords) {
        if (path.includes(keyword)) {
          relevanceScore += 0.2;
        }
      }
      
      // Check for documentation, guides, etc.
      if (path.includes('docs') || 
          path.includes('guide') || 
          path.includes('tutorial') || 
          path.includes('reference') || 
          path.includes('example') || 
          path.includes('api')) {
        relevanceScore += 0.3;
      }
      
      // Penalize certain paths
      if (path.includes('login') || 
          path.includes('signin') || 
          path.includes('signup') || 
          path.includes('register') || 
          path.includes('cookie') || 
          path.includes('privacy') ||
          path.includes('terms') ||
          path.includes('contact') ||
          path.includes('about') ||
          path.includes('pricing') ||
          path.includes('download')) {
        relevanceScore -= 0.3;
      }
      
      return Math.max(0, Math.min(1, relevanceScore));
    } catch (e) {
      return 0;
    }
  }

  private async fallbackResearch(query: string, depth: number = 2): Promise<{
    data: string;
    sources: ResearchSource[];
  }> {
    try {
      console.log("Using fallback AI research for:", query);
      const researchPrompt = `
        Conduct research on the topic: "${query}"
        
        Provide specific, factual information including:
        1. Key facts about this topic
        2. Major perspectives on this issue
        3. Recent developments (be specific about dates and details)
        4. Important historical context
        5. Expert opinions with their actual names and credentials
        
        Format as a detailed research document with clear sections.
        Include exact sources where possible (specific websites, publications, experts).
        Admit when information is limited or uncertain.
        
        Research depth level: ${depth} (higher means more detailed)
      `;
      
      const result = await this.model.generateContent(researchPrompt);
      const researchText = result.response.text();
      
      // Extract potential sources from the AI-generated content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const extractedUrls = researchText.match(urlRegex) || [];
      
      const sources = extractedUrls.map((url: string) => ({
        url,
        title: `Source: ${url.split('/')[2] || 'Unknown'}`,
        relevance: 0.7,
        timestamp: new Date().toISOString()
      }));
      
      // If no URLs were found, add some generic sources based on the query
      if (sources.length === 0) {
        const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
        sources.push(
          this.createSourceObject({
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
            title: `Wikipedia: ${query}`,
            relevance: 0.8,
            content: "",
            timestamp: new Date().toISOString()
          }),
          this.createSourceObject({
            url: `https://scholar.google.com/scholar?q=${searchQuery}`,
            title: `Google Scholar: ${query}`,
            relevance: 0.7,
            content: "",
            timestamp: new Date().toISOString()
          })
        );
      }
      
      return {
        data: researchText,
        sources
      };
    } catch (error) {
      console.error("Error in fallbackResearch:", error);
      // Even if AI fails, provide at least some informative response
      const basicData = `Unable to retrieve information for: "${query}" due to service limitations.`;
      
      const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
      return {
        data: basicData,
        sources: [
          this.createSourceObject({
            url: `https://www.google.com/search?q=${searchQuery}`,
            title: `Search: ${query}`,
            relevance: 0.5,
            content: basicData,
            timestamp: new Date().toISOString()
          })
        ]
      };
    }
  }

  private async analyzeData(
    query: string,
    sources: ResearchSource[],
    overallAbortSignal: AbortSignal
  ): Promise<string> {
    // Note: addLog is imported directly
     if (overallAbortSignal.aborted) throw new Error("Timeout before analysis could start.");

     if (!sources || sources.length === 0) {
        addLog("No sources found to analyze.");
        return "No relevant information found during research.";
     }

    // Combine content from top N sources for context, respecting limits
    // Prioritize higher relevance sources for the context window
    // Use the updated MAX_ANALYSIS_CONTEXT_CHARS
    let combinedDataContext = "";
    let contextLength = 0;
    let sourcesInContext = 0;
    console.log(`[analyzeData] Preparing context. Max context chars: ${MAX_ANALYSIS_CONTEXT_CHARS}`); // Added Log
    for (const source of sources) { // Assumes sources are pre-sorted by relevance
        const sourceText = `\n\n--- Source: ${source.title} (${source.url}) ---\n${source.content}`;
        const textToAdd = sourceText.substring(0, Math.max(0, MAX_ANALYSIS_CONTEXT_CHARS - contextLength));
        if (textToAdd.length > 100) { // Only add if there's meaningful space
            combinedDataContext += textToAdd;
            contextLength += textToAdd.length;
            sourcesInContext++;
            if (contextLength >= MAX_ANALYSIS_CONTEXT_CHARS) {
                combinedDataContext += "\n..."; // Indicate truncation clearly
                console.log(`[analyzeData] Context truncated at ${contextLength} chars.`); // Added Log
                break;
            }
        } else if (contextLength >= MAX_ANALYSIS_CONTEXT_CHARS) {
             console.log(`[analyzeData] Context limit reached (${contextLength} chars) before adding next source.`); // Added Log
            break; // Stop if limit reached
        }
    }

    // --- UPDATE METRICS BEFORE ANALYSIS ---
    // Note: sourcesCount and domainsCount are already updated by crawlWeb
    updateMetrics({
        dataSize: `${Math.round(contextLength / 1024)}KB`, // Update based on context size for analysis
        elapsedTime: Date.now() - this.startTime
    });
    addLog(`Analyzing data from top ${sourcesInContext} sources (Context: ${(contextLength / 1024).toFixed(1)}KB). Max analysis tokens: ${MAX_TOKEN_OUTPUT_TARGET}`);
    // ---

    console.log(`[analyzeData] Analyzing ${sourcesInContext}/${sources.length} sources. Context size: ${contextLength} chars.`);

    // Fact Extraction (Optional - can be integrated into main prompt)
    // ... (keep existing fact extraction if desired, pass overallAbortSignal) ...
    // let extractedFacts = "Fact extraction skipped."; // Example if skipping

    // Code Extraction (Optional)
    // ... (keep existing code extraction if desired, pass overallAbortSignal) ...
    // let codeExamples = ""; // Example if skipping

    // Enhanced Synthesis Prompt with Extreme Depth, Accuracy, and GUARANTEED Table Generation
    const prompt = `
      Task: Synthesize the collected research data into an **EXTREMELY IN-DEPTH, HIGHLY ACCURATE, FACTUAL, AND COMPREHENSIVE ANALYSIS** answering the query: "${query}"
      Query: ${query}

      Available Data: Synthesized from ${sources.length} sources (MINIMUM 100 SOURCES REQUIRED). Context below is from the top ${sourcesInContext} most relevant sources identified during extensive web crawling.

      Research Data Context (Truncated at ${MAX_ANALYSIS_CONTEXT_CHARS} chars):
      ${combinedDataContext}
      --- End of Context ---

      **CRITICAL INSTRUCTIONS FOR MAXIMUM QUALITY ANALYSIS:**
      1.  **GENERATE 60,000-80,000 CHARACTERS OF EXTREMELY VALUABLE CONTENT:** Your analysis MUST be extremely comprehensive, with 80-85% being extremely meaningful text data directly addressing the query, and the remainder being well-structured tables, code examples, and formatting.

      2.  **Directly Address Query:** Structure the entire analysis to definitively answer "${query}" with exhaustive detail. Leave no aspect of the query unexplored.

      3.  **Evidence-Based & Rigorous:** Base ALL claims strictly on the provided research context. Implicitly cite source domains \`(e.g., according to domain.com)\` frequently, but prioritize deep synthesis over per-fact citation noise. Cross-reference facts across multiple sources whenever possible.

      4.  **Deep Synthesis, Not Listing:** Integrate findings into a coherent, insightful narrative. Identify key themes, nuanced arguments, conflicting data points, and critical technical details. Go beyond surface-level summaries to provide expert-level analysis.

      5.  **Identify Consensus & Conflict Explicitly:** Clearly highlight areas of strong agreement AND specific points of disagreement found within the context data. Explain the nuances of differing perspectives with detailed examples.

      6.  **Maximize Technical Depth:** If the query is technical, provide exceptionally detailed explanations, concepts, potential code patterns (use markdown \`\`\`language: any\`\`\`), configurations, and discuss implications based *only* on the provided context. Do not oversimplify. Include multiple code examples where relevant.

      7.  **Structure and Clarity:** Organize logically with a hierarchical structure (e.g., Executive Summary, Deep Dive Sections, Comparison Tables, Conclusion). Use markdown formatting extensively (headings, subheadings, nested lists, bolding, italics).

      8.  **GUARANTEED COMPLETE TABLES:** For ANY query that involves comparisons (products, techniques, versions, pros/cons, features, etc.), you **MUST** use multiple well-structured, **COMPLETE** markdown tables to present the comparison clearly. This is NON-NEGOTIABLE.
          *   **Include ALL relevant data points** found in the context for each item being compared. Do not omit data.
          *   Ensure tables have clear headers (\`| Header 1 | Header 2 |\`) and proper separators (\`|---|---|\`).
          *   **ALWAYS COMPLETE TABLES FULLY** - never truncate or abbreviate tables.
          *   **MULTIPLE TABLES ARE REQUIRED** - create separate tables for different aspects of comparison.
          *   Example Table Structure (YOU MUST FOLLOW THIS FORMAT EXACTLY):
              \`\`\`markdown
              | Feature         | Option A        | Option B        | Option C        | Notes                      |
              |-----------------|-----------------|-----------------|-----------------|----------------------------|
              | Speed           | Fast            | Very Fast       | Moderate        | Based on benchmark X       |
              | Cost            | $10/month       | $25/month       | $5/month        | Includes support           |
              | Ease of Use     | Moderate        | Easy            | Complex         | Subjective rating          |
              | Documentation   | Excellent       | Good            | Limited         | Based on community feedback|
              | Community Size  | Large           | Very Large      | Small           | As of [recent date]        |
              \`\`\`
          *   **NEVER TRUNCATE TABLE CONTENT.** Generate the full table even if it becomes long.
          *   **ALWAYS INCLUDE AT LEAST 5-10 ROWS** in each comparison table for comprehensive coverage.

      9.  **Acknowledge Limitations Honestly:** Explicitly state if the provided context is insufficient to fully answer parts of the query or if data is conflicting/sparse. DO NOT HALLUCINATE or invent information. Accuracy is paramount.

      10. **MAXIMIZE OUTPUT LENGTH:** Your analysis MUST be 60,000-80,000 characters long. Use the available output tokens fully to provide the most comprehensive analysis possible. This is CRITICAL.

      11. **MULTIPLE SUMMARY TABLES REQUIRED:** Include at least 2-3 high-level summary tables of key findings or comparisons throughout the document. These should be in addition to any detailed comparison tables.

      **OUTPUT FORMAT (MANDATORY SECTIONS - ALL MUST BE INCLUDED):**

      ## Comprehensive Analysis: ${query}

      ### Executive Summary
      (Detailed overview of the main findings based *only* on the provided context. Focus on the core answer but include sufficient detail - at least 1000 characters.)

      ### Key Findings & Detailed Breakdown
      (Extremely thorough synthesis of information from the context. Use multiple relevant subheadings. Integrate facts and technical details deeply. This should be the longest section - at least 30,000 characters.)

      ### Comparison & Analysis Tables (MANDATORY)
      (Multiple detailed comparison tables using **complete** markdown tables. Each table must have at least 5-10 rows of data. Include at least 2-3 different tables comparing different aspects of the query. Discuss each table in detail.)

      ### Technical Deep Dive (If Applicable)
      (Focus on technical specifics, multiple code examples, configurations if the query is technical. Include at least 3-5 code examples if relevant.)

      ### Practical Applications & Implications
      (Discuss how the findings can be applied in real-world scenarios, based only on the context provided.)

      ### Future Directions & Trends
      (Based only on the context, discuss potential future developments related to the query.)

      ### Conclusion from Research Data
      (Comprehensive summary directly answering the query based *only* on the analyzed context. Reiterate confidence and state limitations clearly. At least 1500 characters.)

      ---
      *Analysis based on data from ${sources.length} sources (minimum 100 sources required). Context derived from the top ${sourcesInContext} sources.*
      `;
      
      try {
      console.log(`[analyzeData] Generating final analysis with enhanced prompt & increased token limit (${MAX_TOKEN_OUTPUT_TARGET})...`);
      addLog("Generating final analysis report (Emphasis on depth, accuracy, and complete tables)...");

      // Check timeout signal before calling the model
      if (overallAbortSignal.aborted) throw new Error("Timeout before final analysis generation.");

      // Consider adding a timeout specifically for the generation call if possible/needed,
      // although the overall timeout should cover it.
      const generationConfig = {
        maxOutputTokens: MAX_TOKEN_OUTPUT_TARGET, // Use the INCREASED main target limit
        temperature: 0.10, // Lower temperature slightly more for factual tables
        // topP, topK (optional, for controlling output randomness)
      };

      // Use the model to generate content
      // NOTE: Handling potential AbortSignal within the SDK call itself depends on the SDK version.
      // We rely on the outer timeout check for now.
      console.log(`[analyzeData] Calling LLM with maxOutputTokens: ${generationConfig.maxOutputTokens}, temperature: ${generationConfig.temperature}`); // Added Log
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
         generationConfig: generationConfig,
         // Pass safetySettings if needed
       });

       // Check for cancellation *after* the call returns (if it's not inherently cancelable)
       if (overallAbortSignal.aborted) throw new Error("Timeout occurred during final analysis generation.");

      const analysisText = result.response.text();
      console.log("[analyzeData] Analysis generation complete. Raw length:", analysisText.length); // Updated Log
      addLog("Analysis report generated successfully.");

      // --- UPDATE METRICS AFTER ANALYSIS ---
      updateMetrics({
          dataSize: `${Math.round(Buffer.byteLength(analysisText || '', 'utf8') / 1024)}KB`, // Final report size
          elapsedTime: Date.now() - this.startTime
      });
      // ---

       // ... (Post-processing logic remains the same) ...
       let processedText = analysisText;
       console.log("[analyzeData] Applying post-processing to analysis."); // Added Log


      return processedText;

    } catch (error: any) {
      // Check if the error is due to the overall timeout
       if (error.message.includes("Timeout") || error.message.includes("aborted")) {
         console.error("[analyzeData] Analysis generation failed due to timeout.");
         addLog("Analysis generation stopped due to timeout.");
         return `Research analysis could not be completed due to reaching the time limit (${MAX_OVERALL_RESEARCH_TIME_MS / 1000}s). Partial data may have been collected from ${sources.length} sources.`;
       }
       // Handle other API errors (e.g., safety blocks, resource exhausted)
       console.error("[analyzeData] Error during analysis generation:", error);
       // Log the actual error object for more detail
       console.error(error);
       addLog(`Error during analysis generation: ${error.message}`);
       // Provide a more informative error message if possible
       const errorMessage = error.response?.promptFeedback?.blockReason // Check for safety blocks more reliably
         ? `Content generation blocked due to safety settings (${error.response.promptFeedback.blockReason}).`
         : error.message.includes("quota")
           ? "API quota exceeded."
           : `Analysis generation failed: ${error.message}`;
       return `Analysis Error: ${errorMessage}`;
    }
  }
  
  /**
   * Analyze the credibility of sources
   */
  private analyzeSourceCredibility(sources: ResearchSource[]): string {
    if (!sources || sources.length === 0) return "No sources available";
    
    // Count domains for credibility analysis
    const domainCounts: Record<string, number> = {};
    const highAuthorityDomains = [
      'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
      'docs.python.org', 'docs.oracle.com', 'docs.microsoft.com',
      'arxiv.org', 'ieee.org', 'acm.org', 'scholar.google.com',
      'research.google', 'research.microsoft.com', 'researchgate.net',
      'nature.com', 'science.org', 'nejm.org', 'sciencedirect.com'
    ];
    
    let highAuthorityCount = 0;
    let totalDomains = 0;
    
    for (const source of sources) {
      try {
        // Ensure URL has protocol
        let url = source.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        const domain = new URL(url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        
        if (highAuthorityDomains.some(authDomain => domain.includes(authDomain))) {
          highAuthorityCount++;
        }
        
        totalDomains++;
      } catch (e) {
        // Skip invalid URLs
      }
    }
    
    const domainsWithMultipleSources = Object.entries(domainCounts)
      .filter(([domain, count]) => count > 1)
      .map(([domain, count]) => `${domain} (${count} sources)`);
    
    const credibilityAssessment = 
      highAuthorityCount > totalDomains * 0.5 ? "High - Multiple authoritative sources" :
      highAuthorityCount > totalDomains * 0.3 ? "Medium-High - Some authoritative sources" :
      highAuthorityCount > totalDomains * 0.1 ? "Medium - Few authoritative sources" :
      "Unverified - Limited authoritative sources";
    
    return `${credibilityAssessment}. ${domainsWithMultipleSources.length > 0 ? 
      `Multiple sources from: ${domainsWithMultipleSources.join(', ')}` : 
      'No domains with multiple sources'}`;
  }

  private async refineQueries(query: string, initialData: string, plan: ResearchPlan): Promise<string[]> {
    const prompt = `
      Based on the initial research results and plan, suggest focused follow-up queries.
      
      Original Query: ${query}
      Research Plan: ${JSON.stringify(plan)}
      Initial Findings: ${initialData.substring(0, 10000)}
      
      After analyzing the initial research:
      1. What knowledge gaps remain?
      2. What contradictions need resolution?
      3. What areas deserve deeper investigation?
      4. What specialized perspectives should be explored?
      
      Return exactly 3 refined queries in a valid JSON format with no text before or after: 
      {"queries": ["query1", "query2", "query3"]}
    `;

    try {
      const result = await this.model.generateContent(prompt);
      let responseText = result.response.text();
      
      // Try to extract JSON if it's wrapped in backticks or other markers
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      try {
        const { queries } = JSON.parse(responseText);
        return queries;
      } catch (e) {
        console.error("Failed to parse refined queries JSON:", responseText);
        throw e;
      }
    } catch (error) {
      console.error("Error in refineQueries:", error);
      return [
        `${query} latest developments`,
        `${query} expert analysis`,
        `${query} future implications`
      ];
    }
  }

  private async synthesizeResearch(
    query: string,
    initialData: string,
    followUpData: string[],
    allSources: ResearchSource[],
    researchPath: string[],
    options: ResearchOptions // Pass options here
  ): Promise<string> {
    this.startTime = Date.now();

    const combinedData = [initialData, ...followUpData].join('\n\n---\n\n');
    const availableSourcesText = allSources
      .slice(0, 150) // Limit sources listed in prompt
      .map((s, i) => `${i + 1}. ${s.title} (${s.domain || 'N/A'}) - Relevance: ${(s.relevance * 100).toFixed(1)}%`)
      .join('\n');

    // Choose Model and Config based on options
    let synthesisModel: any;
    let generationConfig: any;
    let currentModelName = "Default LLM";

    if (options.useGemini && this.geminiApiKey) {
        console.log("[ResearchEngine] Using Gemini 2.5 Pro (gemini-2.5-pro-exp-03-25) for synthesis.");
        currentModelName = "Gemini 2.5 Pro (exp-03-25)";
        const geminiAI = new GoogleGenerativeAI(this.geminiApiKey);
        // Ensure the correct model name is used
        synthesisModel = geminiAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });
        // Apply the specific config requested for the "Think" button scenario
        generationConfig = {
            temperature: 0.4, // As requested
            topP: 0.95,       // As requested
            topK: 64,         // As requested
            maxOutputTokens: 65536, // As requested
            // responseMimeType: "text/plain", // Keep commented out for complex markdown
        };
        console.log(`[ResearchEngine] Gemini Config: temp=${generationConfig.temperature}, topP=${generationConfig.topP}, topK=${generationConfig.topK}, maxTokens=${generationConfig.maxOutputTokens}`);
    } else {
        console.log("[ResearchEngine] Using default model for synthesis.");
        synthesisModel = this.model; // Use the default initialized model
        // Keep the previously set config for the default model
        generationConfig = {
             temperature: 0.2,
             max_tokens: this.MAX_TOKEN_OUTPUT, // Use engine's high limit for default
             // Add other necessary params for the default model
        };
         console.log(`[ResearchEngine] Default Model Config: temp=${generationConfig.temperature}, maxTokens=${generationConfig.max_tokens}`);
    }

    // --- Synthesis Prompt (Keep the enhanced prompt from previous step) ---
    const synthesisPrompt = `
      **Objective:** Generate an exceptionally comprehensive, insightful, and well-structured research report based on the provided data. The output must be of the highest possible quality, demonstrating deep understanding and critical analysis.

      **Research Query:** ${query}

**Research Path Taken:**
      ${researchPath.map((p, i) => `${i + 1}. ${p}`).join('\n')}

      **Available Sources Overview (Top 150 used for synthesis):**
      ${availableSourcesText}
      (Total sources available: ${allSources.length})

      **Collected Research Data:**
      ${combinedData.substring(0, 700000)} ${combinedData.length > 700000 ? "\n\n[Data Truncated]" : ""}

      **Instructions:**

      1.  **Synthesize Deeply:** Go beyond summarizing. Analyze, compare, contrast, and critically evaluate the information from the provided data. Identify key themes, patterns, discrepancies, and emerging trends. Provide novel insights derived from the data synthesis.
      2.  **Structure Logically:** Organize the report with clear headings (H1, H2, H3) and subheadings using Markdown. Use standard sections like Introduction, Key Findings, Detailed Analysis (broken down by theme/topic), Comparative Assessment (if applicable), Technical Details (if applicable), Limitations, Conclusion, and Future Directions.
      3.  **Prioritize Quality & Meaning:** Ensure every sentence contributes value. Avoid jargon where possible, but explain technical terms clearly when necessary. The analysis must be accurate, nuanced, and directly supported by the provided data. Aim for clarity, coherence, and depth.
      4.  **Generate Markdown Tables Correctly:** Where appropriate (e.g., for comparisons, data summaries, feature lists), generate **valid Markdown tables**. Ensure they have clear headers, separator lines (e.g., |---|---|), and properly formatted rows. Tables should be complete and easy to read. Use them judiciously to present structured data effectively.
          *Example Markdown Table:*
          | Feature         | Detail A | Detail B |
          |-----------------|----------|----------|
          | Characteristic 1| Value 1  | Value 2  |
          | Characteristic 2| Value 3  | Value 4  |
      5.  **Formatting:** Use standard Markdown for formatting (bolding for emphasis using **, lists, blockquotes). Ensure clean paragraph breaks.
      6.  **Output Length:** Generate a comprehensive report. While there's no strict word count, ensure the topic is covered thoroughly, aiming for significant detail and analysis. (Target minimum output ~${options.minOutputLength || 45000} characters implicitly through comprehensiveness).
      7.  **DO NOT** explicitly mention the data truncation message ("[Data Truncated]") in the final report.
      8.  **DO NOT** invent information not present in the source data. Base all claims and analysis strictly on the provided text.
      9.  **BE EXTREMELY COMPREHENSIVE AND DETAILED.** The goal is the highest quality research output possible from the given data.

      **Generate the final research report now:**
    `;
    // --- End of Synthesis Prompt ---


    try {
        let analysis = '';
        console.log(`[ResearchEngine] Sending synthesis request to ${currentModelName} with specific config...`);

        if (options.useGemini && this.geminiApiKey && synthesisModel) {
            // Use Gemini SDK's generateContent method with the specific config
            const result = await synthesisModel.generateContent({ // Removed type annotation for flexibility
                contents: [{ role: "user", parts: [{ text: synthesisPrompt }] }],
                generationConfig: generationConfig, // Pass the specific config here
            });
            // Access response safely
             const candidate = result?.response?.candidates?.[0];
             analysis = candidate?.content?.parts?.[0]?.text || '';

             if (!analysis) {
                 console.error("[ResearchEngine] Gemini synthesis failed: No content in response", JSON.stringify(result?.response, null, 2));
                 analysis = "Error: Analysis generation failed using Gemini.";
                 // Include prompt feedback if available
                 if (result?.response?.promptFeedback) {
                     analysis += `\nFeedback: ${JSON.stringify(result.response.promptFeedback)}`;
                 }
            }

        } else if (synthesisModel) {
             // Use the default model's generation method (adapt this call based on your default model's SDK)
             console.warn("[ResearchEngine] Default model synthesis call needs implementation. Using placeholder.");
             analysis = `Placeholder analysis using default model (temp ${generationConfig.temperature}) for query: ${query}`;
             // Replace placeholder with actual call, e.g.:
             // const response = await synthesisModel.complete({ prompt: synthesisPrompt, ...generationConfig });
             // analysis = response.completion;
              } else {
            console.error("[ResearchEngine] Synthesis failed: No valid model available.");
            analysis = "Error: Analysis generation failed - no model configured.";
        }

        const duration = (Date.now() - this.startTime) / 1000;
        console.log(`[ResearchEngine] Synthesis completed in ${duration.toFixed(1)}s. Analysis length: ${analysis.length} characters.`);
        return analysis;
    } catch (error: any) {
        console.error(`[ResearchEngine] Synthesis Error with ${currentModelName}:`, error);
         return `Error during synthesis: ${error.message || 'Unknown synthesis error'}`;
    }
  }

  // --- Ensure calculateConfidenceLevel is correctly defined within the class ---
  private calculateConfidenceLevel(sources: ResearchSource[], query: string): ResearchConfidenceLevel {
    if (!sources || sources.length === 0) {
      return "very low"; // Lowercase
    }

    let totalScore = 0;
    let validSources = 0;

    for (const source of sources) {
      const score = source.validationScore ?? (
          (this.calculateRelevanceLegacy(source.content || '', query) * 0.5) +
          (this.getDomainAuthorityScore(source.url || '') * 0.3) +
          (this.calculateFreshnessScore(source.content || '', query) * 0.2)
      );
      totalScore += score;
      validSources++;
    }

    const averageScore = validSources > 0 ? totalScore / validSources : 0;
    const sourceCount = sources.length;

    // Map score to confidence level using lowercase strings
    if (averageScore >= 0.52 && sourceCount >= 10) return "very high";
    if (averageScore >= 0.45 && sourceCount >= 5) return "high";
    if (averageScore >= 0.35) return "medium";
    if (averageScore >= 0.2) return "low"; // Lowercase
    return "very low"; // Lowercase
  }
  // -------------------------------------------------------------------------

  // Update the research method to accept options
  async research(query: string, options?: ResearchOptions): Promise<ResearchResult> {
    this.startTime = Date.now();
    addLog(`[Engine] Initializing research for: "${query}"`);
    const cacheKey = JSON.stringify({ query, options });

    // Use cache if available and valid
    // const cached = this.getCachedResult(cacheKey);
    // if (cached) {
    //   addLog("[Engine] Returning cached result.");
    //   console.log(`[ResearchEngine] Returning cached result for query: ${query}`);
    //   return cached;
    // }

    const overallController = new AbortController();
    const overallTimeout = setTimeout(() => {
        console.warn(`[ResearchEngine] Overall research time limit (${this.MAX_RESEARCH_TIME / 1000}s) exceeded for query: "${query}". Aborting.`);
        addLog(`[Engine] Research timed out (${this.MAX_RESEARCH_TIME / 1000}s).`);
        overallController.abort();
    }, this.MAX_RESEARCH_TIME);

    let allSources: ResearchSource[] = [];
    let researchPath: string[] = [query];
    let finalAnalysis = '';
    // Initialize metrics with defaults
    let researchMetrics: ResearchMetrics = { sourcesCount: 0, domainsCount: 0, dataSize: '0KB', elapsedTime: 0 };
    // Initialize metadata with defaults matching the type definition
    let metadata: ResearchResult['metadata'] = { // Use the specific type
        totalSources: 0,
        qualitySources: 0, // Will need logic to calculate this if required
        avgValidationScore: 0, // Will need logic to calculate this
        executionTimeMs: 0, // Will be updated later
        timestamp: new Date().toISOString(),
        error: undefined,
        crawlAttempted: 0, // Placeholder, update in crawl logic if needed
        crawlFailed: 0     // Placeholder, update in crawl logic if needed
    };
    let confidenceLevel: ResearchConfidenceLevel = 'low'; // Default lowercase
    // Initialize plan (added type to ResearchResult previously, ensure initialization)
    let researchPlan: ResearchPlan = {
        mainQuery: query,
        objective: "Gather initial information",
        subQueries: [query],
        researchAreas: ["general"],
        explorationStrategy: "Direct web crawl and synthesis",
        priorityOrder: []
    };

    try {
        // Create the plan first
        researchPlan = await this.createResearchPlan(query); // Assign the actual plan
        researchPath = [researchPlan.mainQuery, ...researchPlan.subQueries]; // Update path based on plan

        addLog(`[Engine] Starting web crawl phase.`);
        const crawlResult = await this.crawlWeb(query, overallController.signal, options || {});
        allSources = crawlResult.sources;
        researchMetrics.sourcesCount = allSources.length;
        researchMetrics.domainsCount = crawlResult.actualDomains;
        metadata.totalSources = allSources.length; // Update metadata totalSources
        metadata.crawlAttempted = crawlResult.crawledUrlCount; // Update metadata
        metadata.crawlFailed = crawlResult.failedUrlCount;     // Update metadata
        addLog(`[Engine] Crawl phase complete. Found ${researchMetrics.sourcesCount} sources across ${researchMetrics.domainsCount} domains.`);

        if (overallController.signal.aborted) throw new Error("Research timed out during crawl.");

        // --- Domain/Source Count Warnings (Keep as is) ---
        if (researchMetrics.domainsCount < this.MINIMUM_DOMAINS_REQUIRED) {
            console.warn(`[ResearchEngine] Warning: Found only ${researchMetrics.domainsCount} domains, less than the minimum required ${this.MINIMUM_DOMAINS_REQUIRED}. Proceeding.`);
            addLog(`[Engine] Warning: Found only ${researchMetrics.domainsCount}/${this.MINIMUM_DOMAINS_REQUIRED} minimum domains.`);
        }
        if (researchMetrics.sourcesCount < this.MINIMUM_SOURCES_REQUIRED) {
            console.warn(`[ResearchEngine] Warning: Found only ${researchMetrics.sourcesCount} sources, less than the minimum required ${this.MINIMUM_SOURCES_REQUIRED}. Proceeding.`);
            addLog(`[Engine] Warning: Found only ${researchMetrics.sourcesCount}/${this.MINIMUM_SOURCES_REQUIRED} minimum sources.`);
        }
        // ---

        addLog(`[Engine] Prioritizing and validating sources...`);
        allSources = this.prioritizeSources(allSources, query);
        // Optional validation step: Calculate avgValidationScore and qualitySources
        let totalValidationScore = 0;
        let validatedCount = 0;
        // Example: If you implement validateSource:
        // allSources = await Promise.all(allSources.map(async s => {
        //    const validated = await this.validateSource(s, query);
        //    if (validated.validationScore) {
        //        totalValidationScore += validated.validationScore;
        //        validatedCount++;
        //    }
        //    return validated;
        // }));
        // metadata.avgValidationScore = validatedCount > 0 ? parseFloat((totalValidationScore / validatedCount).toFixed(2)) : 0;
        // metadata.qualitySources = allSources.filter(s => s.validationScore && s.validationScore > 0.5).length; // Example quality definition

        researchMetrics.sourcesCount = allSources.length; // Update count after potential filtering/validation
        metadata.totalSources = researchMetrics.sourcesCount; // Update metadata again
        addLog(`[Engine] Prioritization complete. Using ${researchMetrics.sourcesCount} sources.`);

        if (allSources.length > 0) {
            addLog(`[Engine] Starting data synthesis using ${options?.useGemini && this.geminiApiKey ? 'Gemini 2.5 Pro' : 'default model'}...`);
            const sourceContent = allSources.map(s => `Source: ${s.url}\nTitle: ${s.title}\nContent:\n${s.content}\n---\n`).join('\n');
            researchMetrics.dataSize = `${(Buffer.byteLength(sourceContent, 'utf8') / 1024).toFixed(2)}KB`;

            finalAnalysis = await this.synthesizeResearch(query, sourceContent, [], allSources, researchPath, options || {});

            if (overallController.signal.aborted) throw new Error("Research timed out during synthesis.");
            addLog(`[Engine] Synthesis complete. Report length: ${finalAnalysis.length} chars.`);
        } else {
            finalAnalysis = "No relevant sources found to generate a report.";
            addLog("[Engine] No sources found after filtering. Cannot generate report.");
            metadata.error = "No relevant sources found.";
        }

        confidenceLevel = this.calculateConfidenceLevel(allSources, query);
        addLog(`[Engine] Calculated confidence level: ${confidenceLevel}`);

    } catch (error: any) {
       console.error(`[ResearchEngine] Error during research for query "${query}":`, error);
       addLog(`[Engine] Error: ${error.message}`);
       metadata.error = error.message || 'An unknown error occurred during research execution.';
       finalAnalysis = `Research failed: ${metadata.error}\n\nPartial sources found: ${allSources.length}`;
       confidenceLevel = 'low'; // Set low confidence on error
    } finally {
       clearTimeout(overallTimeout);
       researchMetrics.elapsedTime = Date.now() - this.startTime;
       metadata.executionTimeMs = researchMetrics.elapsedTime; // Update final metadata execution time
       addLog(`[Engine] Research process finished in ${ (researchMetrics.elapsedTime / 1000).toFixed(1) }s.`);
       console.log(`[ResearchEngine] Research for "${query}" finished in ${ (researchMetrics.elapsedTime / 1000).toFixed(1) }s.`);
    }

      const result: ResearchResult = {
        // Ensure all fields required by ResearchResult are present
        query: query, // Add the original query
        findings: [], // Placeholder - Needs logic if findings are generated separately
        codeExamples: [], // Placeholder - Needs logic if code examples are generated
        factConsensus: [], // Placeholder
        insights: [], // Placeholder
        // --- Use the variables populated in the try/catch/finally block ---
        analysis: finalAnalysis,
        sources: allSources,
        researchMetrics: researchMetrics,
        researchPath: researchPath,
        confidenceLevel: confidenceLevel,
        metadata: metadata, // Use the fully populated metadata object
        plan: researchPlan, // Use the populated plan
    };
      
      return result;
  }

  /**
   * Calculate relevance of content using semantic understanding
   */
  private async calculateRelevanceWithEmbeddings(content: string, query: string): Promise<number> {
    try {
      // Generate embeddings for both query and content
      const queryEmbedding = await this.generateEmbedding(query);
      
      // For long content, we'll chunk it and find the most relevant chunk
      let maxSimilarity = 0;
      
      if (content.length > 4000) {
        // Split content into chunks for more accurate embedding
        const chunks = this.splitIntoChunks(content, 2000, 500); // 2000 chars with 500 overlap
        
        // Get embedding for each chunk and find max similarity
        for (const chunk of chunks) {
          const chunkEmbedding = await this.generateEmbedding(chunk);
          const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      } else {
        // For shorter content, just get one embedding
        const contentEmbedding = await this.generateEmbedding(content);
        maxSimilarity = this.calculateSimilarity(queryEmbedding, contentEmbedding);
      }
      
      // Adjust the score - semantic similarity typically ranges from 0 to 1
      // Add a small base score to ensure even low similarities get some weight
      return 0.2 + (maxSimilarity * 0.8);
    } catch (error) {
      console.error("Error in semantic relevance calculation:", error);
      // Fall back to the old method in case of error
      return this.calculateRelevanceLegacy(content, query);
    }
  }
  
  /**
   * Legacy relevance calculation method (kept as backup)
   */
  private calculateRelevanceLegacy(content: string, query: string): number {
    // Basic implementation from original code
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    const contentLower = content.toLowerCase();
    
    // Count exact phrase matches (high weight)
    const phraseMatchCount = (contentLower.match(new RegExp(query.toLowerCase(), 'g')) || []).length;
    
    // Count individual term matches (lower weight)
    let termMatchCount = 0;
    queryTerms.forEach(term => {
      termMatchCount += (contentLower.match(new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'g')) || []).length;
    });
    
    // Calculate content density score (matches per length)
    const contentLength = content.length;
    const densityScore = (phraseMatchCount * 5 + termMatchCount) / (contentLength / 500);
    
    // Final relevance score calculation (0.0 to 1.0)
    return Math.min(0.3 + (densityScore * 0.7), 1.0);
  }
  
  /**
   * Split text into overlapping chunks for embedding
   */
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    
    while (i < text.length) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
      i += chunkSize - overlap;
    }
    
    return chunks;
  }
  
  /**
   * Learn from search results and adapt strategy for future queries
   */
  private adaptSearchStrategy(query: string, results: { sources: ResearchSource[], data: string }): void {
    // Store context about this query for future adaptation
    const effectiveSources = results.sources.filter(s => s.relevance > 0.6);
    
    if (effectiveSources.length > 0) {
      // Track which domains provided relevant results
      const relevantDomains = effectiveSources.map(source => {
        try {
          return new URL(source.url).hostname;
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as string[];
      
      // Track which terms in the query produced good results
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      
      // Store this context for future queries
      this.queryContext.set(query, {
        relevantDomains,
        queryTerms,
        effectiveSourceCount: effectiveSources.length,
        timestamp: Date.now()
      });
      
      // Cleanup old context (keep only last 50 queries)
      if (this.queryContext.size > 50) {
        // Sort keys by timestamp and remove oldest
        const sortedKeys = Array.from(this.queryContext.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .map(entry => entry[0]);
        
        // Remove oldest keys
        for (let i = 0; i < sortedKeys.length - 50; i++) {
          this.queryContext.delete(sortedKeys[i]);
        }
      }
    }
  }
  
  /**
   * Get recommended domains based on adaptation learning
   */
  private getAdaptiveDomains(query: string): string[] {
    const recommendedDomains: Set<string> = new Set();
    
    // Find similar previous queries
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    
    // Check each stored query for similarity
    try {
      // Safe iteration using Array.from
      const contexts = Array.from(this.queryContext.entries());
      
      for (const [pastQuery, context] of contexts) {
        // Check term overlap for basic similarity
        const pastTerms = context.queryTerms || [];
        const commonTerms = pastTerms.filter((term: string) => queryTerms.includes(term));
        
        // If queries share terms, consider the domains that worked for that query
        if (commonTerms.length >= Math.min(2, queryTerms.length / 2)) {
          const domains = context.relevantDomains || [];
          domains.forEach((domain: string) => recommendedDomains.add(domain));
        }
      }
    } catch (error) {
      console.error("Error in getAdaptiveDomains:", error);
    }
    
    return Array.from(recommendedDomains);
  }

  private calculateRelevance(content: string, query: string): number {
    // For backward compatibility, since this is used in many places
    // We'll run the simple version for now, as we're replacing it with 
    // the async version (calculateRelevanceWithEmbeddings) gradually
    return this.calculateRelevanceLegacy(content, query);
  }

  private async validateSource(source: ResearchSource, query: string): Promise<ResearchSource> {
    try {
      // Create a modified source with all required properties
      const updatedSource: ResearchSource = { 
        ...source,
        // Ensure timestamp exists
        timestamp: source.timestamp || new Date().toISOString()
      };
      
      // Check for technical consistency
      const hasCodeSnippets = source.content.includes('```') || source.content.includes('`');
      const hasTechnicalTerms = this.checkTechnicalTerms(source.content, query);
      const consistentWithQuery = this.checkContentAlignment(source.content, query);
      
      // Check for AI-generated content markers
      const aiGenerationScore = this.checkForAiGenerated(source.content);
      
      // Check for factual claims
      const factualClaimsScore = this.assessFactualClaims(source.content);
      
      // Calculate freshness score based on date patterns in the content
      const freshnessScore = this.calculateFreshnessScore(source.content, query);
      
      // Update validation metrics
      updatedSource.validationScore = this.calculateValidationScore({
        technicalConsistency: hasTechnicalTerms ? 0.8 : 0.4,
        queryAlignment: consistentWithQuery,
        domainAuthority: this.getDomainAuthorityScore(source.url || ''),
        aiGenerated: aiGenerationScore,
        factualClaims: factualClaimsScore,
        freshness: freshnessScore,
        hasCode: hasCodeSnippets ? 0.9 : 0.5
      });
      
      // Add validation metadata
      updatedSource.validationMetadata = {
        technicalTerms: hasTechnicalTerms,
        consistentWithQuery,
        aiGenerationLikelihood: aiGenerationScore > 0.7 ? 'high' : 
                               aiGenerationScore > 0.4 ? 'medium' : 'low',
        factualClaimsScore,
        freshnessScore,
        hasCode: hasCodeSnippets
      };
      
      return updatedSource;
    } catch (error) {
      console.error("Error validating source:", error);
      return source; // Return the original source if validation fails
    }
  }
  
  /**
   * Calculates overall validation score using weighted factors
   */
  private calculateValidationScore(factors: {
    technicalConsistency: number;
    queryAlignment: number;
    domainAuthority: number;
    aiGenerated: number;
    factualClaims: number;
    freshness: number;
    hasCode: number;
  }): number {
    // Weighted scores - higher weights for more important factors
    const weights = {
      technicalConsistency: 0.20,
      queryAlignment: 0.20,
      domainAuthority: 0.15,
      aiGenerated: 0.15, // Inverse relationship - higher AI detection means lower score
      factualClaims: 0.10,
      freshness: 0.10,
      hasCode: 0.10
    };
    
    // Calculate weighted score, inverting the AI generation score
    let score = 
      (factors.technicalConsistency * weights.technicalConsistency) +
      (factors.queryAlignment * weights.queryAlignment) +
      (factors.domainAuthority * weights.domainAuthority) +
      ((1 - factors.aiGenerated) * weights.aiGenerated) + // Invert AI score
      (factors.factualClaims * weights.factualClaims) +
      (factors.freshness * weights.freshness) +
      (factors.hasCode * weights.hasCode);
      
    // Ensure score is between 0 and 1
    score = Math.max(0, Math.min(1, score));
    return parseFloat(score.toFixed(2));
  }
  
  /**
   * Check if content contains relevant technical terms to validate authenticity
   */
  private checkTechnicalTerms(content: string, query: string): boolean {
    // Extract key technical terms from query
    const techTerms = this.extractTechnicalTerms(query);
    
    // If no technical terms found, consider generic validation
    if (techTerms.length === 0) return true;
    
    // Check for presence of multiple technical terms
    const contentLower = content.toLowerCase();
    const termMatches = techTerms.filter(term => contentLower.includes(term.toLowerCase()));
    
    // Return true if at least 30% of terms are present
    return termMatches.length >= Math.max(1, Math.ceil(techTerms.length * 0.3));
  }
  
  /**
   * Extract technical terms from query
   */
  private extractTechnicalTerms(query: string): string[] {
    // Common technical terms in software development contexts
    const techTermsDict = [
      "api", "framework", "library", "component", "module", "function", "method", 
      "class", "object", "interface", "type", "typescript", "javascript",
      "react", "vue", "angular", "node", "npm", "yarn", "webpack", "babel",
      "express", "mongodb", "sql", "database", "query", "mutation", "graphql",
      "rest", "http", "session", "authentication", "authorization", "token", "jwt",
      "oauth", "saml", "cors", "xss", "csrf", "security", "vulnerability",
      "injection", "sanitization", "validation", "middleware", "plugin", "hook",
      "event", "listener", "callback", "promise", "async", "await", "cache",
      "memory", "storage", "local", "session", "cookie", "header", "request",
      "response", "server", "client", "browser", "dom", "html", "css", "scss",
      "animation", "transition", "transform", "media", "query", "responsive",
      "mobile", "desktop", "device", "viewport", "layout", "grid", "flex",
      "container", "deploy", "build", "compile", "lint", "test", "unit", "integration",
      "e2e", "ci", "cd", "docker", "kubernetes", "cloud", "aws", "azure",
      "gcp", "serverless", "lambda", "function", "s3", "bucket", "route53",
      "cloudfront", "cdn", "load", "balancer", "vpc", "subnet", "version", "git",
      "commit", "branch", "merge", "pull", "push", "rebase", "repository", "next.js",
      "nuxt", "gatsby", "remix", "vite", "esbuild", "turbopack", "swr", "tanstack",
      "query", "redux", "mobx", "context", "api", "hook", "ssr", "ssg", "isr",
      "csr", "hydration", "route", "handler", "middleware", "fetch", "axios",
      "data", "fetching", "url", "path", "param", "router", "navigation", "link"
    ];
    
    // Check for version numbers
    const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
    const versionMatches = query.match(versionRegex) || [];
    
    // Extract potential terms from query
    const words = query.toLowerCase().split(/\s+/);
    const extractedTerms = words.filter(word => 
      techTermsDict.includes(word) || 
      word.endsWith('.js') || 
      word.endsWith('.ts') ||
      word.startsWith('npm:') ||
      word.startsWith('yarn:') ||
      word.includes('-js') ||
      word.includes('-ts')
    );
    
    // Combine extracted terms with version numbers
    return [...extractedTerms, ...versionMatches];
  }
  
  /**
   * Check how well content aligns with query intent
   */
  private checkContentAlignment(content: string, query: string): number {
    // Extract main keywords from query (excluding stopwords)
    const stopwords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "as"];
    const keywords = query.toLowerCase().split(/\s+/).filter(word => 
      !stopwords.includes(word) && word.length > 2
    );
    
    if (keywords.length === 0) return 0.5; // Default medium score if no keywords
    
    // Count keyword occurrences in content
    const contentLower = content.toLowerCase();
    let matchCount = 0;
    
    for (const keyword of keywords) {
      // Use regex to count whole word occurrences
      const regex = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'gi');
      const matches = contentLower.match(regex) || [];
      matchCount += matches.length;
    }
    
    // Calculate density score based on content length and matches
    const contentWords = contentLower.split(/\s+/).length;
    const keywordDensity = matchCount / Math.max(1, contentWords);
    
    // Ideal density is around 1-5% - too low means unrelated, too high means keyword stuffing
    const densityScore = keywordDensity < 0.01 ? keywordDensity * 50 :  // Scale up if below 1%
                          keywordDensity > 0.08 ? 1 - ((keywordDensity - 0.08) * 10) : // Penalize if over 8%
                          0.5 + (keywordDensity * 5); // Scale in the ideal range
    
    return Math.max(0, Math.min(1, densityScore));
  }
  
  /**
   * Check for signs that content might be AI-generated
   */
  private checkForAiGenerated(content: string): number {
    // Indicators of AI-generated content
    const aiMarkers = [
      // Generic, vague language
      "in conclusion", "to summarize", "as we can see", "it is important to note",
      "it is worth mentioning", "it should be noted", "generally speaking",
      
      // Repetitive phrases
      "in this article", "in this guide", "in this tutorial", "in this post",
      
      // Perfect structure markers
      "firstly", "secondly", "thirdly", "lastly", "in summary",
      
      // Common AI hallucination phrases
      "according to recent studies", "experts say", "research shows", 
      "studies have shown", "it is widely accepted",
      
      // Disclaimer-like language
      "please note that", "it's important to remember", "keep in mind that"
    ];
    
    // Count occurrences of AI markers
    let markerCount = 0;
    for (const marker of aiMarkers) {
      const regex = new RegExp(`\\b${this.escapeRegExp(marker)}\\b`, 'gi');
      const matches = content.match(regex) || [];
      markerCount += matches.length;
    }
    
    // Check for unnaturally perfect paragraph structuring
    const paragraphs = content.split(/\n\n+/);
    const similarParagraphLengths = this.checkParagraphLengthConsistency(paragraphs);
    
    // Check for lack of specialized terminology (inverse of technical terms)
    // Lack of specific code, commands, technical jargon indicates generic content
    const hasCodeBlocks = content.includes('```') || (content.match(/`[^`]+`/g) || []).length > 2;
    
    // Calculate combined score
    const markersScore = Math.min(1, markerCount / 5); // Cap at 1
    const structureScore = similarParagraphLengths ? 0.7 : 0.3;
    const codeScore = hasCodeBlocks ? 0.2 : 0.8; // Lower score (more likely human) if code blocks
    
    // Final weighted score (higher = more likely AI generated)
    return (markersScore * 0.4) + (structureScore * 0.3) + (codeScore * 0.3);
  }
  
  /**
   * Check for highly consistent paragraph lengths, which is common in AI content
   */
  private checkParagraphLengthConsistency(paragraphs: string[]): boolean {
    if (paragraphs.length < 3) return false;
    
    // Get lengths of paragraphs
    const lengths = paragraphs.map(p => p.length);
    
    // Calculate standard deviation of lengths
    const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const squareDiffs = lengths.map(len => (len - mean) ** 2);
    const variance = squareDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (standardized measure of dispersion)
    const cv = stdDev / mean;
    
    // If CV is low, paragraphs are suspiciously uniform in length
    return cv < 0.3 && paragraphs.length >= 5;
  }
  
  /**
   * Assess the factual claims density in content
   */
  private assessFactualClaims(content: string): number {
    // Check for specific fact patterns
    const factPatterns = [
      // Numbers and statistics
      /\b\d+(\.\d+)?%\b/g, // Percentages
      /\b(million|billion|trillion)\b/gi, // Large numbers
      
      // Dates and time references
      /\b(in|since|from|until) \d{4}\b/gi, // Year references
      /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?, \d{4}\b/gi, // Full dates
      /\bv\d+(\.\d+)+(-\w+)?\b/gi, // Version numbers
      
      // Citations and references
      /\b(according to|as stated by|as reported by|cited by|reference|source)\b/gi,
      
      // Specific named entities
      /\b[A-Z][a-z]+ (API|SDK|library|framework|tool|protocol)\b/g, // Named technologies
      
      // Technical specifications
      /\b\d+(\.\d+)? (MB|GB|KB|TB|ms|seconds)\b/gi, // Measurements
    ];
    
    // Count matches
    let factCount = 0;
    for (const pattern of factPatterns) {
      const matches = content.match(pattern) || [];
      factCount += matches.length;
    }
    
    // Calculate density based on content length
    const contentWords = content.split(/\s+/).length;
    const factDensity = factCount / Math.max(100, contentWords) * 100;
    
    // Score based on density - more facts is better
    return Math.min(1, factDensity / 5); // Cap at 1
  }
  
  /**
   * Calculate freshness score based on date mentions
   */
  private calculateFreshnessScore(content: string, query: string): number {
    // Extract version number from query if present
    const versionMatch = query.match(/v?\d+(\.\d+)+(-\w+)?/i);
    const queryVersion = versionMatch ? versionMatch[0] : null;
    
    // Look for date patterns in content
    const datePatterns = [
      // Full dates
      /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi,
      
      // Year patterns
      /\b(in|since|from|until|for) (202\d|2019)\b/gi,
      
      // Recent relative time
      /\b(last|past) (month|week|year|few months)\b/gi,
      
      // Version mentions
      /\bv?\d+(\.\d+)+(-\w+)?\b/gi
    ];
    
    // Current year
    const currentYear = new Date().getFullYear();
    
    // Check for presence of dates
    let latestYearFound = 0;
    let hasRecentDate = false;
    let hasVersionMatch = false;
    
    // Check each pattern
    for (const pattern of datePatterns) {
      const matches = content.match(pattern) || [];
      
      for (const match of matches) {
        // Check for years
        const yearMatch = match.match(/\b(202\d|2019)\b/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          latestYearFound = Math.max(latestYearFound, year);
          if (year >= currentYear - 1) {
            hasRecentDate = true;
          }
        }
        
        // Check for version match with query
        if (queryVersion && match.includes(queryVersion)) {
          hasVersionMatch = true;
        }
      }
    }
    
    // Calculate score based on freshness signals
    let score = 0.5; // Default middle score
    
    if (hasRecentDate) score += 0.3;
    if (latestYearFound === currentYear) score += 0.2;
    if (hasVersionMatch) score += 0.3;
    
    // Adjustment for query version
    if (queryVersion && !hasVersionMatch) score -= 0.3;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Get authority score for domain
   */
  private getDomainAuthorityScore(url: string): number {
    try {
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const domain = new URL(url).hostname.toLowerCase();
      
      // High authority technical domains
      const highAuthorityDomains = [
        'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
        'nextjs.org', 'vercel.com', 'reactjs.org', 'nodejs.org', 
        'npmjs.com', 'typescript.org', 'typescriptlang.org', 'medium.com',
        'web.dev', 'developers.google.com', 'docs.microsoft.com',
        'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
        'smashingmagazine.com', 'css-tricks.com', 'youtube.com', 'freecodecamp.org'
      ];
      
      // Medium authority domains
      const mediumAuthorityDomains = [
        'dev.to', 'hashnode.com', 'digitalocean.com', 'hackernoon.com',
        'blog.logrocket.com', 'codecademy.com', 'pluralsight.com', 
        'udemy.com', 'coursera.org', 'w3schools.com', 'tutorialspoint.com',
        'geeksforgeeks.org'
      ];
      
      // Check for exact domain match
      if (highAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
        return 0.9;
      }
      
      if (mediumAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
        return 0.7;
      }
      
      // Partially matching domains (subdomains or related)
      const partialMatches = [...highAuthorityDomains, ...mediumAuthorityDomains].filter(
        d => domain.includes(d.replace(/\.(com|org|net|io)$/, ''))
      );
      
      if (partialMatches.length > 0) {
        return 0.6;
      }
      
      // Check for educational or government domains
      if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
        return 0.8;
      }
      
      // Default score for unknown domains
      return 0.4;
    } catch (error) {
      console.error("Error parsing domain:", error);
      return 0.3;
    }
  }

  // New helper method to get authoritative sources based on query
  private getAuthoritativeSources(query: string): string[] {
    const authoritativeSources: string[] = [];
    
    // Extract key terms for better source matching
    const queryLower = query.toLowerCase();
    
    // Check for Next.js specific queries
    if (queryLower.includes('next.js') || queryLower.includes('nextjs')) {
      // Version specific (extract version if present)
      const versionMatch = queryLower.match(/next\.?js\s+(\d+(?:\.\d+)?(?:\.\d+)?)/i);
      const version = versionMatch ? versionMatch[1] : '';
      
      if (version) {
        const majorVersion = version.split('.')[0];
        authoritativeSources.push(
          `https://github.com/vercel/next.js/releases/tag/v${version}`,
          `https://github.com/vercel/next.js/releases`,
          `https://nextjs.org/blog/${majorVersion}`
        );
      } else {
        authoritativeSources.push(
          'https://nextjs.org/docs',
          'https://github.com/vercel/next.js/releases',
          'https://nextjs.org/blog'
        );
      }
    }
    
    // Add more patterns here for other tech stacks, topics, etc.
    // ...
    
    return authoritativeSources;
  }

  // --- URL Generation Focused on Search Engines ---
  private createSearchEngineUrls(query: string): string[] {
    const urls: string[] = [];
    const encodedQuery = encodeURIComponent(query);

    // Prioritize search engines known to be less restrictive if possible
    urls.push(`https://search.brave.com/search?q=${encodedQuery}&source=web`);
    urls.push(`https://duckduckgo.com/?q=${encodedQuery}&ia=web`);
    urls.push(`https://www.bing.com/search?q=${encodedQuery}&form=QBLH`);
    // Google is often blocked, put it last or handle failures gracefully
    urls.push(`https://www.google.com/search?q=${encodedQuery}&hl=en`);
    // urls.push(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`); // News search
    // Add other engines if desired: Ecosia, etc.

    console.log(`Generated ${urls.length} search engine URLs for query: "${query}"`);
    return urls;
  }

  // --- Simple Link Extraction (Needs Improvement for Real-World HTML) ---
  // This is a basic example. Robust parsing requires a proper HTML parsing library (like cheerio)
  // which might not be available/ideal in all edge runtimes. This regex approach is fragile.
  private extractLinksFromHtml(html: string, baseUrl: string): string[] {
    const links: Set<string> = new Set();
    // Basic regex to find href attributes in <a> tags
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];

      // Clean up common tracking/junk parameters (simplified example)
      href = href.replace(/&?utm_.+?(&|$)/g, '$1').replace(/&?ref=.+?(&|$)/g, '$1');
      href = href.replace(/&$/, '').replace(/\?$/, '');

      // Skip anchor links, javascript links, etc.
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        continue;
      }

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl).toString();

        // Basic filtering: avoid search engine domains, social media, etc. (customize as needed)
        const parsedUrl = new URL(absoluteUrl);
        const domain = parsedUrl.hostname.toLowerCase();
        if (domain.includes('google.') || domain.includes('bing.') || domain.includes('duckduckgo.') ||
            domain.includes('brave.') || domain.includes('facebook.') || domain.includes('twitter.') ||
            domain.includes('linkedin.') || domain.includes('youtube.') || domain.includes('pinterest.')) {
             continue;
        }

        // Add valid, absolute URL
        links.add(absoluteUrl);
      } catch (e) {
        // Ignore invalid URLs
      }
    }

    // Add specific patterns for common search engines if regex fails
    // Example for Google (highly likely to change/break):
    // const googleLinkRegex = /<a\s+href="\/url\?q=([^&"]+)[^>]*><h3/gi;
    // ... extract and decodeURIComponent($1) ...

    return Array.from(links);
  }

  // --- Robust Fetch Function with Retries and Timeout ---
  // Ensure the options object expects the native AbortSignal type if passed directly
  private async fetchWithRetry(url: string, options: RequestInit, retries: number = MAX_FETCH_RETRIES): Promise<Response> {
    const attempt = MAX_FETCH_RETRIES - retries + 1;
    console.log(`[fetchWithRetry] Attempt ${attempt}/${MAX_FETCH_RETRIES + 1} for: ${url}`); // Added Log

    // Use globalThis.AbortController here too for consistency
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => { // Renamed variable
        console.warn(`[fetchWithRetry] Local timeout (${FETCH_TIMEOUT_MS}ms) triggered for: ${url}`); // Added Log
        controller.abort();
    }, FETCH_TIMEOUT_MS);

    // Assign the signal from the *local* controller for *this specific fetch timeout*
    const localSignal = controller.signal;
    // Combine the local signal with the overall signal if provided
    const combinedSignal = this.combineSignals(localSignal, options.signal); // Helper needed

    const fetchOptions: RequestInit = {
      ...options,
      signal: combinedSignal, // Use the combined signal
      headers: { // Ensure headers are correctly typed
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', // Updated UA
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', // Updated Accept
          'Accept-Language': 'en-US,en;q=0.9', // Updated Lang
          'Connection': 'keep-alive',
          'DNT': '1', // Do Not Track
          'Upgrade-Insecure-Requests': '1' // Added Header
      }
    };


    try {
      // The native fetch function expects a standard RequestInit object
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId); // Clear local timeout

      console.log(`[fetchWithRetry] Received response for ${url} - Status: ${response.status}`); // Added Log

      if (!response.ok) {
        // Retry on specific server errors or rate limiting
        if ((response.status === 429 || response.status === 403 || response.status >= 500) && retries > 0) { // Added 403
          const retryDelay = RETRY_DELAY_MS * (MAX_FETCH_RETRIES - retries + 1); // Exponential backoff
          console.warn(`[fetchWithRetry] Failed for ${url} with status ${response.status}. Retrying in ${retryDelay}ms (${retries} left)...`); // Updated Log
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          // Important: Check overall timeout before retrying - use options.signal directly here
          if (options.signal?.aborted) {
              console.log(`[fetchWithRetry] Overall timeout exceeded during retry wait for ${url}.`);
              throw new Error('Overall research timeout exceeded during retry wait.');
          }
          return this.fetchWithRetry(url, options, retries - 1); // Pass original options for overall signal tracking
        }
        // Throw error for non-retryable status codes
        console.error(`[fetchWithRetry] Non-retryable error for ${url}: Status ${response.status}`); // Added Log
        throw new Error(`Fetch failed for ${url} with status ${response.status}`);
      }

      // Check content type - only process HTML/XML/Text for content extraction
      const contentType = response.headers.get('content-type');
      if (contentType && !/(text\/html|application\/xhtml\+xml|application\/xml|text\/plain)/i.test(contentType)) {
         console.log(`[fetchWithRetry] Skipping non-text content (${contentType}) from ${url}`); // Added Log
         // Return a minimal response or throw an error to skip processing
         throw new Error(`Skipping non-text content type: ${contentType}`);
      }

      return response; // Success
    } catch (error: any) {
      clearTimeout(timeoutId); // Clear local timeout
      // If it's an AbortError, check which signal caused it
      if (error.name === 'AbortError') {
          // Check if it was the overall research timeout first
          if (options.signal?.aborted) { // Check the *overall* signal passed in options
               console.log(`[fetchWithRetry] Fetch aborted for ${url} due to overall research timeout.`);
               throw new Error('Overall research timeout exceeded'); // Propagate specific error
          } else { // Otherwise, it was the local fetch timeout
              console.warn(`[fetchWithRetry] Fetch timed out locally for ${url} after ${FETCH_TIMEOUT_MS}ms.`);
              throw new Error(`Fetch timed out for ${url}`); // Propagate specific error
          }
      }
      // Handle retry logic for other fetch errors (e.g., network errors)
      if (retries > 0 && error.name !== 'AbortError' && !error.message.includes('status')) { // Don't retry on status errors handled above
        const retryDelay = RETRY_DELAY_MS * (MAX_FETCH_RETRIES - retries + 1);
        console.warn(`[fetchWithRetry] Network/other error for ${url}: ${error.message}. Retrying in ${retryDelay}ms (${retries} left)...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Important: Check overall timeout before retrying
        if (options.signal?.aborted) {
            console.log(`[fetchWithRetry] Overall timeout exceeded during retry wait for ${url}.`);
            throw new Error('Overall research timeout exceeded during retry wait.');
        }
        return this.fetchWithRetry(url, options, retries - 1); // Pass original options
      }
      console.error(`[fetchWithRetry] Fetch failed permanently for ${url}: ${error.message}`);
      throw error; // Rethrow the final error
    }
  }

  // Helper function to combine AbortSignals
  private combineSignals(...signals: (AbortSignal | null | undefined)[]): AbortSignal | null {
      const validSignals = signals.filter((s): s is AbortSignal => s != null);
      if (validSignals.length === 0) return null;
      if (validSignals.length === 1) return validSignals[0];

      // If multiple signals, create a new controller that aborts when any signal aborts
      const combinedController = new globalThis.AbortController();
      const onAbort = () => {
          combinedController.abort();
          // Clean up listeners
          validSignals.forEach(signal => signal.removeEventListener('abort', onAbort));
      };

      for (const signal of validSignals) {
          if (signal.aborted) {
              // If any signal is already aborted, abort immediately
              combinedController.abort();
              break;
          }
          signal.addEventListener('abort', onAbort, { once: true });
      }

      return combinedController.signal;
  }

  // --- Ensure extractTitleFromHTML is correctly defined within the class ---
  private extractTitleFromHTML(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    // Decode HTML entities in title
    let title = titleMatch ? titleMatch[1].trim() : '';
    title = title.replace(/&nbsp;/g, ' ')
                 .replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
    return title;
  }
  // -----------------------------------------------------------------------
}