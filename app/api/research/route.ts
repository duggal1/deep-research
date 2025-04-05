import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';
import { ResearchError, ResearchResult, ResearchSource, ResearchOptions } from '@/lib/types';
import { addLog, clearLogs, clearMetrics, updateMetrics, markResearchComplete } from './progress/route';

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
    
    // Process custom options from client
    const options = body.options || {};
    
    // Greatly increase limits for a more comprehensive research
    const maxDepth = Math.min(options.maxDepth || 30, 35); // Increased from 25 to 30, cap at 35
    const timeLimit = Math.min(options.timeLimit || 240, 290); // Default 240s, cap at 290s
    const maxUrls = Math.min(options.maxUrls || 120000, 200000); // Increased to handle more sources
    
    // Parse client-side domain maximums
    const maxDomains = Math.min(options.maxDomains || 70, 100); // Allow up to 100 domains
    const maxSources = Math.min(options.maxSources || 70, 100); // Allow up to 100 sources

    if (!query?.trim()) {
        console.log("API Error: Invalid query received."); // Added Log
        return NextResponse.json({
            error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
        }, { status: 400 });
    }

    clearLogs(); // Clear logs for the new request
    clearMetrics(); // Also clear metrics for the new request
    addLog(`Received research request: "${query}"`);
    console.log(`[API Route] Starting deep research API call for: "${query}" with maxDepth=${maxDepth}, timeLimit=${timeLimit}s, maxUrls=${maxUrls}, maxDomains=${maxDomains}, maxSources=${maxSources}`);

    // Call the research engine with enhanced configuration options
    const result: ResearchResult = await researchEngine.research(query, {
      maxDepth,
      timeLimit: timeLimit * 1000, // Convert to ms
      maxUrls,
      useFirecrawl: true,
      maxDomains, // Pass through the domain limit 
      maxSources, // Pass through the source limit
      highQuality: true // Ensure highest quality output
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    // Log metrics received from the engine
    console.log(`[API Route] Research engine process completed for: "${query}" in ${duration.toFixed(1)}s`);
    console.log(`[API Route] Engine Metrics: Sources=${result.researchMetrics.sourcesCount}, Domains=${result.researchMetrics.domainsCount}, Size=${result.researchMetrics.dataSize}, EngineTime=${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s`);
    addLog(`Research engine finished. Metrics: ${result.researchMetrics.sourcesCount} sources, ${result.researchMetrics.domainsCount} domains.`);
    
    // Update metrics in the progress tracking
    updateMetrics(result.researchMetrics);

    // Check if the result itself indicates an error occurred (e.g., from timeout or critical failure within the engine)
    if (result.metadata?.error) {
        console.error(`[API Route] Research for "${query}" completed with an error state: ${result.metadata.error}`);
        addLog(`Research finished with error: ${result.metadata.error}`);
        // Return a 500 status but include the partial results/error message
        return NextResponse.json({
            error: { code: 'RESEARCH_EXECUTION_ERROR', message: result.metadata.error } as ResearchError,
            // Include more substantial partial data
            report: result.analysis, // Contains error details or partial analysis
            metrics: result.researchMetrics,
            sources: result.sources?.slice(0, maxSources || 70) // Use maxSources from client or default to 70
        }, { status: 500 });
    }

    // --- Result Processing for Success Case ---
    console.log(`[API Route] Processing successful result for: "${query}"`); // Added Log
    let analysisReport = result.analysis || "Analysis could not be generated."; // Use 'let' to allow modification
    const sources = Array.isArray(result.sources) ? result.sources : [];

    // Post-process analysisReport to make inline domain citations clickable
    // Regex to find "(according to domain.com)" patterns
    const citationRegex = /\(according to ([\w.-]+\.[a-zA-Z]{2,})\)/g;
    analysisReport = analysisReport.replace(citationRegex, (match, domain) => {
        // Ensure domain has a protocol for the link
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        return `(according to [${domain}](${url}))`;
    });
    console.log(`[API Route] Processed inline citations in the analysis report.`); // Added Log

    // Format Sources (Reduced based on user feedback)
    // Create a domain-to-favicon map for the entire source set to prevent duplication
    const faviconCache: Record<string, string> = {};
    const MAX_DISPLAY_SOURCES = 25; // Reduced from 70/60
    const MAX_DOMAIN_SAMPLES = 15;  // Reduced from 60

    const formattedSources = sources
      .slice(0, maxSources || MAX_DISPLAY_SOURCES) // Show fewer sources in the response
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
                  // Fallback using Google Favicons API with a larger size request
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
              // Ensure the URL has a protocol for display
              displayUrl = s.url && s.url.startsWith('http') ? s.url : (s.url ? `https://${s.url}` : '#');
            }
          } catch (e) { /* Keep existing fallback */
            console.warn(`[API Route] Error processing source URL: ${s.url}, Error: ${e instanceof Error ? e.message : String(e)}`);
            const domainMatch = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
            domain = domainMatch ? domainMatch[0] : (s.url || "Invalid URL");
            if (!faviconCache[domain]) {
              favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
              faviconCache[domain] = favicon;
            } else {
              favicon = faviconCache[domain];
            }
            displayUrl = s.url || '#'; // Fallback display URL
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
          isSecure: (s as any).isSecure === undefined ? displayUrl.startsWith('https') : !!(s as any).isSecure, // Ensure boolean
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
        // Fallback for potentially invalid URLs stored in sources
        const domainMatch = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
        return domainMatch ? domainMatch[0] : (s.url || "Invalid URL");
      }
    }))).slice(0, MAX_DOMAIN_SAMPLES); // Show fewer domain samples

    const sourceStats = `
## Source Analysis Overview
- **Sources Found & Analyzed:** ${totalSourcesFound} (Report includes Top ${MAX_DISPLAY_SOURCES} for review)
- **Unique Domains Encountered:** ${uniqueDomainsCount}
- **Top Domains Sample:** ${uniqueDomainsSample.map(d => `\`${d}\``).join(', ')}
    `;
    console.log(`[API Route] Generated Source Stats: Found=${totalSourcesFound}, UniqueDomains=${uniqueDomainsCount}`); // Added Log

    // Add data collection note based on which method was used (Firecrawl or legacy)
    const firecrawlInfo = result.metadata?.error ?
      `\n**Enhanced Data Collection:** This research utilized our internal research engine to gather comprehensive information from across ${uniqueDomainsCount} domains.` :
      `\n**Enhanced Data Collection:** This research utilized Firecrawl's deep research capability to gather comprehensive information from across ${uniqueDomainsCount} domains.`;

    // Format Top Sources Sample with improved formatting including favicons and additional metadata
    // Use the already populated faviconCache for sources display - much more efficient
    const formattedTopSources = `
## Top Sources Sample
${formattedSources.map(s => { // Display fewer sources
    // Create a more informative source entry with additional metadata
    // Use the domain favicon map to avoid duplication
    let sourceEntry = `- ![](${s.favicon}) **[${s.title}](${s.url})**`;

    // Add domain info with secure indicator
    sourceEntry += ` (Domain: ${s.domain}${s.isSecure ? ' 🔒' : ''})`;

    // Add quality metrics but avoid repetition
    sourceEntry += ` | Relevance: ${s.relevance}`;

    // Conditionally add validation score if it varies among displayed sources
    const isUniformValidation = formattedSources.every(src => src.validation === s.validation);
    if (!isUniformValidation) {
      sourceEntry += ` | Validation: ${s.validation}`;
    }
    
    // Conditionally add priority score if it varies
    const isUniformPriority = formattedSources.every(src => src.priority === s.priority);
     if (!isUniformPriority) {
       sourceEntry += ` | Priority: ${s.priority}`;
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
        sources: formattedSources, // Already sliced
        researchPath: researchPath,
        confidenceLevel: confidenceLevel,
        domainStats: {
          total: uniqueDomainsCount,
          sample: uniqueDomainsSample // Already sliced
        },
        usesFallback: !!result.metadata?.error
      }
    };

    addLog("Successfully generated final report.");
    // Mark research as complete after successful processing
    markResearchComplete();

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

    // Mark research as complete on error too
    markResearchComplete();

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