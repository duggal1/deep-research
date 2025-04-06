import { NextResponse } from 'next/server';
import axios from 'axios';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-your-key';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/deep-research';

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
  currentDepth?: number;
}

interface RequestBody {
  query: string;
  params?: ResearchParams;
}

// === POLLING LOGIC ===
async function pollJobStatus(jobId: string, timeoutMs: number = 900000): Promise<ResearchResponse> {
  console.log(`[POLLING START] ID: ${jobId} | Timeout: ${timeoutMs}`);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    console.log(`[POLLING] Checking job ${jobId}`);
    try {
      const res = await axios.get(`${FIRECRAWL_URL}/${jobId}`, {
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      });

      const data = res.data;
      console.log(`[POLLING STATUS] ${data.status}`);
      if (data.status === 'completed') {
        console.log(`[POLLING SUCCESS] Job ${jobId} completed`);
        return data;
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      console.error(`[POLLING ERROR] ${(err as Error).message}`);
    }
  }

  console.error(`[POLLING TIMEOUT] Job ${jobId} took too damn long`);
  throw new Error('Firecrawl research timed out');
}

// === POST HANDLER (NO GEMINI) ===
export async function POST(req: Request) {
  console.log('[API HIT] POST /api/deep-research');

  let query: string | undefined;
  let params: ResearchParams | undefined;

  try {
    const body = JSON.parse(await req.text()) as RequestBody;
    query = body.query;
    params = body.params;
    console.log(`[INPUT] Query: ${query}`);
    console.log(`[INPUT] Params: ${JSON.stringify(params)}`);
  } catch (err) {
    console.error(`[BAD JSON] ${(err as Error).message}`);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!query) {
    console.log('[VALIDATION] Missing query');
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    // === FIRECRAWL INITIAL REQUEST ===
    console.log('[FIRECRAWL] Sending initial deep research request...');
    const fireRes = await axios.post<ResearchResponse>(
      FIRECRAWL_URL,
      {
        query,
        maxDepth: params?.maxDepth || 10,
        maxUrls: params?.maxUrls || 60,
        timeLimit: params?.timeLimit || 600,
      },
      {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let research = fireRes.data;
    console.log(`[FIRECRAWL RESPONSE] Status: ${research.status}`);
    if (research.status !== 'completed') {
      if (!research.id) {
        console.error('[FIRECRAWL ERROR] No job ID');
        return NextResponse.json({ error: 'No job ID from Firecrawl' }, { status: 500 });
      }
      console.log(`[FIRECRAWL] Polling job ${research.id}`);
      research = await pollJobStatus(research.id);
    }

    console.log(`[RESEARCH COMPLETED] Depth: ${research.currentDepth}`);
    console.log(`[SOURCE COUNT] ${research.data.sources.length}`);
    console.log(`[ANALYSIS LENGTH] ${research.data.finalAnalysis.length} chars`);

    if (!research.data.sources.length || !research.data.finalAnalysis) {
      console.error('[NO RESULTS] Firecrawl returned empty results');
      return NextResponse.json({ error: 'No sources or analysis returned' }, { status: 404 });
    }

    // === RETURN RAW FIRECRAWL OUTPUT ===
    return NextResponse.json({
      success: true,
      sources: research.data.sources,
      analysis: research.data.finalAnalysis,
      sourceCount: research.data.sources.length,
      depthAchieved: research.currentDepth,
    });
  } catch (err) {
    console.error(`[SERVER ERROR] ${(err as Error).message}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}