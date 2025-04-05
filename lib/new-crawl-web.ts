// import { ResearchSource } from './types';
// import { enhancedFetch, domainAwareFetch } from './enhanced-fetch';

// /**
//  * Improved web crawling with error resilience and adaptation
//  * Uses enhanced fetch utilities for better performance and reliability
//  */
// export async function crawlWeb(
//   query: string, 
//   depth: number = 2,
//   options: {
//     MAX_PARALLEL_REQUESTS: number;
//     DEEP_RESEARCH_MODE: boolean;
//     MAX_DATA_SOURCES: number;
//     ADDITIONAL_DOMAINS: number;
//     identifyRelevantDomains: (query: string) => string[];
//     extractRelevantContent: (html: string, query: string, url: string) => string;
//     calculateRelevanceLegacy: (text: string, query: string) => number;
//     calculateFreshnessScore: (content: string, query: string) => number;
//     prioritizeSources: (sources: ResearchSource[], query: string) => ResearchSource[];
//     adaptSearchStrategy: (query: string, result: { sources: ResearchSource[], data: string }) => void;
//     fallbackResearch: (query: string, depth: number) => Promise<{ data: string; sources: ResearchSource[] }>;
//     createSourceObject: (data: Partial<ResearchSource>) => ResearchSource;
//   }
// ): Promise<{
//   data: string;
//   sources: ResearchSource[];
// }> {
//   try {
//     console.log(`Starting web crawling for query: "${query}" at depth ${depth} with ${options.MAX_PARALLEL_REQUESTS} parallel requests`);
    
//     // Extract main keywords from the query (remove filler words)
//     const mainKeywords = query
//       .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
//       .replace(/['"]/g, '')  // Remove quotes
//       .trim();
    
//     // Check if query contains version numbers
//     const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
//     const versionMatch = query.match(versionRegex);
//     const versionTag = versionMatch ? versionMatch[0] : '';
    
//     // Create human-like search queries with more variations
//     const humanQueries = {
//       general: `${mainKeywords}`,
//       features: `${mainKeywords} features${versionTag ? ' ' + versionTag : ''}`,
//       examples: `${mainKeywords} code example`,
//       tutorial: `${mainKeywords} tutorial how to`,
//       comparison: `${mainKeywords} vs alternatives comparison`,
//       bestPractices: `${mainKeywords} best practices guide`,
//       advanced: `advanced ${mainKeywords} techniques`,
//       latest: `latest ${mainKeywords} updates ${new Date().getFullYear()}`,
//       documentation: `${mainKeywords} official documentation`,
//       github: `${mainKeywords} github repository`,
//       reddit: `${mainKeywords} reddit discussion`,
//       stackoverflow: `${mainKeywords} stackoverflow solutions`,
//       frameworks: `${mainKeywords} frameworks libraries`,
//       architecture: `${mainKeywords} architecture design patterns`
//     };
    
//     // Construct search query URLs for various search engines
//     const searchEngineUrls = [
//       `https://www.google.com/search?q=${encodeURIComponent(query)}`,
//       `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
//       `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
//       `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
//       `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`,
//       `https://www.startpage.com/sp/search?q=${encodeURIComponent(query)}`,
//       `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
//       `https://searx.thegpm.org/?q=${encodeURIComponent(query)}`,
//       `https://www.qwant.com/?q=${encodeURIComponent(query)}`,
//       `https://yandex.com/search/?text=${encodeURIComponent(query)}`,
//       `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`,
//       `https://swisscows.com/web?query=${encodeURIComponent(query)}`,
//       `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
//       `https://metager.org/meta/meta.ger3?eingabe=${encodeURIComponent(query)}`
//     ];
    
//     // Detect if query is about specific technologies
//     const isTechQuery = /api|sdk|framework|library|platform|tool/i.test(query);
    
//     // Detect if query is about code examples
//     const isCodeQuery = /code|example|implementation|snippet|sample|how to/i.test(query);
    
