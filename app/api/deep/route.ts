import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PQueue from 'p-queue'; // Add this
import axiosRetry from 'axios-retry'; // Add this
import { sendMessageToJob } from '../research-stream/route';

// Config (unchanged)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-your-key';
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || 'your-google-key';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/deep-research';
const JINA_READER_URL = 'https://r.jina.ai/';

// Types (updated with jinaDepth)
interface ResearchParams {
  maxDepth?: number;
  maxUrls?: number;
  timeLimit?: number;
  jinaDepth?: number; // Added for Jina Reader slicing control
}

interface ResearchSource {
  url: string;
  title: string;
  description: string;
  crawlData?: any;
}

interface ResearchResponse {
  success: boolean;
  data: {
    finalAnalysis: string;
    sources: ResearchSource[];
  };
  status: string;
  id?: string;
  currentDepth?: number;
}

interface RequestBody {
  query: string;
  params?: ResearchParams;
  mode?: 'non-think' | 'think';
}

function getFormattedDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());
}

// Helper function to emit research events
function emitResearchEvent(jobId: string, type: 'search' | 'crawl' | 'fetch' | 'analyze' | 'synthesize' | 'complete', message: string, sourceUrl?: string, sourceTitle?: string) {
  if (!jobId) return;
  
  sendMessageToJob(jobId, {
    type: 'activity',
    data: {
      id: `${type}-${Date.now()}`,
      type,
      message,
      timestamp: Date.now(),
      sourceUrl,
      sourceTitle
    }
  });
}

// Helper function to emit source events
function emitSourceEvent(jobId: string, source: ResearchSource) {
  if (!jobId) return;
  
  sendMessageToJob(jobId, {
    type: 'source',
    data: source
  });
}

// Poll status with progress updates
async function pollJobStatus(jobId: string, endpoint: 'deep-research', timeoutMs: number = 900000, currentJobId?: string): Promise<any> {
  console.log(`[POLLING START] 😍 Job ID: ${jobId}, Endpoint: ${endpoint}, Timeout: ${timeoutMs}ms`);
  emitResearchEvent(currentJobId || '', 'crawl', `Discovering relevant sources with job ID: ${jobId}`);
  
  const startTime = Date.now();
  const url = `https://api.firecrawl.dev/v1/${endpoint}/${jobId}`;

  while (Date.now() - startTime < timeoutMs) {
    console.log(`[POLLING]✅  Checking status for Job ID: ${jobId} on ${endpoint}`);
    try {
      const statusRes = await axios.get(url, {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      });
      const statusData = statusRes.data;
      console.log(`[POLLING RESPONSE] ✔️ Status: ${statusData.status}, Data: ${JSON.stringify(statusData, null, 2)}`);

      // Emit events for any new sources
      if (statusData.data?.sources && statusData.data.sources.length > 0 && currentJobId) {
        statusData.data.sources.forEach((source: ResearchSource) => {
          emitSourceEvent(currentJobId, source);
          emitResearchEvent(currentJobId, 'fetch', `Found source: ${source.title || source.url}`, source.url, source.title);
        });
      }

      if (statusData.status === 'completed') {
        console.log(`[POLLING COMPLETE]✅  Job ${jobId} finished`);
        emitResearchEvent(currentJobId || '', 'analyze', `Completed collecting ${statusData.data?.sources?.length || 0} sources`);
        return statusData;
      }
      
      // Update client with progress
      emitResearchEvent(currentJobId || '', 'crawl', `Still processing... (Status: ${statusData.status})`);
      
      console.log(`[POLLING WAIT] 🚧 Status not completed, waiting 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[POLLING ERROR] ❌ Failed to check status: ${(error as Error).message}`);
      emitResearchEvent(currentJobId || '', 'crawl', `Encountered error: ${(error as Error).message}`);
    }
  }
  console.error(`[POLLING TIMEOUT] ⚠️ Job ${jobId} exceeded ${timeoutMs}ms`);
  emitResearchEvent(currentJobId || '', 'crawl', `Timeout: Job exceeded ${timeoutMs}ms`);
  throw new Error(`${endpoint} job timed out`);
}

// New Jina Fetch Function with Retries & Events
const axiosInstance = axios.create({
  timeout: 30000, // Bump to 30s for reliability
  headers: { 'Accept': 'text/markdown' },
});

