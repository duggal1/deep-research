import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';
import { ResearchError, ResearchResult, ResearchSource } from '@/lib/types';
import { addLog, clearLogs } from './progress/route';

const researchEngine = new ResearchEngine();

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes (matches Edge limit, allows for MAX_OVERALL_RESEARCH_TIME_MS)

export async function POST(req: Request) {
  let query = '';
  let startTime = Date.now(); // Define startTime outside the try block

  try {
    const body = await req.json();
    query = body.query;

    if (!query?.trim()) {
        console.log("API Error: Invalid query received."); // Added Log
        return NextResponse.json({
            error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
        }, { status: 400 });
    }

    clearLogs(); // Clear logs for the new request
    addLog(`Received research request: "${query}"`);
    console.log(`[API Route] Starting deep research API call for: "${query}"`);

    // Call the research engine - result now guaranteed to have researchMetrics
    const result: ResearchResult = await researchEngine.research(query);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    // Log metrics received from the engine
    console.log(`[API Route] Research engine process completed for: "${query}" in ${duration.toFixed(1)}s`);
    // Use the non-optional metrics directly from the result
    console.log(`[API Route] Engine Metrics: Sources=${result.researchMetrics.sourcesCount}, Domains=${result.researchMetrics.domainsCount}, Size=${result.researchMetrics.dataSize}, EngineTime=${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s`);
    addLog(`Research engine finished. Metrics: ${result.researchMetrics.sourcesCount} sources, ${result.researchMetrics.domainsCount} domains.`);


    // Check if the result itself indicates an error occurred (e.g., from timeout or critical failure within the engine)
    if (result.metadata?.error) {
        console.error(`[API Route] Research for "${query}" completed with an error state: ${result.metadata.error}`);
        addLog(`Research finished with error: ${result.metadata.error}`);
        // Return a 500 status but include the partial results/error message
        return NextResponse.json({
            error: { code: 'RESEARCH_EXECUTION_ERROR', message: result.metadata.error } as ResearchError,
            // Optionally include partial data if needed
            report: result.analysis, // Contains error details or partial analysis
            metrics: result.researchMetrics,
            sources: result.sources?.slice(0, 10) // Maybe show a few sources even on error
        }, { status: 500 });
    }


    // --- Result Processing for Success Case ---
    console.log(`[API Route] Processing successful result for: "${query}"`); // Added Log
    const analysisReport = result.analysis || "Analysis could not be generated.";
    const sources = Array.isArray(result.sources) ? result.sources : [];

    // Format Sources (Limit to 60 for display now)
    const formattedSources = sources
      .slice(0, 60) // Show top 60 sources in the report
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
          let title = s.title?.trim() || domain; // Fallback title to domain
          // Use relevance score directly from source if available, otherwise N/A
          const relevanceScore = typeof s.relevance === 'number' ? `${(s.relevance * 100).toFixed(1)}%` : "N/A";
        return { title, url: displayUrl, domain, relevance: relevanceScore };
      });
    console.log(`[API Route] Formatted ${formattedSources.length} sources for display.`); // Added Log

    // Format Research Path
    const researchPath = Array.isArray(result.researchPath) ? result.researchPath : [query];
    const formattedResearchPath = `
## Research Path
${researchPath.map((path: string, index: number) => `- Step ${index + 1}: "${path}"`).join('\n')}
    `;
// 
    // Source Statistics using metrics directly from result.researchMetrics
    const uniqueDomainsCount = result.researchMetrics.domainsCount;
    const totalSourcesFound = result.researchMetrics.sourcesCount;
    // Regenerate sample set from actual sources for display consistency
    const uniqueDomainsSample = Array.from(new Set(sources.map((s: ResearchSource) => { try { let urlToParse = s.url || ''; if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) urlToParse = 'https://' + urlToParse; return new URL(urlToParse).hostname.replace(/^www\./, ''); } catch { return s.url || "Invalid URL"; } }))).slice(0, 15); // Show more samples

    const sourceStats = `
## Source Analysis Overview
- **Sources Found & Analyzed:** ${totalSourcesFound} (Report includes Top ${formattedSources.length} for brevity)
- **Unique Domains Encountered:** ${uniqueDomainsCount}
- **Top Domains Sample:** ${uniqueDomainsSample.map(d => `\`${d}\``).join(', ')}
    `;
    console.log(`[API Route] Generated Source Stats: Found=${totalSourcesFound}, UniqueDomains=${uniqueDomainsCount}`); // Added Log


    // Format Top Sources Sample
    const formattedTopSources = `
## Top Sources Sample (Max 60 Shown)
${formattedSources.map(s => `- **[${s.title}](${s.url})** (Domain: ${s.domain}, Relevance: ${s.relevance})`).join('\n')}
    `;

    // Confidence Level
    const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() : "MEDIUM";
    const avgValidationScore = result.metadata?.avgValidationScore;
    const confidenceReason = result.metadata
      ? `Based on ${result.metadata.totalSources} sources across ${uniqueDomainsCount} domains.${avgValidationScore ? ` Avg Validation: ${(avgValidationScore * 100).toFixed(1)}%.` : ''} Exec Time: ${(result.metadata.executionTimeMs / 1000).toFixed(1)}s.`
      : `Based on source quantity (${totalSourcesFound}), diversity (${uniqueDomainsCount} domains), and internal analysis quality.`;


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

    console.log(`[API Route] Final report assembled. Length: ${finalReport.length}`); // Added Log
    // Use metrics directly from the successful result
    const researchMetrics = result.researchMetrics;

    addLog("Successfully generated final report.");
    return NextResponse.json({
      report: finalReport,
      metrics: researchMetrics // Pass the non-optional metrics object
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' } // Don't cache deep research results aggressively
    });

  } catch (error: any) {
    // Catch errors from req.json() or unexpected errors during API route processing
    console.error(`[API Route] Unhandled API Route Error for query "${query}":`, error); // More specific log
    addLog(`API Route Error: ${error.message}`);
    // Calculate fallback metrics for the error response using startTime defined outside try
     const finalElapsedTimeOnError = Date.now() - startTime; // Use startTime from outer scope
     const errorMetrics = { sourcesCount: 0, domainsCount: 0, dataSize: '0KB', elapsedTime: finalElapsedTimeOnError };

    // Return a generic server error
    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred handling the request.'
      } as ResearchError,
       metrics: errorMetrics // Provide fallback metrics
    }, { status: 500 });
  }
}