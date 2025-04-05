// import { NextResponse } from 'next/server';
// import { ResearchEngine } from '@/lib/research';
// import { ResearchError, ResearchResult, ResearchSource, ResearchOptions } from '@/lib/types';
// import { addLog, clearLogs, clearMetrics, updateMetrics, markResearchComplete } from './progress/route';


// const researchEngine = new ResearchEngine();

// export const dynamic = 'force-dynamic';
// export const runtime = 'edge';
// export const maxDuration = 300; // Keep Edge limit

// export async function POST(req: Request) {
//   let query = '';
//   let startTime = Date.now();
//   let useGemini = false; // Default to not using Gemini

//   try {
//     const body = await req.json();
//     query = body.query;
//     const optionsFromBody = body.options || {};
//     useGemini = !!body.useGemini; // Check for the new flag

//     // --- Configuration ---
//     // Use defaults from ResearchEngine, but allow overrides from request if needed
//     // Let ResearchEngine handle internal defaults like maxDepth, timeLimit etc.
//     // Set minimum output length and pass useGemini flag
//     const researchOptions: ResearchOptions = {
//        minOutputLength: 45000, // <--- Set minimum output characters
//       useGemini: useGemini,   // <--- Pass the Gemini flag
//       // Allow overriding other engine defaults if provided in request body's options
//       maxDepth: optionsFromBody.maxDepth,
//       timeLimit: optionsFromBody.timeLimit,
//       maxUrls: optionsFromBody.maxUrls,
//       useFirecrawl: optionsFromBody.useFirecrawl, // Allow override if needed
//       maxDomains: optionsFromBody.maxDomains,     // Allow override
//       maxSources: optionsFromBody.maxSources,     // Allow override
//       highQuality: true // Generally keep high quality on
//     };

//     const MINIMUM_REQUIRED_SOURCES_DISPLAY = 100; // Still aim to *display* at least 100
//     const MAX_DISPLAY_SOURCES = 500; // Display up to 500 sources in the final markdown


//     if (!query?.trim()) {
//       console.log("API Error: Invalid query received.");
//       return NextResponse.json({
//         error: { code: 'INVALID_QUERY', message: 'Please provide a valid research query' } as ResearchError
//       }, { status: 400 });
//     }

//     clearLogs();
//     clearMetrics();
//     addLog(`Received research request: "${query}" ${useGemini ? '(using Gemini 2.5 Pro)' : ''}`);
//     console.log(`[API Route] Starting research: query="${query}", useGemini=${useGemini}, minOutputChars=${researchOptions.minOutputLength}`);
//     console.log("[API Route] Options passed to engine:", researchOptions);


//     // Call the research engine with updated options
//     const result: ResearchResult = await researchEngine.research(query, researchOptions);

//     const endTime = Date.now();
//     const duration = (endTime - startTime) / 1000;
//     console.log(`[API Route] Research engine process completed for: "${query}" in ${duration.toFixed(1)}s`);
//     console.log(`[API Route] Engine Metrics: Sources=${result.researchMetrics.sourcesCount}, Domains=${result.researchMetrics.domainsCount}, Size=${result.researchMetrics.dataSize}, EngineTime=${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s`);
//     addLog(`Research engine finished. Metrics: ${result.researchMetrics.sourcesCount} sources, ${result.researchMetrics.domainsCount} domains.`);
//     updateMetrics(result.researchMetrics); // Update final metrics

//     // Handle engine errors
//     if (result.metadata?.error) {
//       console.error(`[API Route] Research for "${query}" completed with an error state: ${result.metadata.error}`);
//       addLog(`Research finished with error: ${result.metadata.error}`);
//       markResearchComplete(); // Mark complete even on error
//       return NextResponse.json({
//         error: { code: 'RESEARCH_EXECUTION_ERROR', message: result.metadata.error } as ResearchError,
//         // Still return partial report/metrics/sources if available on error
//         report: result.analysis,
//         metrics: result.researchMetrics,
//         sources: result.sources?.slice(0, MAX_DISPLAY_SOURCES)
//       }, { status: 500 });
//     }

//     // --- Result Processing for Success Case ---
//     console.log(`[API Route] Processing successful result for: "${query}"`);
//     let analysisReport = result.analysis || "Analysis could not be generated.";
//     const sources = Array.isArray(result.sources) ? result.sources : [];

