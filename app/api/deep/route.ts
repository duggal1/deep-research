// pages/api/research.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Config
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-your-key';
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || 'your-google-key';
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v1/deep-research';
const JINA_READER_URL = 'https://r.jina.ai/'; // Added for Jina Reader

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
  crawlData?: any; // Will store Jina Reader markdown content
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

// Poll status with logging, updated to handle different endpoints
async function pollJobStatus(jobId: string, endpoint: 'deep-research', timeoutMs: number = 900000): Promise<any> {
  console.log(`[POLLING START] Job ID: ${jobId}, Endpoint: ${endpoint}, Timeout: ${timeoutMs}ms`);
  const startTime = Date.now();
  const url = `https://api.firecrawl.dev/v1/${endpoint}/${jobId}`;

  while (Date.now() - startTime < timeoutMs) {
    console.log(`[POLLING] Checking status for Job ID: ${jobId} on ${endpoint}`);
    try {
      const statusRes = await axios.get(url, {
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
  throw new Error(`${endpoint} job timed out`);
}

// POST Handler with Jina Reader integration
export async function POST(req: Request) {
  console.log('[REQUEST START] Incoming POST request');

  let query: string | undefined;
  let params: ResearchParams | undefined;
  let mode: 'non-think' | 'think' = 'non-think'; // Default mode

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
        maxDepth: params?.maxDepth || 3,
        maxUrls: params?.maxUrls || 150, // Firecrawl can fetch up to 60, we'll filter later
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
      research = await pollJobStatus(initialResearch.id, 'deep-research');
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
            { query: subQuery, maxDepth: 3, maxUrls: 100, timeLimit: 500 },
            { headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' } }
          )
        )
      );
      const secondPassData = await Promise.all(secondPassRes.map((res) => res.data.id ? pollJobStatus(res.data.id, 'deep-research') : Promise.resolve(res.data)));
      research.data.sources = [...research.data.sources, ...secondPassData.flatMap(d => d.data.sources)];
      research.data.finalAnalysis += '\n\n' + secondPassData.map(d => d.data.finalAnalysis).join('\n');
      console.log(`[REFINE COMPLETE] Added ${research.data.sources.length} total sources`);
    }

    if (!research.data.sources.length) {
      console.log('[VALIDATION FAIL] No sources found after refinement');
      return NextResponse.json({ success: false, error: 'No sources found for deep research' }, { status: 404 });
    }

    // Step 2.5: Fetch URLs from Deep Research and Use Jina Reader (Limit to 30 URLs)
    console.log('[JINA READER START]🔥 Fetching content with Jina Reader');
    // CHANGE MADE HERE: Limit to 30 URLs (adjust this number here to increase/decrease later)
    const sourceUrls = research.data.sources.slice(0, 45).map(source => source.url); // Take first 30 URLs
    const jinaPromises = sourceUrls.map(async (url) => {
      try {
        const jinaRes = await axios.get(`${JINA_READER_URL}${encodeURIComponent(url)}`, {
          headers: { 'Accept': 'text/markdown' },
        });
        console.log(`[JINA SUCCESS]✅ Fetched ${url}`);
        return { url, data: [{ content: jinaRes.data }] }; // Mimic Firecrawl structure
      } catch (error) {
        console.error(`[JINA ERROR]❌ Failed for ${url}: ${(error as Error).message}`);
        return { url, data: [] };
      }
    });

    const jinaResults = await Promise.all(jinaPromises);
    console.log(`[JINA READER COMPLETE] 🎉 Processed ${jinaResults.length} URLs`);

    // Enhance sources with Jina Reader data
    const enhancedSources = research.data.sources.map(source => {
      const jinaResult = jinaResults.find(result => result.url === source.url);
      return {
        ...source,
        crawlData: jinaResult?.data || [],
      };
    });

    // Step 3: Gemini Synthesis with Model Selection
    console.log('[GEMINI START] Initializing Gemini synthesis');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

    const selectedModel = mode === 'non-think' ? 'gemini-2.0-flash' : 'gemini-2.5-pro-exp-03-25';
    console.log(`[MODEL SELECTED] Using ${selectedModel} based on mode: ${mode}`);

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        maxOutputTokens: selectedModel === 'gemini-2.5-pro-exp-03-25' ? 55000 : 50000,
        temperature: selectedModel === 'gemini-2.5-pro-exp-03-25' ? 0.1 : 0.2,
      },
    });

    const today = getFormattedDate();

    const synthesisPrompt = `
   Always start with  Date ${today} 
Synthesize the following information into a comprehensive, detailed research report (minimum 2000 words) formatted in Markdown.
**Most importnat Instructions:**
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
    console.log(`[GEMINI PROMPT] ${synthesisPrompt.substring(0, 500)}...`);

    const geminiRes = await model.generateContent(synthesisPrompt);
    const responseText = geminiRes.response?.text();
    if (!responseText) {
      console.error("[GEMINI ERROR] No text generated in response:", geminiRes.response);
      throw new Error('Gemini failed to generate a valid report text.');
    }
    const report = responseText;
    console.log(`[GEMINI RESULT] Report Length: ${report.length}`);

    // Step 4: Return Enhanced Result
    console.log('[RESPONSE PREP] Preparing final response');
    const response = {
      success: true,
      report,
      sources: enhancedSources,
      originalAnalysis: research.data.finalAnalysis,
      depthAchieved: research.currentDepth || 'unknown',
      sourceCount: enhancedSources.length,
      modelUsed: selectedModel,
    };
    console.log(`[RESPONSE SENT] ${JSON.stringify(response, null, 2)}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error(`[ERROR] Shit hit the fan: ${(error as Error).message}`);
    return NextResponse.json({ error: 'Server error: ' + (error as Error).message }, { status: 500 });
  }
}