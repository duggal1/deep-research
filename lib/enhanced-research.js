// Enhanced ResearchEngine Implementation
// Use this as a reference for implementing improvements in the main ResearchEngine class

/**
 * Enhanced massive parallel fetching that processes far more sources
 */
async function massiveParallelFetch(urls) {
  console.log(`Starting massive parallel fetch for ${urls.length} URLs`);
  
  // Group URLs by domain to prevent overwhelming any single domain
  const domainBuckets = {};
  
  urls.forEach(url => {
    try {
      const domain = new URL(url).hostname;
      if (!domainBuckets[domain]) {
        domainBuckets[domain] = [];
      }
      domainBuckets[domain].push(url);
    } catch (e) {
      console.error(`Error parsing URL: ${url}`);
    }
  });
  
  const sources = [];
  // Process up to 20 domains in parallel
  const MAX_CONCURRENT_DOMAINS = 20;
  // Up to 3 URLs per domain in parallel
  const MAX_CONCURRENT_PER_DOMAIN = 3;
  
  const domains = Object.keys(domainBuckets);
  console.log(`Processing ${domains.length} domains with up to ${MAX_CONCURRENT_DOMAINS} at once`);
  
  // Process domains in batches for massive parallelism
  for (let i = 0; i < domains.length; i += MAX_CONCURRENT_DOMAINS) {
    const domainBatch = domains.slice(i, i + MAX_CONCURRENT_DOMAINS);
    
    // Process each batch of domains in parallel
    const domainResults = await Promise.all(domainBatch.map(async (domain) => {
      const urlsForDomain = domainBuckets[domain];
      const domainSources = [];
      
      // Process URLs for this domain with controlled concurrency
      for (let j = 0; j < urlsForDomain.length; j += MAX_CONCURRENT_PER_DOMAIN) {
        const urlBatch = urlsForDomain.slice(j, j + MAX_CONCURRENT_PER_DOMAIN);
        
        // Process batch in parallel
        const batchResults = await Promise.all(urlBatch.map(async (url) => {
          try {
            // Set a timeout for fetch to avoid hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            console.log(`Fetching: ${url}`);
            const response = await fetch(url, { 
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.5'
              }
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              console.log(`Failed to fetch ${url}: ${response.status}`);
              return null;
            }
            
            const html = await response.text();
            
            // Process the result
            return {
              url,
              html,
              timestamp: new Date().toISOString()
            };
          } catch (e) {
            console.log(`Error fetching ${url}:`, e);
            return null;
          }
        }));
        
        // Filter out failures and process HTML content
        const validResults = batchResults.filter(Boolean);
        
        // Extract content from each valid result
        for (const result of validResults) {
          try {
            // Extract title
            let title = result.url;
            const titleMatch = result.html.match(/<title[^>]*>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].trim();
            }
            
            // Extract and process content
            // Using a placeholder for the extractRelevantContent method
            const extractedContent = "Extracted content from " + result.url;
            
            // Extract code snippets
            const codeSnippets = extractCodeSnippets(result.html);
            
            domainSources.push({
              url: result.url,
              title,
              content: extractedContent,
              codeSnippets,
              timestamp: result.timestamp
            });
          } catch (e) {
            console.error(`Error processing content from ${result.url}:`, e);
          }
        }
        
        // Small delay between batches for the same domain
        if (j + MAX_CONCURRENT_PER_DOMAIN < urlsForDomain.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return domainSources;
    }));
    
    // Flatten and add all domain results to the main sources array
    sources.push(...domainResults.flat());
    
    console.log(`Completed batch ${Math.floor(i/MAX_CONCURRENT_DOMAINS) + 1}/${Math.ceil(domains.length/MAX_CONCURRENT_DOMAINS)}`);
  }
  
  console.log(`Massive parallel fetch completed. Found ${sources.length} sources.`);
  return sources;
}

/**
 * Enhanced code snippet extraction with improved regex patterns
 */
function extractCodeSnippets(html) {
  const snippets = [];
  
  try {
    // Match <pre><code> elements (common in documentation and tech blogs)
    const preCodeRegex = /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
    let match;
    while ((match = preCodeRegex.exec(html)) !== null) {
      if (match[1] && match[1].trim().length > 10) {
        // Decode HTML entities in code
        const decoded = match[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        snippets.push({
          type: 'html-code-block',
          content: decoded.trim()
        });
      }
    }
    
    // Also try to find code in GitHub-style ```code``` blocks
    const markdownCodeRegex = /```([a-z]*)\n([\s\S]*?)```/gi;
    while ((match = markdownCodeRegex.exec(html)) !== null) {
      if (match[2] && match[2].trim().length > 10) {
        snippets.push({
          type: 'markdown-code-block',
          language: match[1] || 'unknown',
          content: match[2].trim()
        });
      }
    }
    
    // Also capture inline code with single backticks if they're long enough
    const inlineCodeRegex = /`([^`]{30,})`/g;
    while ((match = inlineCodeRegex.exec(html)) !== null) {
      if (match[1] && match[1].trim().length > 30) {
        snippets.push({
          type: 'inline-code',
          content: match[1].trim()
        });
      }
    }
    
    // Look for <script> tags with meaningful content
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1] && match[1].trim().length > 50 && 
          !match[1].includes('Google Analytics') && 
          !match[1].includes('gtag') &&
          !match[1].includes('function(') && 
          !match[1].includes('var _') && 
          !match[1].includes('window.dataLayer')) {
        
        snippets.push({
          type: 'script',
          content: match[1].trim()
        });
      }
    }
  } catch (error) {
    console.error("Error extracting code snippets:", error);
  }
  
  return snippets;
}

/**
 * Generate many more search URLs to process a much larger set of sources
 */
function generateMassiveUrlSet(query) {
  const urls = [];
  
  // Extract main keywords
  const mainKeywords = query
    .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
    .replace(/['"]/g, '')
    .trim();
  
  // Check if query contains version numbers
  const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
  const versionMatch = query.match(versionRegex);
  const versionTag = versionMatch ? versionMatch[0] : '';
  
  // Create query variations
  const queryVariations = [
    mainKeywords,
    `${mainKeywords} tutorial`,
    `${mainKeywords} documentation`,
    `${mainKeywords} code example`,
    `${mainKeywords} implementation`,
    `${mainKeywords} sample`,
    `${mainKeywords} api reference`,
    `${mainKeywords} best practices`,
    `${mainKeywords} quickstart`,
    `${mainKeywords} guide`,
    `${mainKeywords} cheatsheet`,
    versionTag ? `${mainKeywords} ${versionTag}` : '',
    `${mainKeywords} latest version`,
    `${mainKeywords} github`,
    `${mainKeywords} stackoverflow`,
    `"${mainKeywords}" filetype:pdf`, // PDF documentation
    `"${mainKeywords}" site:github.com`, // GitHub specific
    `"${mainKeywords}" inurl:docs`, // URLs with "docs"
    `"${mainKeywords}" inurl:api`, // URLs with "api"
    `"${mainKeywords}" intitle:tutorial` // Pages with "tutorial" in title
  ].filter(Boolean);
  
  // Add search engines with different query variations
  const searchEngines = [
    (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
    (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`
  ];
  
  // Generate URLs from all combinations of search engines and query variations
  for (const engine of searchEngines) {
    for (const variation of queryVariations) {
      urls.push(engine(variation));
    }
  }
  
  // Add specialized sites for programming and technical content
  const techSites = [
    (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
    (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=code`,
    (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=issues`,
    (q) => `https://dev.to/search?q=${encodeURIComponent(q)}`,
    (q) => `https://medium.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(q)}`,
    (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    (q) => `https://hackernoon.com/search?query=${encodeURIComponent(q)}`,
    (q) => `https://lobste.rs/search?q=${encodeURIComponent(q)}&what=stories&order=relevance`,
    (q) => `https://news.ycombinator.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
    (q) => `https://www.npmjs.com/search?q=${encodeURIComponent(q)}`,
    (q) => `https://pypi.org/search/?q=${encodeURIComponent(q)}`,
    (q) => `https://crates.io/search?q=${encodeURIComponent(q)}`,
    (q) => `https://rubygems.org/search?query=${encodeURIComponent(q)}`,
    (q) => `https://packagist.org/search/?query=${encodeURIComponent(q)}`,
    (q) => `https://www.nuget.org/packages?q=${encodeURIComponent(q)}`,
    (q) => `https://godoc.org/?q=${encodeURIComponent(q)}`,
    (q) => `https://docs.rs/releases/search?query=${encodeURIComponent(q)}`
  ];
  
  // Generate URLs from tech sites
  for (const site of techSites) {
    urls.push(site(mainKeywords));
  }
  
  // Add academic and research sources
  const academicSites = [
    (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
    (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all`,
    (q) => `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(q)}`,
    (q) => `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(q)}`
  ];
  
  // Generate URLs from academic sites for technical topics
  if (/algorithm|research|paper|theory|computation|analysis/i.test(query)) {
    for (const site of academicSites) {
      urls.push(site(mainKeywords));
    }
  }
  
  // Deduplicate URLs
  return Array.from(new Set(urls));
}

// Example implementation of enhanced content extraction
function extractRelevantContent(html, query, url) {
  try {
    // Remove script and style elements
    let cleanedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                         .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                         .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '');
    
    // Extract main content using common content containers
    let mainContent = '';
    const contentContainers = [
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<div[^>]*(?:class|id)=['"](?:content|main|post|article|entry|blog-post)[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*(?:class|id)=['"](?:post-content|article-content|entry-content|content-main)[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    for (const pattern of contentContainers) {
      const matches = [...cleanedHtml.matchAll(pattern)];
      if (matches.length > 0) {
        // Use the longest match as it's likely the main content
        let bestMatch = '';
        for (const match of matches) {
          if (match[1].length > bestMatch.length) {
            bestMatch = match[1];
          }
        }
        if (bestMatch.length > 0) {
          mainContent = bestMatch;
          break;
        }
      }
    }
    
    // If no main content container found, use the whole body
    if (!mainContent) {
      const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        mainContent = bodyMatch[1];
      } else {
        mainContent = cleanedHtml;
      }
    }
    
    // Remove navigation, footer, sidebar elements
    const elementsToRemove = [
      /<nav[^>]*>[\s\S]*?<\/nav>/gi,
      /<footer[^>]*>[\s\S]*?<\/footer>/gi,
      /<aside[^>]*>[\s\S]*?<\/aside>/gi,
      /<div[^>]*(?:class|id)=['"](?:nav|navigation|menu|sidebar|footer|header|banner|advertising|ad)[^>]*>[\s\S]*?<\/div>/gi
    ];
    
    for (const pattern of elementsToRemove) {
      mainContent = mainContent.replace(pattern, ' ');
    }
    
    // Remove all HTML tags, keeping their content
    mainContent = mainContent.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    mainContent = mainContent.replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'");
    
    // Normalize whitespace
    mainContent = mainContent.replace(/\s+/g, ' ').trim();
    
    // Extract sections most relevant to query
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    if (queryTerms.length > 0 && mainContent.length > 15000) {
      const chunks = [];
      const sentences = mainContent.split(/\.\s+/);
      let currentChunk = '';
      
      // Group sentences into chunks
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > 1000) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence + '. ';
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      
      // Score chunks by query term relevance
      const scoredChunks = chunks.map(chunk => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        
        // Score exact phrase matches higher
        const phraseMatches = chunkLower.match(new RegExp(query.toLowerCase(), 'g'));
        score += (phraseMatches ? phraseMatches.length * 10 : 0);
        
        // Score individual term matches
        for (const term of queryTerms) {
          const termMatches = chunkLower.match(new RegExp(`\\b${term}\\b`, 'g'));
          score += (termMatches ? termMatches.length * 2 : 0);
        }
        
        return { chunk, score };
      });
      
      // Sort by score and take top chunks
      scoredChunks.sort((a, b) => b.score - a.score);
      const topChunks = scoredChunks.slice(0, 15).map(sc => sc.chunk);
      
      // Restore original order for better readability
      topChunks.sort((a, b) => mainContent.indexOf(a) - mainContent.indexOf(b));
      
      mainContent = topChunks.join('\n\n');
    }
    
    return mainContent;
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return html.substring(0, 5000); // Fallback to a substring
  }
}

// Export
module.exports = {
  massiveParallelFetch,
  extractCodeSnippets,
  generateMassiveUrlSet,
  extractRelevantContent
}; 