//     // --- Simplified Post-Processing ---
//     // The synthesis prompt now explicitly asks for correct markdown tables.
//     // Avoid complex regex replacements that might break valid markdown.
//     // Keep simple replacements like bolding single quotes if desired.

//     // Optional: Replace single quotes with bold formatting (**text**) - Keep if desired
//     analysisReport = analysisReport.replace(/'([^']+)'/g, '**$1**');

//     // Remove potentially fragile table processing logic. Rely on LLM generating correct markdown.
//     // analysisReport = analysisReport.replace(/<table>[\s\S]*?<\/table>/g, match => ...); // REMOVED
//     // analysisReport = analysisReport.replace(markdownTableRegex, (tableMatch) => ...); // REMOVED

//     // Keep citation processing if it works reliably
//     const citationRegex = /\(([^)]+)\)/g;
//     analysisReport = analysisReport.replace(citationRegex, (match, content) => {
//         // Avoid linking already linked content within parentheses
//         if (/\[.*?\]\(.*?\)/.test(content)) return match;
//         // Basic check for potential domain/URL pattern - less aggressive
//         if (content.includes('.') && !content.includes(' ') && content.length > 3 && !content.startsWith('[')) {
//             const url = content.startsWith('http') ? content : `https://${content}`;
//              // Only link if it looks like a simple domain/URL citation
//             if (url.length < 80) { // Avoid linking long complex strings
//                  return `([${content}](${url}))`;
//             }
//         }
//         return match; // Return original if no simple link pattern found
//     });


//     // Format Sources (Keep existing formatting logic)
//     const faviconCache: Record<string, string> = {};
//     const formattedSources = sources
//       // Ensure we display *at least* the minimum, up to the max display limit
//       .slice(0, Math.max(MAX_DISPLAY_SOURCES, MINIMUM_REQUIRED_SOURCES_DISPLAY))
//       .map((s: ResearchSource) => {
//         let domain = "Unknown Domain";
//         let displayUrl = s.url || "#";
//         let favicon = "";

//         try {
//           domain = (s as any).domain || new URL(s.url && s.url.startsWith('http') ? s.url : `https://${s.url}`).hostname.replace(/^www\./, '');
//           favicon = faviconCache[domain] || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`; // Smaller favicon
//           faviconCache[domain] = favicon;
//           displayUrl = (s as any).cleanUrl || (s.url && s.url.startsWith('http') ? s.url : (s.url ? `https://${s.url}` : '#'));
//         } catch (e) {
//           // Keep existing error handling
//           console.warn(`[API Route] Error processing source URL: ${s.url}, Error: ${e instanceof Error ? e.message : String(e)}`);
//           domain = s.url?.match(/([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/)?.[0] || s.url || "Invalid URL";
//           favicon = faviconCache[domain] || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
//           faviconCache[domain] = favicon;
//           displayUrl = s.url || '#';
//         }

//         const title = s.title?.trim() || domain;
//         const relevanceScore = typeof s.relevance === 'number' ? `${(s.relevance * 100).toFixed(0)}%` : "N/A"; // Simpler %
//         // Remove validation/priority from display string unless critical
//         // const validationScore = typeof s.validationScore === 'number' ? `${(s.validationScore * 100).toFixed(0)}%` : "N/A";
//         // const sourcePriority = (s as any).sourcePriority ? `${((s as any).sourcePriority * 100).toFixed(0)}%` : "N/A";

//         return {
//           title, url: displayUrl, domain, relevance: relevanceScore,
//           // validation: validationScore, priority: sourcePriority, // Removed from return object for simplicity
//           favicon,
//           dataType: (s as any).dataType || 'webpage',
//           isSecure: (s as any).isSecure === undefined ? displayUrl.startsWith('https') : !!(s as any).isSecure,
//           timestamp: (s as any).timestamp || new Date().toISOString()
//         };
//       });

//     // Format Research Path (Keep existing logic)
//     const researchPath = Array.isArray(result.researchPath) ? result.researchPath : [query];
//     const formattedResearchPath = `
// ## Research Path
// ${researchPath.map((path: string, index: number) => `- Step ${index + 1}: "${path}"`).join('\n')}
//     `;

