import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResearchResult, ResearchSource, ResearchPlan, ResearchFinding, CodeExample, ResearchConfidenceLevel } from './types';

export class ResearchEngine {
  private model: any;
  private cache: Map<string, { data: ResearchResult; timestamp: number }>;
  private CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  private startTime: number = 0;

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
      
      // Extract main keywords from the query (remove filler words)
      const mainKeywords = query
        .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
        .replace(/['"]/g, '')  // Remove quotes
        .trim();
      
      // Check if query contains version numbers
      const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
      const versionMatch = query.match(versionRegex);
      const versionTag = versionMatch ? versionMatch[0] : '';
      
      // Create human-like search queries
      const humanQueries = {
        general: `${mainKeywords}`,
        features: `${mainKeywords} features${versionTag ? ' ' + versionTag : ''}`,
        examples: `${mainKeywords} code example`,
        tutorial: `${mainKeywords} tutorial how to`,
        comparison: `${mainKeywords} vs alternatives comparison`,
        bestPractices: `${mainKeywords} best practices guide`
      };
      
      // Detect if query is about specific technologies
      const isTechQuery = /api|sdk|framework|library|platform|tool/i.test(query);
      
      // Detect if query is about code examples
      const isCodeQuery = /code|example|implementation|snippet|sample|how to/i.test(query);
      
      // Create domain-specific URLs based on tech and code detection
      let domainSpecificUrls: string[] = [];
      
      if (isCodeQuery) {
        domainSpecificUrls = [
          `https://github.com/search?q=${encodeURIComponent(humanQueries.examples)}&type=repositories`,
          `https://stackoverflow.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
          `https://dev.to/search?q=${encodeURIComponent(humanQueries.examples)}`
        ];
      } else if (isTechQuery) {
        // Look for official documentation and community resources
        const techName = mainKeywords.split(' ')[0]; // Extract main tech name
        domainSpecificUrls = [
          `https://github.com/search?q=${encodeURIComponent(techName)}&type=repositories`,
          `https://stackoverflow.com/questions/tagged/${encodeURIComponent(techName)}?tab=Newest`,
          `https://dev.to/t/${encodeURIComponent(techName.toLowerCase())}/latest?q=${encodeURIComponent(mainKeywords.substring(techName.length).trim())}`
        ];
      }
      
      // General search URLs - use more focused queries
      const generalUrls = [
        `https://www.google.com/search?q=${encodeURIComponent(humanQueries.general)}`,
        `https://www.google.com/search?q=${encodeURIComponent(humanQueries.features)}`,
        `https://duckduckgo.com/?q=${encodeURIComponent(humanQueries.general)}`,
        `https://dev.to/search?q=${encodeURIComponent(humanQueries.general)}`,
        `https://stackoverflow.com/search?q=${encodeURIComponent(humanQueries.general)}`,
        // Add academic sources for deeper research
        `https://scholar.google.com/scholar?q=${encodeURIComponent(mainKeywords)}`,
        `https://www.researchgate.net/search?q=${encodeURIComponent(mainKeywords)}`,
        // Add more search engines
        `https://www.bing.com/search?q=${encodeURIComponent(humanQueries.general)}`,
        `https://search.brave.com/search?q=${encodeURIComponent(humanQueries.general)}`
      ];
      
      // Find topical sites based on query content
      const topicalUrls = this.getTopicalSearchUrls(query);
      
      // Combine URLs with domain-specific ones first
      const searchUrls = [...domainSpecificUrls, ...topicalUrls, ...generalUrls];
      
      // Track requested domains to manage rate limiting
      const requestedDomains = new Set<string>();
      // Track delays for each domain
      const domainDelays: Record<string, number> = {};
      
      // Create an array of fetch promises
      const sources: ResearchSource[] = [];
      let combinedData = '';
      
      const fetchPromises = searchUrls.map(async (url, index) => {
        try {
          // Extract domain for rate limiting
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          
          // Check if we've requested this domain recently and need a delay
          if (requestedDomains.has(domain)) {
            const delay = domainDelays[domain] || 500;
            // Increase delay for repeated requests, max 3 seconds
            domainDelays[domain] = Math.min(delay * 1.5, 3000);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // First request to this domain
            requestedDomains.add(domain);
            domainDelays[domain] = 500; // Initial delay
          }
          
          // Set a timeout for fetch to avoid hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
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
            console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
          }
          
          const html = await response.text();
          
          // Extract title from HTML
          let title = url;
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
          
          // Extract relevant content
          const extractedContent = this.extractRelevantContent(html, query, url);
          
          // Calculate relevance
          const relevanceScore = this.calculateRelevance(extractedContent, query);
          
          // Only keep sources with minimum relevance and content
          const minContentLength = 50;
          if (relevanceScore >= 0.3 && extractedContent.length > minContentLength) {
            // Get additional links from the page for deeper crawling
            const linkMatches = html.match(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>/g);
            let additionalLinks: string[] = [];
            
            if (linkMatches && depth > 1) {
              additionalLinks = linkMatches
                .map(match => {
                  const hrefMatch = match.match(/href="([^"]*)"/);
                  return hrefMatch ? hrefMatch[1] : null;
                })
                .filter(Boolean) as string[];
                
              // Convert relative URLs to absolute
              additionalLinks = additionalLinks.map(link => {
                if (link.startsWith('http')) return link;
                try {
                  return new URL(link, url).href;
                } catch (e) {
                  return null;
                }
              }).filter(Boolean) as string[];
              
              // Select up to 3 most relevant additional links
              additionalLinks = additionalLinks
                .filter(link => 
                  !link.includes('login') && 
                  !link.includes('signin') && 
                  !link.includes('signup') &&
                  !link.includes('register') &&
                  !link.includes('cookie') &&
                  !link.includes('privacy') &&
                  (this.checkUrlRelevance(link, query) > 0.5)
                )
                .slice(0, 3);
                
              // Process additional links
              for (const link of additionalLinks) {
                try {
                  const linkUrl = new URL(link);
                  const linkDomain = linkUrl.hostname;
                  
                  if (requestedDomains.has(linkDomain)) {
                    const delay = domainDelays[linkDomain] || 500;
                    domainDelays[linkDomain] = Math.min(delay * 1.5, 3000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  } else {
                    requestedDomains.add(linkDomain);
                    domainDelays[linkDomain] = 500;
                  }
                  
                  // Set a timeout for fetch to avoid hanging
                  const linkController = new AbortController();
                  const linkTimeoutId = setTimeout(() => linkController.abort(), 8000);
                  
                  console.log(`Fetching additional link: ${link}`);
                  const linkResponse = await fetch(link, { 
                    signal: linkController.signal,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                      'Accept': 'text/html',
                      'Accept-Language': 'en-US,en;q=0.5'
                    }
                  });
                  clearTimeout(linkTimeoutId);
                  
                  if (!linkResponse.ok) continue;
                  
                  const linkHtml = await linkResponse.text();
                  
                  // Extract title
                  let linkTitle = link;
                  const linkTitleMatch = linkHtml.match(/<title[^>]*>(.*?)<\/title>/i);
                  if (linkTitleMatch && linkTitleMatch[1]) {
                    linkTitle = linkTitleMatch[1].trim();
                  }
                  
                  // Extract content
                  const linkContent = this.extractRelevantContent(linkHtml, query, link);
                  
                  // Calculate relevance
                  const linkRelevance = this.calculateRelevance(linkContent, query);
                  
                  if (linkRelevance >= 0.4 && linkContent.length > minContentLength) {
                    return {
                      url: link,
                      title: linkTitle,
                      relevance: linkRelevance,
                      content: linkContent,
                      timestamp: new Date().toISOString()
                    };
                  }
                } catch (e) {
                  console.log(`Error fetching additional link: ${link}`, e);
                }
              }
            }
            
            return {
              url,
              title,
              relevance: relevanceScore,
              content: extractedContent,
              timestamp: new Date().toISOString()
            };
          }
          
          return null;
        } catch (e) {
          console.log(`Error fetching ${url}:`, e);
          return null;
        }
      });
      