axiosRetry(axiosInstance, {
  retries: 5, // Retry up to 5 times
  retryDelay: (retryCount) => {
    const delay = Math.pow(2, retryCount) * 375; // Reduced delay: 0.75s, 1.5s, 3s, 6s, 12s
    console.log(`[JINA RETRY] Attempt ${retryCount}, waiting ${delay}ms`);
    return delay;
  },
  retryCondition: (error) => {
    const status = error.response?.status;
    return status === 429 || axios.isAxiosError(error); // Retry on 429 or network errors
  },
});

async function fetchJinaContent(url: string, index: number, total: number, jinaDepth: number = 10, currentJobId?: string): Promise<any> {
  try {
    console.log(`[JINA PROGRESS] Processing URL ${index + 1}/${total}: ${url} with depth ${jinaDepth}`);
    
    // Emit event for this fetch
    emitResearchEvent(currentJobId || '', 'analyze', `Processing content from ${url} (${index + 1}/${total})`, url);
    
    const jinaRes = await axiosInstance.get(`${JINA_READER_URL}${encodeURIComponent(url)}`);
    console.log(`[JINA SUCCESS]✅ Fetched ${url}`);
    emitResearchEvent(currentJobId || '', 'analyze', `Successfully extracted content from ${url}`, url);
    
    // Use jinaDepth to control how much content to keep
    let content = jinaRes.data;
    if (content && typeof content === 'string' && jinaDepth < 95) {
      // Estimated average markdown paragraph length is ~500 chars
      // So multiply jinaDepth by a factor to get approximate character count
      const charLimit = jinaDepth * 750;
      content = content.substring(0, charLimit) + (content.length > charLimit ? '\n\n...(content truncated based on depth setting)' : '');
      console.log(`[JINA DEPTH] Content truncated to ${charLimit} characters based on depth ${jinaDepth}`);
    }
    
    return { url, data: [{ content }] };
  } catch (error) {
    console.error(`[JINA ERROR]❌ Failed for ${url}: ${(error as Error).message}`);
    emitResearchEvent(currentJobId || '', 'analyze', `Failed to extract content from ${url}: ${(error as Error).message}`, url);
    throw error; // Let PQueue handle it
  }
}

