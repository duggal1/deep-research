import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Config
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-your-key';
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || 'your-google-key';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/deep-research';

// Types
interface ResearchParams {
  maxDepth?: number;
  maxUrls?: number;
  timeLimit?: number;
}

interface ResearchSource {
  url: string;
  title: string;
  description: string;
}

interface ResearchResponse {
    success: boolean;
    data: {
      finalAnalysis: string;
      sources: ResearchSource[];
    };
    status: string;
    id?: string;
    currentDepth?: number; // Added to match Firecrawl's response
  }
// Poll status with logging
async function pollJobStatus(jobId: string, timeoutMs: number = 900000): Promise<ResearchResponse> { // 15min timeout
  console.log(`[POLLING START] Job ID: ${jobId}, Timeout: ${timeoutMs}ms`);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    console.log(`[POLLING] Checking status for Job ID: ${jobId}`);
    try {
      const statusRes = await axios.get(`${FIRECRAWL_URL}/${jobId}`, {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      });
      const statusData = statusRes.data;
      console.log(`[POLLING RESPONSE] Status: ${statusData.status}, Data: ${JSON.stringify(statusData, null, 2)}`);

      if (statusData.status === 'completed') {
        console.log(`[POLLING COMPLETE] Job ${jobId} finished`);
        return statusData;
      }
      console.log(`[POLLING WAIT] Status not completed, waiting 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Slower polling for longer jobs
    } catch (error) {
      console.error(`[POLLING ERROR] Failed to check status: ${(error as Error).message}`);
    }
  }
  console.error(`[POLLING TIMEOUT] Job ${jobId} exceeded ${timeoutMs}ms`);
  throw new Error('Research timed out');
}

// POST Handler with advanced deep research
export async function POST(req: Request) {
  console.log('[REQUEST START] Incoming POST request');

  let query: string | undefined;
  let params: ResearchParams | undefined;

  try {
    const rawBody = await req.text();
    console.log(`[RAW BODY] ${rawBody}`);
    const body = JSON.parse(rawBody);
    ({ query, params } = body as { query: string; params?: ResearchParams });
    console.log(`[REQUEST DATA] Query: ${query}, Params: ${JSON.stringify(params)}`);
  } catch (error) {
    console.error(`[JSON PARSE ERROR] Invalid JSON: ${(error as Error).message}`);
    return NextResponse.json(
      { error: 'Invalid JSON in request body', details: (error as Error).message },
      { status: 400 }
    );
  }

  if (!query) {
    console.log('[VALIDATION FAIL] No query provided');
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    // Step 1: Start Firecrawl Deep Research (Initial Pass)
    console.log('[FIRECRAWL START] Initiating deep research - Pass 1');
    const firecrawlRes = await axios.post<ResearchResponse>(
      FIRECRAWL_URL,
      {
        query,
        maxDepth: params?.maxDepth || 10, // Max depth for exhaustive crawl
        maxUrls: params?.maxUrls || 50,   // Max URLs for broad coverage
        timeLimit: params?.timeLimit || 600, // 10min for deep digging
      },
      { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const initialResearch = firecrawlRes.data;
    console.log(`[FIRECRAWL RESPONSE] Status: ${initialResearch.status}, ID: ${initialResearch.id || 'none'}, Data: ${JSON.stringify(initialResearch, null, 2)}`);

    let research: ResearchResponse;
    if (initialResearch.status === 'completed') {
      console.log('[FIRECRAWL DONE] Research completed immediately');
      research = initialResearch;
    } else if (initialResearch.id) {
      console.log(`[FIRECRAWL ASYNC] Job started, polling ID: ${initialResearch.id}`);
      research = await pollJobStatus(initialResearch.id);
    } else {
      console.log('[FIRECRAWL FAIL] No job ID returned');
      return NextResponse.json({ error: 'No job ID returned' }, { status: 500 });
    }

    // Step 2: Validate and Refine (Second Pass if Needed)
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
            { query: subQuery, maxDepth: 5, maxUrls: 20, timeLimit: 300 },
            { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
          )
        )
      );
      const secondPassData = await Promise.all(secondPassRes.map((res) => res.data.id ? pollJobStatus(res.data.id) : Promise.resolve(res.data)));
      research.data.sources = [...research.data.sources, ...secondPassData.flatMap(d => d.data.sources)];
      research.data.finalAnalysis += '\n\n' + secondPassData.map(d => d.data.finalAnalysis).join('\n');
      console.log(`[REFINE COMPLETE] Added ${research.data.sources.length} total sources`);
    }

    if (!research.data.sources.length) {
      console.log('[VALIDATION FAIL] No sources found after refinement');
      return NextResponse.json({ success: false, error: 'No sources found for deep research' }, { status: 404 });
    }

    // Step 3: Gemini Synthesis with Advanced Config
    console.log('[GEMINI START] Initializing Gemini synthesis');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro-exp-03-25',
      generationConfig: {
        maxOutputTokens: 8192, // Max tokens for detailed output
        temperature: 0.2,      // Balanced creativity and precision
      },
    });

    const synthesisPrompt = `
      Synthesize the following into a comprehensive, detailed research report. Include technical specifics, examples, and critical analysis where possible. Cross-reference sources to highlight trends, contradictions, or gaps. Aim for depth and actionable insights
      - Please return the report in markdown format.
      Sources: ${JSON.stringify(research.data.sources)}
      Initial Analysis: ${research.data.finalAnalysis}
    `;
    console.log(`[GEMINI PROMPT] ${synthesisPrompt}`);

    const geminiRes = await model.generateContent(synthesisPrompt);
    const report = geminiRes.response.text();
    console.log(`[GEMINI RESULT] Report: ${report}`);

    // Step 4: Return Enhanced Result
    console.log('[RESPONSE PREP] Preparing final response');
    const response = {
      success: true,
      report,
      sources: research.data.sources,
      originalAnalysis: research.data.finalAnalysis,
      depthAchieved: research.currentDepth || 'unknown', // Log actual depth if available
      sourceCount: research.data.sources.length,
    };
    console.log(`[RESPONSE SENT] ${JSON.stringify(response, null, 2)}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error(`[ERROR] Shit hit the fan: ${(error as Error).message}`);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message }, { status: 500 });
  }
}