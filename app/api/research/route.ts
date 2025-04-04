import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';
import { ResearchError, ResearchSource } from '@/lib/types';
import { addLog, clearLogs } from './progress/route';

const researchEngine = new ResearchEngine();

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes (matches Edge limit, allows for MAX_OVERALL_RESEARCH_TIME_MS)

export async function POST(req: Request) {
  let query = ''; // Define query outside try block for error logging
  try {
    const body = await req.json();
    query = body.query; // Assign query here

    if (!query?.trim()) {
      return NextResponse.json({
        error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
      }, { status: 400 });
    }

    clearLogs(); // Clear logs for the new request
    const startTime = Date.now();
    addLog(`Received research request: "${query}"`);
    console.log(`Starting deep research API call for: "${query}"`);

    // No try-catch specifically around researchEngine.research here,
    // let the outer catch handle errors, including potential structured errors returned by research()
    const result = await researchEngine.research(query);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Research engine process completed for: "${query}" in ${duration.toFixed(1)}s`);
    addLog(`Research engine process completed in ${duration.toFixed(1)}s.`);

    // Check if the result itself indicates an error occurred (e.g., from timeout or critical failure)
    if (result.metadata?.error) {
        console.error(`Research for "${query}" completed with an error state: ${result.metadata.error}`);
        addLog(`Research finished with error: ${result.metadata.error}`);
        // Return a 500 status but include the partial results/error message
        return NextResponse.json({
            error: { code: 'RESEARCH_EXECUTION_ERROR', message: result.metadata.error } as ResearchError,
            // Optionally include partial data if needed by the frontend during errors
            // report: result.analysis, // Contains error details
            // metrics: result.researchMetrics,
            // sources: result.sources
        }, { status: 500 });
    }


    // --- Result Processing for Success Case ---
    const analysisReport = result.analysis || "Analysis could not be generated.";
    const sources = Array.isArray(result.sources) ? result.sources : [];

    // Format Sources (Keep your existing formatting logic)
    const formattedSources = sources
      // .sort(...) // Sorting is now done within crawlWeb/prioritizeSources
      .slice(0, 40) // Show top 40 sources in the report
      .map((s: ResearchSource) => {
          let domain = "Unknown Domain";
          let displayUrl = s.url || "#";
          try {
            let urlToParse = s.url || '';
            if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
              urlToParse = 'https://' + urlToParse;
            }
            const parsedUrl = new URL(urlToParse);
            domain = parsedUrl.hostname.replace(/^www\./, '');
            displayUrl = parsedUrl.toString();
          } catch (e) { /* Keep existing fallback */
            const domainMatch = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
            domain = domainMatch ? domainMatch[0] : (s.url || "Invalid URL");
          }
          let title = s.title?.trim();
          if (!title || title.toLowerCase() === 'untitled' || title.length < 3) { title = domain; }
          const relevanceScore = s.relevance ? `${(s.relevance * 100).toFixed(1)}%` : "N/A";
        return { title, url: displayUrl, domain, relevance: relevanceScore };
      });

    // Format Research Path
    const researchPath = Array.isArray(result.researchPath) ? result.researchPath : [query];
    const formattedResearchPath = `
## Research Path
${researchPath.map((path: string, index: number) => `- Step ${index + 1}: "${path}"`).join('\n')}
    `;

    // Source Statistics
    const uniqueDomains = new Set(sources.map((s: ResearchSource) => { /* Keep existing logic */
        try { let urlToParse = s.url || ''; if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) urlToParse = 'https://' + urlToParse; return new URL(urlToParse).hostname.replace(/^www\./, ''); } catch { return s.url || "Invalid URL"; }
    }));
    const sourceStats = `
## Source Analysis Overview
- **Sources Found:** ${sources.length} (Report includes Top ${formattedSources.length})
- **Unique Domains:** ${uniqueDomains.size}
- **Top Domains Sample:** ${Array.from(uniqueDomains).slice(0, 10).map(d => `\`${d}\``).join(', ')}
    `;

    // Format Top Sources Sample
    const formattedTopSources = `
## Top Sources Sample
${formattedSources.map(s => `- **[${s.title}](${s.url})** (Domain: ${s.domain}, Relevance: ${s.relevance})`).join('\n')}
    `;

    // Confidence Level
    const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() : "MEDIUM";
    const confidenceReason = result.metadata
      ? `Based on ${result.metadata.totalSources} sources across ${uniqueDomains.size} domains. Avg Validation: ${result.metadata.avgValidationScore ? (result.metadata.avgValidationScore * 100).toFixed(1) + '%' : 'N/A'}.`
      : `Based on source quantity (${sources.length}), diversity (${uniqueDomains.size} domains), and internal analysis.`;


    // --- Assemble the Final Report ---
    const finalReport = `
${analysisReport}

---

## Research Process & Sources

${formattedResearchPath}

${sourceStats}

${formattedTopSources}

## Confidence Level Assessment
**Confidence:** ${confidenceLevel}
*${confidenceReason}*
    `.trim();

    // Use metrics directly from the successful result
    const researchMetrics = result.researchMetrics;

    addLog("Successfully generated final report.");
    return NextResponse.json({
      report: finalReport,
      metrics: researchMetrics
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' } // Don't cache deep research results aggressively
    });

  } catch (error: any) {
    // Catch errors from req.json() or unexpected errors
    console.error(`API Route Error for query "${query}":`, error);
    addLog(`API Error: ${error.message}`);
    // Return a generic server error
    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred on the server.'
      } as ResearchError
    }, { status: 500 });
  }
}