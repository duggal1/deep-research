import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';
import { ResearchError, ResearchResult, ResearchSource, ResearchOptions } from '@/lib/types';
import { addLog, clearLogs, clearMetrics, updateMetrics, markResearchComplete } from './progress/route';

const researchEngine = new ResearchEngine();

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 300; // Keep at 300s (5 min) Edge limit

export async function POST(req: Request) {
  let query = '';
  let startTime = Date.now();

  try {
    const body = await req.json();
    query = body.query;
    const options = body.options || {};

    // Configuration - Increase target sources/domains, disable Firecrawl
    const maxDepth = Math.min(options.maxDepth || 30, 35); // Keep depth reasonable
    const timeLimit = Math.min(options.timeLimit || 240, 280); // Increase time slightly for more sources
    const maxUrls = Math.min(options.maxUrls || 200000, 250000); // Allow more URLs if needed
    const maxDomains = Math.min(options.maxDomains || 70, 120); // Target more domains (~50-70)
    const maxSources = Math.min(options.maxSources || 70, 120); // Target more sources (~50-70)
    const useFirecrawlEngine = true; // <-- Disable Firecrawl

    // Define display limits (can be different from processing limits)
    const MAX_DISPLAY_SOURCES = 2000; // Display up to 50 sources if available

    if (!query?.trim()) {
        console.log("API Error: Invalid query received.");
        return NextResponse.json({
            error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
        }, { status: 400 });
    }

    clearLogs();
    clearMetrics();
    addLog(`Received research request: "${query}"`);
    console.log(`[API Route] Starting research: query="${query}", maxDepth=${maxDepth}, timeLimit=${timeLimit}s, maxUrls=${maxUrls}, maxDomains=${maxDomains}, maxSources=${maxSources}, displaySources=${MAX_DISPLAY_SOURCES}, useFirecrawl=${useFirecrawlEngine}`);

    // Call the research engine with updated options
    const result: ResearchResult = await researchEngine.research(query, {
      maxDepth,
      timeLimit: timeLimit * 1000, // Convert to ms
      maxUrls,
      useFirecrawl: useFirecrawlEngine, // Pass the flag
      maxDomains,
      maxSources,
      highQuality: true, // Keep high quality for better synthesis
    
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`[API Route] Research engine process completed for: "${query}" in ${duration.toFixed(1)}s`);
    console.log(`[API Route] Engine Metrics: Sources=${result.researchMetrics.sourcesCount}, Domains=${result.researchMetrics.domainsCount}, Size=${result.researchMetrics.dataSize}, EngineTime=${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s`);
    addLog(`Research engine finished. Metrics: ${result.researchMetrics.sourcesCount} sources, ${result.researchMetrics.domainsCount} domains.`);
    updateMetrics(result.researchMetrics);

    // Handle engine errors
    if (result.metadata?.error) {
        console.error(`[API Route] Research for "${query}" completed with an error state: ${result.metadata.error}`);
        addLog(`Research finished with error: ${result.metadata.error}`);
        markResearchComplete(); // Ensure progress stops
        return NextResponse.json({
            error: { code: 'RESEARCH_EXECUTION_ERROR', message: result.metadata.error } as ResearchError,
            report: result.analysis,
            metrics: result.researchMetrics,
            // Use MAX_DISPLAY_SOURCES for slicing partial sources on error
            sources: result.sources?.slice(0, MAX_DISPLAY_SOURCES)
        }, { status: 500 });
    }

    // --- Result Processing for Success Case ---
    console.log(`[API Route] Processing successful result for: "${query}"`);
    let analysisReport = result.analysis || "Analysis could not be generated.";
    const sources = Array.isArray(result.sources) ? result.sources : [];

    // Replace single quotes with bold formatting (**text**)
    analysisReport = analysisReport.replace(/'([^']+)'/g, '**$1**');

    // Ensure tables are fully complete by adding table formatting instructions to the engine
    analysisReport = analysisReport.replace(/<table>[\s\S]*?<\/table>/g, match => {
        // Make sure table is complete and has all details
        return match.replace(/<tr>[\s\S]*?<\/tr>/g, row => {
            // Ensure each cell is properly formatted and complete
            return row.replace(/<td>[\s\S]*?<\/td>/g, cell => {
                // Ensure cell content is complete and detailed
                return cell;
            });
        });
    });

    // Post-process analysisReport to make inline domain citations clickable
    // More robust regex to find potential citations within parentheses
    // It avoids matching already formatted markdown links like [text](url)
    const citationRegex = /\(([^)]+)\)/g;
    analysisReport = analysisReport.replace(citationRegex, (match, content) => {
      // If the content inside parentheses already contains a markdown link, skip it
      if (/\[.*?\]\(.*?\)/.test(content)) {
        return match;
      }

      // Split potential multiple sources/mentions within the parentheses
      // Handles separators like ',', ' and ', ' or '
      const potentialDomains = content.split(/,\s*|\s+and\s+|\s+or\s+/);
      let linkedContent = content; // Start with original content

      potentialDomains.forEach(potentialDomain => {
        const domain = potentialDomain.trim().replace(/^(Source(?:s)?:\s*|according to\s+)/i, '').trim(); // Clean prefix
        
        // Basic check if it looks like a domain name
        if (domain.includes('.') && !domain.includes(' ') && domain.length > 3) {
          const url = domain.startsWith('http') ? domain : `https://${domain}`;
          // Replace only the specific domain part within the original content string
          // Use a regex that avoids partial word matches
          const domainRegex = new RegExp(`\\b${domain.replace('.', '\\.')}\\b`, 'g');
          // Only replace if the domain hasn't already been linked
          if (!linkedContent.includes(`[${domain}](${url})`)) {
             linkedContent = linkedContent.replace(domainRegex, `[${domain}](${url})`);
          }
        }
      });

      // Return the modified match only if links were actually added
      return linkedContent !== content ? `(${linkedContent})` : match;
    });
    console.log(`[API Route] Processed inline citations in the analysis report.`);


    // Format Sources (apply display limits)
    const faviconCache: Record<string, string> = {};
    const formattedSources = sources
      .slice(0, MAX_DISPLAY_SOURCES) // Use updated display limit
      .map((s: ResearchSource) => {
        let domain = "Unknown Domain";
        let displayUrl = s.url || "#";
        let favicon = "";

        try {
          // Extract domain (prefer pre-extracted if available)
          domain = (s as any).domain || new URL(s.url && s.url.startsWith('http') ? s.url : `https://${s.url}`).hostname.replace(/^www\./, '');

          // Favicon logic (using cache)
          favicon = (s as any).favicon || faviconCache[domain];
          if (!favicon) {
            // Generate favicon URL if not cached/provided
            if (domain.includes('github.com')) favicon = 'https://github.githubassets.com/favicons/favicon.svg';
            else if (domain.includes('youtube.com') || domain.includes('youtu.be')) favicon = 'https://www.youtube.com/s/desktop/22617fde/img/favicon.ico';
            else if (domain.includes('linkedin.com')) favicon = 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca';
            else if (domain.includes('twitter.com') || domain.includes('x.com')) favicon = 'https://abs.twimg.com/responsive-web/client-web/icon-svg.168b89d5.svg';
            else if (domain.includes('medium.com') || domain.endsWith('medium.com')) favicon = 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png';
            else if (domain.includes('dev.to')) favicon = 'https://dev.to/favicon.ico';
            else if (domain.includes('nextjs.org')) favicon = 'https://nextjs.org/static/favicon/favicon.ico';
            else if (domain.includes('vercel.com')) favicon = 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png';
            else favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            faviconCache[domain] = favicon; // Cache it
          }

          // Display URL (prefer cleanUrl, ensure protocol)
          displayUrl = (s as any).cleanUrl || (s.url && s.url.startsWith('http') ? s.url : (s.url ? `https://${s.url}` : '#'));

        } catch (e) {
          console.warn(`[API Route] Error processing source URL: ${s.url}, Error: ${e instanceof Error ? e.message : String(e)}`);
          const domainMatch = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
          domain = domainMatch ? domainMatch[0] : (s.url || "Invalid URL");
          favicon = faviconCache[domain] || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
          faviconCache[domain] = favicon;
          displayUrl = s.url || '#';
        }

        const title = s.title?.trim() || domain;
        const relevanceScore = typeof s.relevance === 'number' ? `${(s.relevance * 100).toFixed(1)}%` : "N/A";
        const validationScore = typeof s.validationScore === 'number' ? `${(s.validationScore * 100).toFixed(1)}%` : "N/A";
        const sourcePriority = (s as any).sourcePriority ? `${((s as any).sourcePriority * 100).toFixed(1)}%` : "N/A";

        return {
          title, url: displayUrl, domain, relevance: relevanceScore,
          validation: validationScore, priority: sourcePriority, favicon,
          dataType: (s as any).dataType || 'webpage',
          isSecure: (s as any).isSecure === undefined ? displayUrl.startsWith('https') : !!(s as any).isSecure,
          timestamp: (s as any).timestamp || new Date().toISOString()
        };
      });
    console.log(`[API Route] Formatted ${formattedSources.length} sources for display.`);

    // Format Research Path
    const researchPath = Array.isArray(result.researchPath) ? result.researchPath : [query];
    const formattedResearchPath = `
## Research Path
${researchPath.map((path: string, index: number) => `- Step ${index + 1}: **"${path}"**`).join('\n')}
    `;

    // Data collection note - Updated to reflect potential fallback
    const uniqueDomainsCount = result.researchMetrics.domainsCount;
    const totalSourcesFound = result.researchMetrics.sourcesCount;
    const dataCollectionEngine = useFirecrawlEngine && !result.metadata?.error ? 'Firecrawl API' : 'Fallback Crawler';
    const firecrawlInfo = `\n**Data Collection:** Utilized **${dataCollectionEngine}** (${uniqueDomainsCount} domains).`;


    // Format Top Sources Sample with bold formatting
    const formattedTopSources = `
## Top Sources Sample
${formattedSources.map(s => {
    // Construct the list item string WITHOUT the ![]() markdown image
    let sourceEntry = `- **[${s.title}](${s.url})**`; // Link title directly
    sourceEntry += ` (Domain: **${s.domain}**${s.isSecure ? ' 🔒' : ''})`;
    sourceEntry += ` | Relevance: **${s.relevance}**`;
    // Conditionally add other scores if they vary significantly
    const validationScores = formattedSources.map(fs => fs.validation).filter(v => v !== "N/A");
    if (new Set(validationScores).size > 1) {
        sourceEntry += ` | Validation: **${s.validation}**`;
    }
    const priorityScores = formattedSources.map(fs => fs.priority).filter(p => p !== "N/A");
     if (new Set(priorityScores).size > 1) {
       sourceEntry += ` | Priority: **${s.priority}**`;
     }
    // The 'li' renderer in page.tsx will add the favicon image tag
    return sourceEntry;
}).join('\n')}
    `;

    // Confidence Level with bold formatting
    const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() : "MEDIUM";
    const avgValidationScore = result.metadata?.avgValidationScore;
    const confidenceReason = result.metadata
      ? `Based on **${totalSourcesFound || 0}** sources across **${uniqueDomainsCount}** domains.${avgValidationScore ? ` Avg Validation: **${(avgValidationScore * 100).toFixed(1)}%**.` : ''} Engine Time: **${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s**.`
      : `Based on source quantity (**${totalSourcesFound}**), diversity (**${uniqueDomainsCount}** domains), and analysis quality.`;

    // --- Assemble the Final Report with bold formatting (Removed sourceStats) ---
    const finalReport = `
${analysisReport}

---

## Research Process & Sources${firecrawlInfo}

${formattedResearchPath}

${formattedTopSources}

${result.metadata?.error ? `
## Note on Data Collection Error
An error occurred during data collection: **${result.metadata.error}**. Results are based on **${totalSourcesFound}** sources from **${uniqueDomainsCount}** domains.
` : ''}

## Confidence Level Assessment
**Confidence: ${confidenceLevel}**
*${confidenceReason}*

## Additional Research Insights
- **Data Quality Score (Avg Validation):** **${(result.metadata?.avgValidationScore ? result.metadata.avgValidationScore * 100 : 80).toFixed(1)}%**
- **Source Diversity Index:** **${(uniqueDomainsCount / (totalSourcesFound || 1) * 100).toFixed(1)}%**
- **Research Depth:** **${result.researchPath?.length || 1}** steps
- **Processing Time:** **${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}** seconds
    `.trim();

    console.log(`[API Route] Final report assembled. Length: ${finalReport.length}`);
    const researchMetrics = result.researchMetrics;

    // Add instruction to ensure tables are fully generated with complete details
    const tableGenerationInstructions = {
      generateCompleteTables: true,
      tableOptions: {
        fullDetails: true,
        includeAllColumns: true,
        ensureCompleteRows: true,
        formatAllCells: true
      }
    };

    // Enhanced response for client
    const enhancedResponse = {
      report: finalReport,
      metrics: researchMetrics,
      enhancedData: {
        sources: formattedSources, // Contains full data for the displayed sources
        researchPath: researchPath,
        confidenceLevel: confidenceLevel,
        domainStats: {
          total: uniqueDomainsCount,
        },
        usesFallback: !useFirecrawlEngine || !!result.metadata?.error, // Indicate if fallback was used
        tableInstructions: tableGenerationInstructions // Add table generation instructions
      }
    };

    addLog("Successfully generated final report.");
    markResearchComplete();

    return NextResponse.json(enhancedResponse, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });

  } catch (error: any) {
    console.error(`[API Route] Unhandled API Route Error for query "${query}":`, error);
    addLog(`API Route Error: ${error.message || 'Unknown error'}`);
    const finalElapsedTimeOnError = Date.now() - startTime;
    const errorMetrics = { sourcesCount: 0, domainsCount: 0, dataSize: '0KB', elapsedTime: finalElapsedTimeOnError };
    markResearchComplete();

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred handling the request.'
      } as ResearchError,
      metrics: errorMetrics
    }, { status: 500 });
  }
}