//     // Set maximum crawl limit based on DEEP_RESEARCH_MODE
//     const maxCrawlUrls = options.DEEP_RESEARCH_MODE ? options.MAX_DATA_SOURCES : Math.min(30, options.MAX_DATA_SOURCES);
    
//     // Create domain-specific URLs based on tech and code detection
//     let domainSpecificUrls: string[] = [];
    
//     // Get extended list of relevant domains
//     const extendedDomains = options.identifyRelevantDomains(query).slice(0, options.ADDITIONAL_DOMAINS);
    
//     if (isCodeQuery) {
//       domainSpecificUrls = [
//         `https://github.com/search?q=${encodeURIComponent(humanQueries.examples)}&type=repositories`,
//         `https://stackoverflow.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://dev.to/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://medium.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://hashnode.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://replit.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://glitch.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://codepen.io/search/pens?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://jsfiddle.net/search/?q=${encodeURIComponent(humanQueries.examples)}`,
//         `https://codesandbox.io/search?query=${encodeURIComponent(humanQueries.examples)}`,
//         `https://stackblitz.com/search?query=${encodeURIComponent(humanQueries.examples)}`,
//         `https://nodejs.org/api/all.html`,
//         `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(humanQueries.examples)}`
//       ];
      
//       // Add GitHub code search
//       domainSpecificUrls.push(`https://github.com/search?q=${encodeURIComponent(humanQueries.examples)}&type=code`);
//     } else if (isTechQuery) {
//       // Look for official documentation and community resources
//       const techName = mainKeywords.split(' ')[0]; // Extract main tech name
//       domainSpecificUrls = [
//         `https://github.com/search?q=${encodeURIComponent(techName)}&type=repositories`,
//         `https://stackoverflow.com/questions/tagged/${encodeURIComponent(techName)}?tab=Newest`,
//         `https://dev.to/t/${encodeURIComponent(techName.toLowerCase())}/latest?q=${encodeURIComponent(mainKeywords.substring(techName.length).trim())}`,
//         `https://docs.github.com/en/search?query=${encodeURIComponent(techName)}`,
//         `https://medium.com/search?q=${encodeURIComponent(techName)}`,
//         `https://reddit.com/r/programming/search/?q=${encodeURIComponent(techName)}`,
//         `https://npmjs.com/search?q=${encodeURIComponent(techName)}`,
//         `https://libraries.io/search?q=${encodeURIComponent(techName)}`,
//         `https://alternativeto.net/browse/search/?q=${encodeURIComponent(techName)}`
//       ];
//     }
    
//     // More search queries from different engines for diversity
//     const additionalSearchUrls = [
//       `https://www.google.com/search?q=${encodeURIComponent(humanQueries.general)}`,
//       `https://www.google.com/search?q=${encodeURIComponent(humanQueries.features)}`,
//       `https://duckduckgo.com/?q=${encodeURIComponent(humanQueries.general)}`,
//       `https://www.bing.com/search?q=${encodeURIComponent(humanQueries.latest)}`,
//       `https://search.brave.com/search?q=${encodeURIComponent(humanQueries.documentation)}`,
//       `https://www.startpage.com/do/search?q=${encodeURIComponent(humanQueries.advanced)}`,
//       `https://www.mojeek.com/search?q=${encodeURIComponent(humanQueries.comparison)}`,
//       `https://search.yahoo.com/search?p=${encodeURIComponent(humanQueries.github)}`
//     ];
    