// POST Handler with updated events
export async function POST(req: Request) {
  console.log('[REQUEST START] Incoming POST request');

  let query: string | undefined;
  let params: ResearchParams | undefined;
  let mode: 'non-think' | 'think' = 'non-think';
  let currentJobId: string | undefined;

  try {
    const rawBody = await req.text();
    console.log(`[RAW BODY] ${rawBody}`);
    const body = JSON.parse(rawBody) as RequestBody;
    
    // Extract query and params, explicitly set mode default to 'non-think' if not provided
    query = body.query;
    params = body.params;
    mode = body.mode || 'non-think'; // Default to 'non-think' if mode is not provided
    
    console.log(`[REQUEST DATA] 🔥 Query: ${query}, Params: ${JSON.stringify(params)}, Mode: ${mode}`);
  } catch (error) {
    console.error(`[JSON PARSE ERROR] ❌ Invalid JSON: ${(error as Error).message}`);
    return NextResponse.json(
      { error: '😢 Invalid JSON in request body', details: (error as Error).message },
      { status: 400 }
    );
  }

  if (!query) {
    console.log('[VALIDATION FAIL]❌ No query provided');
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    // Extract and validate parameters with defaults
    const maxUrls = params?.maxUrls && params.maxUrls >= 15 && params.maxUrls <= 120 
      ? params.maxUrls 
      : 15; // Default to 15, range 15-120
    
    const maxDepth = 5; // Fixed at 5 regardless of input
    
    const timeLimit = params?.timeLimit && params.timeLimit >= 150 && params.timeLimit <= 600 
      ? params.timeLimit 
      : 150; // Default to 150, range 150-600
    
    const jinaDepth = params?.jinaDepth && params.jinaDepth >= 10 && params.jinaDepth <= 95 
      ? params.jinaDepth 
      : 10; // Default to 10, range 10-95
    
    console.log(`[VALIDATED PARAMS] MaxUrls: ${maxUrls}, MaxDepth: ${maxDepth} (fixed), TimeLimit: ${timeLimit}, JinaDepth: ${jinaDepth}`);

    // Generate a currentJobId for tracking this session
    currentJobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    emitResearchEvent(currentJobId, 'search', `Starting deep research on "${query}"`);
    
    // Step 1: Firecrawl Deep Research (updated with validated params)
    console.log('[FIRECRAWL START]🔥 Initiating deep research - Pass 1');
    emitResearchEvent(currentJobId, 'crawl', `Initiating web search for "${query}"`);
    
    const firecrawlRes = await axios.post<ResearchResponse>(
      FIRECRAWL_URL,
      {
        query,
        maxDepth: maxDepth, // Fixed at 5
        maxUrls: maxUrls,
        timeLimit: timeLimit,
      },
      { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const initialResearch = firecrawlRes.data;
    console.log(`[FIRECRAWL RESPONSE] 🔥Status: ${initialResearch.status}, ID: ${initialResearch.id || 'none'}, Data: ${JSON.stringify(initialResearch, null, 2)}`);

    let research: ResearchResponse;
    if (initialResearch.status === 'completed') {
      console.log('[FIRECRAWL DONE]✅ Research completed immediately');
      emitResearchEvent(currentJobId, 'analyze', `Initial research completed successfully`);
      research = initialResearch;
    } else if (initialResearch.id) {
      console.log(`[FIRECRAWL ASYNC] 🚀Job started, polling ID: ${initialResearch.id}`);
      research = await pollJobStatus(initialResearch.id, 'deep-research', undefined, currentJobId);
    } else {
      console.log('[FIRECRAWL FAIL] ❌ No job ID returned');
      emitResearchEvent(currentJobId, 'analyze', `Failed to start research process: No job ID returned`);
      return NextResponse.json({ error: 'No job ID returned' }, { status: 500 });
    }

    // Add sources to sidebar
    if (research.data.sources && research.data.sources.length > 0) {
      research.data.sources.forEach(source => {
        emitSourceEvent(currentJobId || '', source);
      });
    }

    // Step 2: Refine (updated with validated params)
    if (research.data.sources.length < 5 || !research.data.finalAnalysis) {
      console.log('[REFINE] Initial results too thin, starting second pass');
      emitResearchEvent(currentJobId, 'crawl', `Expanding search with specialized queries`);
      
      const subQueries = [
        `${query} technical details`,
        `${query} case studies`,
        `${query} latest developments`,
      ];
      
      const secondPassRes = await Promise.all(
        subQueries.map((subQuery) => {
          emitResearchEvent(currentJobId || '', 'search', `Searching for "${subQuery}"`);
          return axios.post<ResearchResponse>(
            FIRECRAWL_URL,
            { 
              query: subQuery, 
              maxDepth: maxDepth, // Fixed at 5 
              maxUrls: Math.floor(maxUrls / 3), // Divide by 3 for sub-queries 
              timeLimit: Math.floor(timeLimit / 2) // Half the time for sub-queries
            },
            { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
          );
        })
      );
      
      const secondPassData = await Promise.all(
        secondPassRes.map((res, index) => {
          if (res.data.id) {
            emitResearchEvent(currentJobId || '', 'crawl', `Processing supplementary search ${index + 1}/3: ${subQueries[index]}`);
            return pollJobStatus(res.data.id, 'deep-research', undefined, currentJobId);
          }
          return Promise.resolve(res.data);
        })
      );
      
      // Add all new sources
      const newSources = secondPassData.flatMap(d => d.data.sources);
      research.data.sources = [...research.data.sources, ...newSources];
      research.data.finalAnalysis += '\n\n' + secondPassData.map(d => d.data.finalAnalysis).join('\n');
      
      // Register new sources in the sidebar
      newSources.forEach(source => {
        emitSourceEvent(currentJobId || '', source);
      });
      
      console.log(`[REFINE COMPLETE]✅ Added ${research.data.sources.length} total sources`);
      emitResearchEvent(currentJobId, 'analyze', `Refined search complete. Total sources: ${research.data.sources.length}`);
    }

    if (!research.data.sources.length) {
      console.log('[VALIDATION FAIL]❌ No sources found after refinement');
      emitResearchEvent(currentJobId, 'analyze', `Search failed: No sources found`);
      return NextResponse.json({ success: false, error: 'No sources found for deep research' }, { status: 404 });
    }

    // Step 3: Jina Reader with Rate-Limited Queue and Depth Control
    console.log(`[JINA READER START]🔥 Fetching content with Jina Reader (Depth: ${jinaDepth})`);
    emitResearchEvent(currentJobId, 'analyze', `Starting content extraction from ${Math.min(maxUrls, research.data.sources.length)} sources`);
    
    const sourceUrls = research.data.sources.slice(0, maxUrls).map(source => source.url);
    console.log(`[JINA SOURCE COUNT] Processing ${sourceUrls.length} URLs`);

    // Set up PQueue: 50 requests per minute (conservative guess for Jina's free tier)
    const queue = new PQueue({
      concurrency: 1, // 1 request at a time
      intervalCap: 50, // Max 50 requests per interval
      interval: 60 * 1000, // Per minute
      timeout: 60000, // 60s per request
      carryoverConcurrencyCount: true, // Respect concurrency even for queued tasks
    });

    const jinaResults = await queue.addAll(
      sourceUrls.map((url, index) => async () => {
        try {
          // Pass the jinaDepth parameter to fetchJinaContent
          const result = await fetchJinaContent(url, index, sourceUrls.length, jinaDepth, currentJobId);
          return result;
        } catch (error) {
          console.error(`[JINA FINAL FAIL]❌ Unrecoverable error for ${url}: ${(error as Error).message}`);
          return { url, data: [] }; // Fallback empty result
        }
      })
    );

    console.log(`[JINA READER COMPLETE]✅ Processed ${jinaResults.length} URLs with depth ${jinaDepth}`);
    emitResearchEvent(currentJobId, 'analyze', `Content extraction complete. Processed ${jinaResults.length} URLs.`);

    const enhancedSources = research.data.sources.map(source => {
      const jinaResult = jinaResults.find(result => result.url === source.url);
      return {
        ...source,
        crawlData: jinaResult?.data || [],
      };
    });

    // Step 4: Gemini Synthesis
    console.log('[GEMINI START] 🌟 Initializing Gemini synthesis');
    emitResearchEvent(currentJobId, 'synthesize', `Starting AI synthesis of research data using ${mode === 'think' ? 'Gemini Pro' : 'Gemini Flash'}`);
    
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    
    // Choose model based on mode - think uses Gemini Pro, non-think uses Gemini Flash
    const selectedModel = mode === 'non-think' ? 'gemini-2.0-flash' : 'gemini-2.0-pro-exp-02-05';
    console.log(`[MODEL SELECTED]🚀 Using ${selectedModel} based on mode: ${mode}`);

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        maxOutputTokens: selectedModel === 'gemini-2.0-pro-exp-02-05' ? 80000 : 50000,
        temperature: selectedModel === 'gemini-2.0-pro-exp-02-05' ? 0.1 : 0.1,
      },
    });

    const today = getFormattedDate();
    const synthesisPrompt = `
    Always start with  Date ${today} 
Synthesize the following information into a comprehensive, detailed research report (minimum 3000 words) formatted in Markdown.
**Most important Instructions:**
- ❌ Never  Ever begin the output with triple backticks '''markdown'' as it will break the markdown parser but generate the report in markdown format.

**Core Instructions:**
1. **Length Requirement:** Generate a detailed report of AT LEAST 2000-3000 words. Include extensive analysis, examples, and thorough explanations.

2. **Citation Format:** Always use proper Markdown links for citations:
  - Format: \`[Source Name](URL)\`
  - Example: According to [Netguru](https://www.netguru.com), ...
  - EVERY major claim must have a linked citation
  - Prefer format: "[SourceName.com](url)" over naked URLs

3. **Structure & Detail:**
  - Start with an Executive Summary (500+ words)
  - Include 5-8 main sections with detailed subsections
  - Each major section should be 1000+ words
  - Use tables for comparative data EARLY in the report
  - Include relevant code examples (if found in sources)
  - End with decisive conclusions

4. **Quantification & Metrics:**
  - Prioritize concrete metrics over qualitative claims
  - Include exact numbers, percentages, speeds, costs, dates
  - Create comparative tables for quantifiable data points
  - Clearly state if metrics are missing for key areas
  - Use tables to summarize benchmarks and specifications

5. **Source Handling:**
  - Base analysis STRICTLY on provided sources
  - Prefer primary sources (official docs, research papers)
  - Note source freshness (aim for last 6-12 months)
  - Cite ALL significant claims
  - Include source publication dates when available

6. **Code Examples (Technical Topics):**
  - ONLY include code examples found in source material
  - NO hypothetical or generated code examples
  - Use proper Markdown code blocks with language
  - Explain existing code's logic and purpose
  - Link code to source documentation

7. **Data Presentation:**
  - Use Markdown tables strategically and early
  - Summarize key comparisons in tables
  - Minimize prose around tables
  - Present benchmarks and specs in structured format
  - Include source citations in/after tables

8. **Conclusions & Recommendations:**
  - Provide firm, specific conclusions
  - State main takeaway first
  - Avoid hedging phrases ("it depends")
  - Base recommendations only on provided data
  - Include implementation considerations

9. **Real-World Context:**
  - Link findings to practical applications
  - Include case studies from sources
  - Discuss user/business impact
  - Provide concrete implementation examples
  - Focus on actionable insights

10. **Content Requirements:**
   - Deep technical analysis where applicable
   - Concrete metrics and statistics
   - Real-world examples and case studies
   - Industry implications
   - Future trends and predictions
   - Critical analysis of limitations
   - Practical applications

11. **Citation Guidelines:**
   - Every paragraph must have at least one citation
   - Link directly to sources using Markdown syntax
   - Format: "[Company/Source](URL) states/reports/indicates..."
   - For multiple sources: "Research from [Source1](URL1) and [Source2](URL2) shows..."

Input Data:
Sources:
${JSON.stringify(enhancedSources, null, 2)}

Initial Analysis:
${research.data.finalAnalysis}

IMPORTANT: 
- Generate a MINIMUM of 2000 words with extensive detail and proper Markdown source linking
- Focus on depth, completeness, and thorough analysis while maintaining readability
- Prioritize concrete metrics and quantifiable data
- Use tables early and strategically
- Base ALL content strictly on provided sources
- Make decisive conclusions and recommendations
- Each source includes 'crawlData', which contains detailed markdown content from Jina Reader for that URL. Use this data to enhance the report with in-depth information.
`;
  
    // Send periodic updates about progress
    emitResearchEvent(currentJobId, 'synthesize', `AI processing ${enhancedSources.length} sources with ${selectedModel}`);
    
    // Create a timeout to show periodic AI progress updates
    const aiUpdateInterval = setInterval(() => {
      emitResearchEvent(currentJobId || '', 'synthesize', `AI is synthesizing research data (${selectedModel})...`);
    }, 10000); // Update every 10 seconds
    
    try {
      const geminiRes = await model.generateContent(synthesisPrompt);
      clearInterval(aiUpdateInterval);
      
      const responseText = geminiRes.response?.text();
      if (!responseText) {
        console.error("[GEMINI ERROR] No text generated in response:", geminiRes.response);
        emitResearchEvent(currentJobId || '', 'synthesize', `Error: AI failed to generate report text`);
        throw new Error('Gemini failed to generate a valid report text.');
      }
      
      const report = responseText;
      console.log(`[GEMINI RESULT] ⚡️Report Length: ${report.length}`);
      emitResearchEvent(currentJobId, 'complete', `Report generation complete (${report.length} characters)`);

      // Step 5: Return Enhanced Result (unchanged)
      console.log('[RESPONSE PREP]🔥 Preparing final response');
      const response = {
        success: true,
        report,
        sources: enhancedSources,
        originalAnalysis: research.data.finalAnalysis,
        depthAchieved: research.currentDepth || 'unknown',
        sourceCount: enhancedSources.length,
        modelUsed: selectedModel,
        researchParams: { maxUrls, maxDepth, timeLimit, jinaDepth }, // Include the actual params used
        jobId: currentJobId // Include the job ID for client reference
      };
      console.log(`[RESPONSE SENT] ✅${JSON.stringify(response, null, 2)}`);
      return NextResponse.json(response);
    } catch (error) {
      clearInterval(aiUpdateInterval);
      emitResearchEvent(currentJobId || '', 'synthesize', `Error during AI synthesis: ${(error as Error).message}`);
      throw error;
    }

  } catch (error) {
    console.error(`[ERROR]😢 ❌Something went wrong: ${(error as Error).message}`);
    emitResearchEvent(currentJobId || '', 'complete', `Research failed: ${(error as Error).message}`);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message, jobId: currentJobId }, { status: 500 });
  }
}