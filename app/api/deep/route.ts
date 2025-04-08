import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PQueue from 'p-queue'; // Add this
import axiosRetry from 'axios-retry'; // Add this

// Config (unchanged)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-your-key';
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || 'your-google-key';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/deep-research';
const JINA_READER_URL = 'https://r.jina.ai/';

// Types (unchanged)
interface ResearchParams {
  maxDepth?: number;
  maxUrls?: number;
  timeLimit?: number;
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

// Poll status (unchanged)
async function pollJobStatus(jobId: string, endpoint: 'deep-research', timeoutMs: number = 900000): Promise<any> {
  console.log(`[POLLING START] 😍 Job ID: ${jobId}, Endpoint: ${endpoint}, Timeout: ${timeoutMs}ms`);
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

      if (statusData.status === 'completed') {
        console.log(`[POLLING COMPLETE]✅  Job ${jobId} finished`);
        return statusData;
      }
      console.log(`[POLLING WAIT] 🚧 Status not completed, waiting 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[POLLING ERROR] ❌ Failed to check status: ${(error as Error).message}`);
    }
  }
  console.error(`[POLLING TIMEOUT] ⚠️ Job ${jobId} exceeded ${timeoutMs}ms`);
  throw new Error(`${endpoint} job timed out`);
}

// New Jina Fetch Function with Retries
const axiosInstance = axios.create({
  timeout: 30000, // Bump to 30s for reliability
  headers: { 'Accept': 'text/markdown' },
});

axiosRetry(axiosInstance, {
  retries: 5, // Retry up to 5 times
  retryDelay: (retryCount) => {
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    console.log(`[JINA RETRY] Attempt ${retryCount}, waiting ${delay}ms`);
    return delay;
  },
  retryCondition: (error) => {
    const status = error.response?.status;
    return status === 429 || axios.isAxiosError(error); // Retry on 429 or network errors
  },
});

async function fetchJinaContent(url: string, index: number, total: number): Promise<any> {
  try {
    console.log(`[JINA PROGRESS] Processing URL ${index + 1}/${total}: ${url}`);
    const jinaRes = await axiosInstance.get(`${JINA_READER_URL}${encodeURIComponent(url)}`);
    console.log(`[JINA SUCCESS]✅ Fetched ${url}`);
    return { url, data: [{ content: jinaRes.data }] };
  } catch (error) {
    console.error(`[JINA ERROR]❌ Failed for ${url}: ${(error as Error).message}`);
    throw error; // Let PQueue handle it
  }
}