//     // Technical reference sites
//     const technicalUrls = [
//       `https://stackoverflow.com/search?q=${encodeURIComponent(mainKeywords)}&tab=newest`,
//       `https://dev.to/search?q=${encodeURIComponent(mainKeywords)}&sort=latest`,
//       `https://github.com/search?q=${encodeURIComponent(mainKeywords)}&type=repositories&s=updated&o=desc`,
//       `https://www.w3schools.com/search/search.asp?q=${encodeURIComponent(mainKeywords)}`,
//       `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://medium.com/search?q=${encodeURIComponent(mainKeywords)}&sort=recency`,
//       `https://www.npmjs.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.youtube.com/results?search_query=${encodeURIComponent(mainKeywords + ' tutorial')}`,
//       `https://css-tricks.com/?s=${encodeURIComponent(mainKeywords)}`,
//       `https://smashingmagazine.com/search/?q=${encodeURIComponent(mainKeywords)}`,
//       `https://web.dev/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://reactjs.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://docs.python.org/3/search.html?q=${encodeURIComponent(mainKeywords)}`,
//       `https://docs.microsoft.com/en-us/search/?terms=${encodeURIComponent(mainKeywords)}`,
//       `https://docs.oracle.com/search/?search=${encodeURIComponent(mainKeywords)}`
//     ];
    
//     // Educational and documentation sites
//     const educationalUrls = [
//       `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(mainKeywords)}`,
//       `https://www.tutorialspoint.com/search/search-results?search_string=${encodeURIComponent(mainKeywords)}`,
//       `https://www.geeksforgeeks.org/search/?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(mainKeywords)}`,
//       `https://hackr.io/tutorials/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.javatpoint.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.guru99.com/search.html?query=${encodeURIComponent(mainKeywords)}`,
//       `https://www.programiz.com/search/${encodeURIComponent(mainKeywords)}`,
//       `https://www.codecademy.com/search?query=${encodeURIComponent(mainKeywords)}`,
//       `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(mainKeywords)}`,
//       `https://developer.android.com/s/results?q=${encodeURIComponent(mainKeywords)}`
//     ];
    
//     // Add forum and discussion sites
//     const forumUrls = [
//       `https://www.reddit.com/search/?q=${encodeURIComponent(mainKeywords)}&sort=new`,
//       `https://www.quora.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://discourse.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forums.swift.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://community.openai.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forum.unity.com/search/search?keywords=${encodeURIComponent(mainKeywords)}`,
//       `https://gitter.im/home/search?term=${encodeURIComponent(mainKeywords)}`,
//       `https://discuss.codecademy.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://discuss.pytorch.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://discuss.tensorflow.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forum.djangoproject.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forum.vuejs.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forums.meteor.com/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forum.arduino.cc/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://forum.xda-developers.com/search/?q=${encodeURIComponent(mainKeywords)}`
//     ];
    
//     // Add academic and research sources
//     const academicUrls = [
//       `https://arxiv.org/search/?query=${encodeURIComponent(mainKeywords)}`,
//       `https://scholar.google.com/scholar?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.researchgate.net/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://www.semanticscholar.org/search?q=${encodeURIComponent(mainKeywords)}`,
//       `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(mainKeywords)}`,
//       `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(mainKeywords)}`,
//       `https://www.sciencedirect.com/search?qs=${encodeURIComponent(mainKeywords)}`,
//       `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(mainKeywords)}`,
//       `https://link.springer.com/search?query=${encodeURIComponent(mainKeywords)}`,
//       `https://www.ncbi.nlm.nih.gov/pmc/?term=${encodeURIComponent(mainKeywords)}`
//     ];
    
//     // Combine all URLs with domain-specific ones first, as they're more targeted
//     let allUrls = [
//       ...domainSpecificUrls,
//       ...searchEngineUrls,
//       ...additionalSearchUrls,
//       ...technicalUrls,
//       ...educationalUrls,
//       ...forumUrls,
//       ...academicUrls
//     ];
    
//     // Add URLs for domain-specific sources identified for the query
//     if (extendedDomains.length > 0) {
//       const additionalDomainUrls = extendedDomains.map((domain: string) => 
//         `https://${domain}/search?q=${encodeURIComponent(mainKeywords)}`
//       );
//       allUrls = [...allUrls, ...additionalDomainUrls];
//     }
    
