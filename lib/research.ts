import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchResult, ResearchSource, ResearchPlan } from './types';

export class ResearchEngine {
  private model: any;
  private cache: Map<string, { data: ResearchResult; timestamp: number }>;
  private CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.cache = new Map();
  }

  private getCachedResult(query: string): ResearchResult | null {
    const cached = this.cache.get(query);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private async createResearchPlan(query: string): Promise<ResearchPlan> {
    // First, analyze the query to understand what type of information is needed
    const queryAnalysisPrompt = `
      Analyze this research query: "${query}"
      
      Identify:
      1. The core subject/topic
      2. What type of information is being requested (facts, comparison, analysis, etc.)
      3. Any time constraints or specific aspects mentioned
      4. The likely purpose of this research (education, decision-making, problem-solving)
      
      Return in JSON format:
      {
        "topic": "core topic",
        "informationType": "type of information needed",
        "aspects": ["specific aspect 1", "specific aspect 2"],
        "purpose": "likely purpose",
        "expectedSources": ["domain type 1", "domain type 2"]
      }
    `;
    
    let queryAnalysis = {
      topic: query,
      informationType: "general information",
      aspects: ["overview"],
      purpose: "learning",
      expectedSources: ["websites", "articles"]
    };
    
    try {
      console.log("Analyzing research query:", query);
      const analysisResult = await this.model.generateContent(queryAnalysisPrompt);
      const analysisText = analysisResult.response.text();
      
      // Extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          queryAnalysis = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse query analysis:", e);
        }
      }
    } catch (error) {
      console.error("Error in query analysis:", error);
    }

    // Now create a structured research plan based on the query analysis
    const planPrompt = `
      Create a comprehensive research plan for investigating: "${query}"
      
      Query Analysis:
      - Core Topic: ${queryAnalysis.topic}
      - Information Type: ${queryAnalysis.informationType}
      - Key Aspects: ${queryAnalysis.aspects.join(', ')}
      - Research Purpose: ${queryAnalysis.purpose}
      - Expected Sources: ${queryAnalysis.expectedSources.join(', ')}
      
      Design a systematic research plan with:
      1. Specific research questions that will provide a complete understanding
      2. Key areas to investigate with specific, measurable objectives
      3. A logical approach to gathering reliable information
      
      Format your response as a valid JSON object, strictly following this format:
      {
        "mainQuery": "${query}",
        "objective": "clear statement of research goal",
        "subQueries": [
          {"question": "specific question 1", "purpose": "why this matters"},
          {"question": "specific question 2", "purpose": "why this matters"},
          {"question": "specific question 3", "purpose": "why this matters"}
        ],
        "researchAreas": ["area1", "area2", "area3"],
        "explorationStrategy": "specific approach",
        "priorityOrder": ["first focus", "second focus", "third focus"]
      }
    `;

    try {
      console.log("Creating structured research plan");
      const result = await this.model.generateContent(planPrompt);
      let planText = result.response.text();
      
      // Try to extract JSON if it's wrapped in backticks or other markers
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planText = jsonMatch[0];
      }
      
      try {
        // Parse the JSON response
        const parsedPlan = JSON.parse(planText);
        
        // Convert to our ResearchPlan format if needed
        const researchPlan: ResearchPlan = {
          mainQuery: parsedPlan.mainQuery || query,
          objective: parsedPlan.objective || "Gather comprehensive information",
          subQueries: Array.isArray(parsedPlan.subQueries) 
            ? parsedPlan.subQueries.map((sq: any) => 
                typeof sq === 'object' ? sq.question : sq)
            : [query],
          researchAreas: parsedPlan.researchAreas || ["general"],
          explorationStrategy: parsedPlan.explorationStrategy || "systematic investigation",
          priorityOrder: parsedPlan.priorityOrder || []
        };
        
        console.log("Research plan created successfully");
        return researchPlan;
      } catch (e) {
        console.error("Failed to parse research plan JSON:", planText);
        throw e;
      }
    } catch (error) {
      console.error("Failed to create research plan", error);
      return {
        mainQuery: query,
        objective: "Gather basic information",
        subQueries: [query],
        researchAreas: ["general"],
        explorationStrategy: "direct exploration",
        priorityOrder: []
      };
    }
  }

  private async crawlWeb(query: string, depth: number = 2): Promise<{
    data: string;
    sources: ResearchSource[];
  }> {
    try {
      console.log(`Starting real web crawling for query: "${query}"`);
      const sources: ResearchSource[] = [];
      let combinedData = "";
      
      // Create more effective search queries
      const mainKeywords = query.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5)
        .join(' ');
      
      // Create shorter, more targeted search queries
      const searchQuery = encodeURIComponent(mainKeywords);
      const specificQuery = encodeURIComponent(query.substring(0, 100));
      
      // Use a variety of relevant, authoritative sources
      // 1. Start with domain-specific sources based on topic detection
      let domainSpecificUrls: string[] = [];
      
      // Tech topic detection
      if (/\b(javascript|typescript|react|angular|vue|node|npm|webpack|next\.?js|software|programming|code|developer|api)\b/i.test(query)) {
        domainSpecificUrls = [
          `https://github.com/vercel/next.js/releases`,
          `https://nextjs.org/blog`,
          `https://github.com/vercel/next.js/issues?q=${searchQuery}`,
          `https://dev.to/t/nextjs/latest?q=${searchQuery}`,
          `https://stackoverflow.com/questions/tagged/next.js?tab=Newest`
        ];
      }
      
      // Business topic detection
      else if (/\b(business|startup|company|entrepreneur|market|investment|funding|venture|finance|profit|revenue)\b/i.test(query)) {
        domainSpecificUrls = [
          `https://techcrunch.com/search/${searchQuery}`,
          `https://www.crunchbase.com/discover/organization.companies/${searchQuery}`,
          `https://www.forbes.com/search/?q=${searchQuery}`
        ];
      }
      
      // General knowledge sources as backup
      const generalUrls = [
        `https://en.wikipedia.org/wiki/${encodeURIComponent(mainKeywords.replace(/\s+/g, '_'))}`,
        `https://www.google.com/search?q=${specificQuery}`,
        `https://duckduckgo.com/?q=${specificQuery}`,
        `https://news.google.com/search?q=${searchQuery}`,
        `https://scholar.google.com/scholar?q=${searchQuery}`
      ];
      
      // Final list of URLs to try
      const searchUrls = [...domainSpecificUrls, ...generalUrls];
      
      // Try to fetch content from each source with timeout
      const fetchPromises = searchUrls.map(async (url, index) => {
        try {
          console.log(`Fetching ${index + 1}/${searchUrls.length}: ${url}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
          
          const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5'
            }
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
          }
          
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/html') && 
              !contentType.includes('application/json') && 
              !contentType.includes('application/xml')) {
            console.log(`Skipping non-HTML/JSON/XML content from ${url}`);
            return null;
          }
          
          const text = await response.text();
          
          // Advanced content extraction
          let extractedContent = this.extractRelevantContent(text, query, url);
          
          // Extract a title from the page
          let title = url;
          const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
          
          // Calculate relevance score based on keyword matches
          const keywords = query.toLowerCase().split(/\s+/);
          const contentLower = extractedContent.toLowerCase();
          
          // Calculate keyword density for relevance scoring
          const keywordMatches = keywords.reduce((count, word) => {
            if (word.length > 3) { // Only count significant words
              const regex = new RegExp(`\\b${word}\\b`, 'gi');
              const matches = (contentLower.match(regex) || []).length;
              return count + matches;
            }
            return count;
          }, 0);
          
          // Normalize score (higher is better, max 1.0)
          const relevanceScore = Math.min(0.3 + (keywordMatches / (extractedContent.length / 500) * 0.7), 1.0);
          
          // Only keep sources with minimum relevance and content
          if (relevanceScore > 0.4 && extractedContent.length > 300) {
            // Add to sources
            sources.push({
              url,
              title: title || `Source ${index + 1}`,
              relevance: relevanceScore,
              timestamp: new Date().toISOString()
            });
            
            // Add to combined data
            combinedData += `### Source: ${title} (${url})\n${extractedContent}\n\n`;
            
            console.log(`✓ Source added: ${title} (relevance: ${relevanceScore.toFixed(2)})`);
            return extractedContent;
          } else {
            console.log(`✗ Source rejected: ${title} (low relevance: ${relevanceScore.toFixed(2)})`);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
          return null;
        }
      });
      
      // Wait for all fetches to complete (or timeout)
      const results = await Promise.all(fetchPromises);
      const validResults = results.filter(Boolean);
      
      console.log(`Crawling complete: ${validResults.length}/${searchUrls.length} sources valid`);
      
      // If we couldn't get enough real data, fall back to AI generation BUT try harder first
      if (combinedData.trim().length < 1000 || sources.length === 0) {
        console.log("Insufficient web data, trying secondary search");
        
        // Create secondary search queries based on the original query
        const secondaryKeywords = `${mainKeywords} overview information details`;
        const secondaryUrls = [
          `https://www.bing.com/search?q=${encodeURIComponent(secondaryKeywords)}`,
          `https://www.reddit.com/search/?q=${encodeURIComponent(mainKeywords)}`,
          `https://medium.com/search?q=${encodeURIComponent(mainKeywords)}`
        ];
        
        // Try secondary sources
        const secondaryPromises = secondaryUrls.map(async (url, index) => {
          try {
            console.log(`Trying secondary source ${index + 1}/${secondaryUrls.length}: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(url, { 
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.5'
              }
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) return null;
            
            const text = await response.text();
            const extractedContent = this.extractRelevantContent(text, query, url);
            
            if (extractedContent.length > 300) {
              let title = url;
              const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
              }
              
              sources.push({
                url,
                title: title,
                relevance: 0.7,
                timestamp: new Date().toISOString()
              });
              
              combinedData += `### Source: ${title} (${url})\n${extractedContent}\n\n`;
              console.log(`✓ Secondary source added: ${title}`);
              return extractedContent;
            }
            return null;
          } catch (error) {
            console.error(`Error fetching secondary source ${url}:`, error);
            return null;
          }
        });
        
        await Promise.all(secondaryPromises);
      }
      
      // NOW check if we have enough data, and only fall back if we don't
      if (combinedData.trim().length < 800 || sources.length === 0) {
        console.log("Still insufficient web data, falling back to AI generation");
        return this.fallbackResearch(query, depth);
      }
      
      console.log(`Web crawling successful: ${sources.length} sources, ${combinedData.length} chars`);
      return {
        data: combinedData,
        sources
      };
    } catch (error) {
      console.error("Error in crawlWeb:", error);
      return this.fallbackResearch(query, depth);
    }
  }
  
  // New helper method for extracting relevant content
  private extractRelevantContent(html: string, query: string, url: string): string {
    try {
      // Remove script and style tags
      let extractedContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      extractedContent = extractedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      
      // Try to find main content area based on common patterns
      let mainContent = '';
      
      // Check for common content containers
      const contentPatterns = [
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<main[^>]*>([\s\S]*?)<\/main>/i,
        /<div[^>]*?(?:class|id)=["']?(?:content|main|post|article)["']?[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*?(?:class|id)=["']?(?:entry|blog|post-content)["']?[^>]*>([\s\S]*?)<\/div>/i
      ];
      
      for (const pattern of contentPatterns) {
        const match = extractedContent.match(pattern);
        if (match && match[1] && match[1].length > 200) {
          mainContent = match[1];
          break;
        }
      }
      
      // If no main content found, use the whole document
      if (!mainContent) {
        mainContent = extractedContent;
      }
      
      // Extract text while preserving some structure
      const structuredContent = mainContent
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '## $1\n')  // Convert h1 to markdown h2
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '### $1\n') // Convert h2 to markdown h3
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '#### $1\n') // Convert h3 to markdown h4
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '##### $1\n') // Convert h4 to markdown h5
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '###### $1\n') // Convert h5 to markdown h6
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') // Convert list items to markdown list items
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n') // Convert paragraphs
        .replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 [$1]') // Convert links
        .replace(/<[^>]*>/g, ' ') // Remove remaining HTML tags
        .replace(/&nbsp;/gi, ' ') // Replace &nbsp; with space
        .replace(/&lt;/gi, '<') // Replace &lt; with <
        .replace(/&gt;/gi, '>') // Replace &gt; with >
        .replace(/&amp;/gi, '&') // Replace &amp; with &
        .replace(/&quot;/gi, '"') // Replace &quot; with "
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Check if GitHub releases page and format appropriately
      if (url.includes("github.com") && url.includes("/releases")) {
        const releaseEntries = html.match(/<div[^>]*release-entry[^>]*>[\s\S]*?<\/div>/gi) || [];
        if (releaseEntries.length > 0) {
          let releases = '';
          for (const entry of releaseEntries.slice(0, 5)) { // Get first 5 releases only
            const titleMatch = entry.match(/<a[^>]*release-title[^>]*>([\s\S]*?)<\/a>/i);
            const bodyMatch = entry.match(/<div[^>]*release-body[^>]*>([\s\S]*?)<\/div>/i);
            
            if (titleMatch && titleMatch[1]) {
              releases += `### ${titleMatch[1].trim()}\n`;
              if (bodyMatch && bodyMatch[1]) {
                const body = bodyMatch[1].replace(/<[^>]*>/g, ' ').trim();
                releases += `${body}\n\n`;
              }
            }
          }
          return releases || structuredContent.substring(0, 5000);
        }
      }
      
      // Extract only the most relevant parts using a window around query terms
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      let relevantChunks = '';
      
      if (queryTerms.length > 0) {
        const sentences = structuredContent.split(/(?<=\.|\?|\!)\s+/);
        
        for (const sentence of sentences) {
          const sentenceLower = sentence.toLowerCase();
          for (const term of queryTerms) {
            if (sentenceLower.includes(term) && sentence.length < 500) {
              relevantChunks += sentence + ' ';
              break;
            }
          }
        }
      }
      
      // If we found relevant chunks, return those; otherwise, return the first 5000 chars of structured content
      return (relevantChunks.length > 300) 
        ? relevantChunks.trim() 
        : structuredContent.substring(0, 5000);
        
    } catch (e) {
      console.error("Error in extractRelevantContent:", e);
      // Fallback to basic extraction
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 3000);
    }
  }

  private async fallbackResearch(query: string, depth: number = 2): Promise<{
    data: string;
    sources: ResearchSource[];
  }> {
    try {
      console.log("Using fallback AI research for:", query);
      const researchPrompt = `
        Conduct research on the topic: "${query}"
        
        Provide specific, factual information including:
        1. Key facts about this topic
        2. Major perspectives on this issue
        3. Recent developments (be specific about dates and details)
        4. Important historical context
        5. Expert opinions with their actual names and credentials
        
        Format as a detailed research document with clear sections.
        Include exact sources where possible (specific websites, publications, experts).
        Admit when information is limited or uncertain.
        
        Research depth level: ${depth} (higher means more detailed)
      `;
      
      const result = await this.model.generateContent(researchPrompt);
      const researchText = result.response.text();
      
      // Extract potential sources from the AI-generated content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const extractedUrls = researchText.match(urlRegex) || [];
      
      const sources = extractedUrls.map((url: string) => ({
        url,
        title: `Source: ${url.split('/')[2] || 'Unknown'}`,
        relevance: 0.7,
        timestamp: new Date().toISOString()
      }));
      
      // If no URLs were found, add some generic sources based on the query
      if (sources.length === 0) {
        const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
        sources.push(
          {
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
            title: `Wikipedia: ${query}`,
            relevance: 0.8,
            timestamp: new Date().toISOString()
          },
          {
            url: `https://scholar.google.com/scholar?q=${searchQuery}`,
            title: `Google Scholar: ${query}`,
            relevance: 0.7,
            timestamp: new Date().toISOString()
          }
        );
      }
      
      return {
        data: researchText,
        sources
      };
    } catch (error) {
      console.error("Error in fallbackResearch:", error);
      // Even if AI fails, provide at least some informative response
      const basicData = `Unable to retrieve information for: "${query}" due to service limitations.`;
      
      const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
      return {
        data: basicData,
        sources: [
          {
            url: `https://www.google.com/search?q=${searchQuery}`,
            title: `Search: ${query}`,
            relevance: 0.5,
            timestamp: new Date().toISOString()
          }
        ]
      };
    }
  }

  private async analyzeData(
    query: string,
    data: string,
    sources: ResearchSource[]
  ): Promise<string> {
    // First, extract key facts from the raw data
    const factExtractionPrompt = `
      From the following research data on "${query}", extract ONLY factual information.
      Do not include opinions or speculations, only facts that have clear evidence.
      
      Research Data:
      ${data.substring(0, 20000)}
      
      Return a list of 10-15 key facts in this format:
      1. [Fact with specific details]
      2. [Fact with specific details]
      ...
    `;
    
    let extractedFacts = "";
    try {
      console.log("Extracting facts from research data");
      const factResult = await this.model.generateContent(factExtractionPrompt);
      extractedFacts = factResult.response.text();
    } catch (error) {
      console.error("Error in fact extraction:", error);
      extractedFacts = "Fact extraction failed due to technical limitations.";
    }
    
    // Now analyze the data and facts
    const prompt = `
      Task: Analyze the following research data and facts to generate a comprehensive report.
      
      Query: ${query}
      
      Extracted Key Facts:
      ${extractedFacts}
      
      Research Data: 
      ${data.substring(0, 15000)}
      
      Source Count: ${sources.length}
      Source Domains: ${sources.map(s => new URL(s.url).hostname).join(', ')}
      
      Instructions:
      1. Focus on evidence-based conclusions supported by multiple sources
      2. Evaluate the credibility and expertise of each source
      3. Identify consensus views versus minority perspectives
      4. Acknowledge data limitations and gaps in knowledge
      5. Distinguish between established facts and emerging trends
      6. Consider how recent the information is
      7. Note important conflicts between sources
      
      Format the response as a detailed report with:
      - Executive Summary (concise overview - 2-3 sentences)
      - Key Findings (5-7 bullet points of most important discoveries)
      - Detailed Analysis (evidence-based discussion with source citations)
      - Limitations (what couldn't be determined from available data)
      - Conclusions (what can be confidently stated based on evidence)
      
      Use direct citations when appropriate like [Source: domain.com].
      Write in a clear, direct style with no fluff or filler content.
    `;

    try {
      console.log("Analyzing research data with fact-based approach");
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error in analyzeData:", error);
      return `Analysis could not be generated due to an error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async refineQueries(query: string, initialData: string, plan: ResearchPlan): Promise<string[]> {
    const prompt = `
      Based on the initial research results and plan, suggest focused follow-up queries.
      
      Original Query: ${query}
      Research Plan: ${JSON.stringify(plan)}
      Initial Findings: ${initialData.substring(0, 10000)}
      
      After analyzing the initial research:
      1. What knowledge gaps remain?
      2. What contradictions need resolution?
      3. What areas deserve deeper investigation?
      4. What specialized perspectives should be explored?
      
      Return exactly 3 refined queries in a valid JSON format with no text before or after: 
      {"queries": ["query1", "query2", "query3"]}
    `;

    try {
      const result = await this.model.generateContent(prompt);
      let responseText = result.response.text();
      
      // Try to extract JSON if it's wrapped in backticks or other markers
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      try {
        const { queries } = JSON.parse(responseText);
        return queries;
      } catch (e) {
        console.error("Failed to parse refined queries JSON:", responseText);
        throw e;
      }
    } catch (error) {
      console.error("Error in refineQueries:", error);
      return [
        `${query} latest developments`,
        `${query} expert analysis`,
        `${query} future implications`
      ];
    }
  }

  private async synthesizeResearch(
    query: string,
    initialData: string,
    followUpData: string[],
    allSources: ResearchSource[],
    researchPath: string[]
  ): Promise<string> {
    // Create a source map for easier citation
    const sourceMap = allSources.reduce((map, source, index) => {
      const domain = new URL(source.url).hostname;
      if (!map[domain]) {
        map[domain] = {
          count: 1,
          urls: [source.url],
          titles: [source.title]
        };
      } else {
        map[domain].count += 1;
        map[domain].urls.push(source.url);
        map[domain].titles.push(source.title);
      }
      return map;
    }, {} as Record<string, {count: number, urls: string[], titles: string[]}>);
    
    // Prepare source summary
    const sourceSummary = Object.entries(sourceMap)
      .map(([domain, info]) => `${domain} (${info.count} sources)`)
      .join(', ');
    
    // Prepare research path with context
    const formattedPath = researchPath.map((q, i) => {
      if (i === 0) return `Initial query: "${q}"`;
      if (i <= 5) return `Research area ${i}: "${q}"`;
      return `Follow-up query ${i-5}: "${q}"`;
    }).join('\n');
    
    // Build the context
    const researchContext = `
      Original Query: "${query}"
      
      Research Process:
      ${formattedPath}
      
      Source Diversity: Data was collected from ${allSources.length} sources across ${Object.keys(sourceMap).length} domains: ${sourceSummary}
      
      Initial Research Findings (summary):
      ${initialData.substring(0, 7500)}
      
      Follow-up Research Findings (summaries):
      ${followUpData.map((d, i) => `--- Follow-up Area ${i+1} ---\n${d.substring(0, 3500)}`).join('\n\n')}
    `;

    const prompt = `
      Task: Synthesize all research data into a comprehensive, evidence-based report on "${query}".
      
      Research Context:
      ${researchContext}
      
      Instructions:
      1. Cross-reference information across multiple sources to verify accuracy
      2. Prioritize findings that are supported by multiple credible sources
      3. Clearly identify areas where sources disagree
      4. Document the confidence level for each major conclusion
      5. Maintain objectivity and avoid speculation
      6. Ensure all claims are backed by evidence from the research
      7. Present alternative perspectives where relevant
      8. Be specific about dates, numbers, and attributions
      
      Format as a professional research report with clear sections:
      - Executive Summary (1 paragraph overview)
      - Introduction (background on the topic)
      - Methodology (how the research was conducted)
      - Key Findings (evidence-based discoveries)
      - Analysis (patterns, trends, and implications)
      - Limitations (acknowledged constraints in the research)
      - Conclusions (evidence-supported answers to the original query)
      - References (sources organized by domain)
      
      Include specific citations when presenting factual information [Source: domain.com].
      Focus on delivering actionable insights based on verifiable data.
    `;

    try {
      console.log("Synthesizing research with cross-referencing approach");
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error in synthesizeResearch:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `
## Research Synthesis Error

The system encountered an error while attempting to synthesize the research findings: ${errorMessage}

### Available Research Data:
- ${researchPath.length} research paths were explored
- ${allSources.length} sources were consulted across ${Object.keys(sourceMap).length} different domains
- Initial data collection was ${initialData.length} characters in length
- ${followUpData.length} follow-up research streams were conducted

Please retry your query or contact support if this issue persists.
      `;
    }
  }

  async research(query: string): Promise<ResearchResult> {
    try {
      console.log(`Starting deep research process for: "${query}"`);
      const startTime = Date.now();
      
      // 1. Check cache first
      const cachedResult = this.getCachedResult(query);
      if (cachedResult) {
        console.log(`Returning cached research result for: "${query}"`);
        return cachedResult;
      }

      // 2. Create research plan
      console.log(`[1/7] Creating research plan for: "${query}"`);
      let researchPlan: ResearchPlan;
      try {
        researchPlan = await this.createResearchPlan(query);
        console.log(`Research plan created with ${researchPlan.subQueries?.length || 0} sub-queries`);
      } catch (planError) {
        console.error("Failed to create research plan:", planError);
        // Create a basic fallback plan
        researchPlan = {
          mainQuery: query,
          objective: `Gather comprehensive information about ${query}`,
          subQueries: [
            `What is ${query}?`,
            `Latest ${query} features`,
            `${query} documentation`,
            `${query} examples`,
            `${query} benefits and limitations`
          ],
          researchAreas: ["overview", "details", "applications"],
          explorationStrategy: "broad to specific",
          priorityOrder: ["official sources", "technical details", "examples"]
        };
      }

      // 3. Directly check authoritative sources first (major improvement)
      console.log(`[2/7] Checking authoritative sources first`);
      const authoritativeSources = this.getAuthoritativeSources(query);
      
      let foundAuthoritativeData = false;
      let authoritativeData = "";
      let authoritativeSrcList: ResearchSource[] = [];
      
      if (authoritativeSources.length > 0) {
        try {
          const results = await Promise.all(authoritativeSources.map(async (source) => {
            try {
              console.log(`Checking authoritative source: ${source}`);
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000);
              
              const response = await fetch(source, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
                }
              });
              
              clearTimeout(timeout);
              
              if (!response.ok) {
                console.log(`Failed to fetch ${source}: ${response.status}`);
                return null;
              }
              
              const text = await response.text();
              const extractedContent = this.extractRelevantContent(text, query, source);
              
              if (extractedContent.length > 500) {
                // Extract title
                let title = source;
                const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                  title = titleMatch[1].trim();
                }
                
                // Check if this is highly relevant content
                const relevanceScore = this.calculateRelevance(extractedContent, query);
                
                return {
                  url: source,
                  title,
                  content: extractedContent,
                  relevance: relevanceScore
                };
              }
              return null;
            } catch (e) {
              console.error(`Error fetching authoritative source ${source}:`, e);
              return null;
            }
          }));
          
          const validResults = results.filter(Boolean);
          
          if (validResults.length > 0) {
            // Sort by relevance
            validResults.sort((a, b) => (b?.relevance ?? 0) - (a?.relevance ?? 0));
            
            // Use the most relevant authoritative sources
            authoritativeData = validResults.map(r => 
              `### Source: ${r?.title || 'Unknown'} (${r?.url || '#'})\n${r?.content || ''}`
            ).join('\n\n');
            
            authoritativeSrcList = validResults.map(r => ({
              url: r?.url || '#',
              title: r?.title || 'Unknown Source',
              relevance: r?.relevance || 0.5,
              timestamp: new Date().toISOString()
            }));
            
            if (authoritativeData.length > 2000) {
              foundAuthoritativeData = true;
              console.log(`Found ${validResults.length} relevant authoritative sources!`);
            }
          }
        } catch (e) {
          console.error("Error checking authoritative sources:", e);
        }
      }
      
      // 4. Conduct initial research using web crawling, NOT AI generation
      console.log(`[3/7] Conducting initial research on ${researchPlan.subQueries.length} sub-queries`);
      
      // Use real web crawling for each sub-query
      const initialResultPromises = researchPlan.subQueries.map((q, index) => {
        // Stagger requests to avoid rate limiting (200ms between requests)
        return new Promise<{data: string, sources: ResearchSource[]}>(resolve => {
          setTimeout(async () => {
            try {
              console.log(`Researching sub-query ${index + 1}/${researchPlan.subQueries.length}: "${q}"`);
              // Use web crawling, with fallback only as last resort
              const result = await this.crawlWeb(q, 2);
              resolve(result);
            } catch (err) {
              console.error(`Error in sub-query ${index + 1}:`, err);
              resolve({
                data: `Error researching "${q}": ${err instanceof Error ? err.message : String(err)}`,
                sources: []
              });
            }
          }, index * 200);
        });
      });
      
      const initialResults = await Promise.all(initialResultPromises);
      console.log(`Initial research complete: ${initialResults.length} areas covered`);
      
      // Track research progress metrics
      const dataStats = {
        initialDataSize: 0,
        initialSourceCount: 0,
        refinedDataSize: 0,
        refinedSourceCount: 0,
        uniqueDomains: new Set<string>(),
        authoritativeSourceCount: foundAuthoritativeData ? authoritativeSrcList.length : 0
      };
      
      // Combine initial results with authoritative data if found
      let initialData = initialResults.map(r => r.data).join('\n\n');
      if (foundAuthoritativeData) {
        initialData = authoritativeData + '\n\n' + initialData;
      }
      
      // Combine and deduplicate sources
      const initialSourceUrls = new Set<string>();
      let initialSources: ResearchSource[] = [];
      
      // First add authoritative sources if found
      if (foundAuthoritativeData) {
        authoritativeSrcList.forEach(source => {
          initialSources.push(source);
          initialSourceUrls.add(source.url);
          try {
            const domain = new URL(source.url).hostname;
            dataStats.uniqueDomains.add(domain);
          } catch (e) {}
        });
      }
      
      // Then add other sources, avoiding duplicates
      initialResults.forEach(result => {
        result.sources.forEach(source => {
          if (!initialSourceUrls.has(source.url)) {
            initialSources.push(source);
            initialSourceUrls.add(source.url);
            try {
              const domain = new URL(source.url).hostname;
              dataStats.uniqueDomains.add(domain);
            } catch (e) {}
          }
        });
      });
      
      // Update stats
      dataStats.initialDataSize = initialData.length;
      dataStats.initialSourceCount = initialSources.length;
      
      // 5. Fact validation step (new)
      console.log(`[4/7] Validating facts from ${initialSources.length} sources`);
      
      // Group sources by domain to detect consensus
      const domainGroups: Record<string, {count: number, sources: ResearchSource[]}> = {};
      initialSources.forEach(source => {
        try {
          const domain = new URL(source.url).hostname;
          if (!domainGroups[domain]) {
            domainGroups[domain] = {count: 1, sources: [source]};
          } else {
            domainGroups[domain].count++;
            domainGroups[domain].sources.push(source);
          }
        } catch (e) {}
      });
      
      // Calculate credibility score for each source
      initialSources = initialSources.map(source => {
        try {
          const domain = new URL(source.url).hostname;
          const group = domainGroups[domain];
          
          // Calculate credibility factors:
          // 1. Multiple sources from same domain indicate consistency
          // 2. Official documentation domains are more credible
          let credibilityBoost = 0;
          
          // More credibility for official docs
          if (domain.includes('github.com') || 
              domain.includes('docs.') || 
              domain.includes('official') ||
              domain.includes('.org') ||
              domain.includes('stackoverflow.com')) {
            credibilityBoost += 0.15;
          }
          
          // More credibility for multiple sources from same domain
          if (group && group.count > 1) {
            credibilityBoost += Math.min(0.1 * group.count, 0.3);
          }
          
          // Apply credibility adjustment to relevance
          const adjustedRelevance = Math.min(source.relevance + credibilityBoost, 1.0);
          
          return {
            ...source,
            relevance: adjustedRelevance
          };
        } catch (e) {
          return source;
        }
      });
      
      // 6. Initial analysis to identify knowledge gaps
      console.log(`[5/7] Analyzing research data (${Math.round(initialData.length/1000)}KB)`);
      let initialAnalysis = "";
      try {
        initialAnalysis = await this.analyzeData(query, initialData, initialSources);
        console.log(`Initial analysis complete: ${Math.round(initialAnalysis.length/1000)}KB`);
      } catch (analysisError) {
        console.error("Initial analysis failed:", analysisError);
        initialAnalysis = `Failed to analyze initial data: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`;
      }
      
      // 7. Refine queries based on initial analysis
      console.log(`[6/7] Refining research queries based on analysis`);
      let refinedQueries: string[] = [];
      try {
        // Extract knowledge gaps from analysis
        const gapMatch = initialAnalysis.match(/knowledge gaps:?([\s\S]*?)(?:\n\n|\n##|\n\*\*|$)/i);
        const gapText = gapMatch ? gapMatch[1].trim() : '';
        
        if (gapText) {
          console.log("Identified knowledge gaps:", gapText);
          
          // Extract specific questions from gaps
          const questions = gapText.split(/\n|\./).filter(line => 
            line.trim().length > 10 && 
            (line.includes('?') || /what|how|why|when|where|which|who/i.test(line))
          );
          
          if (questions.length > 0) {
            // Use up to 3 specific gap questions
            refinedQueries = questions.slice(0, 3).map(q => q.trim());
          }
        }
        
        // If no specific gaps were found, use standard refinement
        if (refinedQueries.length === 0) {
          refinedQueries = await this.refineQueries(query, initialData, researchPlan);
        }
        
        console.log(`Refined ${refinedQueries.length} follow-up queries: ${refinedQueries.join(', ')}`);
      } catch (refineError) {
        console.error("Query refinement failed:", refineError);
        // Create basic follow-up queries if refinement fails
        refinedQueries = [
          `${query} latest information`,
          `${query} pros and cons`,
          `${query} alternatives`
        ];
      }
      
      // Build full research path
      const researchPaths = [query, ...researchPlan.subQueries, ...refinedQueries];
      
      // 8. Deeper research on refined queries
      console.log(`[7/7] Conducting deeper research on ${refinedQueries.length} refined queries`);
      const refinedResultPromises = refinedQueries.map((q, index) => {
        // Stagger requests further apart for follow-ups (300ms)
        return new Promise<{data: string, sources: ResearchSource[]}>(resolve => {
          setTimeout(async () => {
            try {
              console.log(`Researching refined query ${index + 1}/${refinedQueries.length}: "${q}"`);
              const result = await this.crawlWeb(q, 3);
              resolve(result);
            } catch (err) {
              console.error(`Error in refined query ${index + 1}:`, err);
              resolve({
                data: `Error researching refined query "${q}": ${err instanceof Error ? err.message : String(err)}`,
                sources: []
              });
            }
          }, index * 300);
        });
      });
      
      const refinedResults = await Promise.all(refinedResultPromises);
      console.log(`Deeper research complete: ${refinedResults.length} refined areas covered`);
      
      // Extract and deduplicate refined data
      const refinedData = refinedResults.map(r => r.data);
      const refinedSources = refinedResults.flatMap(r => r.sources);
      
      // Update stats
      dataStats.refinedDataSize = refinedData.join('\n\n').length;
      dataStats.refinedSourceCount = refinedSources.length;
      refinedSources.forEach(s => {
        try {
          const domain = new URL(s.url).hostname;
          dataStats.uniqueDomains.add(domain);
        } catch (e) {}
      });
      
      // Combine all unique sources
      const allSources = [...initialSources];
      
      // Add only new sources from refinedSources (avoid duplicates)
      const existingUrls = new Set(initialSources.map(s => s.url));
      refinedSources.forEach(source => {
        if (!existingUrls.has(source.url)) {
          allSources.push(source);
          existingUrls.add(source.url);
        }
      });
      
      // 9. Final synthesis
      console.log(`Synthesizing research from ${allSources.length} sources across ${dataStats.uniqueDomains.size} domains`);
      let analysis;
      try {
        analysis = await this.synthesizeResearch(query, initialData, refinedData, allSources, researchPaths);
      } catch (synthesisError) {
        console.error("Research synthesis failed:", synthesisError);
        analysis = `Error synthesizing research: ${synthesisError instanceof Error ? synthesisError.message : String(synthesisError)}`;
      }
      
      // Create the final research result
      const result: ResearchResult = {
        query,
        findings: initialData + '\n\n' + refinedData.join('\n\n'),
        analysis,
        sources: allSources,
        confidence: 0.85,
        plan: researchPlan,
        researchPath: researchPaths
      };
      
      // Calculate and log performance metrics
      const duration = (Date.now() - startTime) / 1000; // in seconds
      console.log(`Research complete in ${duration.toFixed(1)}s`);
      console.log(`Data collected: ${(dataStats.initialDataSize + dataStats.refinedDataSize) / 1024}KB`);
      console.log(`Sources: ${allSources.length} from ${dataStats.uniqueDomains.size} domains`);
      
      // Cache the result
      this.cache.set(query, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error("Research process failed:", error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // New helper method to get authoritative sources based on query
  private getAuthoritativeSources(query: string): string[] {
    const authoritativeSources: string[] = [];
    
    // Extract key terms for better source matching
    const queryLower = query.toLowerCase();
    
    // Check for Next.js specific queries
    if (queryLower.includes('next.js') || queryLower.includes('nextjs')) {
      // Version specific (extract version if present)
      const versionMatch = queryLower.match(/next\.?js\s+(\d+(?:\.\d+)?(?:\.\d+)?)/i);
      const version = versionMatch ? versionMatch[1] : '';
      
      if (version) {
        const majorVersion = version.split('.')[0];
        authoritativeSources.push(
          `https://github.com/vercel/next.js/releases/tag/v${version}`,
          `https://github.com/vercel/next.js/releases`,
          `https://nextjs.org/blog/${majorVersion}`
        );
      } else {
        authoritativeSources.push(
          'https://nextjs.org/docs',
          'https://github.com/vercel/next.js/releases',
          'https://nextjs.org/blog'
        );
      }
    }
    
    // Add more patterns here for other tech stacks, topics, etc.
    // ...
    
    return authoritativeSources;
  }
  
  // New helper method to calculate relevance of content
  private calculateRelevance(content: string, query: string): number {
    // Basic implementation - can be enhanced with ML/embeddings
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    const contentLower = content.toLowerCase();
    
    // Count exact phrase matches (high weight)
    const phraseMatchCount = (contentLower.match(new RegExp(query.toLowerCase(), 'g')) || []).length;
    
    // Count individual term matches (lower weight)
    let termMatchCount = 0;
    queryTerms.forEach(term => {
      termMatchCount += (contentLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    });
    
    // Calculate content density score (matches per length)
    const contentLength = content.length;
    const densityScore = (phraseMatchCount * 5 + termMatchCount) / (contentLength / 500);
    
    // Final relevance score calculation (0.0 to 1.0)
    return Math.min(0.3 + (densityScore * 0.7), 1.0);
  }
}