//     // Data collection note (Keep existing logic)
//     const uniqueDomainsCount = result.researchMetrics.domainsCount;
//     const totalSourcesFound = result.researchMetrics.sourcesCount;
//      // Determine engine based on useGemini flag and potential errors
//     const usedGeminiForSynthesis = useGemini && result.researchMetrics.elapsedTime > 0 && !result.metadata?.error;
//     const dataCollectionEngine = (researchOptions.useFirecrawl !== false) && !result.metadata?.error ? 'Firecrawl API' : 'Fallback Crawler'; // Assume Firecrawl unless explicitly disabled or error
//     const synthesisEngine = usedGeminiForSynthesis ? 'Gemini 2.5 Pro' : 'Default LLM';
//     const engineInfo = `\n**Engines Used:** Data Collection via **${dataCollectionEngine}**; Synthesis via **${synthesisEngine}**.`;


//     // Format Top Sources Sample (Simplified formatting)
//     const formattedTopSources = `
// ## Top Sources Sample (${formattedSources.length} shown)
// ${formattedSources.map(s => {
//       // Simpler source entry format
//       return `- [${s.title}](${s.url}) (Domain: **${s.domain}**${s.isSecure ? ' 🔒' : ''} | Relevance: ${s.relevance})`;
//     }).join('\n')}
//     `;

//     // Confidence Level (Keep existing logic)
//     const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() : "MEDIUM";
//     const avgValidationScore = result.metadata?.avgValidationScore;
//     const confidenceReason = result.metadata
//       ? `Based on **${totalSourcesFound || 0}** sources across **${uniqueDomainsCount}** domains.${avgValidationScore ? ` Avg Validation: **${(avgValidationScore * 100).toFixed(0)}%**.` : ''} Total Time: **${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}s**.`
//       : `Based on source quantity (**${totalSourcesFound}**), diversity (**${uniqueDomainsCount}** domains), and analysis quality.`;

//     // Assemble Final Report (Integrate simplified sections)
//     let finalReport = `
// ${analysisReport}

// ---

// ## Research Process & Sources${engineInfo}

// ${formattedResearchPath}

// ${formattedTopSources}

// ${result.metadata?.error ? `
// ## Note on Data Collection Error
// An error may have occurred during data collection: **${result.metadata.error}**. Results are based on **${totalSourcesFound}** sources from **${uniqueDomainsCount}** domains.
// ` : ''}

// ## Confidence Level Assessment
// **Confidence: ${confidenceLevel}**
// *${confidenceReason}*

// ## Additional Research Metrics
// - **Total Sources Analyzed:** **${totalSourcesFound.toLocaleString()}**
// - **Unique Domains Found:** **${uniqueDomainsCount.toLocaleString()}**
// - **Research Depth:** **${researchPath.length}** steps
// - **Total Processing Time:** **${(result.researchMetrics.elapsedTime / 1000).toFixed(1)}** seconds
//     `.trim();

//     // --- Remove the forced padding logic ---
//     // Rely on the synthesis prompt asking for comprehensive output and the minOutputLength option.
//     // if (finalReport.length < researchOptions.minOutputLength) { ... } // REMOVED

//     console.log(`[API Route] Final report assembled. Length: ${finalReport.length} characters`);
//     const researchMetrics = result.researchMetrics;


//     // Simplified response object (remove tableInstructions if not used)
//     const responsePayload = {
//       report: finalReport,
//       metrics: researchMetrics,
//       // Keep sources if needed by frontend, but maybe limit further?
//       // sources: formattedSources, // Optional: Exclude sources from main payload if large
//     };

//     addLog("Successfully generated final report.");
//     markResearchComplete(); // Mark complete

//     return NextResponse.json(responsePayload, {
//       status: 200,
//       headers: { 'Cache-Control': 'no-store' } // Ensure no caching
//     });

//   } catch (error: any) {
//     console.error(`[API Route] Unhandled API Route Error for query "${query}":`, error);
//     addLog(`API Route Error: ${error.message || 'Unknown error'}`);
//     const finalElapsedTimeOnError = Date.now() - startTime;
//     // Provide minimal metrics on error
//     const errorMetrics = { sourcesCount: 0, domainsCount: 0, dataSize: '0KB', elapsedTime: finalElapsedTimeOnError };
//     markResearchComplete(); // Mark complete even on error

//     return NextResponse.json({
//       error: {
//         code: 'INTERNAL_SERVER_ERROR',
//         message: error.message || 'An unexpected error occurred handling the request.'
//       } as ResearchError,
//       metrics: errorMetrics // Send basic metrics
//     }, { status: 500 });
//   }
// }