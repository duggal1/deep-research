/**
 * Enhanced fetch utility with robust error handling and retry logic
 */

/**
 * Performs a fetch request with timeout, retry logic, and error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @param retries Number of retries (default: 2)
 * @param timeout Timeout in milliseconds (default: 15000)
 * @returns Response data or null if failed
 */
export async function enhancedFetch(
  url: string, 
  options: RequestInit = {}, 
  retries: number = 2,
  timeout: number = 15000
): Promise<{ html: string; status: number } | null> {
  let lastError: Error | null = null;
  
  // Try multiple times if needed
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Add signal to options
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...(options.headers || {})
        }
      };
      
      // Attempt fetch
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // Handle response
      if (!response.ok) {
        console.log(`Fetch failed for ${url}: HTTP ${response.status}`);
        
        // For certain status codes, don't retry
        if (response.status === 404 || response.status === 403 || response.status === 401) {
          return null;
        }
        
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Get text content
      const html = await response.text();
      
      // Return successful result
      return { 
        html, 
        status: response.status 
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort errors (timeouts)
      if (lastError.name === 'AbortError') {
        console.log(`Fetch timeout for ${url}`);
        break;
      }
      
      // Log retry attempt
      if (attempt < retries) {
        console.log(`Retrying fetch for ${url} (attempt ${attempt + 1}/${retries}): ${lastError.message}`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  // All attempts failed
  console.error(`All fetch attempts failed for ${url}: ${lastError?.message}`);
  return null;
}

/**
 * Fetches multiple URLs in parallel with controlled concurrency
 * @param urls List of URLs to fetch
 * @param maxConcurrent Maximum number of concurrent requests
 * @returns Array of successful responses
 */
export async function batchFetch(
  urls: string[], 
  maxConcurrent: number = 10
): Promise<Array<{ url: string; html: string; status: number }>> {
  const results: Array<{ url: string; html: string; status: number }> = [];
  
  // Process in batches for controlled concurrency
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        try {
          const result = await enhancedFetch(url);
          if (result) {
            return { url, ...result };
          }
          return null;
        } catch (error) {
          console.error(`Error in batch fetch for ${url}:`, error);
          return null;
        }
      })
    );
    
    // Add successful results
    results.push(...batchResults.filter(Boolean) as Array<{ url: string; html: string; status: number }>);
    
    // Small delay between batches
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Groups URLs by domain to prevent overwhelming any single domain
 * @param urls List of URLs to group
 * @returns Object with domains as keys and arrays of URLs as values
 */
export function groupUrlsByDomain(urls: string[]): Record<string, string[]> {
  const domainBuckets: Record<string, string[]> = {};
  
  urls.forEach(url => {
    try {
      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const domain = new URL(fullUrl).hostname;
      
      if (!domainBuckets[domain]) {
        domainBuckets[domain] = [];
      }
      domainBuckets[domain].push(url);
    } catch (e) {
      console.error(`Error parsing URL: ${url}`);
    }
  });
  
  return domainBuckets;
}

/**
 * Fetches URLs grouped by domain with controlled concurrency
 * @param urls List of URLs to fetch
 * @param maxConcurrentDomains Maximum number of concurrent domains
 * @param maxConcurrentPerDomain Maximum number of concurrent requests per domain
 * @returns Array of successful responses
 */
export async function domainAwareFetch(
  urls: string[],
  maxConcurrentDomains: number = 15,
  maxConcurrentPerDomain: number = 3
): Promise<Array<{ url: string; html: string; status: number }>> {
  // Group URLs by domain
  const domainBuckets = groupUrlsByDomain(urls);
  const domains = Object.keys(domainBuckets);
  
  console.log(`Processing ${domains.length} domains with up to ${maxConcurrentDomains} at once`);
  
  const allResults: Array<{ url: string; html: string; status: number }> = [];
  
  // Process domains in batches
  for (let i = 0; i < domains.length; i += maxConcurrentDomains) {
    const domainBatch = domains.slice(i, i + maxConcurrentDomains);
    
    // Process each batch of domains in parallel
    const batchResults = await Promise.all(
      domainBatch.map(async (domain) => {
        const urlsForDomain = domainBuckets[domain];
        return await batchFetch(urlsForDomain, maxConcurrentPerDomain);
      })
    );
    
    // Flatten and add results
    allResults.push(...batchResults.flat());
    
    console.log(`Completed domain batch ${Math.floor(i/maxConcurrentDomains) + 1}/${Math.ceil(domains.length/maxConcurrentDomains)}`);
  }
  
  return allResults;
}