//     // For GitHub and StackOverflow searches, add variations for deeper results
//     if (isTechQuery || isCodeQuery) {
//       const variations = [
//         `https://github.com/search?q=${encodeURIComponent(mainKeywords + " starter template")}&type=repositories`,
//         `https://github.com/search?q=${encodeURIComponent(mainKeywords + " boilerplate")}&type=repositories`,
//         `https://stackoverflow.com/search?q=${encodeURIComponent(mainKeywords + " best practice")}`
//       ];
//       allUrls = [...allUrls, ...variations];
//     }
    
//     // Deduplicate URLs
//     allUrls = Array.from(new Set(allUrls));
    
//     // Limit to maximum URLs to crawl
//     allUrls = allUrls.slice(0, maxCrawlUrls);
    
//     // Create an array of sources
//     const sources: ResearchSource[] = [];
//     let combinedData = '';
    
//     console.log(`Preparing to fetch up to ${options.MAX_DATA_SOURCES} sources from ${allUrls.length} URLs`);
    
//     // Use our enhanced domain-aware fetch utility
//     const fetchResults = await domainAwareFetch(
//       allUrls.slice(0, Math.min(allUrls.length, options.MAX_DATA_SOURCES)),
//       Math.min(30, Math.floor(options.MAX_PARALLEL_REQUESTS / 2)),
//       3
//     );
    
//     console.log(`Successfully fetched ${fetchResults.length} sources out of ${Math.min(allUrls.length, options.MAX_DATA_SOURCES)} attempted`);
    
//     // Process the fetched results
//     const processPromises = fetchResults.map(async (result) => {
//       try {
//         const { url, html } = result;
        
//         // Extract title from HTML
//         let title = url;
//         const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
//         if (titleMatch && titleMatch[1]) {
//           title = titleMatch[1].trim();
//         }
        
//         // Extract relevant content
//         const extractedContent = options.extractRelevantContent(html, query, url);
        
//         // Calculate relevance
//         const relevanceScore = options.calculateRelevanceLegacy(extractedContent, query);
        
//         // Check for freshness signals in the content
//         const freshnessScore = options.calculateFreshnessScore(extractedContent, query);
        
//         // Adjust relevance based on freshness for recency-sensitive queries
//         const recencyAdjustedRelevance = /latest|recent|new|update/i.test(query)
//           ? ((relevanceScore * 0.7) + (freshnessScore * 0.3))
//           : relevanceScore;
        
//         // Only keep sources with minimum relevance and content
//         if (recencyAdjustedRelevance >= 0.3 && extractedContent.length > 100) {
//           const source: ResearchSource = {
//             url,
//             title,
//             content: extractedContent,
//             relevance: recencyAdjustedRelevance,
//             timestamp: new Date().toISOString()
//           };
          
//           sources.push(source);
//         }
//       } catch (error) {
//         console.error(`Error processing result for ${result.url}:`, error);
//       }
//     });
    
//     // Wait for all processing to complete
//     await Promise.all(processPromises);
    
//     // Update combined data from all valid sources
//     for (const source of sources) {
//       combinedData += `\n\nSOURCE: ${source.title}\nURL: ${source.url}\n${source.content.substring(0, 2000)}`;
//     }
    
//     console.log(`Processed ${sources.length} valid sources with combined data length: ${combinedData.length} characters`);
    
//     // Prioritize sources based on relevance, freshness, and authority
//     const prioritizedSources = options.prioritizeSources(sources, query);
    
//     // Combine all the content - now using prioritized sources
//     combinedData = prioritizedSources
//       .map(r => `Source: ${r.title || 'Unknown'}\n${r.content || ''}`)
//       .join('\n\n---\n\n');
    
//     // Learn from this query for future adaptation
//     options.adaptSearchStrategy(query, {
//       sources: prioritizedSources,
//       data: combinedData
//     });
    
//     console.log(`Completed web crawling with ${prioritizedSources.length} sources`);
    
//     return {
//       data: combinedData,
//       sources: prioritizedSources
//     };
//   } catch (error) {
//     console.error("Web crawling failed", error);
//     return options.fallbackResearch(query, depth);
//   }
// }