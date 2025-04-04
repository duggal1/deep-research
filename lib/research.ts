import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchResult, ResearchSource, ResearchPlan, ResearchFinding, CodeExample, ResearchConfidenceLevel, ResearchError } from './types';

// Add embedding model
interface EmbeddingVector {
  values: number[];
  dimensions: number;
}

// --- Constants Adjustment ---
// Target more sources, higher parallelism, longer overall time, but keep individual request timeouts reasonable.
const MAX_TARGET_SOURCES = 30000; // Target high, but actual count depends on time
const MAX_TOKEN_OUTPUT_TARGET = 120000; // Increase desired output size (check model limits)
const MAX_PARALLEL_FETCHES = 150; // Increase parallelism cautiously
const MAX_OVERALL_RESEARCH_TIME_MS = 240 * 1000; // Allow up to 4 minutes for deep research (Edge limit is 300s)
const FETCH_TIMEOUT_MS = 15000; // Timeout for individual page fetches (15 seconds)
const MAX_FETCH_RETRIES = 2; // Retry failed fetches up to 2 times
const RETRY_DELAY_MS = 1500; // Base delay before retrying a fetch
// ---

export class ResearchEngine {
  private model: any;
  private embeddingModel: any;
  private cache: Map<string, { data: ResearchResult; timestamp: number }>;
  private CACHE_DURATION = 1000 * 60 * 60;
  private startTime: number = 0;
  private queryContext: Map<string, any> = new Map();
  private MAX_DATA_SOURCES = 15000;
  private MAX_TOKEN_OUTPUT = 90000;
  private CHUNK_SIZE = 20000;
  private SEARCH_DEPTH = 10;
  private MAX_PARALLEL_REQUESTS = 100;
  private ADDITIONAL_DOMAINS = 200;
  private MAX_RESEARCH_TIME = 180000;
  private DEEP_RESEARCH_MODE = true;
  private sourcesCollected: number = 0;
  private domainsCollected: Set<string> = new Set();
  private dataSize: number = 0;
  private elapsedTime: number = 0;


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
      title: data.title || 'Unknown Source',
      relevance: data.relevance || 0.5,
      content: data.content || '',
      timestamp: data.timestamp || new Date().toISOString()
    };
  }

  // Update the return type to guarantee non-optional researchMetrics if not null
  private getCachedResult(query: string): (ResearchResult & {
    analysis: string;
    researchPath: string[];
    plan: ResearchPlan;
    researchMetrics: {
      sourcesCount: number;
      domainsCount: number;
      dataSize: string;
      elapsedTime: number; // Note: cached elapsedTime might not be meaningful
    };
  }) | null {
    const cachedItem = this.cache.get(query);
    
    if (cachedItem && (Date.now() - cachedItem.timestamp) < this.CACHE_DURATION) {
      const cachedResult = cachedItem.data;
      
      // Ensure the cached result has all required base properties
      if (!('analysis' in cachedResult) || !('researchPath' in cachedResult) || !('plan' in cachedResult)) {
        console.warn("Cached result missing core properties (analysis, path, plan). Invalidating cache.");
        this.cache.delete(query); // Optional: remove invalid cache entry
        return null;
      }
      
      // Ensure researchMetrics exists before returning
      if (!('researchMetrics' in cachedResult) || !cachedResult.researchMetrics) {
         console.warn("Cached result missing researchMetrics, adding defaults.");
         // Add default/empty metrics if missing
         cachedResult.researchMetrics = {
            sourcesCount: cachedResult.sources?.length || 0,
            domainsCount: new Set(cachedResult.sources?.map(s => { try { return new URL(s.url).hostname } catch { return s.url } }) || []).size,
            dataSize: `${Math.round(Buffer.byteLength(typeof cachedResult.analysis === 'string' ? cachedResult.analysis : '', 'utf8') / 1024)}KB`, // Estimate size
            elapsedTime: 0 // Elapsed time for cached result is not meaningful
         };
      }
      
      // Cast to the validated & updated type before returning
      return cachedResult as ResearchResult & {
        analysis: string;
        researchPath: string[];
        plan: ResearchPlan;
        researchMetrics: {
          sourcesCount: number;
          domainsCount: number;
          dataSize: string;
          elapsedTime: number;
        };
      };
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
   * Robust error-resilient content extraction with fallbacks
   */
  private extractRelevantContent(html: string, query: string, url: string): string {
    try {
      // Remove script and style tags
      let cleanedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                            .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '');
      
      // Remove all HTML tags, keeping their content
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
      
      // If content is too large, focus on query-relevant sections
      if (cleanedHtml.length > 10000) {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
        const paragraphs = cleanedHtml.split(/\n\n|\r\n\r\n|\.\s+/);
        const relevantParagraphs = paragraphs.filter(p => {
          const lowerP = p.toLowerCase();
          return queryTerms.some(term => lowerP.includes(term));
        });
        
        // If we found relevant paragraphs, use those
        if (relevantParagraphs.length > 0) {
          cleanedHtml = relevantParagraphs.slice(0, 20).join('\n\n');
        } else {
          // Otherwise just take the beginning and some from the middle
          cleanedHtml = paragraphs.slice(0, 10).join('\n\n') + '\n\n...\n\n' + 
                      paragraphs.slice(Math.floor(paragraphs.length / 2), Math.floor(paragraphs.length / 2) + 10).join('\n\n');
        }
      }
      
      return cleanedHtml;
    } catch (e) {
      console.error(`Error extracting content from ${url}:`, e);
      // First fallback: very simple tag stripping
      try {
        return html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 10000);
      } catch (fallbackError) {
        console.error("Error in fallback content extraction:", fallbackError);
        
        // Ultimate fallback: just take some of the raw content
        try {
          return html.substring(0, 5000);
        } catch (e) {
          // Absolute last resort
          return `Failed to extract content due to encoding issues. Query: ${query}`;
        }
      }
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
   * Improved web crawling with error resilience and adaptation
   */
  private async crawlWeb(
      initialQuery: string,
      overallAbortSignal: AbortSignal
  ): Promise<{ sources: ResearchSource[], crawledUrlCount: number, failedUrlCount: number }> {
    console.log(`[crawlWeb] Starting deep crawl for: "${initialQuery}"`);
    const { addLog } = await import('../app/api/research/progress/route'); // Import logging

    const crawledUrls = new Set<string>(); // Track URLs visited in this crawl session
    const finalSources: ResearchSource[] = [];
    let totalCrawledCount = 0;
    let totalFailedCount = 0;

    // --- Step 1: Fetch Search Engine Results ---
    const searchUrls = this.createSearchEngineUrls(initialQuery);
    addLog(`Fetching initial results from ${searchUrls.length} search engines.`);
    const potentialPageLinks = new Set<string>();

    await Promise.allSettled(searchUrls.map(async (searchUrl) => {
       if (overallAbortSignal.aborted) return; // Check timeout
       if (crawledUrls.has(searchUrl)) return; // Skip already crawled (less likely for SERPs)

       console.log(`[crawlWeb] Fetching SERP: ${searchUrl}`);
       crawledUrls.add(searchUrl);
       totalCrawledCount++;

       try {
           const response = await this.fetchWithRetry(searchUrl, { signal: overallAbortSignal });
           const html = await response.text();

           // Very important: Check for CAPTCHAs or blocks
           if (html.includes('CAPTCHA') || html.includes('needs to verify you') || html.includes('unusual traffic')) {
               console.warn(`[crawlWeb] Possible CAPTCHA/block detected on ${searchUrl}. Skipping link extraction.`);
               addLog(`Possible block/CAPTCHA on ${new URL(searchUrl).hostname}, trying other engines.`);
               return; // Skip link extraction for this blocked page
           }

           const extracted = this.extractLinksFromHtml(html, searchUrl);
           console.log(`[crawlWeb] Extracted ${extracted.length} potential links from ${searchUrl}`);
           extracted.forEach(link => {
               // Basic filtering of extracted links
               if (!crawledUrls.has(link) && link.length < 256 && !link.endsWith('.pdf') && !link.endsWith('.zip')) { // Avoid already crawled, long URLs, PDFs etc.
                   potentialPageLinks.add(link);
               }
           });
       } catch (error: any) {
           console.error(`[crawlWeb] Failed to fetch or process SERP ${searchUrl}: ${error.message}`);
           totalFailedCount++;
           addLog(`Failed to fetch results from ${new URL(searchUrl).hostname}.`);
           // Don't add links from failed SERPs
       }
    }));

    if (potentialPageLinks.size === 0) {
        addLog("No links extracted from initial search results. Trying fallback or authoritative sources.");
        // Consider adding authoritative sources check here as a fallback
        console.warn("[crawlWeb] No links extracted from SERPs. Crawling will be limited.");
        // Optionally, directly crawl authoritative sources here if no links found
    }

    // --- Step 2: Crawl Extracted Page Links ---
    const pageUrlsToCrawl = Array.from(potentialPageLinks);
    addLog(`Found ${pageUrlsToCrawl.length} unique links to crawl deeply.`);
    console.log(`[crawlWeb] Starting deep crawl of ${pageUrlsToCrawl.length} extracted links...`);

    const batches: string[][] = [];
    for (let i = 0; i < pageUrlsToCrawl.length; i += MAX_PARALLEL_FETCHES) {
        batches.push(pageUrlsToCrawl.slice(i, i + MAX_PARALLEL_FETCHES));
    }

    for (let i = 0; i < batches.length; i++) {
        if (overallAbortSignal.aborted) {
           console.log(`[crawlWeb] Overall timeout reached. Stopping batch processing.`);
           addLog(`Timeout reached. Stopping further crawling.`);
           break; // Stop processing batches if timeout occurs
        }
        if (finalSources.length >= MAX_TARGET_SOURCES) {
            console.log(`[crawlWeb] Reached MAX_TARGET_SOURCES limit (${MAX_TARGET_SOURCES}). Stopping crawl.`);
            addLog(`Reached target source limit (${MAX_TARGET_SOURCES}).`);
            break;
        }

        const batch = batches[i];
        console.log(`[crawlWeb] Processing batch ${i + 1}/${batches.length} with ${batch.length} URLs.`);
        addLog(`Crawling batch ${i + 1}/${batches.length} (${batch.length} URLs)`);

        const batchPromises = batch.map(async (url) => {
            if (overallAbortSignal.aborted) return null; // Check timeout before fetch
            if (crawledUrls.has(url)) return null; // Skip duplicates within/across batches

            crawledUrls.add(url); // Mark as attempted
            totalCrawledCount++;

            try {
                const response = await this.fetchWithRetry(url, { signal: overallAbortSignal });
                const text = await response.text(); // Get page content
                const relevantContent = this.extractRelevantContent(text, initialQuery, url);

                if (relevantContent && relevantContent.length > 200) { // Basic check for meaningful content
                  const title = this.extractTitleFromHTML(text) || url;
                    // Calculate initial relevance (use faster legacy for speed during crawl)
                    const relevance = this.calculateRelevanceLegacy(relevantContent, initialQuery);

                    if (relevance > 0.3) { // Only keep sources with some relevance
                        return this.createSourceObject({
                            url: response.url, // Use final URL after redirects
                      title: title,
                  content: relevantContent,
                            relevance: relevance,
                            timestamp: response.headers.get('last-modified') || response.headers.get('date') || new Date().toISOString() // Try to get timestamp
                        });
                    }
                }
            } catch (error: any) {
                if (error.message !== 'Overall research timeout exceeded') { // Don't log timeout errors excessively
                    console.error(`[crawlWeb] Failed to fetch/process content from ${url}: ${error.message}`);
                    totalFailedCount++;
                }
                // Return null for failed URLs
                return null;
            }
            return null; // Return null if content wasn't relevant enough
        });

        // Process batch results
        const results = await Promise.allSettled(batchPromises);

        let sourcesInBatch = 0;
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                 if (finalSources.length < MAX_TARGET_SOURCES) { // Check limit again before adding
                     finalSources.push(result.value);
                     sourcesInBatch++;
                 }
            } else if (result.status === 'rejected') {
                // Error handled within the fetch/map logic already
                if (result.reason?.message === 'Overall research timeout exceeded') {
                    // If one promise failed due to overall timeout, the signal should be aborted for others too
                    console.log("[crawlWeb] Batch processing interrupted by overall timeout.");
                }
            }
        });
        addLog(`Batch ${i+1} processed. Added ${sourcesInBatch} relevant sources. Total: ${finalSources.length}`);

        // Optional: Add a small delay between batches to avoid aggressive crawling
         if (!overallAbortSignal.aborted && i < batches.length - 1) {
             await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
         }
    } // End batch loop

    console.log(`[crawlWeb] Deep crawl finished. Collected ${finalSources.length} sources.`);
    addLog(`Deep crawl phase complete. Found ${finalSources.length} potential sources.`);

    // Final prioritization of all collected sources
    const prioritizedSources = this.prioritizeSources(finalSources, initialQuery);

    // Truncate if still over the target limit *after* prioritization
    const finalTruncatedSources = prioritizedSources.slice(0, MAX_TARGET_SOURCES);
    if (prioritizedSources.length > MAX_TARGET_SOURCES) {
        addLog(`Truncated sources from ${prioritizedSources.length} to ${MAX_TARGET_SOURCES} after prioritization.`);
    }

    
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
     const { addLog } = await import('../app/api/research/progress/route');

     if (overallAbortSignal.aborted) throw new Error("Timeout before analysis could start.");

     if (!sources || sources.length === 0) {
        addLog("No sources found to analyze.");
        return "No relevant information found during research.";
     }

    // Combine content from top N sources for context, respecting limits
    // Prioritize higher relevance sources for the context window
    const MAX_ANALYSIS_CONTEXT_CHARS = MAX_TOKEN_OUTPUT_TARGET * 2; // Allow ~2 chars per token for context
    let combinedDataContext = "";
    let contextLength = 0;
    let sourcesInContext = 0;
    for (const source of sources) { // Assumes sources are pre-sorted by relevance
        const sourceText = `\n\n--- Source: ${source.title} (${source.url}) ---\n${source.content}`;
        const textToAdd = sourceText.substring(0, Math.max(0, MAX_ANALYSIS_CONTEXT_CHARS - contextLength));
        if (textToAdd.length > 100) { // Only add if there's meaningful space
            combinedDataContext += textToAdd;
            contextLength += textToAdd.length;
            sourcesInContext++;
            if (contextLength >= MAX_ANALYSIS_CONTEXT_CHARS) {
                combinedDataContext += "..."; // Indicate truncation
                break;
            }
        } else if (contextLength >= MAX_ANALYSIS_CONTEXT_CHARS) {
            break; // Stop if limit reached
        }
    }

    addLog(`Analyzing data from top ${sourcesInContext} sources (Context: ${(contextLength / 1024).toFixed(1)}KB).`);
    console.log(`[analyzeData] Analyzing ${sourcesInContext}/${sources.length} sources. Context size: ${contextLength} chars.`);

    // Fact Extraction (Optional - can be integrated into main prompt)
    // ... (keep existing fact extraction if desired, pass overallAbortSignal) ...
    // let extractedFacts = "Fact extraction skipped."; // Example if skipping

    // Code Extraction (Optional)
    // ... (keep existing code extraction if desired, pass overallAbortSignal) ...
    // let codeExamples = ""; // Example if skipping

    // Main Synthesis Prompt (Revised)
    const prompt = `
      Task: Synthesize the collected research data into an **in-depth, factual, and comprehensive analysis** answering the query: "${query}"
      Query: ${query}

      Available Data: Synthesized from ${sources.length} sources. Context below is from the top ${sourcesInContext} most relevant sources.

      Research Data Context (Truncated at ${MAX_ANALYSIS_CONTEXT_CHARS} chars):
      ${combinedDataContext}
      --- End of Context ---

      **Instructions for High-Quality Analysis:**
      1.  **Directly Address Query:** Structure the analysis to answer "${query}" thoroughly.
      2.  **Evidence-Based:** Base all claims strictly on the provided research context. Cite source domains ` + "`(e.g., [Source: domain.com])`" + ` implicitly by mentioning findings from specific sources if possible, but prioritize synthesis over explicit per-fact citation.
      3.  **Synthesize, Don't Just List:** Integrate findings into a coherent narrative. Identify key themes, arguments, and technical details.
      4.  **Identify Consensus & Conflict:** Highlight areas of agreement and disagreement found within the context data.
      5.  **Technical Depth:** If the query is technical, provide detailed explanations, concepts, potential code patterns (use markdown), discuss implications based *only* on the provided context.
      6.  **Structure and Clarity:** Organize logically (e.g., Introduction, Key Aspects, Conclusion). Use markdown formatting (headings, lists, tables if data supports).
      7.  **Acknowledge Limitations:** Explicitly state if the provided context is insufficient to fully answer parts of the query. DO NOT HALLUCINATE or invent information.
      8.  **Conciseness:** Focus on core findings. Avoid excessive fluff. Be factual and direct.

      **Output Format:**

      ## Comprehensive Analysis: ${query}

      ### Executive Summary
      (Brief overview of the main findings based *only* on the provided context.)

      ### Key Findings & Detailed Breakdown
      (Structured synthesis of information from the context. Use subheadings relevant to the query. Integrate facts and technical details.)

      ### Identified Nuances or Contradictions
      (Discussion of differing viewpoints or conflicting information found *within the context*.)

      ### Conclusion from Research Data
      (Concise summary answering the query based *only* on the analyzed context. State limitations clearly.)

      ---
      *Analysis based on data from ${sources.length} sources. Context derived from the top ${sourcesInContext} sources.*
      `;
      
      try {
      console.log("[analyzeData] Generating final analysis...");
      addLog("Generating final analysis report...");

      // Check timeout signal before calling the model
      if (overallAbortSignal.aborted) throw new Error("Timeout before final analysis generation.");

      // Consider adding a timeout specifically for the generation call if possible/needed,
      // although the overall timeout should cover it.
      const generationConfig = {
        maxOutputTokens: MAX_TOKEN_OUTPUT_TARGET,
        temperature: 0.2, // Slightly higher for better synthesis flow, but still factual
        // topP, topK (optional, for controlling output randomness)
      };

      // Use the model to generate content
      // NOTE: Handling potential AbortSignal within the SDK call itself depends on the SDK version.
      // We rely on the outer timeout check for now.
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
         generationConfig: generationConfig,
         // Pass safetySettings if needed
       });

       // Check for cancellation *after* the call returns (if it's not inherently cancelable)
       if (overallAbortSignal.aborted) throw new Error("Timeout occurred during final analysis generation.");

      const analysisText = result.response.text();
      console.log("[analyzeData] Analysis generation complete.");
      addLog("Analysis report generated successfully.");

      // Post-processing (like table fixing) can remain if needed
       let processedText = analysisText;
       // ... (optional table fixing logic) ...

      return processedText;

    } catch (error: any) {
      // Check if the error is due to the overall timeout
       if (error.message.includes("Timeout") || error.message.includes("aborted")) {
         console.error("[analyzeData] Analysis generation failed due to timeout.");
         addLog("Analysis generation stopped due to timeout.");
         return `Research analysis could not be completed due to reaching the time limit. Partial data may have been collected from ${sources.length} sources.`;
       }
       // Handle other API errors (e.g., safety blocks, resource exhausted)
       console.error("[analyzeData] Error during analysis generation:", error);
       addLog(`Error during analysis generation: ${error.message}`);
       // Provide a more informative error message if possible
       const errorMessage = error.message.includes("SAFETY")
         ? "Content generation blocked due to safety settings."
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
    researchPath: string[]
  ): Promise<string> {
    // Create a source map for easier citation
    const sourceMap = allSources.reduce((map, source, index) => {
      try {
        const domain = new URL(source.url).hostname;
        if (!map[domain]) {
          map[domain] = {
            count: 1,
            urls: [source.url],
            titles: [source.title],
            relevanceSum: source.relevance
          };
        } else {
          map[domain].count += 1;
          map[domain].urls.push(source.url);
          map[domain].titles.push(source.title);
          map[domain].relevanceSum += source.relevance;
        }
      } catch (e) {
        // Handle invalid URLs
        console.warn(`Invalid URL in source: ${source.url}`);
      }
      return map;
    }, {} as Record<string, {count: number, urls: string[], titles: string[], relevanceSum: number}>);
    
    // --- Ensure MAX_DATA_SOURCES limit before synthesis ---
    let finalSources = allSources;
    let sourceLimitNote = "";
    if (finalSources.length > this.MAX_DATA_SOURCES) {
        console.log(`Truncating sources from ${finalSources.length} to ${this.MAX_DATA_SOURCES} before synthesis.`);
        // Assuming sources are already prioritized, take the top N
        finalSources = finalSources.slice(0, this.MAX_DATA_SOURCES);
        sourceLimitNote = `\n(Note: Displaying top ${this.MAX_DATA_SOURCES} most relevant sources out of ${allSources.length} collected)`;
    }
    // --- End MAX_DATA_SOURCES check ---

    // Prepare source summary, prioritizing most relevant domains
    const sourceSummary = Object.entries(sourceMap)
      .sort((a, b) => (b[1].relevanceSum / b[1].count) - (a[1].relevanceSum / a[1].count))
      .slice(0, 15) // Top 15 most relevant domains
      .map(([domain, info]) => `${domain} (${info.count} sources, avg relevance: ${(info.relevanceSum / info.count).toFixed(2)})`)
      .join(', ') + sourceLimitNote; // Add note about truncation if applied
    
    // Prepare research path with context
    const formattedPath = researchPath.map((q, i) => {
      if (i === 0) return `Initial query: "${q}"`;
      if (i <= 5) return `Research area ${i}: "${q}"`;
      return `Follow-up query ${i-5}: "${q}"`;
    }).join('\n');
    
    // Calculate data size and adjust chunk sizes based on our MAX_TOKEN_OUTPUT
    const initialDataSize = Math.min(15000, initialData.length);
    const followUpDataSize = Math.min(7000, Math.floor(this.MAX_TOKEN_OUTPUT / 8));
    
    // Build the context with larger chunks of data
    const researchContext = `
      Original Query: "${query}"
      
      Research Process:
      ${formattedPath}
      
      Source Diversity: Data was collected from ${finalSources.length} sources across ${Object.keys(sourceMap).length} domains. ${sourceLimitNote}
      
      Most Relevant Source Domains: ${sourceSummary}
      
      Initial Research Findings (summary):
      ${initialData.substring(0, initialDataSize)}
      
      Follow-up Research Findings (summaries):
      ${followUpData.map((d, i) => `--- Follow-up Area ${i+1} ---\n${d.substring(0, followUpDataSize)}`).join('\n\n')}
    `;

    // Create a more comprehensive prompt that utilizes our higher token capacity
    const prompt = `
      Task: Synthesize all research data into a comprehensive, evidence-based report on "${query}".
      
      Research Context:
      ${researchContext}
      
      Instructions:
      1. Cross-reference information across multiple sources to verify accuracy - look for consensus among at least 3 sources when possible
      2. Prioritize findings that are supported by multiple credible sources with higher relevance scores
      3. Clearly identify areas where sources disagree and explain the different perspectives
      4. Document the confidence level for each major conclusion (HIGH/MEDIUM/LOW)
      5. Maintain objectivity and avoid speculation - clearly distinguish between facts and interpretations
      6. Ensure all claims are backed by specific evidence from the research
      7. Present alternative perspectives where relevant
      8. Be specific about dates, numbers, versions, and technical details - include exact version numbers when mentioned
      9. Provide in-depth analysis that goes beyond surface-level information
      10. For technical topics, include code examples when available
      11. For comparison topics, use tables to clearly show differences - ensure tables use proper markdown formatting with: 
          | Header 1 | Header 2 | Header 3 |
          | --- | --- | --- |
          | Data 1 | Data 2 | Data 3 |
      12. Use numbered lists for steps, processes, or sequences of events
      13. Be skeptical of information that contradicts established knowledge or seems implausible
      14. Use your own critical thinking to evaluate claims found in sources
      
      Format as a professional research report with these comprehensive sections:
      
      EXECUTIVE SUMMARY
      (Concise overview of the most important findings - approximately 300 words)
      
      INTRODUCTION
      (Topic background, significance, scope of the research)
      
      METHODOLOGY
      (Research approach, sources consulted, validation methods)
      
      KEY FINDINGS
      (Major discoveries organized by relevance and topic area)
      
      DETAILED ANALYSIS
      (In-depth examination of findings with supporting evidence)
      
      TECHNICAL DETAILS
      (Specifications, configurations, implementation details when applicable)
      
      CODE EXAMPLES
      (Any relevant code samples from the research)
      
      COMPARATIVE ASSESSMENT
      (Comparisons with alternatives or previous versions when applicable)
      
      LIMITATIONS AND CONSIDERATIONS
      (Constraints, caveats, areas of uncertainty)
      
      FUTURE DIRECTIONS
      (Emerging trends, upcoming developments, research gaps)
      
      CONCLUSIONS
      (Evidence-supported answers to the original query)
      
      REFERENCES
      (Sources organized by domain, with relevance scores)
      
      Include specific citations when presenting factual information using the format [Source: domain.com].
      Focus on delivering actionable insights with maximum detail based on verifiable data from the top ${finalSources.length} sources.
      This is for an expert audience that wants comprehensive technical information without oversimplification.
      YOUR RESPONSE SHOULD BE GREATLY DETAILED WITH SIGNIFICANT LENGTH - USE THE FULL AVAILABLE TOKEN CAPACITY.
    `;

    try {
      console.log(`Synthesizing comprehensive research with ${finalSources.length} sources across ${Object.keys(sourceMap).length} domains`);
      // Generate content with maximum model capacity
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: this.MAX_TOKEN_OUTPUT,
          temperature: 0.1 // Lower temperature for more factual and grounded output
        }
      });
      
      // Process the response to fix table formatting
      let text = result.response.text();

      // Comprehensive table formatting fix
      // First, detect table sections
      const tablePattern = /\|[\s\S]+?\|[\s\S]+?\|/g;
      const tables = text.match(tablePattern);

      if (tables) {
        tables.forEach((tableSection: string) => {
          // Get the original table
          const originalTable = tableSection;

          // Fix the header separator row
          let fixedTable = tableSection.replace(/\|\s*[-:]+\s*\|/g, '| --- |');
          fixedTable = fixedTable.replace(/\|[-:\s|]+\n/g, '| --- | --- | --- |\n');

          // Ensure all rows have the same number of columns
          const headerRow = fixedTable.split('\n')[0];
          const columnCount = (headerRow.match(/\|/g) || []).length - 1;

          // Create a properly formatted separator row
          const separatorRow = '|' + ' --- |'.repeat(columnCount);

          // Replace the second row with our properly formatted separator
          const tableRows = fixedTable.split('\n');
          if (tableRows.length > 1) {
            tableRows[1] = separatorRow;
            fixedTable = tableRows.join('\n');
          }

          // Replace the original table with the fixed one
          text = text.replace(originalTable, fixedTable);
        });
      }

      // Fix comparative assessment section formatting
      text = text.replace(
        /(COMPARATIVE ASSESSMENT[\s\S]*?)(\n\n|$)/g,
        '## Comparative Assessment\n\n$1\n\n'
      );

      // Make all domain references clickable
      const domainPattern = /\b(?:www\.)?([\w-]+\.[\w.-]+)\b(?!\]|\))/g;
      text = text.replace(domainPattern, (match: string, domain: string) => {
        // Ensure the domain has www. if it started with it
        const fullDomain = match.startsWith('www.') ? match : domain;
        return `[${fullDomain}](https://${fullDomain})`;
      });
      
      // Remove excessive dashes that break markdown formatting
      text = text.replace(/[-]{10,}/g, '---');
      
      // Ensure proper spacing around headings
      text = text.replace(/(\n#+\s.*?)(\n[^#\n])/g, '$1\n$2');
      
      return text;
    } catch (error) {
      console.error("Error in synthesizeResearch:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `
## Research Synthesis Error

The system encountered an error while attempting to synthesize the research findings: ${errorMessage}

### Available Research Data:
- ${researchPath.length} research paths were explored
- ${finalSources.length} sources were consulted across ${Object.keys(sourceMap).length} different domains
- Initial data collection was ${initialData.length} characters in length
- ${followUpData.length} follow-up research streams were conducted

Please retry your query or contact support if this issue persists.
      `;
    }
  }

  async research(query: string): Promise<ResearchResult & {
    analysis: string;
    researchPath: string[]; // Keep track of the core queries
    plan: ResearchPlan; // Keep the plan
    researchMetrics: { // Non-optional
      sourcesCount: number; // Actual sources in the final list
      domainsCount: number;
      dataSize: string; // Size of the final analysis report
      elapsedTime: number; // Total time in ms
    };
  }> {
    this.startTime = Date.now();
    const { addLog, clearLogs } = await import('../app/api/research/progress/route');
    clearLogs();

    addLog(`Research initialized for query: "${query}"`);
    console.log(`[Research] Starting process for: "${query}" at ${new Date().toISOString()}`);

    // --- Setup Overall Timeout ---
    // Ensure we use the globally available AbortController
    const overallTimeoutController = new globalThis.AbortController();
    const researchTimeout = setTimeout(() => {
        console.warn(`[Research] Overall research timeout of ${MAX_OVERALL_RESEARCH_TIME_MS / 1000}s reached!`);
        addLog(`WARN: Research time limit reached (${MAX_OVERALL_RESEARCH_TIME_MS / 1000}s). Attempting to finalize with collected data.`);
        // Fix TS2554: Call abort() without arguments
        overallTimeoutController.abort();
    }, MAX_OVERALL_RESEARCH_TIME_MS);
    // Fix TS2345: Ensure signal is compatible by using the one from the global controller
    const overallAbortSignal = overallTimeoutController.signal;

    let finalAnalysis = "Research did not complete."; // Default analysis
    let finalSources: ResearchSource[] = []; // Initialize as empty
    let researchPlan: ResearchPlan | null = null;
    let researchPaths: string[] = [query]; // Start with the main query
    let confidenceLevel: ResearchConfidenceLevel = "very low";
    let finalMetrics: { sourcesCount: number; domainsCount: number; dataSize: string; elapsedTime: number; } | null = null;


    try {
      // --- Check Cache ---
    const cachedResult = this.getCachedResult(query);
    if (cachedResult) {
        clearTimeout(researchTimeout); // Cancel timeout if using cache
        addLog(`Using cached result.`);
        return cachedResult;
      }

      // --- Phase 1: Planning ---
      addLog("Phase 1: Creating research plan...");
      console.log("[Research] Phase 1: Planning...");
       if (overallAbortSignal.aborted) throw new Error("Timeout during planning phase."); // Check before starting
      try {
        researchPlan = await this.createResearchPlan(query);
         researchPaths = [query, ...(researchPlan?.subQueries?.slice(0, 3) || [])]; // Track main + few sub-queries
         addLog(`Research plan created with ${researchPlan?.subQueries?.length || 0} sub-queries.`);
      } catch (planError: any) {
        console.error("Failed to create research plan:", planError);
         addLog(`Warning: Failed to create plan (${planError.message}). Using basic query.`);
         researchPlan = { mainQuery: query, objective: `Gather information on ${query}`, subQueries: [query], researchAreas: [], explorationStrategy: '', priorityOrder: [] };
         researchPaths = [query];
      }

      // --- Phase 2: Deep Crawling ---
      addLog("Phase 2: Conducting deep web crawl...");
      console.log("[Research] Phase 2: Deep Crawling...");
      if (overallAbortSignal.aborted) throw new Error("Timeout before crawling phase."); // Check before starting
      const crawlResult = await this.crawlWeb(query, overallAbortSignal);
      finalSources = crawlResult.sources; // Get sources collected before potential timeout
      addLog(`Crawling complete. Collected ${finalSources.length} sources. URLs attempted: ${crawlResult.crawledUrlCount}, Failed: ${crawlResult.failedUrlCount}.`);
      console.log(`[Research] Crawling finished. Sources: ${finalSources.length}, Attempted: ${crawlResult.crawledUrlCount}, Failed: ${crawlResult.failedUrlCount}`);

      // --- Phase 3: Analysis & Synthesis ---
      addLog("Phase 3: Analyzing collected data and synthesizing report...");
      console.log("[Research] Phase 3: Analysis & Synthesis...");
      if (overallAbortSignal.aborted && finalSources.length === 0) {
         // If timeout hit *before* any sources were collected
         throw new Error("Timeout occurred before any sources could be analyzed.");
      }
      // Proceed with analysis even if timeout hit during crawl, using whatever sources were found
      finalAnalysis = await this.analyzeData(query, finalSources, overallAbortSignal); // Pass collected sources and signal

      // --- Phase 4: Finalization ---
      addLog("Phase 4: Finalizing report and metrics...");
      console.log("[Research] Phase 4: Finalizing...");
      // Calculate metrics based on the final state
      const finalDomains = new Set(finalSources.map(s => { try { return new URL(s.url).hostname; } catch { return s.url; } }));
      const elapsedTimeMs = Date.now() - this.startTime;
      confidenceLevel = this.calculateConfidenceLevel(finalSources, query); // Calculate confidence

      finalMetrics = {
         sourcesCount: finalSources.length,
         domainsCount: finalDomains.size,
         dataSize: `${Math.round(Buffer.byteLength(finalAnalysis || '', 'utf8') / 1024)}KB`,
         elapsedTime: Math.min(elapsedTimeMs, MAX_OVERALL_RESEARCH_TIME_MS) // Cap elapsed time at max allowed
      };

      console.log(`[Research] Process completed in ${(finalMetrics.elapsedTime / 1000).toFixed(1)}s`);
      addLog(`Research process finished in ${(finalMetrics.elapsedTime / 1000).toFixed(1)}s.`);

      // Construct the final result object
      const result: ResearchResult & {
        analysis: string; researchPath: string[]; plan: ResearchPlan;
        researchMetrics: { sourcesCount: number; domainsCount: number; dataSize: string; elapsedTime: number; };
      } = {
         query: query,
         // Simplified findings - main content is in analysis
         findings: [{ key: "Main Analysis", details: finalAnalysis.substring(0, 500) + (finalAnalysis.length > 500 ? "..." : "") }],
         sources: finalSources, // The actual sources used/collected
         confidenceLevel: confidenceLevel,
         codeExamples: [], // Populate if analyzeData provides them separately
         insights: [], // Populate if analyzeData provides them separately
         metadata: { // Add more metadata if available
             totalSources: finalMetrics.sourcesCount,
             // Add missing properties with default values
             qualitySources: 0, // Default value as validation isn't fully active
             avgValidationScore: 0.0, // Default value
             executionTimeMs: finalMetrics.elapsedTime,
             timestamp: new Date().toISOString()
         },
         analysis: finalAnalysis,
         researchPath: researchPaths, // Use the tracked paths
         plan: researchPlan || { mainQuery: query, objective: '', subQueries: [], researchAreas: [], explorationStrategy: '', priorityOrder: [] }, // Ensure plan exists
         researchMetrics: finalMetrics // Assign final metrics
      };

      // Cache the successful result
      this.cache.set(query, { data: result, timestamp: Date.now() });
      clearTimeout(researchTimeout); // Clear timeout successfully
      return result;

    } catch (error: any) {
        clearTimeout(researchTimeout); // MUST clear timeout in case of error
        console.error(`[Research] CRITICAL ERROR for query "${query}":`, error);
        addLog(`CRITICAL ERROR: ${error.message}`);

        // If timeout occurred, analysis might still contain partial results or a timeout message
        const isTimeoutError = error.message.includes("Timeout");
        finalAnalysis = isTimeoutError
            ? (finalAnalysis || `Research aborted due to time limit (${MAX_OVERALL_RESEARCH_TIME_MS / 1000}s).`) // Use existing analysis if available
            : `Research failed critically: ${error.message}`;

        // Calculate final metrics even on error, using potentially partial data
        const finalDomainsOnError = new Set(finalSources.map(s => { try { return new URL(s.url).hostname; } catch { return s.url; } }));
        const elapsedTimeMsOnError = Date.now() - this.startTime;
        finalMetrics = {
             sourcesCount: finalSources.length, // Sources collected before error
             domainsCount: finalDomainsOnError.size,
             dataSize: `${Math.round(Buffer.byteLength(finalAnalysis || '', 'utf8') / 1024)}KB`,
             elapsedTime: Math.min(elapsedTimeMsOnError, MAX_OVERALL_RESEARCH_TIME_MS) // Cap time
        };

        // Return a structured error object compatible with the expected return type
        // This allows the API route to potentially still show partial info if desired
        return {
            query: query,
            findings: [{ key: "Error", details: error.message }],
            sources: finalSources, // Return sources collected before error
            confidenceLevel: "very low",
            codeExamples: [],
            insights: [],
            metadata: {
                totalSources: finalMetrics.sourcesCount,
                // Add missing properties with default values
                qualitySources: 0, // Default value
                avgValidationScore: 0.0, // Default value
                executionTimeMs: finalMetrics.elapsedTime,
                timestamp: new Date().toISOString(),
                error: error.message // Include error message in metadata
            },
            analysis: finalAnalysis, // Include the error message or timeout message in analysis
            researchPath: researchPaths,
            plan: researchPlan || { mainQuery: query, objective: '', subQueries: [], researchAreas: [], explorationStrategy: '', priorityOrder: [] },
            researchMetrics: finalMetrics // Include metrics calculated up to the error point
        };

        // Or re-throw for the API route to handle as a 500 error (choose one approach)
        // throw new Error(`Research failed: ${error.message}`);
    }
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
      /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi, // Full dates
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

  // Add a method to get current research progress
  getCurrentProgress(): { 
    sourcesCount: number;
    domainsCount: number;
    dataSize: string;
    elapsedTime: number;
  } {
    return {
      sourcesCount: this.sourcesCollected,
      domainsCount: this.domainsCollected.size,
      dataSize: `${this.dataSize.toFixed(2)}KB`,
      elapsedTime: this.elapsedTime
    };
  }

  // Helper method to create search URLs
  private createSearchUrls(queries: string[], domains: string[]): string[] {
    const urls: string[] = [];
    
    // Search engines
    const searchEngines = [
      'https://www.google.com/search?q=',
      'https://www.bing.com/search?q=',
      'https://search.brave.com/search?q=',
      'https://duckduckgo.com/?q=',
      'https://www.ecosia.org/search?q='
    ];
    
    // Create search URLs
    for (const query of queries) {
      for (const engine of searchEngines) {
        urls.push(`${engine}${encodeURIComponent(query)}`);
      }
      
      // Domain-specific searches
      for (const domain of domains.slice(0, 20)) { // Limit to first 20 domains
        urls.push(`https://www.google.com/search?q=${encodeURIComponent(query)}+site:${domain}`);
      }
    }
    
    return urls;
  }

  // Extract title from HTML content
  private extractTitleFromHTML(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  /**
   * Calculate confidence level based on various factors
   */
  private calculateConfidenceLevel(sources: ResearchSource[], query: string): ResearchConfidenceLevel {
    // Calculate total credibility score based on sources
    let totalCredibility = 0;
    let highAuthorityCount = 0;
    let consistentSourceCount = 0;
    let recentSourceCount = 0;
    
    // Count unique domains to assess diversity
    const domains = new Set<string>();
    
    // Track consensus on key points
    const keyPoints = new Map<string, number>();
    
    // Process each source
    sources.forEach(source => {
      try {
        // Add domain
        const domain = new URL(source.url).hostname;
        domains.add(domain);
        
        // Check authority
        if (source.validationScore && source.validationScore > 0.7) {
          highAuthorityCount++;
        }
        
        // Check if recent (if timestamp exists)
        if (source.timestamp) {
          const sourceDate = new Date(source.timestamp);
          const now = new Date();
          const monthsAgo = (now.getFullYear() - sourceDate.getFullYear()) * 12 + 
                            now.getMonth() - sourceDate.getMonth();
          
          if (monthsAgo <= 6) { // Within last 6 months
            recentSourceCount++;
          }
        }
        
        // Extract key points (simplified)
        if (source.content) {
          const sentences = source.content.split(/[.!?]+/).filter(s => s.length > 30);
          sentences.forEach(sentence => {
            // Create a simplified hash of the sentence meaning
            const words = sentence.toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter(w => w.length > 4);
            
            if (words.length >= 3) {
              const significantWords = words
                .filter(w => !['about', 'these', 'those', 'their', 'would', 'could', 'should'].includes(w))
                .slice(0, 5)
                .sort()
                .join('|');
                
              keyPoints.set(significantWords, (keyPoints.get(significantWords) || 0) + 1);
            }
          });
        }
        
      } catch (e) {
        // Skip processing errors
      }
    });
    
    // Calculate confidence indicators
    const sourceCount = sources.length;
    const domainDiversity = domains.size;
    const highAuthorityRatio = sourceCount > 0 ? highAuthorityCount / sourceCount : 0;
    const recentSourceRatio = sourceCount > 0 ? recentSourceCount / sourceCount : 0;
    
    // Calculate consensus level
    let consensusPoints = 0;
    let pointsWithConsensus = 0;
    
    keyPoints.forEach((count) => {
      if (count >= 3) { // At least 3 sources agree
        pointsWithConsensus++;
        consensusPoints += count;
      }
    });
    
    const consensusStrength = keyPoints.size > 0 ? pointsWithConsensus / keyPoints.size : 0;
    
    // Calculate total confidence score (weighted)
    const score = 
      (sourceCount > 200 ? 0.25 : sourceCount > 100 ? 0.2 : sourceCount > 50 ? 0.15 : 0.1) +
      (domainDiversity > 20 ? 0.15 : domainDiversity > 10 ? 0.1 : domainDiversity > 5 ? 0.05 : 0) +
      (highAuthorityRatio * 0.25) +
      (recentSourceRatio * 0.15) +
      (consensusStrength * 0.25);
    
    // Map score to confidence level
    if (score >= 0.75) return "very high";
    if (score >= 0.6) return "high";
    if (score >= 0.4) return "medium";
    if (score >= 0.25) return "low";
    return "very low";
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
    // Use globalThis.AbortController here too for consistency
    const controller = new globalThis.AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Assign the signal from the *local* controller for *this specific fetch timeout*
    const localSignal = controller.signal;
    // Combine the local signal with the overall signal if provided
    const combinedSignal = this.combineSignals(localSignal, options.signal); // Helper needed

    const fetchOptions: RequestInit = {
      ...options,
      signal: combinedSignal, // Use the combined signal
      headers: { // Ensure headers are correctly typed
          ...options.headers,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'DNT': '1'
      }
    };


    try {
      // The native fetch function expects a standard RequestInit object
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeout); // Clear local timeout

      if (!response.ok) {
        // Retry on specific server errors or rate limiting
        if ((response.status === 429 || response.status >= 500) && retries > 0) {
          console.warn(`Fetch failed for ${url} with status ${response.status}. Retrying (${retries} left)...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (MAX_FETCH_RETRIES - retries + 1))); // Exponential backoff
          // Important: Check overall timeout before retrying - use options.signal directly here
          if (options.signal?.aborted) throw new Error('Overall research timeout exceeded during retry wait.');
          return this.fetchWithRetry(url, options, retries - 1); // Pass original options for overall signal tracking
        }
        // Throw error for non-retryable status codes
        throw new Error(`Fetch failed for ${url} with status ${response.status}`);
      }

      // Check content type - only process HTML/XML/Text for content extraction
      const contentType = response.headers.get('content-type');
      if (contentType && !/(text\/html|application\/xhtml\+xml|application\/xml|text\/plain)/i.test(contentType)) {
         console.log(`Skipping non-text content (${contentType}) from ${url}`);
         // Return a minimal response or throw an error to skip processing
         throw new Error(`Skipping non-text content type: ${contentType}`);
      }

      return response; // Success
    } catch (error: any) {
      clearTimeout(timeout); // Clear local timeout
      // If it's an AbortError, check which signal caused it
      if (error.name === 'AbortError') {
          // Check if it was the overall research timeout first
          if (options.signal?.aborted) { // Check the *overall* signal passed in options
               console.log(`Fetch aborted for ${url} due to overall research timeout.`);
               throw new Error('Overall research timeout exceeded');
          } else { // Otherwise, it was the local fetch timeout
              console.warn(`Fetch timed out for ${url} after ${FETCH_TIMEOUT_MS}ms.`);
              throw new Error(`Fetch timed out for ${url}`);
          }
      }
      // Handle retry logic for other fetch errors
      if (retries > 0 && error.name !== 'AbortError') {
        // ... retry logic ...
        // Important: Check overall timeout before retrying
        if (options.signal?.aborted) throw new Error('Overall research timeout exceeded during retry wait.');
        return this.fetchWithRetry(url, options, retries - 1); // Pass original options
      }
      console.error(`Fetch failed permanently for ${url}: ${error.message}`);
      throw error;
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
}
