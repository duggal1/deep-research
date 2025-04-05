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
  currentDepth?: number;
}

interface RequestBody {
  query: string;
  params?: ResearchParams;
  mode?: 'non-think' | 'think'; // Added mode to select model
}

// Poll status with logging
async function pollJobStatus(jobId: string, timeoutMs: number = 900000): Promise<ResearchResponse> {
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[POLLING ERROR] Failed to check status: ${(error as Error).message}`);
    }
  }
  console.error(`[POLLING TIMEOUT] Job ${jobId} exceeded ${timeoutMs}ms`);
  throw new Error('Research timed out');
}

// POST Handler with model selection
export async function POST(req: Request) {
  console.log('[REQUEST START] Incoming POST request');

  let query: string | undefined;
  let params: ResearchParams | undefined;
  let mode: 'non-think' | 'think' = 'think'; // Default mode

  try {
    const rawBody = await req.text();
    console.log(`[RAW BODY] ${rawBody}`);
    const body = JSON.parse(rawBody) as RequestBody;
    ({ query, params, mode = 'think' } = body);
    console.log(`[REQUEST DATA] Query: ${query}, Params: ${JSON.stringify(params)}, Mode: ${mode}`);
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
        maxDepth: params?.maxDepth || 10,
        maxUrls: params?.maxUrls || 50,
        timeLimit: params?.timeLimit || 600,
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

    // Step 3: Gemini Synthesis with Model Selection
    console.log('[GEMINI START] Initializing Gemini synthesis');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    
    // Select model based on mode
   // ... existing code ...

    // Step 3: Gemini Synthesis with Model Selection
    console.log('[GEMINI START] Initializing Gemini synthesis');
  
    // Select model based on mode
    const selectedModel = mode === 'non-think' ? 'gemini-2.0-flash' : 'gemini-2.5-pro-exp-03-25'; // Updated 'think' model name
    console.log(`[MODEL SELECTED] Using ${selectedModel} based on mode: ${mode}`);
    
    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        // Adjusted token/temp based on the new 'think' model potentially having different characteristics or defaults.
        // Keeping the previous logic, but you might want to fine-tune these if needed for the experimental model.
        maxOutputTokens: selectedModel === 'gemini-2.5-pro-exp-03-25' ? 60000 : 7500, 
        temperature: selectedModel === 'gemini-2.5-pro-exp-03-25' ? 0.2 : 0.3,     
      },
    });

//use gemini 2.5 prev 

    const synthesisPrompt = `
      Synthesize the following information into a comprehensive, **concise**, and **decisive** research report formatted in Markdown.

      **Core Instructions:**
      1.  **Structure & Clarity:** Organize logically with clear headings. Front-load key findings and conclusions.
      2.  **Quantify Everything:** Prioritize **concrete metrics** (percentages, numbers, speeds, costs, dates) over vague qualitative claims ("fast", "better"). Extract these directly from the sources. If sources lack metrics for a key area, state that clearly.
      3.  **Source Primacy & Freshness:** Base the report *strictly* on the provided 'Sources' and 'Initial Analysis'. Prefer information from primary sources (official docs, research papers) if available in the context. Cite sources implicitly or explicitly where significant claims are made. Aim for relevance within the last 6-12 months if possible based on source dates, but use the provided sources regardless.
      4.  **Code Examples (If Applicable & Found):** If the query is technical AND the provided sources contain relevant, concrete code examples, include them in appropriate Markdown code blocks. **Do NOT generate hypothetical or placeholder code examples if none exist in the source material.** Explain the provided code's logic clearly.
      5.  **Data Visualization (Tables):** Use Markdown tables **early and strategically** to summarize key comparisons, specifications, benchmarks, or quantifiable data points for quick scanning. Keep surrounding prose minimal.
      6.  **Decisive Conclusions:** Provide firm conclusions or recommendations based *only* on the synthesized information. Avoid hedging ("it depends"). State the main takeaway first, then add brief qualifications if necessary based *only* on the provided context.
      7.  **Conciseness:** Eliminate redundancy. Be direct and to the point. Every sentence should add value. Aim for maximal insight with minimal text.
      8.  **Real-World Relevance:** Where sources permit, connect findings to practical applications, case studies, or user impact mentioned in the source material.

      **Input Data:**
      Sources:
      ${JSON.stringify(research.data.sources, null, 2)}

      Initial Analysis from Firecrawl:
      ${research.data.finalAnalysis}

      **Output Format:** Markdown Report
    `;
    console.log(`[GEMINI PROMPT] ${synthesisPrompt.substring(0, 500)}...`); // Log truncated prompt

    const geminiRes = await model.generateContent(synthesisPrompt);
    // Add safety check for response structure
    const responseText = geminiRes.response?.text();
    if (!responseText) {
        console.error("[GEMINI ERROR] No text generated in response:", geminiRes.response);
        // Consider checking finishReason: geminiRes.response?.candidates?.[0]?.finishReason
        throw new Error('Gemini failed to generate a valid report text.');
    }
    const report = responseText;
    console.log(`[GEMINI RESULT] Report Length: ${report.length}`);

    // Step 4: Return Enhanced Result
    console.log('[RESPONSE PREP] Preparing final response');
    const response = {
      success: true,
      report,
      sources: research.data.sources,
      originalAnalysis: research.data.finalAnalysis,
      depthAchieved: research.currentDepth || 'unknown',
      sourceCount: research.data.sources.length,
      modelUsed: selectedModel, // Include model used in response
    };
    console.log(`[RESPONSE SENT] ${JSON.stringify(response, null, 2)}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error(`[ERROR] Shit hit the fan: ${(error as Error).message}`);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message }, { status: 500 });
  }
}