      const results = (await Promise.all(fetchPromises)).filter(Boolean);
      
      // Combine all the content
      combinedData = results
        .map(r => `Source: ${r?.title || 'Unknown'}\n${r?.content || ''}`)
        .join('\n\n---\n\n');
        
      // Compile sources
      sources.push(...results.map(r => ({
        url: r?.url || '',
        title: r?.title || 'Unknown Source',
        relevance: r?.relevance || 0.5,
        content: r?.content || '',
        timestamp: r?.timestamp || new Date().toISOString()
      })));
      
      console.log(`Completed web crawling with ${sources.length} sources`);
      
      return {
        data: combinedData,
        sources
      };
    } catch (error) {
      console.error("Web crawling failed", error);
      return this.fallbackResearch(query, depth);
    }
  }

  /**
   * Generate a diverse set of search queries based on the user query
   */
  private generateSearchQueries(query: string): string[] {
    // Extract main keywords
    const mainKeywords = query
      .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
      .replace(/['"]/g, '')  // Remove quotes
      .trim();
      
    // Check for version numbers/specific identifiers
    const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
    const versionMatch = query.match(versionRegex);
    const versionTag = versionMatch ? versionMatch[0] : '';
    
    // Identify if it's a code/programming query
    const isProgrammingQuery = /\b(code|function|api|library|framework|programming|developer|sdk|npm|package|class|method|interface|component|hook|module|dependency|import|export)\b/i.test(query);
    
    // Identify specific technology areas
    const webDev = /\b(html|css|javascript|typescript|react|vue|angular|svelte|dom|browser|frontend|web|responsive|node|express|nextjs|remix|gatsby)\b/i.test(query);
    const mobileDev = /\b(ios|android|react native|flutter|swift|kotlin|mobile app|mobile development)\b/i.test(query);
    const dataScience = /\b(python|machine learning|ml|ai|data science|tensorflow|pytorch|pandas|numpy|statistics|dataset|classification|regression|neural network)\b/i.test(query);
    const devOps = /\b(docker|kubernetes|ci\/cd|jenkins|github actions|aws|gcp|azure|cloud|serverless|lambda|deployment|container)\b/i.test(query);
    const database = /\b(sql|postgresql|mysql|mongodb|database|nosql|orm|query|joins|schema|data model|prisma|mongoose|sequelize)\b/i.test(query);
    
    // Check for request intent
    const wantsExamples = /\b(example|code|sample|snippet|demo|implementation|reference|how to use)\b/i.test(query);
    const wantsTutorial = /\b(tutorial|guide|walkthrough|step by step|learn|course|explain|how to)\b/i.test(query);
    const wantsComparison = /\b(vs|versus|comparison|compare|difference|better|alternative)\b/i.test(query);
    const wantsBestPractices = /\b(best practice|pattern|architecture|optimize|improve|clean|proper|correct way|standard)\b/i.test(query);
    
    // Generate query variants
    const queries = [
      mainKeywords, // Basic query
      `${mainKeywords}${versionTag ? ' ' + versionTag : ''}`, // With version tag if present
    ];
    
    // Add intent-specific queries
    if (wantsExamples) {
      queries.push(
        `${mainKeywords} example code`,
        `${mainKeywords} code sample`,
        `${mainKeywords} implementation example${versionTag ? ' ' + versionTag : ''}`
      );
    }
    
    if (wantsTutorial) {
      queries.push(
        `${mainKeywords} tutorial guide`,
        `how to use ${mainKeywords}${versionTag ? ' ' + versionTag : ''}`,
        `${mainKeywords} step by step guide`
      );
    }
    
    if (wantsComparison) {
      queries.push(
        `${mainKeywords} comparison alternatives`,
        `${mainKeywords} vs other${isProgrammingQuery ? ' libraries' : ''}`,
        `${mainKeywords} pros and cons`
      );
    }
    
    if (wantsBestPractices) {
      queries.push(
        `${mainKeywords} best practices`,
        `${mainKeywords} recommended patterns`,
        `${mainKeywords} optimization techniques`
      );
    }
    
    // Add technology-specific queries
    if (webDev) {
      queries.push(
        `${mainKeywords} web development`,
        `${mainKeywords} frontend ${isProgrammingQuery ? 'library' : 'usage'}`
      );
    }
    
    if (mobileDev) {
      queries.push(
        `${mainKeywords} mobile development`,
        `${mainKeywords} ${/ios|swift/i.test(query) ? 'iOS' : 'Android'} implementation`
      );
    }
    
    if (dataScience) {
      queries.push(
        `${mainKeywords} data science application`,
        `${mainKeywords} machine learning implementation`
      );
    }
    
    if (devOps) {
      queries.push(
        `${mainKeywords} devops integration`,
        `${mainKeywords} cloud deployment`
      );
    }
    
    if (database) {
      queries.push(
        `${mainKeywords} database usage`,
        `${mainKeywords} data modeling`
      );
    }
    
    // Documentation queries for technical topics
    if (isProgrammingQuery) {
      queries.push(
        `${mainKeywords} documentation${versionTag ? ' ' + versionTag : ''}`,
        `${mainKeywords} api reference`,
        `${mainKeywords} official docs`,
        `${mainKeywords} github`
      );
    }
    
    // Filter out duplicates and return
    return [...new Set(queries)];
  }

  /**
   * Identify the most relevant domains for a particular query
   */
  private identifyRelevantDomains(query: string): string[] {
    const domains: string[] = [];
    
    // General reference domains
    domains.push('stackoverflow.com', 'github.com');
    
    // Check for programming languages/technologies
    if (/\bjavascript\b|\bjs\b/i.test(query)) {
      domains.push('developer.mozilla.org', 'javascript.info', 'npmjs.com');
    }
    
    if (/\btypescript\b|\bts\b/i.test(query)) {
      domains.push('typescriptlang.org', 'typescript-eslint.io');
    }
    
    if (/\bpython\b/i.test(query)) {
      domains.push('docs.python.org', 'pypi.org', 'realpython.com');
    }
    
    if (/\bjava\b/i.test(query)) {
      domains.push('docs.oracle.com', 'maven.apache.org');
    }
    
    if (/\bc#\b|\bcsharp\b/i.test(query)) {
      domains.push('docs.microsoft.com', 'learn.microsoft.com');
    }
    
    if (/\bruby\b/i.test(query)) {
      domains.push('ruby-lang.org', 'rubygems.org');
    }
    
    if (/\bgo\b|\bgolang\b/i.test(query)) {
      domains.push('golang.org', 'go.dev');
    }
    
    if (/\brust\b/i.test(query)) {
      domains.push('rust-lang.org', 'crates.io');
    }
    
    // Check for frameworks/libraries
    if (/\breact\b/i.test(query)) {
      domains.push('reactjs.org', 'react.dev', 'legacy.reactjs.org');
    }
    
    if (/\bangular\b/i.test(query)) {
      domains.push('angular.io', 'angularjs.org');
    }
    
    if (/\bvue\b/i.test(query)) {
      domains.push('vuejs.org', 'v3.vuejs.org');
    }
    
    if (/\bsvelte\b/i.test(query)) {
      domains.push('svelte.dev');
    }
    
    if (/\bnextjs\b|\bnext\.js\b/i.test(query)) {
      domains.push('nextjs.org', 'vercel.com');
    }
    
    if (/\bnode\b|\bnode\.js\b/i.test(query)) {
      domains.push('nodejs.org', 'nodejs.dev');
    }
    
    if (/\bexpress\b/i.test(query)) {
      domains.push('expressjs.com');
    }
    
    if (/\bflutter\b/i.test(query)) {
      domains.push('flutter.dev', 'pub.dev');
    }
    
    if (/\bdjango\b/i.test(query)) {
      domains.push('djangoproject.com');
    }
    
    if (/\blaravel\b/i.test(query)) {
      domains.push('laravel.com');
    }
    
    if (/\bspring\b/i.test(query)) {
      domains.push('spring.io');
    }
    
    // Check for databases
    if (/\bsql\b|\bdatabase\b/i.test(query)) {
      domains.push('db-engines.com');
      
      if (/\bmysql\b/i.test(query)) {
        domains.push('dev.mysql.com');
      }
      
      if (/\bpostgresql\b|\bpostgres\b/i.test(query)) {
        domains.push('postgresql.org');
      }
      
      if (/\bmongodb\b/i.test(query)) {
        domains.push('mongodb.com');
      }
      
      if (/\bredis\b/i.test(query)) {
        domains.push('redis.io');
      }
    }
    
    // Check for cloud platforms/devops
    if (/\baws\b|\bamazon\s+web\s+services\b/i.test(query)) {
      domains.push('aws.amazon.com', 'docs.aws.amazon.com');
    }
    
    if (/\bazure\b|\bmicrosoft\s+azure\b/i.test(query)) {
      domains.push('azure.microsoft.com');
    }
    
    if (/\bgcp\b|\bgoogle\s+cloud\b/i.test(query)) {
      domains.push('cloud.google.com');
    }
    
    if (/\bdocker\b/i.test(query)) {
      domains.push('docs.docker.com');
    }
    
    if (/\bkubernetes\b|\bk8s\b/i.test(query)) {
      domains.push('kubernetes.io');
    }
    
    // Education platforms for broader topics
    domains.push(
      'medium.com',
      'dev.to',
      'freecodecamp.org',
      'geeksforgeeks.org',
      'w3schools.com',
      'javatpoint.com',
      'tutorialspoint.com'
    );
    
    // Research and academic sources if query seems academic
    if (/\bresearch\b|\bpaper\b|\bstudy\b|\btheory\b|\balgorithm\b|\bmathematical\b/i.test(query)) {
      domains.push(
        'arxiv.org',
        'scholar.google.com',
        'researchgate.net',
        'ieee.org',
        'acm.org'
      );
    }
    
    return domains;
  }

  /**
   * Check URL relevance to the query based on URL text
   */
  private checkUrlRelevance(url: string, query: string): number {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      const keywords = query.toLowerCase()
        .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
        .replace(/['"]/g, '')
        .trim()
        .split(/\s+/)
        .filter(kw => kw.length > 3);
      
      let relevanceScore = 0;
      
      // Check for keywords in path
      for (const keyword of keywords) {
        if (path.includes(keyword)) {
          relevanceScore += 0.2;
        }
      }
      
      // Check for documentation, guides, etc.
      if (path.includes('docs') || 
          path.includes('guide') || 
          path.includes('tutorial') || 
          path.includes('reference') || 
          path.includes('example') || 
          path.includes('api')) {
        relevanceScore += 0.3;
      }
      
      // Penalize certain paths
      if (path.includes('login') || 
          path.includes('signin') || 
          path.includes('signup') || 
          path.includes('register') || 
          path.includes('cookie') || 
          path.includes('privacy') ||
          path.includes('terms') ||
          path.includes('contact') ||
          path.includes('about') ||
          path.includes('pricing') ||
          path.includes('download')) {
        relevanceScore -= 0.3;
      }
      
      return Math.max(0, Math.min(1, relevanceScore));
    } catch (e) {
      return 0;
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
            timestamp: new Date().toISOString(),
            content: basicData
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
      From the following research data on "${query}", extract only factual information.
      Focus on extracting precise information that directly answers the research query.
      
      Research Data:
      ${data.substring(0, 20000)}
      
      Return a comprehensive list of at least 20 key facts in this format:
      1. [Detailed fact with specific references, statistics, or technical details when available]
      2. [Detailed fact with specific references, statistics, or technical details when available]
      ...
      
      When extracting facts:
      - Include version numbers, technical specifications, and exact terminology
      - Note specific limitations or requirements when mentioned
      - Include data points and statistics with their sources when available
      - Note any contradictions between different sources
      - Extract specific implementation examples or code patterns if relevant
      - Include real-world usage examples and case studies
      - Note performance metrics, compatibility information, and system requirements
    `;
    
    let extractedFacts = "";
    try {
      console.log("Extracting detailed facts from research data");
      const factResult = await this.model.generateContent(factExtractionPrompt);
      extractedFacts = factResult.response.text();
    } catch (error) {
      console.error("Error in fact extraction:", error);
      extractedFacts = "Fact extraction failed due to technical limitations.";
    }
    
    // Extract code examples separately for technical topics
    let codeExamples = "";
    const isCodeRelated = /\bcode\b|\bprogramming\b|\bapi\b|\bjavascript\b|\bpython\b|\bjava\b|\bc\+\+\b|\bcsharp\b|\bruby\b|\bphp\b|\bswift\b|\bkotlin\b|\brust\b|\bhtml\b|\bcss\b/i.test(query);
    
    if (isCodeRelated) {
      const codeExtractionPrompt = `
        From the research data, extract ONLY code examples, implementations, or technical patterns related to: "${query}"
        
        Research Data:
        ${data.substring(0, 20000)}
        
        Format each example with:
        - A title describing what the code does
        - The programming language used
        - The complete code snippet formatted properly
        - A brief explanation of how it works
        - Any necessary context (frameworks, libraries, etc.)
        
        Extract at least 3-5 different code examples if available. Format with proper markdown code blocks.
      `;
      
      try {
        console.log("Extracting code examples for technical query");
        const codeResult = await this.model.generateContent(codeExtractionPrompt);
        codeExamples = codeResult.response.text();
      } catch (error) {
        console.error("Error in code examples extraction:", error);
        codeExamples = "";
      }
    }
    
    // Now analyze the data, facts and code examples comprehensively
    const prompt = `
      Task: Produce an in-depth, expert-level analysis of the following research data to answer: "${query}"
      
      Research Query: ${query}
      
      Extracted Key Facts:
      ${extractedFacts}
      
      ${codeExamples ? `Technical Code Examples:\n${codeExamples}\n\n` : ''}
      
      Research Data: 
      ${data.substring(0, 15000)}
      
      Source Analysis:
      - Total Sources: ${sources.length}
      - Source Domains: ${sources.map(s => {
        try { 
          return new URL(s.url).hostname; 
        } catch(e) { 
          return s.url; 
        }
      }).join(', ')}
      - Source Credibility: ${this.analyzeSourceCredibility(sources)}
      
      Instructions for Comprehensive Analysis:
      1. Provide extremely detailed, technical insights that directly answer the research query
      2. Organize the information hierarchically with clear sections and subsections
      3. Include factual, quantitative data wherever possible
      4. Compare and contrast different approaches, technologies, or viewpoints
      5. Identify key factors, variables, or considerations that influence the topic
      6. Explain complex concepts with clear examples or analogies
      7. Highlight practical applications, implementation details, and real-world implications
      8. Address limitations, challenges, and potential solutions
      9. Provide context about the historical development and future directions
      10. Include specific examples and case studies that illustrate key points
      
      Format your response as a structured, professionally formatted report with:
      - Executive Summary (concise overview - 150-200 words)
      - Key Findings (comprehensive list of 10-15 major discoveries with details)
      - Detailed Analysis (in-depth examination organized by subtopics)
      - Technical Implementation (specific details, examples, and guidelines)
      - Comparative Analysis (evaluation of different approaches, methods, or solutions)
      - Practical Applications (real-world usage scenarios and implementation guidance)
      - Limitations and Challenges (detailed discussion of constraints with potential solutions)
      - Future Directions (emerging trends and developments)
      - Conclusions (synthesized insights and recommendations)
      
      Use direct citations when appropriate like [Source: domain.com].
      Prioritize depth of analysis over breadth - provide detailed, technical explanations rather than superficial overviews.
      Include as much specific data and factual information as possible to substantiate all claims and assertions.
      Incorporate numerical data, statistics, technical specifications, and quantitative measurements.
      If the topic is technical, include specific implementation details, architecture considerations, and technical requirements.
    `;

    try {
      console.log("Generating comprehensive research analysis");
      const result = await this.model.generateContent(prompt);
      const analysisText = result.response.text();
      
      // Further enhance the analysis with references and visualizations descriptions
      const enhancementPrompt = `
        Review and enhance this research analysis on "${query}" by:
        
        1. Adding appropriate references and citations
        2. Including descriptions of relevant visualizations (diagrams, flowcharts, etc.)
        3. Adding detailed examples and case studies
        4. Providing more technical depth and specific implementation details
        
        Original Analysis:
        ${analysisText}
        
        Return the enhanced analysis with all the original content preserved, but with added depth,
        technical precision, and extended examples. Do not remove any content from the original analysis.
      `;
      
      try {
        const enhancedResult = await this.model.generateContent(enhancementPrompt);
        return enhancedResult.response.text();
      } catch (error) {
        console.log("Enhancement failed, returning original analysis");
        return analysisText;
      }
    } catch (error) {
      console.error("Error in comprehensive analyzeData:", error);
      return `Analysis could not be generated due to an error: ${error instanceof Error ? error.message : String(error)}. Please try a more specific query or check your internet connection.`;
    }
  }
  
  /**
   * Analyze the credibility of sources
   */
  private analyzeSourceCredibility(sources: ResearchSource[]): string {
    if (!sources || sources.length === 0) return "No sources available";
    
    // Count domains for credibility analysis
    const domainCounts: Record<string, number> = {};
    const highAuthorityDomains = [
      'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
      'docs.python.org', 'docs.oracle.com', 'docs.microsoft.com',
      'arxiv.org', 'ieee.org', 'acm.org', 'scholar.google.com',
      'research.google', 'research.microsoft.com', 'researchgate.net',
      'nature.com', 'science.org', 'nejm.org', 'sciencedirect.com'
    ];
    
    let highAuthorityCount = 0;
    let totalDomains = 0;
    
    for (const source of sources) {
      try {
        const domain = new URL(source.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        
        if (highAuthorityDomains.some(authDomain => domain.includes(authDomain))) {
          highAuthorityCount++;
        }
        
        totalDomains++;
      } catch (e) {
        // Skip invalid URLs
      }
    }
    
    const domainsWithMultipleSources = Object.entries(domainCounts)
      .filter(([domain, count]) => count > 1)
      .map(([domain, count]) => `${domain} (${count} sources)`);
    
    const credibilityAssessment = 
      highAuthorityCount > totalDomains * 0.5 ? "High - Multiple authoritative sources" :
      highAuthorityCount > totalDomains * 0.3 ? "Medium-High - Some authoritative sources" :
      highAuthorityCount > totalDomains * 0.1 ? "Medium - Few authoritative sources" :
      "Unverified - Limited authoritative sources";
    
    return `${credibilityAssessment}. ${domainsWithMultipleSources.length > 0 ? 
      `Multiple sources from: ${domainsWithMultipleSources.join(', ')}` : 
      'No domains with multiple sources'}`;
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
    const startTime = Date.now();
    this.startTime = startTime;
    
    // Check cache first
    const cachedResult = this.getCachedResult(query);
    if (cachedResult) {
      console.log(`Using cached research result for: "${query}"`);
      return cachedResult;
    }
    
    console.log(`Starting deep research process for: "${query}"`);
    
    try {
      // 1. Create research plan
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

      // 2. Directly check authoritative sources first (major improvement)
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
              timestamp: r?.timestamp || new Date().toISOString(),
              content: r?.content || ''
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
      
      // 3. Conduct initial research using web crawling, NOT AI generation
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
      
      // 4. Fact validation step (new)
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
      
      // 5. Initial analysis to identify knowledge gaps
      console.log(`[5/7] Analyzing research data (${Math.round(initialData.length/1000)}KB)`);
      let initialAnalysis = "";
      try {
        initialAnalysis = await this.analyzeData(query, initialData, initialSources);
        console.log(`Initial analysis complete: ${Math.round(initialAnalysis.length/1000)}KB`);
      } catch (analysisError) {
        console.error("Initial analysis failed:", analysisError);
        initialAnalysis = `Failed to analyze initial data: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`;
      }
      
      // 6. Refine queries based on initial analysis
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
      
      // 7. Build full research path
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
      const result = {
        query,
        findings: [
          {
            key: "Research Data",
            details: initialData + '\n\n' + refinedData.join('\n\n')
          }
        ],
        sources: allSources,
        confidenceLevel: "medium" as ResearchConfidenceLevel,
        metadata: {
          totalSources: allSources.length,
          qualitySources: allSources.filter(s => s.validationScore && s.validationScore >= 0.6).length,
          avgValidationScore: allSources.reduce((sum, s) => sum + (s.validationScore || 0), 0) / allSources.length,
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        // Add backward compatibility fields
        analysis: analysis,
        researchPath: researchPaths,
        plan: researchPlan
      } as ResearchResult & {
        analysis: string;
        researchPath: string[];
        plan: ResearchPlan;
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

  private async validateSource(source: ResearchSource, query: string): Promise<ResearchSource> {
    try {
      const updatedSource = { ...source };
      
      // Check for technical consistency
      const hasCodeSnippets = source.content.includes('```') || source.content.includes('`');
      const hasTechnicalTerms = this.checkTechnicalTerms(source.content, query);
      const consistentWithQuery = this.checkContentAlignment(source.content, query);
      
      // Check for AI-generated content markers
      const aiGenerationScore = this.checkForAiGenerated(source.content);
      
      // Check for factual claims
      const factualClaimsScore = this.assessFactualClaims(source.content);
      
      // Calculate freshness score based on date patterns in the content
      const freshnessScore = this.calculateFreshnessScore(source.content, query);
      
      // Update validation metrics
      updatedSource.validationScore = this.calculateValidationScore({
        technicalConsistency: hasTechnicalTerms ? 0.8 : 0.4,
        queryAlignment: consistentWithQuery,
        domainAuthority: this.getDomainAuthorityScore(source.url),
        aiGenerated: aiGenerationScore,
        factualClaims: factualClaimsScore,
        freshness: freshnessScore,
        hasCode: hasCodeSnippets ? 0.9 : 0.5
      });
      
      // Add validation metadata
      updatedSource.validationMetadata = {
        technicalTerms: hasTechnicalTerms,
        consistentWithQuery,
        aiGenerationLikelihood: aiGenerationScore > 0.7 ? 'high' : 
                               aiGenerationScore > 0.4 ? 'medium' : 'low',
        factualClaimsScore,
        freshnessScore,
        hasCode: hasCodeSnippets
      };
      
      return updatedSource;
    } catch (error) {
      console.error("Error validating source:", error);
      return { ...source, validationScore: 0.5 }; // Default score on error
    }
  }
  
  /**
   * Calculates overall validation score using weighted factors
   */
  private calculateValidationScore(factors: {
    technicalConsistency: number;
    queryAlignment: number;
    domainAuthority: number;
    aiGenerated: number;
    factualClaims: number;
    freshness: number;
    hasCode: number;
  }): number {
    // Weighted scores - higher weights for more important factors
    const weights = {
      technicalConsistency: 0.20,
      queryAlignment: 0.20,
      domainAuthority: 0.15,
      aiGenerated: 0.15, // Inverse relationship - higher AI detection means lower score
      factualClaims: 0.10,
      freshness: 0.10,
      hasCode: 0.10
    };
    
    // Calculate weighted score, inverting the AI generation score
    let score = 
      (factors.technicalConsistency * weights.technicalConsistency) +
      (factors.queryAlignment * weights.queryAlignment) +
      (factors.domainAuthority * weights.domainAuthority) +
      ((1 - factors.aiGenerated) * weights.aiGenerated) + // Invert AI score
      (factors.factualClaims * weights.factualClaims) +
      (factors.freshness * weights.freshness) +
      (factors.hasCode * weights.hasCode);
      
    // Ensure score is between 0 and 1
    score = Math.max(0, Math.min(1, score));
    return parseFloat(score.toFixed(2));
  }
  
  /**
   * Check if content contains relevant technical terms to validate authenticity
   */
  private checkTechnicalTerms(content: string, query: string): boolean {
    // Extract key technical terms from query
    const techTerms = this.extractTechnicalTerms(query);
    
    // If no technical terms found, consider generic validation
    if (techTerms.length === 0) return true;
    
    // Check for presence of multiple technical terms
    const contentLower = content.toLowerCase();
    const termMatches = techTerms.filter(term => contentLower.includes(term.toLowerCase()));
    
    // Return true if at least 30% of terms are present
    return termMatches.length >= Math.max(1, Math.ceil(techTerms.length * 0.3));
  }
  
  /**
   * Extract technical terms from query
   */
  private extractTechnicalTerms(query: string): string[] {
    // Common technical terms in software development contexts
    const techTermsDict = [
      "api", "framework", "library", "component", "module", "function", "method", 
      "class", "object", "interface", "type", "typescript", "javascript",
      "react", "vue", "angular", "node", "npm", "yarn", "webpack", "babel",
      "express", "mongodb", "sql", "database", "query", "mutation", "graphql",
      "rest", "http", "session", "authentication", "authorization", "token", "jwt",
      "oauth", "saml", "cors", "xss", "csrf", "security", "vulnerability",
      "injection", "sanitization", "validation", "middleware", "plugin", "hook",
      "event", "listener", "callback", "promise", "async", "await", "cache",
      "memory", "storage", "local", "session", "cookie", "header", "request",
      "response", "server", "client", "browser", "dom", "html", "css", "scss",
      "animation", "transition", "transform", "media", "query", "responsive",
      "mobile", "desktop", "device", "viewport", "layout", "grid", "flex",
      "container", "deploy", "build", "compile", "lint", "test", "unit", "integration",
      "e2e", "ci", "cd", "docker", "kubernetes", "cloud", "aws", "azure",
      "gcp", "serverless", "lambda", "function", "s3", "bucket", "route53",
      "cloudfront", "cdn", "load", "balancer", "vpc", "subnet", "version", "git",
      "commit", "branch", "merge", "pull", "push", "rebase", "repository", "next.js",
      "nuxt", "gatsby", "remix", "vite", "esbuild", "turbopack", "swr", "tanstack",
      "query", "redux", "mobx", "context", "api", "hook", "ssr", "ssg", "isr",
      "csr", "hydration", "route", "handler", "middleware", "fetch", "axios",
      "data", "fetching", "url", "path", "param", "router", "navigation", "link"
    ];
    
    // Check for version numbers
    const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
    const versionMatches = query.match(versionRegex) || [];
    
    // Extract potential terms from query
    const words = query.toLowerCase().split(/\s+/);
    const extractedTerms = words.filter(word => 
      techTermsDict.includes(word) || 
      word.endsWith('.js') || 
      word.endsWith('.ts') ||
      word.startsWith('npm:') ||
      word.startsWith('yarn:') ||
      word.includes('-js') ||
      word.includes('-ts')
    );
    
    // Combine extracted terms with version numbers
    return [...extractedTerms, ...versionMatches];
  }
  
  /**
   * Check how well content aligns with query intent
   */
  private checkContentAlignment(content: string, query: string): number {
    // Extract main keywords from query (excluding stopwords)
    const stopwords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "as"];
    const keywords = query.toLowerCase().split(/\s+/).filter(word => 
      !stopwords.includes(word) && word.length > 2
    );
    
    if (keywords.length === 0) return 0.5; // Default medium score if no keywords
    
    // Count keyword occurrences in content
    const contentLower = content.toLowerCase();
    let matchCount = 0;
    
    for (const keyword of keywords) {
      // Use regex to count whole word occurrences
      const regex = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'gi');
      const matches = contentLower.match(regex) || [];
      matchCount += matches.length;
    }
    
    // Calculate density score based on content length and matches
    const contentWords = contentLower.split(/\s+/).length;
    const keywordDensity = matchCount / Math.max(1, contentWords);
    
    // Ideal density is around 1-5% - too low means unrelated, too high means keyword stuffing
    const densityScore = keywordDensity < 0.01 ? keywordDensity * 50 :  // Scale up if below 1%
                          keywordDensity > 0.08 ? 1 - ((keywordDensity - 0.08) * 10) : // Penalize if over 8%
                          0.5 + (keywordDensity * 5); // Scale in the ideal range
    
    return Math.max(0, Math.min(1, densityScore));
  }
  
  /**
   * Check for signs that content might be AI-generated
   */
  private checkForAiGenerated(content: string): number {
    // Indicators of AI-generated content
    const aiMarkers = [
      // Generic, vague language
      "in conclusion", "to summarize", "as we can see", "it is important to note",
      "it is worth mentioning", "it should be noted", "generally speaking",
      
      // Repetitive phrases
      "in this article", "in this guide", "in this tutorial", "in this post",
      
      // Perfect structure markers
      "firstly", "secondly", "thirdly", "lastly", "in summary",
      
      // Common AI hallucination phrases
      "according to recent studies", "experts say", "research shows", 
      "studies have shown", "it is widely accepted",
      
      // Disclaimer-like language
      "please note that", "it's important to remember", "keep in mind that"
    ];
    
    // Count occurrences of AI markers
    let markerCount = 0;
    for (const marker of aiMarkers) {
      const regex = new RegExp(`\\b${this.escapeRegExp(marker)}\\b`, 'gi');
      const matches = content.match(regex) || [];
      markerCount += matches.length;
    }
    
    // Check for unnaturally perfect paragraph structuring
    const paragraphs = content.split(/\n\n+/);
    const similarParagraphLengths = this.checkParagraphLengthConsistency(paragraphs);
    
    // Check for lack of specialized terminology (inverse of technical terms)
    // Lack of specific code, commands, technical jargon indicates generic content
    const hasCodeBlocks = content.includes('```') || (content.match(/`[^`]+`/g) || []).length > 2;
    
    // Calculate combined score
    const markersScore = Math.min(1, markerCount / 5); // Cap at 1
    const structureScore = similarParagraphLengths ? 0.7 : 0.3;
    const codeScore = hasCodeBlocks ? 0.2 : 0.8; // Lower score (more likely human) if code blocks
    
    // Final weighted score (higher = more likely AI generated)
    return (markersScore * 0.4) + (structureScore * 0.3) + (codeScore * 0.3);
  }
  
  /**
   * Check for highly consistent paragraph lengths, which is common in AI content
   */
  private checkParagraphLengthConsistency(paragraphs: string[]): boolean {
    if (paragraphs.length < 3) return false;
    
    // Get lengths of paragraphs
    const lengths = paragraphs.map(p => p.length);
    
    // Calculate standard deviation of lengths
    const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const squareDiffs = lengths.map(len => (len - mean) ** 2);
    const variance = squareDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (standardized measure of dispersion)
    const cv = stdDev / mean;
    
    // If CV is low, paragraphs are suspiciously uniform in length
    return cv < 0.3 && paragraphs.length >= 5;
  }
  
  /**
   * Assess the factual claims density in content
   */
  private assessFactualClaims(content: string): number {
    // Check for specific fact patterns
    const factPatterns = [
      // Numbers and statistics
      /\b\d+(\.\d+)?%\b/g, // Percentages
      /\b(million|billion|trillion)\b/gi, // Large numbers
      
      // Dates and time references
      /\b(in|since|from|until) \d{4}\b/gi, // Year references
      /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi, // Full dates
      /\bv\d+(\.\d+)+(-\w+)?\b/gi, // Version numbers
      
      // Citations and references
      /\b(according to|as stated by|as reported by|cited by|reference|source)\b/gi,
      
      // Specific named entities
      /\b[A-Z][a-z]+ (API|SDK|library|framework|tool|protocol)\b/g, // Named technologies
      
      // Technical specifications
      /\b\d+(\.\d+)? (MB|GB|KB|TB|ms|seconds)\b/gi, // Measurements
    ];
    
    // Count matches
    let factCount = 0;
    for (const pattern of factPatterns) {
      const matches = content.match(pattern) || [];
      factCount += matches.length;
    }
    
    // Calculate density based on content length
    const contentWords = content.split(/\s+/).length;
    const factDensity = factCount / Math.max(100, contentWords) * 100;
    
    // Score based on density - more facts is better
    return Math.min(1, factDensity / 5); // Cap at 1
  }
  
  /**
   * Calculate freshness score based on date mentions
   */
  private calculateFreshnessScore(content: string, query: string): number {
    // Extract version number from query if present
    const versionMatch = query.match(/v?\d+(\.\d+)+(-\w+)?/i);
    const queryVersion = versionMatch ? versionMatch[0] : null;
    
    // Look for date patterns in content
    const datePatterns = [
      // Full dates
      /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi,
      
      // Year patterns
      /\b(in|since|from|until|for) (202\d|2019)\b/gi,
      
      // Recent relative time
      /\b(last|past) (month|week|year|few months)\b/gi,
      
      // Version mentions
      /\bv?\d+(\.\d+)+(-\w+)?\b/gi
    ];
    
    // Current year
    const currentYear = new Date().getFullYear();
    
    // Check for presence of dates
    let latestYearFound = 0;
    let hasRecentDate = false;
    let hasVersionMatch = false;
    
    // Check each pattern
    for (const pattern of datePatterns) {
      const matches = content.match(pattern) || [];
      
      for (const match of matches) {
        // Check for years
        const yearMatch = match.match(/\b(202\d|2019)\b/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          latestYearFound = Math.max(latestYearFound, year);
          if (year >= currentYear - 1) {
            hasRecentDate = true;
          }
        }
        
        // Check for version match with query
        if (queryVersion && match.includes(queryVersion)) {
          hasVersionMatch = true;
        }
      }
    }
    
    // Calculate score based on freshness signals
    let score = 0.5; // Default middle score
    
    if (hasRecentDate) score += 0.3;
    if (latestYearFound === currentYear) score += 0.2;
    if (hasVersionMatch) score += 0.3;
    
    // Adjustment for query version
    if (queryVersion && !hasVersionMatch) score -= 0.3;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Get authority score for domain
   */
  private getDomainAuthorityScore(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // High authority technical domains
      const highAuthorityDomains = [
        'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
        'nextjs.org', 'vercel.com', 'reactjs.org', 'nodejs.org', 
        'npmjs.com', 'typescript.org', 'typescriptlang.org', 'medium.com',
        'web.dev', 'developers.google.com', 'docs.microsoft.com',
        'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
        'smashingmagazine.com', 'css-tricks.com', 'youtube.com', 'freecodecamp.org'
      ];
      
      // Medium authority domains
      const mediumAuthorityDomains = [
        'dev.to', 'hashnode.com', 'digitalocean.com', 'hackernoon.com',
        'blog.logrocket.com', 'codecademy.com', 'pluralsight.com', 
        'udemy.com', 'coursera.org', 'w3schools.com', 'tutorialspoint.com',
        'geeksforgeeks.org'
      ];
      
      // Check for exact domain match
      if (highAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
        return 0.9;
      }
      
      if (mediumAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
        return 0.7;
      }
      
      // Partially matching domains (subdomains or related)
      const partialMatches = [...highAuthorityDomains, ...mediumAuthorityDomains].filter(
        d => domain.includes(d.replace(/\.(com|org|net|io)$/, ''))
      );
      
      if (partialMatches.length > 0) {
        return 0.6;
      }
      
      // Check for educational or government domains
      if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
        return 0.8;
      }
      
      // Default score for unknown domains
      return 0.4;
    } catch (error) {
      console.error("Error parsing domain:", error);
      return 0.3;
    }
  }

  /**
   * Escape special characters in a string for use in a regular expression
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate topic-specific search URLs based on the query content
   */
  private getTopicalSearchUrls(query: string): string[] {
    const queryLower = query.toLowerCase();
    const urls: string[] = [];
    
    // Check for programming language specific content
    if (queryLower.includes('javascript') || queryLower.includes('js')) {
      urls.push(
        `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
        `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('python')) {
      urls.push(
        `https://docs.python.org/3/search.html?q=${encodeURIComponent(query)}`,
        `https://pypi.org/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('java')) {
      urls.push(
        `https://docs.oracle.com/en/java/javase/17/docs/api/index.html?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('rust')) {
      urls.push(
        `https://doc.rust-lang.org/book/?search=${encodeURIComponent(query)}`,
        `https://crates.io/search?q=${encodeURIComponent(query)}`
      );
    }
    
    // Framework specific content
    if (queryLower.includes('react')) {
      urls.push(
        `https://react.dev/search?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('vue')) {
      urls.push(
        `https://vuejs.org/guide/?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('angular')) {
      urls.push(
        `https://angular.io/docs?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('next.js') || queryLower.includes('nextjs')) {
      urls.push(
        `https://nextjs.org/docs?q=${encodeURIComponent(query)}`
      );
    }
    
    // Database specific content
    if (queryLower.includes('sql') || queryLower.includes('database') || queryLower.includes('db')) {
      urls.push(
        `https://www.postgresql.org/search/?q=${encodeURIComponent(query)}`,
        `https://dev.mysql.com/doc/search/?q=${encodeURIComponent(query)}`,
        `https://www.mongodb.com/docs/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    // Cloud & DevOps specific content
    if (queryLower.includes('aws') || queryLower.includes('amazon')) {
      urls.push(
        `https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation&searchQuery=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('azure') || queryLower.includes('microsoft cloud')) {
      urls.push(
        `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('google cloud') || queryLower.includes('gcp')) {
      urls.push(
        `https://cloud.google.com/s/results?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('docker') || queryLower.includes('container')) {
      urls.push(
        `https://docs.docker.com/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('kubernetes') || queryLower.includes('k8s')) {
      urls.push(
        `https://kubernetes.io/docs/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    // AI and ML specific content
    if (queryLower.includes('machine learning') || queryLower.includes('ml') || 
        queryLower.includes('ai') || queryLower.includes('artificial intelligence')) {
      urls.push(
        `https://pytorch.org/docs/stable/search.html?q=${encodeURIComponent(query)}`,
        `https://www.tensorflow.org/s/results?q=${encodeURIComponent(query)}`
      );
    }
    
    // Mobile development
    if (queryLower.includes('android')) {
      urls.push(
        `https://developer.android.com/s/results?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('ios') || queryLower.includes('swift')) {
      urls.push(
        `https://developer.apple.com/search/?q=${encodeURIComponent(query)}`
      );
    }
    
    if (queryLower.includes('flutter')) {
      urls.push(
        `https://docs.flutter.dev/search?q=${encodeURIComponent(query)}`
      );
    }
    
    // Academic and research content
    if (queryLower.includes('research') || queryLower.includes('paper') || 
        queryLower.includes('theory') || queryLower.includes('algorithm')) {
      urls.push(
        `https://arxiv.org/search/?query=${encodeURIComponent(query)}`,
        `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(query)}`
      );
    }
    
    return urls;
  }
}