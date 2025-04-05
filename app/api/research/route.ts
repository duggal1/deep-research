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
    const maxDepth = Math.min(body.maxDepth || 25, 30); // Increased from 20 to 25, cap at 30 (was 25)
    const timeLimit = Math.min(body.timeLimit || 220, 290); // Reduced default from 240s to 220s, still cap at 290s
    const maxUrls = Math.min(body.maxUrls || 100000, 150000); // Increased default from 70000 to 100000, cap at 150k

    if (!query?.trim()) {
        console.log("API Error: Invalid query received."); // Added Log
        return NextResponse.json({
            error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
        }, { status: 400 });
    }

    clearLogs(); // Clear logs for the new request
    addLog(`Received research request: "${query}"`);
    console.log(`[API Route] Starting deep research API call for: "${query}" with maxDepth=${maxDepth}, timeLimit=${timeLimit}s, maxUrls=${maxUrls}`);

    // Call the research engine with configuration options
    const result: ResearchResult = await researchEngine.research(query, {
      maxDepth,
      timeLimit: timeLimit * 1000, // Convert to ms
      maxUrls,
      useFirecrawl: true
    });

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
            sources: result.sources?.slice(0, 50) // Increased from 15 to 50 sources on error
        }, { status: 500 });
    }

    // --- Result Processing for Success Case ---
    console.log(`[API Route] Processing successful result for: "${query}"`); // Added Log
    const analysisReport = result.analysis || "Analysis could not be generated.";
    const sources = Array.isArray(result.sources) ? result.sources : [];

    // Format Sources (Increased from 150 to 200 for display, but only show top 60 in the final report)
    // Create a domain-to-favicon map for the entire source set to prevent duplication
    const faviconCache: Record<string, string> = {};
    
    const formattedSources = sources
      .slice(0, 200) // Show top 200 sources in the response
      .map((s: ResearchSource) => {
          let domain = "Unknown Domain";
          let displayUrl = s.url || "#";
          let favicon = "";
          
          try {
            // Use pre-extracted domain and favicon if available from enhanced source objects
            if ((s as any).domain) {
              domain = (s as any).domain;
            } else {
              let urlToParse = s.url || '';
              if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
                urlToParse = 'https://' + urlToParse;
              }
              const parsedUrl = new URL(urlToParse);
              domain = parsedUrl.hostname.replace(/^www\./, '');
            }
            
            // Use domain-specific favicon caching to prevent duplication
            // Use existing favicon if already provided in source object
            if ((s as any).favicon) {
              favicon = (s as any).favicon;
              // Also store in cache for future use
              faviconCache[domain] = favicon;
            } else {
              // Check if this domain already has a cached favicon
              if (faviconCache[domain]) {
                favicon = faviconCache[domain];
              } else {
                // Use domain-specific favicons for common domains
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
                  favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                }
                
                // Cache the favicon for this domain
                faviconCache[domain] = favicon;
              }
            }
            
            // Use clean URL if it exists in the enhanced source object
            if ((s as any).cleanUrl) {
              displayUrl = (s as any).cleanUrl;
            } else {
              displayUrl = s.url.startsWith('http') ? s.url : `https://${s.url}`;
            }
          } catch (e) { /* Keep existing fallback */
            const domainMatch = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
            domain = domainMatch ? domainMatch[0] : (s.url || "Invalid URL");
            if (!faviconCache[domain]) {
              favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
              faviconCache[domain] = favicon;
            } else {
              favicon = faviconCache[domain];
            }
          }
          
          let title = s.title?.trim() || domain; // Fallback title to domain
          // Use relevance score directly from source if available, otherwise N/A
          const relevanceScore = typeof s.relevance === 'number' ? `${(s.relevance * 100).toFixed(1)}%` : "N/A";
          
          // Add validation score if available
          const validationScore = typeof s.validationScore === 'number' ? `${(s.validationScore * 100).toFixed(1)}%` : "N/A";
          
          // Include sourcePriority if available
          const sourcePriority = (s as any).sourcePriority ? `${((s as any).sourcePriority * 100).toFixed(1)}%` : "N/A";
          
        return { 
          title, 
          url: displayUrl, 
          domain, 
          relevance: relevanceScore, 
          validation: validationScore,
          priority: sourcePriority,
          favicon,
          dataType: (s as any).dataType || 'webpage',
          isSecure: (s as any).isSecure || displayUrl.startsWith('https'),
          timestamp: (s as any).timestamp || new Date().toISOString()
        };
      });
    console.log(`[API Route] Formatted ${formattedSources.length} sources for display.`); // Added Log

    // Format Research Path
    const researchPath = Array.isArray(result.researchPath) ? result.researchPath : [query];
    const formattedResearchPath = `
## Research Path
${researchPath.map((path: string, index: number) => `- Step ${index + 1}: "${path}"`).join('\n')}
    `;

    // Source Statistics using metrics directly from result.researchMetrics
    const uniqueDomainsCount = result.researchMetrics.domainsCount;
    const totalSourcesFound = result.researchMetrics.sourcesCount;
    // Regenerate sample set from actual sources for display consistency
    const uniqueDomainsSample = Array.from(new Set(sources.map((s: ResearchSource) => { 
      try { 
        if ((s as any).domain) return (s as any).domain;
        let urlToParse = s.url || ''; 
        if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) urlToParse = 'https://' + urlToParse; 
        return new URL(urlToParse).hostname.replace(/^www\./, ''); 
      } catch { 
        return s.url || "Invalid URL"; 
      } 
    }))).slice(0, 60); // Show more domain samples (increased from 50 to 60)

    const sourceStats = `
## Source Analysis Overview
- **Sources Found & Analyzed:** ${totalSourcesFound} (Report includes Top 60 for comprehensive review)
- **Unique Domains Encountered:** ${uniqueDomainsCount}
- **Top Domains Sample:** ${uniqueDomainsSample.map(d => `\`${d}\``).join(', ')}
    `;
    console.log(`[API Route] Generated Source Stats: Found=${totalSourcesFound}, UniqueDomains=${uniqueDomainsCount}`); // Added Log

    // Add data collection note based on which method was used (Firecrawl or legacy)
    const firecrawlInfo = result.metadata?.error ? 
      `\n**Enhanced Data Collection:** This research utilizes our internal research engine to gather comprehensive information from across ${uniqueDomainsCount} domains.` :
      `\n**Enhanced Data Collection:** This research utilizes Firecrawl's deep research capability to gather comprehensive information from across ${uniqueDomainsCount} domains.`;

    // Format Top Sources Sample with improved formatting including favicons and additional metadata
    // Use the already populated faviconCache for sources display - much more efficient
    const formattedTopSources = `
## Top Sources Sample 
${formattedSources.slice(0, 60).map(s => { // Display top 60 sources
    // Create a more informative source entry with additional metadata
    // Use the domain favicon map to avoid duplication
    let sourceEntry = `- ![](${s.favicon}) **[${s.title}](${s.url})**`;
    
    // Add domain info with secure indicator
    sourceEntry += ` (Domain: ${s.domain}${s.isSecure ? ' 🔒' : ''})`;
    
    // Add quality metrics but avoid repetition
    sourceEntry += ` | Relevance: ${s.relevance}`;
    
    // Don't repeat validation if it's the same for all sources to save space
    const isUniformValidation = formattedSources.every(src => src.validation === s.validation);
    if (!isUniformValidation) {
      sourceEntry += ` | Validation: ${s.validation}`;
    }
    
    return sourceEntry;
}).join('\n')}
    `;

    // Confidence Level
    const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() : "MEDIUM";
    const avgValidationScore = result.metadata?.avgValidationScore;
    const confidenceReason = result.metadata
      ? `Based on ${result.metadata.totalSources || 0} sources across ${uniqueDomainsCount} domains.${avgValidationScore ? ` Avg Validation: ${(avgValidationScore * 100).toFixed(1)}%.` : ''} Exec Time: ${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s.`
      : `Based on source quantity (${totalSourcesFound}), diversity (${uniqueDomainsCount} domains), and internal analysis quality.`;

    // --- Assemble the Final Report ---
    const finalReport = `
${analysisReport}

---

## Research Process & Sources${firecrawlInfo}

${formattedResearchPath}

${sourceStats}

${formattedTopSources}

${result.metadata?.error ? `
## Note on Data Collection
This research was conducted using our fallback research engine after an initial attempt to use Firecrawl's deep research API encountered an issue. The fallback engine successfully analyzed ${uniqueDomainsCount} domains with ${totalSourcesFound} sources to provide comprehensive results.
` : ''}

## Confidence Level Assessment
**Confidence:** ${confidenceLevel}
*${confidenceReason}*

## Additional Research Insights
- **Data Quality Score:** ${(result.metadata?.avgValidationScore * 100 || 85).toFixed(1)}%
- **Source Diversity Index:** ${(uniqueDomainsCount / (totalSourcesFound || 1) * 100).toFixed(2)}%
- **Research Depth:** ${result.researchPath?.length || 1} iterations
- **Processing Time:** ${(result.researchMetrics.elapsedTime / 1000).toFixed(2)} seconds
    `.trim();

    console.log(`[API Route] Final report assembled. Length: ${finalReport.length}`); // Added Log
    // Use metrics directly from the successful result
    const researchMetrics = result.researchMetrics;

    // Include extra data points in the response for client-side enhancement
    const enhancedResponse = {
      report: finalReport,
      metrics: researchMetrics,
      // Add extra data for richer client-side rendering
      enhancedData: {
        sources: formattedSources,
        researchPath: researchPath,
        confidenceLevel: confidenceLevel,
        domainStats: {
          total: uniqueDomainsCount,
          sample: uniqueDomainsSample
        },
        usesFallback: !!result.metadata?.error
      }
    };

    addLog("Successfully generated final report.");
    return NextResponse.json(enhancedResponse, {
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