// POST Handler with Fixed Jina Logic
export async function POST(req: Request) {
  console.log('[REQUEST START] Incoming POST request');

  let query: string | undefined;
  let params: ResearchParams | undefined;
  let mode: 'non-think' | 'think' = 'non-think';

  try {
    const rawBody = await req.text();
    console.log(`[RAW BODY] ${rawBody}`);
    const body = JSON.parse(rawBody) as RequestBody;
    ({ query, params, mode = 'think' } = body);
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
    // Step 1: Firecrawl Deep Research (unchanged)
    console.log('[FIRECRAWL START]🔥 Initiating deep research - Pass 1');
    const firecrawlRes = await axios.post<ResearchResponse>(
      FIRECRAWL_URL,
      {
        query,
        maxDepth: params?.maxDepth || 6,
        maxUrls: params?.maxUrls || 75,
        timeLimit: params?.timeLimit || 600,
      },
      { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const initialResearch = firecrawlRes.data;
    console.log(`[FIRECRAWL RESPONSE] 🔥Status: ${initialResearch.status}, ID: ${initialResearch.id || 'none'}, Data: ${JSON.stringify(initialResearch, null, 2)}`);

    let research: ResearchResponse;
    if (initialResearch.status === 'completed') {
      console.log('[FIRECRAWL DONE]✅ Research completed immediately');
      research = initialResearch;
    } else if (initialResearch.id) {
      console.log(`[FIRECRAWL ASYNC] 🚀Job started, polling ID: ${initialResearch.id}`);
      research = await pollJobStatus(initialResearch.id, 'deep-research');
    } else {
      console.log('[FIRECRAWL FAIL] ❌ No job ID returned');
      return NextResponse.json({ error: 'No job ID returned' }, { status: 500 });
    }

    // Step 2: Refine (unchanged)
    if (research.data.sources.length < 20 || !research.data.finalAnalysis) {
      console.log('[REFINE] Initial results too thin, starting second pass');
      const subQueries = [
        `${query} technical details`,
        `${query} case studies`,
        `${query} latest developments`,
      ];
      const secondPassRes = await Promise.all(
        subQueries.map((subQuery) =>
          axios.post<ResearchResponse>(
            FIRECRAWL_URL,
            { query: subQuery, maxDepth: 4, maxUrls: 45, timeLimit: 500 },
            { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
          )
        )
      );
      const secondPassData = await Promise.all(secondPassRes.map((res) => res.data.id ? pollJobStatus(res.data.id, 'deep-research') : Promise.resolve(res.data)));
      research.data.sources = [...research.data.sources, ...secondPassData.flatMap(d => d.data.sources)];
      research.data.finalAnalysis += '\n\n' + secondPassData.map(d => d.data.finalAnalysis).join('\n');
      console.log(`[REFINE COMPLETE]✅ Added ${research.data.sources.length} total sources`);
    }

    if (!research.data.sources.length) {
      console.log('[VALIDATION FAIL]❌ No sources found after refinement');
      return NextResponse.json({ success: false, error: 'No sources found for deep research' }, { status: 404 });
    }

    // Step 3: Jina Reader with Rate-Limited Queue
    console.log('[JINA READER START]🔥 Fetching content with Jina Reader');
    const sourceUrls = research.data.sources.slice(0, 200).map(source => source.url);

    // Set up PQueue: 50 requests per minute (conservative guess for Jina’s free tier)
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
          const result = await fetchJinaContent(url, index, sourceUrls.length);
          return result;
        } catch (error) {
          console.error(`[JINA FINAL FAIL]❌ Unrecoverable error for ${url}: ${(error as Error).message}`);
          return { url, data: [] }; // Fallback empty result
        }
      })
    );

    console.log(`[JINA READER COMPLETE]✅ Processed ${jinaResults.length} URLs`);

    const enhancedSources = research.data.sources.map(source => {
      const jinaResult = jinaResults.find(result => result.url === source.url);
      return {
        ...source,
        crawlData: jinaResult?.data || [],
      };
    });

    // Step 4: Gemini Synthesis (unchanged)
    console.log('[GEMINI START] 🌟 Initializing Gemini synthesis');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const selectedModel = mode === 'non-think' ? 'gemini-2.0-flash' : 'gemini-2.0-flash-thinking-exp-01-21';
    console.log(`[MODEL SELECTED]🚀 Using ${selectedModel} based on mode: ${mode}`);

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        maxOutputTokens: selectedModel === 'gemini-2.0-flash-thinking-exp-01-21' ? 550000 : 500000,
        temperature: selectedModel === 'gemini-2.0-flash-thinking-exp-01-21' ? 0.1 : 0.2,
      },
    });

    const today = getFormattedDate();

    const synthesisPrompt = `
    Always start with  Date ${today} 
    Synthesize the following information into a comprehensive, detailed research report (minimum 3000 words) formatted in Markdown.
    **Most importnat Instructions:**
    - ❌ Never  Ever begin the output with triple backticks '''markdown'' as it will break the markdown parser but generate the report in markdown format.
    [... rest of prompt unchanged ...]
    `;

    const geminiRes = await model.generateContent(synthesisPrompt);
    const responseText = geminiRes.response?.text();
    if (!responseText) {
      console.error("[GEMINI ERROR] No text generated in response:", geminiRes.response);
      throw new Error('Gemini failed to generate a valid report text.');
    }
    const report = responseText;
    console.log(`[GEMINI RESULT] ⚡️Report Length: ${report.length}`);

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
    };
    console.log(`[RESPONSE SENT] ✅${JSON.stringify(response, null, 2)}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error(`[ERROR]😢 ❌Something went wrong: ${(error as Error).message}`);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message }, { status: 500 });
  }
}