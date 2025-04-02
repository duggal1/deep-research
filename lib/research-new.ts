// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { enhancedFetch, domainAwareFetch } from './enhanced-fetch';
// import { ResearchResult, ResearchSource, ResearchPlan, ResearchFinding, CodeExample, ResearchConfidenceLevel } from './types';

// // Add embedding model
// interface EmbeddingVector {
//   values: number[];
//   dimensions: number;
// }

// export class ResearchEngine {
//   private model: any;
//   private embeddingModel: any;
//   private cache: Map<string, { data: ResearchResult; timestamp: number }>;
//   private CACHE_DURATION = 1000 * 60 * 60; // 1 hour
//   private startTime: number = 0;
//   private queryContext: Map<string, any> = new Map(); // Store query context for adaptation
//   private MAX_DATA_SOURCES = 850; // Significantly increased to 850+ sources
//   private MAX_TOKEN_OUTPUT = 150000; // Substantially increased token output limit
//   private CHUNK_SIZE = 18000; // Process much larger chunks of data
//   private SEARCH_DEPTH = 10; // Significantly increased search depth
//   private MAX_PARALLEL_REQUESTS = 30; // Increased parallel processing
//   private ADDITIONAL_DOMAINS = 150; // Include more domains in searches
//   private MAX_RESEARCH_TIME = 120000; // Optimized research time in milliseconds
//   private DEEP_RESEARCH_MODE = true; // Enable deep research mode

//   constructor() {
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
//     this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
//     // Initialize embedding model for semantic search
//     this.embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
//     this.cache = new Map();
//   }

//   // Generate embeddings for semantic understanding
//   private async generateEmbedding(text: string): Promise<EmbeddingVector> {
//     try {
//       const result = await this.embeddingModel.embedContent(text);
//       const embedding = result.embedding;
//       return {
//         values: embedding.values,
//         dimensions: embedding.values.length
//       };
//     } catch (error) {
//       console.error("Error generating embedding:", error);
//       // Return empty embedding in case of error
//       return { values: [], dimensions: 0 };
//     }
//   }

//   // Calculate semantic similarity between two embeddings (cosine similarity)
//   private calculateSimilarity(embedding1: EmbeddingVector, embedding2: EmbeddingVector): number {
//     if (embedding1.dimensions === 0 || embedding2.dimensions === 0) {
//       return 0;
//     }

//     // Calculate dot product
//     let dotProduct = 0;
//     const minLength = Math.min(embedding1.values.length, embedding2.values.length);
//     for (let i = 0; i < minLength; i++) {
//       dotProduct += embedding1.values[i] * embedding2.values[i];
//     }

//     // Calculate magnitudes
//     let magnitude1 = 0;
//     let magnitude2 = 0;
//     for (let i = 0; i < embedding1.values.length; i++) {
//       magnitude1 += embedding1.values[i] * embedding1.values[i];
//     }
//     for (let i = 0; i < embedding2.values.length; i++) {
//       magnitude2 += embedding2.values[i] * embedding2.values[i];
//     }

//     magnitude1 = Math.sqrt(magnitude1);
//     magnitude2 = Math.sqrt(magnitude2);

//     // Calculate cosine similarity
//     if (magnitude1 === 0 || magnitude2 === 0) {
//       return 0;
//     }
    
//     return dotProduct / (magnitude1 * magnitude2);
//   }

//   /**
//    * Helper function to create a valid ResearchSource object from partial data
//    */
//   private createSourceObject(data: Partial<ResearchSource>): ResearchSource {
//     return {
//       url: data.url || '',
//       title: data.title || 'Unknown Source',
//       relevance: data.relevance || 0.5,
//       content: data.content || '',
//       timestamp: data.timestamp || new Date().toISOString()
//     };
//   }

//   private getCachedResult(query: string): ResearchResult | null {
//     const cached = this.cache.get(query);
//     if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
//       return cached.data;
//     }
//     return null;
//   }

//   private async createResearchPlan(query: string): Promise<ResearchPlan> {
//     // First, analyze the query to understand what type of information is needed
//     const queryAnalysisPrompt = `
//       Analyze this research query: "${query}"
      
//       Identify:
//       1. The core subject/topic
//       2. What type of information is being requested (facts, comparison, analysis, etc.)
//       3. Any time constraints or specific aspects mentioned
//       4. The likely purpose of this research (education, decision-making, problem-solving)
      
//       Return in JSON format:
//       {
//         "topic": "core topic",
//         "informationType": "type of information needed",
//         "aspects": ["specific aspect 1", "specific aspect 2"],
//         "purpose": "likely purpose",
//         "expectedSources": ["domain type 1", "domain type 2"]
//       }
//     `;
    
//     let queryAnalysis = {
//       topic: query,
//       informationType: "general information",
//       aspects: ["overview"],
//       purpose: "learning",
//       expectedSources: ["websites", "articles"]
//     };
    
//     try {
//       console.log("Analyzing research query:", query);
//       const analysisResult = await this.model.generateContent(queryAnalysisPrompt);
//       const analysisText = analysisResult.response.text();
      
//       // Extract JSON
//       const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         try {
//           queryAnalysis = JSON.parse(jsonMatch[0]);
//         } catch (e) {
//           console.error("Failed to parse query analysis:", e);
//         }
//       }
//     } catch (error) {
//       console.error("Error in query analysis:", error);
//     }

//     // Now create a structured research plan based on the query analysis
//     const planPrompt = `
//       Create a comprehensive research plan for investigating: "${query}"
      
//       Query Analysis:
//       - Core Topic: ${queryAnalysis.topic}
//       - Information Type: ${queryAnalysis.informationType}
//       - Key Aspects: ${queryAnalysis.aspects.join(', ')}
//       - Research Purpose: ${queryAnalysis.purpose}
//       - Expected Sources: ${queryAnalysis.expectedSources.join(', ')}
      
//       Design a systematic research plan with:
//       1. Specific research questions that will provide a complete understanding
//       2. Key areas to investigate with specific, measurable objectives
//       3. A logical approach to gathering reliable information
      
//       Format your response as a valid JSON object, strictly following this format:
//       {
//         "mainQuery": "${query}",
//         "objective": "clear statement of research goal",
//         "subQueries": [
//           {"question": "specific question 1", "purpose": "why this matters"},
//           {"question": "specific question 2", "purpose": "why this matters"},
//           {"question": "specific question 3", "purpose": "why this matters"}
//         ],
//         "researchAreas": ["area1", "area2", "area3"],
//         "explorationStrategy": "specific approach",
//         "priorityOrder": ["first focus", "second focus", "third focus"]
//       }
//     `;

//     try {
//       console.log("Creating structured research plan");
//       const result = await this.model.generateContent(planPrompt);
//       let planText = result.response.text();
      
//       // Try to extract JSON if it's wrapped in backticks or other markers
//       const jsonMatch = planText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         planText = jsonMatch[0];
//       }
      
//       try {
//         // Parse the JSON response
//         const parsedPlan = JSON.parse(planText);
        
//         // Convert to our ResearchPlan format if needed
//         const researchPlan: ResearchPlan = {
//           mainQuery: parsedPlan.mainQuery || query,
//           objective: parsedPlan.objective || "Gather comprehensive information",
//           subQueries: Array.isArray(parsedPlan.subQueries) 
//             ? parsedPlan.subQueries.map((sq: any) => 
//                 typeof sq === 'object' ? sq.question : sq)
//             : [query],
//           researchAreas: parsedPlan.researchAreas || ["general"],
//           explorationStrategy: parsedPlan.explorationStrategy || "systematic investigation",
//           priorityOrder: parsedPlan.priorityOrder || []
//         };
        
//         console.log("Research plan created successfully");
//         return researchPlan;
//       } catch (e) {
//         console.error("Failed to parse research plan JSON:", planText);
//         throw e;
//       }
//     } catch (error) {
//       console.error("Failed to create research plan", error);
//       return {
//         mainQuery: query,
//         objective: "Gather basic information",
//         subQueries: [query],
//         researchAreas: ["general"],
//         explorationStrategy: "direct exploration",
//         priorityOrder: []
//       };
//     }
//   }

//   /**
//    * Extract authoritative domains for a given query
//    */
//   private getTopicalSearchUrls(query: string): string[] {
//     const queryLower = query.toLowerCase();
//     const urls: string[] = [];
    
//     // Check for programming language specific content
//     if (queryLower.includes('javascript') || queryLower.includes('js')) {
//       urls.push(
//         `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
//         `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`
//       );
//     }
    
//     if (queryLower.includes('python')) {
//       urls.push(
//         `https://docs.python.org/3/search.html?q=${encodeURIComponent(query)}`,
//         `https://pypi.org/search/?q=${encodeURIComponent(query)}`
//       );
//     }
    
//     // More URL generation logic here
    
//     return urls;
//   }

//   /**
//    * Robust error-resilient content extraction with fallbacks
//    */
//   private extractRelevantContent(html: string, query: string, url: string): string {
//     try {
//       // Remove script and style tags
//       let cleanedHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
//                             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
//                             .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '');
      
//       // Remove all HTML tags, keeping their content
//       cleanedHtml = cleanedHtml.replace(/<[^>]*>/g, ' ');
      
//       // Decode HTML entities
//       cleanedHtml = cleanedHtml.replace(/&nbsp;/g, ' ')
//                               .replace(/&amp;/g, '&')
//                               .replace(/&lt;/g, '<')
//                               .replace(/&gt;/g, '>')
//                               .replace(/&quot;/g, '"')
//                               .replace(/&#39;/g, "'");
      
//       // Normalize whitespace
//       cleanedHtml = cleanedHtml.replace(/\s+/g, ' ').trim();
      
//       // If content is too large, focus on query-relevant sections
//       if (cleanedHtml.length > 10000) {
//         const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
//         const paragraphs = cleanedHtml.split(/\n\n|\r\n\r\n|\.\s+/);
//         const relevantParagraphs = paragraphs.filter(p => {
//           const lowerP = p.toLowerCase();
//           return queryTerms.some(term => lowerP.includes(term));
//         });
        
//         // If we found relevant paragraphs, use those
//         if (relevantParagraphs.length > 0) {
//           cleanedHtml = relevantParagraphs.slice(0, 20).join('\n\n');
//         } else {
//           // Otherwise just take the beginning and some from the middle
//           cleanedHtml = paragraphs.slice(0, 10).join('\n\n') + '\n\n...\n\n' + 
//                       paragraphs.slice(Math.floor(paragraphs.length / 2), Math.floor(paragraphs.length / 2) + 10).join('\n\n');
//         }
//       }
      
//       return cleanedHtml;
//     } catch (e) {
//       console.error(`Error extracting content from ${url}:`, e);
//       // First fallback: very simple tag stripping
//       try {
//         return html
//           .replace(/<[^>]*>/g, ' ')
//           .replace(/\s+/g, ' ')
//           .trim()
//           .substring(0, 10000);
//       } catch (fallbackError) {
//         console.error("Error in fallback content extraction:", fallbackError);
        
//         // Ultimate fallback: just take some of the raw content
//         try {
//           return html.substring(0, 5000);
//         } catch (e) {
//           // Absolute last resort
//           return `Failed to extract content due to encoding issues. Query: ${query}`;
//         }
//       }
//     }
//   }

//   /**
//    * Escape special characters in a string for use in a regular expression
//    */
//   private escapeRegExp(string: string): string {
//     return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//   }

//   /**
//    * Fallback research method when web crawling fails
//    * @param query The search query
//    * @param depth The search depth
//    * @returns Research data and sources
//    */
//   private async fallbackResearch(query: string, depth: number = 1): Promise<{
//     data: string;
//     sources: ResearchSource[];
//   }> {
//     console.log(`Using fallback research for query: "${query}"`);

//     // Create some basic sources with general information
//     const sources: ResearchSource[] = [
//       {
//         url: 'https://fallback-source.example.com/general-info',
//         title: 'General Information (Fallback)',
//         content: `This is fallback content for the query: "${query}". The web crawling process encountered an error, so we're providing basic information.`,
//         relevance: 0.7,
//         timestamp: new Date().toISOString()
//       }
//     ];

//     // Try to get some relevant domains for this query
//     const relevantDomains = this.identifyRelevantDomains(query);

//     // Add some fallback sources based on the query type
//     if (query.toLowerCase().includes('javascript') || query.toLowerCase().includes('js')) {
//       sources.push({
//         url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
//         title: 'JavaScript Documentation (MDN Web Docs)',
//         content: 'JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.',
//         relevance: 0.8,
//         timestamp: new Date().toISOString()
//       });
//     }

//     if (query.toLowerCase().includes('python')) {
//       sources.push({
//         url: 'https://docs.python.org/3/',
//         title: 'Python Documentation',
//         content: 'Python is a programming language that lets you work quickly and integrate systems more effectively.',
//         relevance: 0.8,
//         timestamp: new Date().toISOString()
//       });
//     }

//     // Combine all the content
//     const combinedData = sources
//       .map(s => `Source: ${s.title}\n${s.content}`)
//       .join('\n\n---\n\n');

//     return {
//       data: combinedData,
//       sources
//     };
//   }

//   /**
//    * Adapt search strategy based on previous queries and results
//    * @param query The current query
//    * @param result The result data to learn from
//    */
//   private adaptSearchStrategy(query: string, result: { sources: ResearchSource[], data: string }): void {
//     try {
//       // Store query context for future adaptation
//       this.queryContext.set(query, {
//         timestamp: Date.now(),
//         sourceCount: result.sources.length,
//         domains: result.sources.map(s => {
//           try {
//             return new URL(s.url).hostname;
//           } catch (e) {
//             return '';
//           }
//         }).filter(Boolean),
//         topRelevanceScores: result.sources
//           .slice(0, 5)
//           .map(s => s.relevance)
//       });

//       // Limit context size
//       if (this.queryContext.size > 50) {
//         // Remove oldest entries
//         const entries = Array.from(this.queryContext.entries());
//         const oldestEntries = entries
//           .sort((a, b) => a[1].timestamp - b[1].timestamp)
//           .slice(0, 10);

//         for (const [key] of oldestEntries) {
//           this.queryContext.delete(key);
//         }
//       }
//     } catch (error) {
//       console.error("Error adapting search strategy:", error);
//       // Non-critical error, can be ignored
//     }
//   }

//   /**
//    * Prioritize sources based on freshness and authority
//    */
//   /**
//    * Calculate a freshness score for content based on date signals
//    * @param content The content to analyze
//    * @param query The original query
//    * @returns A score between 0 and 1 indicating freshness
//    */
//   private calculateFreshnessScore(content: string, query: string): number {
//     // Default score if we can't determine freshness
//     let freshnessScore = 0.5;

//     try {
//       // Look for date patterns in the content
//       const currentYear = new Date().getFullYear();
//       const lastYear = currentYear - 1;

//       // Check for current year
//       if (content.includes(currentYear.toString())) {
//         freshnessScore = 0.9;
//       }
//       // Check for last year
//       else if (content.includes(lastYear.toString())) {
//         freshnessScore = 0.7;
//       }

//       // Look for date patterns like "Updated on", "Published on", etc.
//       const datePatterns = [
//         /updated\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
//         /published\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
//         /posted\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
//         /date:\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
//         /(\d{1,2}\s+\w+\s+\d{4})/i,
//         /(\w+\s+\d{1,2},?\s+\d{4})/i
//       ];

//       for (const pattern of datePatterns) {
//         const match = content.match(pattern);
//         if (match && match[1]) {
//           try {
//             const date = new Date(match[1]);
//             if (!isNaN(date.getTime())) {
//               const now = new Date();
//               const ageInDays = (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);

//               if (ageInDays < 7) {
//                 freshnessScore = 1.0; // Very fresh (last week)
//               } else if (ageInDays < 30) {
//                 freshnessScore = 0.9; // Fresh (last month)
//               } else if (ageInDays < 90) {
//                 freshnessScore = 0.8; // Somewhat fresh (last 3 months)
//               } else if (ageInDays < 365) {
//                 freshnessScore = 0.6; // Moderately fresh (last year)
//               } else if (ageInDays < 730) {
//                 freshnessScore = 0.4; // Somewhat old (last 2 years)
//               } else {
//                 freshnessScore = 0.2; // Old (more than 2 years)
//               }

//               // Once we find a valid date, we can stop looking
//               break;
//             }
//           } catch (e) {
//             // If date parsing fails, continue with the next pattern
//             continue;
//           }
//         }
//       }

//       // Adjust score based on recency terms in the content
//       const recencyTerms = [
//         'latest', 'newest', 'recent', 'just released', 'new version',
//         'update', 'updated', 'current', 'now available', 'this month',
//         'this week', 'today', 'yesterday', 'this year'
//       ];

//       for (const term of recencyTerms) {
//         if (content.toLowerCase().includes(term)) {
//           freshnessScore = Math.min(freshnessScore + 0.1, 1.0);
//         }
//       }

//       return freshnessScore;
//     } catch (e) {
//       console.error("Error calculating freshness score:", e);
//       return 0.5; // Default score on error
//     }
//   }

//   /**
//    * Calculate a legacy relevance score without using embeddings
//    * @param text The text to evaluate
//    * @param query The query to compare against
//    * @returns A relevance score between 0 and 1
//    */
//   private calculateRelevanceLegacy(text: string, query: string): number {
//     try {
//       // Normalize text and query
//       const normalizedText = text.toLowerCase();
//       const normalizedQuery = query.toLowerCase();

//       // Extract keywords from query (remove common words)
//       const stopWords = new Set([
//         'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
//         'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'like',
//         'through', 'over', 'before', 'after', 'between', 'under', 'during',
//         'how', 'what', 'when', 'where', 'why', 'who', 'which', 'that',
//         'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will'
//       ]);

//       const queryKeywords = normalizedQuery
//         .split(/\s+/)
//         .filter(word => word.length > 2 && !stopWords.has(word));

//       if (queryKeywords.length === 0) {
//         // If no meaningful keywords, use the whole query
//         queryKeywords.push(...normalizedQuery.split(/\s+/).filter(w => w.length > 2));
//       }

//       // Calculate keyword presence score
//       let keywordMatches = 0;
//       for (const keyword of queryKeywords) {
//         if (normalizedText.includes(keyword)) {
//           keywordMatches++;
//         }
//       }

//       const keywordScore = queryKeywords.length > 0
//         ? keywordMatches / queryKeywords.length
//         : 0;

//       // Calculate exact phrase match score
//       const phraseScore = normalizedText.includes(normalizedQuery) ? 0.3 : 0;

//       // Calculate keyword density score
//       const textWords = normalizedText.split(/\s+/).length;
//       let keywordDensity = 0;

//       if (textWords > 0) {
//         let keywordCount = 0;
//         for (const keyword of queryKeywords) {
//           const regex = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'gi');
//           const matches = normalizedText.match(regex);
//           keywordCount += matches ? matches.length : 0;
//         }

//         keywordDensity = keywordCount / textWords;
//       }

//       const densityScore = Math.min(keywordDensity * 10, 0.3);

//       // Calculate proximity score (how close query terms appear together)
//       let proximityScore = 0;
//       if (queryKeywords.length > 1) {
//         // Simple implementation - check if keywords appear within a certain distance
//         const words = normalizedText.split(/\s+/);
//         const positions: Record<string, number[]> = {};

//         // Find positions of all keywords
//         queryKeywords.forEach(keyword => {
//           positions[keyword] = [];
//         });

//         words.forEach((word, index) => {
//           queryKeywords.forEach(keyword => {
//             if (word.includes(keyword)) {
//               positions[keyword].push(index);
//             }
//           });
//         });

//         // Calculate minimum distance between different keywords
//         let minDistance = words.length;
//         const keywordsWithPositions = Object.keys(positions).filter(k => positions[k].length > 0);

//         if (keywordsWithPositions.length > 1) {
//           for (let i = 0; i < keywordsWithPositions.length; i++) {
//             for (let j = i + 1; j < keywordsWithPositions.length; j++) {
//               const pos1 = positions[keywordsWithPositions[i]];
//               const pos2 = positions[keywordsWithPositions[j]];

//               for (const p1 of pos1) {
//                 for (const p2 of pos2) {
//                   const distance = Math.abs(p1 - p2);
//                   minDistance = Math.min(minDistance, distance);
//                 }
//               }
//             }
//           }

//           // Convert distance to score (closer is better)
//           proximityScore = minDistance <= 5 ? 0.2 :
//                           minDistance <= 10 ? 0.1 :
//                           minDistance <= 20 ? 0.05 : 0;
//         }
//       }

//       // Combine scores with weights
//       const combinedScore =
//         (keywordScore * 0.4) +
//         (phraseScore * 0.3) +
//         (densityScore * 0.2) +
//         (proximityScore * 0.1);

//       return Math.min(combinedScore, 1.0);
//     } catch (e) {
//       console.error("Error calculating legacy relevance:", e);
//       return 0.3; // Default moderate relevance on error
//     }
//   }

//   /**
//    * Get authority score for a domain based on its reputation
//    * @param domain The domain to evaluate
//    * @returns A score between 0 and 1 indicating authority
//    */
//   private getDomainAuthorityScore(domain: string): number {
//     // High authority technical and educational domains
//     const highAuthorityDomains = [
//       'github.com', 'stackoverflow.com', 'developer.mozilla.org',
//       'docs.python.org', 'reactjs.org', 'angular.io', 'vuejs.org',
//       'tensorflow.org', 'pytorch.org', 'kubernetes.io', 'docker.com',
//       'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
//       'developer.android.com', 'developer.apple.com', 'docs.microsoft.com',
//       'web.dev', 'developers.google.com', 'medium.com', 'arxiv.org',
//       'research.google', 'openai.com', 'huggingface.co', 'kaggle.com',
//       'wikipedia.org', 'w3.org', 'w3schools.com', 'freecodecamp.org',
//       'mit.edu', 'stanford.edu', 'harvard.edu', 'berkeley.edu',
//       'coursera.org', 'udacity.com', 'edx.org', 'khanacademy.org'
//     ];

//     // Medium authority domains
//     const mediumAuthorityDomains = [
//       'npmjs.com', 'pypi.org', 'maven.org', 'nuget.org',
//       'digitalocean.com', 'linode.com', 'heroku.com', 'netlify.com',
//       'vercel.com', 'cloudflare.com', 'akamai.com', 'fastly.com',
//       'reddit.com', 'dev.to', 'hashnode.dev', 'hackernoon.com',
//       'smashingmagazine.com', 'css-tricks.com', 'alistapart.com',
//       'tutorialspoint.com', 'geeksforgeeks.org', 'javatpoint.com',
//       'baeldung.com', 'sitepoint.com', 'scotch.io', 'codepen.io',
//       'replit.com', 'codesandbox.io', 'glitch.com', 'codewars.com',
//       'hackerrank.com', 'leetcode.com', 'topcoder.com', 'codeforces.com'
//     ];

//     // Check for exact domain match
//     if (highAuthorityDomains.some(d => domain === d || domain.endsWith('.' + d))) {
//       return 0.9;
//     }

//     if (mediumAuthorityDomains.some(d => domain === d || domain.endsWith('.' + d))) {
//       return 0.7;
//     }

//     // Check for educational and government domains
//     if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
//       return 0.85;
//     }

//     // Check for organizational domains
//     if (domain.endsWith('.org')) {
//       return 0.65;
//     }

//     // Check for company domains
//     if (domain.endsWith('.com') || domain.endsWith('.io') || domain.endsWith('.co')) {
//       return 0.5;
//     }

//     // Default score for other domains
//     return 0.3;
//   }

//   /**
//    * Identify relevant domains for a specific query
//    * @param query The search query
//    * @returns Array of relevant domain URLs
//    */
//   private identifyRelevantDomains(query: string): string[] {
//     const queryLower = query.toLowerCase();
//     const domains: string[] = [];

//     // Programming languages
//     if (queryLower.includes('javascript') || queryLower.includes('js')) {
//       domains.push(
//         'developer.mozilla.org',
//         'javascript.info',
//         'npmjs.com',
//         'nodejs.org'
//       );
//     }

//     if (queryLower.includes('typescript') || queryLower.includes('ts')) {
//       domains.push(
//         'typescriptlang.org',
//         'github.com/microsoft/typescript',
//         'typescript-eslint.io'
//       );
//     }

//     if (queryLower.includes('python')) {
//       domains.push(
//         'docs.python.org',
//         'pypi.org',
//         'realpython.com',
//         'python.org'
//       );
//     }

//     if (queryLower.includes('java')) {
//       domains.push(
//         'docs.oracle.com/javase',
//         'baeldung.com',
//         'dev.java',
//         'spring.io'
//       );
//     }

//     if (queryLower.includes('c#') || queryLower.includes('csharp') || queryLower.includes('.net')) {
//       domains.push(
//         'docs.microsoft.com/dotnet',
//         'learn.microsoft.com/dotnet',
//         'nuget.org'
//       );
//     }

//     // Frameworks
//     if (queryLower.includes('react')) {
//       domains.push(
//         'reactjs.org',
//         'react.dev',
//         'legacy.reactjs.org'
//       );
//     }

//     if (queryLower.includes('angular')) {
//       domains.push(
//         'angular.io',
//         'material.angular.io'
//       );
//     }

//     if (queryLower.includes('vue')) {
//       domains.push(
//         'vuejs.org',
//         'pinia.vuejs.org',
//         'router.vuejs.org'
//       );
//     }

//     if (queryLower.includes('svelte')) {
//       domains.push(
//         'svelte.dev',
//         'kit.svelte.dev'
//       );
//     }

//     // Cloud providers
//     if (queryLower.includes('aws') || queryLower.includes('amazon web services')) {
//       domains.push(
//         'aws.amazon.com',
//         'docs.aws.amazon.com'
//       );
//     }

//     if (queryLower.includes('azure') || queryLower.includes('microsoft cloud')) {
//       domains.push(
//         'azure.microsoft.com',
//         'learn.microsoft.com/azure'
//       );
//     }

//     if (queryLower.includes('gcp') || queryLower.includes('google cloud')) {
//       domains.push(
//         'cloud.google.com',
//         'developers.google.com/cloud'
//       );
//     }

//     // AI and ML
//     if (queryLower.includes('machine learning') || queryLower.includes('ml') ||
//         queryLower.includes('ai') || queryLower.includes('artificial intelligence')) {
//       domains.push(
//         'tensorflow.org',
//         'pytorch.org',
//         'huggingface.co',
//         'kaggle.com',
//         'paperswithcode.com',
//         'arxiv.org'
//       );
//     }

//     // Always include these general programming resources
//     domains.push(
//       'github.com',
//       'stackoverflow.com',
//       'medium.com',
//       'dev.to',
//       'freecodecamp.org'
//     );

//     return domains.map(domain => `https://${domain}`);
//   }

//   private prioritizeSources(sources: ResearchSource[], query: string): ResearchSource[] {
//     // Check how fresh content needs to be based on query
//     const needsVeryRecent = /latest|newest|new|recent|update|changelog|release|version|202[3-5]/i.test(query);
//     const needsModeratelyRecent = /last year|trend|current|modern|today/i.test(query);

//     // Prioritization weights
//     const weights = {
//       freshness: needsVeryRecent ? 0.4 : needsModeratelyRecent ? 0.25 : 0.1,
//       authority: 0.3,
//       relevance: 0.3
//     };

//     // Current date for comparison
//     const now = Date.now();
//     const ONE_DAY = 24 * 60 * 60 * 1000;
//     const ONE_MONTH = 30 * ONE_DAY;
//     const ONE_YEAR = 365 * ONE_DAY;

//     // Score and sort sources
//     return sources.map(source => {
//       // Parse the timestamp
//       let timestamp;
//       try {
//         timestamp = new Date(source.timestamp).getTime();
//       } catch (e) {
//         timestamp = now - ONE_YEAR; // Default to 1 year old if invalid
//       }

//       // Calculate freshness score
//       const age = now - timestamp;
//       let freshnessScore;
//       if (age < ONE_DAY) {
//         freshnessScore = 1.0; // Very fresh (last 24 hours)
//       } else if (age < ONE_MONTH) {
//         freshnessScore = 0.8; // Fresh (last month)
//       } else if (age < 6 * ONE_MONTH) {
//         freshnessScore = 0.6; // Somewhat fresh (last 6 months)
//       } else if (age < ONE_YEAR) {
//         freshnessScore = 0.4; // Moderately old (last year)
//       } else {
//         freshnessScore = 0.1; // Old (more than a year)
//       }

//       // Calculate authority score
//       let authorityScore = 0;
//       try {
//         // Ensure URL has protocol
//         let url = source.url;
//         if (!url.startsWith('http://') && !url.startsWith('https://')) {
//           url = 'https://' + url;
//         }
//         const domain = new URL(url).hostname;
//         authorityScore = this.getDomainAuthorityScore(domain);
//       } catch (e) {
//         authorityScore = 0.2; // Default if can't parse URL
//       }

//       // Calculate combined priority score
//       const priorityScore =
//         (freshnessScore * weights.freshness) +
//         (authorityScore * weights.authority) +
//         (source.relevance * weights.relevance);

//       // Return source with updated relevance reflecting the prioritization
//       return {
//         ...source,
//         relevance: Math.min(1.0, priorityScore) // Cap at 1.0
//       };
//     })
//     .sort((a, b) => b.relevance - a.relevance); // Sort by priority score
//   }

//   /**
//    * Improved web crawling with error resilience and adaptation
//    * Uses enhanced fetch utilities for better performance and reliability
//    */
//   private async crawlWeb(query: string, depth: number = 2): Promise<{
//     data: string;
//     sources: ResearchSource[];
//   }> {
//     try {
//       console.log(`Starting web crawling for query: "${query}" at depth ${depth} with ${this.MAX_PARALLEL_REQUESTS} parallel requests`);

//       // Extract main keywords from the query (remove filler words)
//       const mainKeywords = query
//         .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
//         .replace(/['"]/g, '')  // Remove quotes
//         .trim();
      
//       // Check if query contains version numbers
//       const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
//       const versionMatch = query.match(versionRegex);
//       const versionTag = versionMatch ? versionMatch[0] : '';
      
//       // Create human-like search queries with more variations
//       const humanQueries = {
//         general: `${mainKeywords}`,
//         features: `${mainKeywords} features${versionTag ? ' ' + versionTag : ''}`,
//         examples: `${mainKeywords} code example`,
//         tutorial: `${mainKeywords} tutorial how to`,
//         comparison: `${mainKeywords} vs alternatives comparison`,
//         bestPractices: `${mainKeywords} best practices guide`,
//         advanced: `advanced ${mainKeywords} techniques`,
//         latest: `latest ${mainKeywords} updates ${new Date().getFullYear()}`,
//         documentation: `${mainKeywords} official documentation`,
//         github: `${mainKeywords} github repository`,
//         reddit: `${mainKeywords} reddit discussion`,
//         stackoverflow: `${mainKeywords} stackoverflow solutions`,
//         frameworks: `${mainKeywords} frameworks libraries`,
//         architecture: `${mainKeywords} architecture design patterns`
//       };
      
//       // Construct search query URLs for various search engines
//       const searchEngineUrls = [
//         `https://www.google.com/search?q=${encodeURIComponent(query)}`,
//         `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
//         `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
//         `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
//         `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`,
//         `https://www.startpage.com/sp/search?q=${encodeURIComponent(query)}`,
//         `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
//         `https://searx.thegpm.org/?q=${encodeURIComponent(query)}`,
//         `https://www.qwant.com/?q=${encodeURIComponent(query)}`,
//         `https://yandex.com/search/?text=${encodeURIComponent(query)}`,
//         `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`,
//         `https://swisscows.com/web?query=${encodeURIComponent(query)}`,
//         `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
//         `https://metager.org/meta/meta.ger3?eingabe=${encodeURIComponent(query)}`
//       ];
      
//       // Detect if query is about specific technologies
//       const isTechQuery = /api|sdk|framework|library|platform|tool/i.test(query);
      
//       // Detect if query is about code examples
//       const isCodeQuery = /code|example|implementation|snippet|sample|how to/i.test(query);
      
//       // Set maximum crawl limit based on DEEP_RESEARCH_MODE
//       const maxCrawlUrls = this.DEEP_RESEARCH_MODE ? this.MAX_DATA_SOURCES : Math.min(30, this.MAX_DATA_SOURCES);
      
//       // Create domain-specific URLs based on tech and code detection
//       let domainSpecificUrls: string[] = [];
      
//       // Get extended list of relevant domains
//       const extendedDomains = this.identifyRelevantDomains(query).slice(0, this.ADDITIONAL_DOMAINS);
      
//       if (isCodeQuery) {
//         domainSpecificUrls = [
//           `https://github.com/search?q=${encodeURIComponent(humanQueries.examples)}&type=repositories`,
//           `https://stackoverflow.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://dev.to/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://medium.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://hashnode.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://replit.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://glitch.com/search?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://codepen.io/search/pens?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://jsfiddle.net/search/?q=${encodeURIComponent(humanQueries.examples)}`,
//           `https://codesandbox.io/search?query=${encodeURIComponent(humanQueries.examples)}`,
//           `https://stackblitz.com/search?query=${encodeURIComponent(humanQueries.examples)}`,
//           `https://nodejs.org/api/all.html`,
//           `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(humanQueries.examples)}`
//         ];
        
//         // Add GitHub code search
//         domainSpecificUrls.push(`https://github.com/search?q=${encodeURIComponent(humanQueries.examples)}&type=code`);
//       } else if (isTechQuery) {
//         // Look for official documentation and community resources
//         const techName = mainKeywords.split(' ')[0]; // Extract main tech name
//         domainSpecificUrls = [
//           `https://github.com/search?q=${encodeURIComponent(techName)}&type=repositories`,
//           `https://stackoverflow.com/questions/tagged/${encodeURIComponent(techName)}?tab=Newest`,
//           `https://dev.to/t/${encodeURIComponent(techName.toLowerCase())}/latest?q=${encodeURIComponent(mainKeywords.substring(techName.length).trim())}`,
//           `https://docs.github.com/en/search?query=${encodeURIComponent(techName)}`,
//           `https://medium.com/search?q=${encodeURIComponent(techName)}`,
//           `https://reddit.com/r/programming/search/?q=${encodeURIComponent(techName)}`,
//           `https://npmjs.com/search?q=${encodeURIComponent(techName)}`,
//           `https://libraries.io/search?q=${encodeURIComponent(techName)}`,
//           `https://alternativeto.net/browse/search/?q=${encodeURIComponent(techName)}`
//         ];
//       }
      
//       // More search queries from different engines for diversity
//       const additionalSearchUrls = [
//         `https://www.google.com/search?q=${encodeURIComponent(humanQueries.general)}`,
//         `https://www.google.com/search?q=${encodeURIComponent(humanQueries.features)}`,
//         `https://duckduckgo.com/?q=${encodeURIComponent(humanQueries.general)}`,
//         `https://www.bing.com/search?q=${encodeURIComponent(humanQueries.latest)}`,
//         `https://search.brave.com/search?q=${encodeURIComponent(humanQueries.documentation)}`,
//         `https://www.startpage.com/do/search?q=${encodeURIComponent(humanQueries.advanced)}`,
//         `https://www.mojeek.com/search?q=${encodeURIComponent(humanQueries.comparison)}`,
//         `https://search.yahoo.com/search?p=${encodeURIComponent(humanQueries.github)}`
//       ];
      
//       // Technical reference sites
//       const technicalUrls = [
//         `https://stackoverflow.com/search?q=${encodeURIComponent(mainKeywords)}&tab=newest`,
//         `https://dev.to/search?q=${encodeURIComponent(mainKeywords)}&sort=latest`,
//         `https://github.com/search?q=${encodeURIComponent(mainKeywords)}&type=repositories&s=updated&o=desc`,
//         `https://www.w3schools.com/search/search.asp?q=${encodeURIComponent(mainKeywords)}`,
//         `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://medium.com/search?q=${encodeURIComponent(mainKeywords)}&sort=recency`,
//         `https://www.npmjs.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.youtube.com/results?search_query=${encodeURIComponent(mainKeywords + ' tutorial')}`,
//         `https://css-tricks.com/?s=${encodeURIComponent(mainKeywords)}`,
//         `https://smashingmagazine.com/search/?q=${encodeURIComponent(mainKeywords)}`,
//         `https://web.dev/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://reactjs.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://docs.python.org/3/search.html?q=${encodeURIComponent(mainKeywords)}`,
//         `https://docs.microsoft.com/en-us/search/?terms=${encodeURIComponent(mainKeywords)}`,
//         `https://docs.oracle.com/search/?search=${encodeURIComponent(mainKeywords)}`
//       ];
      
//       // Educational and documentation sites
//       const educationalUrls = [
//         `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(mainKeywords)}`,
//         `https://www.tutorialspoint.com/search/search-results?search_string=${encodeURIComponent(mainKeywords)}`,
//         `https://www.geeksforgeeks.org/search/?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(mainKeywords)}`,
//         `https://hackr.io/tutorials/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.javatpoint.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.guru99.com/search.html?query=${encodeURIComponent(mainKeywords)}`,
//         `https://www.programiz.com/search/${encodeURIComponent(mainKeywords)}`,
//         `https://www.codecademy.com/search?query=${encodeURIComponent(mainKeywords)}`,
//         `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(mainKeywords)}`,
//         `https://developer.android.com/s/results?q=${encodeURIComponent(mainKeywords)}`
//       ];
      
//       // Add forum and discussion sites
//       const forumUrls = [
//         `https://www.reddit.com/search/?q=${encodeURIComponent(mainKeywords)}&sort=new`,
//         `https://www.quora.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://discourse.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forums.swift.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://community.openai.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forum.unity.com/search/search?keywords=${encodeURIComponent(mainKeywords)}`,
//         `https://gitter.im/home/search?term=${encodeURIComponent(mainKeywords)}`,
//         `https://discuss.codecademy.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://discuss.pytorch.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://discuss.tensorflow.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forum.djangoproject.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forum.vuejs.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forums.meteor.com/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forum.arduino.cc/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://forum.xda-developers.com/search/?q=${encodeURIComponent(mainKeywords)}`
//       ];
      
//       // Add academic and research sources
//       const academicUrls = [
//         `https://arxiv.org/search/?query=${encodeURIComponent(mainKeywords)}`,
//         `https://scholar.google.com/scholar?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.researchgate.net/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://www.semanticscholar.org/search?q=${encodeURIComponent(mainKeywords)}`,
//         `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(mainKeywords)}`,
//         `https://dl.acm.org/action/doSearch?AllField=${encodeURIComponent(mainKeywords)}`,
//         `https://www.sciencedirect.com/search?qs=${encodeURIComponent(mainKeywords)}`,
//         `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(mainKeywords)}`,
//         `https://link.springer.com/search?query=${encodeURIComponent(mainKeywords)}`,
//         `https://www.ncbi.nlm.nih.gov/pmc/?term=${encodeURIComponent(mainKeywords)}`
//       ];
      
//       // Combine all URLs with domain-specific ones first, as they're more targeted
//       let allUrls = [
//         ...domainSpecificUrls,
//         ...searchEngineUrls,
//         ...additionalSearchUrls,
//         ...technicalUrls,
//         ...educationalUrls,
//         ...forumUrls,
//         ...academicUrls
//       ];
      
//       // Add URLs for domain-specific sources identified for the query
//       if (extendedDomains.length > 0) {
//         const additionalDomainUrls = extendedDomains.map(domain => 
//           `https://${domain}/search?q=${encodeURIComponent(mainKeywords)}`
//         );
//         allUrls = [...allUrls, ...additionalDomainUrls];
//       }
      
//       // For GitHub and StackOverflow searches, add variations for deeper results
//       if (isTechQuery || isCodeQuery) {
//         const variations = [
//           `https://github.com/search?q=${encodeURIComponent(mainKeywords + " starter template")}&type=repositories`,
//           `https://github.com/search?q=${encodeURIComponent(mainKeywords + " boilerplate")}&type=repositories`,
//           `https://stackoverflow.com/search?q=${encodeURIComponent(mainKeywords + " best practice")}`
//         ];
//         allUrls = [...allUrls, ...variations];
//       }
      
//       // Deduplicate URLs
//       allUrls = Array.from(new Set(allUrls));
      
//       // Limit to maximum URLs to crawl
//       allUrls = allUrls.slice(0, maxCrawlUrls);
      
//       // Create an array of sources
//       const sources: ResearchSource[] = [];
//       let combinedData = '';
      
//       console.log(`Preparing to fetch up to ${this.MAX_DATA_SOURCES} sources from ${allUrls.length} URLs`);
      
//       // Use our enhanced domain-aware fetch utility
//       const fetchResults = await domainAwareFetch(
//         allUrls.slice(0, Math.min(allUrls.length, this.MAX_DATA_SOURCES)),
//         Math.min(30, Math.floor(this.MAX_PARALLEL_REQUESTS / 2)),
//         3
//       );
      
//       console.log(`Successfully fetched ${fetchResults.length} sources out of ${Math.min(allUrls.length, this.MAX_DATA_SOURCES)} attempted`);
      
//       // Process the fetched results
//       const processPromises = fetchResults.map(async (result) => {
//         try {
//           const { url, html } = result;
          
//           // Extract title from HTML
//           let title = url;
//           const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
//           if (titleMatch && titleMatch[1]) {
//             title = titleMatch[1].trim();
//           }
          
//           // Extract relevant content
//           const extractedContent = this.extractRelevantContent(html, query, url);
          
//           // Calculate relevance
//           const relevanceScore = this.calculateRelevanceLegacy(extractedContent, query);
          
//           // Check for freshness signals in the content
//           const freshnessScore = this.calculateFreshnessScore(extractedContent, query);
          
//           // Adjust relevance based on freshness for recency-sensitive queries
//           const recencyAdjustedRelevance = /latest|recent|new|update/i.test(query)
//             ? ((relevanceScore * 0.7) + (freshnessScore * 0.3))
//             : relevanceScore;
          
//           // Only keep sources with minimum relevance and content
//           if (recencyAdjustedRelevance >= 0.3 && extractedContent.length > 100) {
//             const source: ResearchSource = {
//               url,
//               title,
//               content: extractedContent,
//               relevance: recencyAdjustedRelevance,
//               timestamp: new Date().toISOString()
//             };
            
//             sources.push(source);
//           }
//         } catch (error) {
//           console.error(`Error processing result for ${result.url}:`, error);
//         }
//       });
      
//       // Wait for all processing to complete
//       await Promise.all(processPromises);
      
//       // Update combined data from all valid sources
//       for (const source of sources) {
//         combinedData += `\n\nSOURCE: ${source.title}\nURL: ${source.url}\n${source.content.substring(0, 2000)}`;
//       }
      
//       console.log(`Processed ${sources.length} valid sources with combined data length: ${combinedData.length} characters`);
      
//       // Prioritize sources based on relevance, freshness, and authority
//       const prioritizedSources = this.prioritizeSources(sources, query);
      
//       // Combine all the content - now using prioritized sources
//       combinedData = prioritizedSources
//         .map(r => `Source: ${r.title || 'Unknown'}\n${r.content || ''}`)
//         .join('\n\n---\n\n');
      
//       // Learn from this query for future adaptation
//       this.adaptSearchStrategy(query, {
//         sources: prioritizedSources,
//         data: combinedData
//       });
      
//       console.log(`Completed web crawling with ${prioritizedSources.length} sources`);
      
//       return {
//         data: combinedData,
//         sources: prioritizedSources
//       };
//     } catch (error) {
//       console.error("Web crawling failed", error);
//       return this.fallbackResearch(query, depth);
//     }
//   }

//   /**
//    * Generate a diverse set of search queries based on the user query
//    */
//   private generateSearchQueries(query: string): string[] {
//     // Extract main keywords
//     const mainKeywords = query
//       .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
//       .replace(/['"]/g, '')  // Remove quotes
//       .trim();
      
//     // Check for version numbers/specific identifiers
//     const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
//     const versionMatch = query.match(versionRegex);
//     const versionTag = versionMatch ? versionMatch[0] : '';
    
//     // Identify if it's a code/programming query
//     const isProgrammingQuery = /\b(code|function|api|library|framework|programming|developer|sdk|npm|package|class|method|interface|component|hook|module|dependency|import|export)\b/i.test(query);
    
//     // Identify specific technology areas
//     const webDev = /\b(html|css|javascript|typescript|react|vue|angular|svelte|dom|browser|frontend|web|responsive|node|express|nextjs|remix|gatsby)\b/i.test(query);
//     const mobileDev = /\b(ios|android|react native|flutter|swift|kotlin|mobile app|mobile development)\b/i.test(query);
//     const dataScience = /\b(python|machine learning|ml|ai|data science|tensorflow|pytorch|pandas|numpy|statistics|dataset|classification|regression|neural network)\b/i.test(query);
//     const devOps = /\b(docker|kubernetes|ci\/cd|jenkins|github actions|aws|gcp|azure|cloud|serverless|lambda|deployment|container)\b/i.test(query);
//     const database = /\b(sql|postgresql|mysql|mongodb|database|nosql|orm|query|joins|schema|data model|prisma|mongoose|sequelize)\b/i.test(query);
    
//     // Check for request intent
//     const wantsExamples = /\b(example|code|sample|snippet|demo|implementation|reference|how to use)\b/i.test(query);
//     const wantsTutorial = /\b(tutorial|guide|walkthrough|step by step|learn|course|explain|how to)\b/i.test(query);
//     const wantsComparison = /\b(vs|versus|comparison|compare|difference|better|alternative)\b/i.test(query);
//     const wantsBestPractices = /\b(best practice|pattern|architecture|optimize|improve|clean|proper|correct way|standard)\b/i.test(query);
    
//     // Generate query variants
//     const queries = [
//       mainKeywords, // Basic query
//       `${mainKeywords}${versionTag ? ' ' + versionTag : ''}`, // With version tag if present
//     ];
    
//     // Add intent-specific queries
//     if (wantsExamples) {
//       queries.push(
//         `${mainKeywords} example code`,
//         `${mainKeywords} code sample`,
//         `${mainKeywords} implementation example${versionTag ? ' ' + versionTag : ''}`
//       );
//     }
    
//     if (wantsTutorial) {
//       queries.push(
//         `${mainKeywords} tutorial guide`,
//         `how to use ${mainKeywords}${versionTag ? ' ' + versionTag : ''}`,
//         `${mainKeywords} step by step guide`
//       );
//     }
    
//     if (wantsComparison) {
//       queries.push(
//         `${mainKeywords} comparison alternatives`,
//         `${mainKeywords} vs other${isProgrammingQuery ? ' libraries' : ''}`,
//         `${mainKeywords} pros and cons`
//       );
//     }
    
//     if (wantsBestPractices) {
//       queries.push(
//         `${mainKeywords} best practices`,
//         `${mainKeywords} recommended patterns`,
//         `${mainKeywords} optimization techniques`
//       );
//     }
    
//     // Add technology-specific queries
//     if (webDev) {
//       queries.push(
//         `${mainKeywords} web development`,
//         `${mainKeywords} frontend ${isProgrammingQuery ? 'library' : 'usage'}`
//       );
//     }
    
//     if (mobileDev) {
//       queries.push(
//         `${mainKeywords} mobile development`,
//         `${mainKeywords} ${/ios|swift/i.test(query) ? 'iOS' : 'Android'} implementation`
//       );
//     }
    
//     if (dataScience) {
//       queries.push(
//         `${mainKeywords} data science application`,
//         `${mainKeywords} machine learning implementation`
//       );
//     }
    
//     if (devOps) {
//       queries.push(
//         `${mainKeywords} devops integration`,
//         `${mainKeywords} cloud deployment`
//       );
//     }
    
//     if (database) {
//       queries.push(
//         `${mainKeywords} database usage`,
//         `${mainKeywords} data modeling`
//       );
//     }
    
//     // Documentation queries for technical topics
//     if (isProgrammingQuery) {
//       queries.push(
//         `${mainKeywords} documentation${versionTag ? ' ' + versionTag : ''}`,
//         `${mainKeywords} api reference`,
//         `${mainKeywords} official docs`,
//         `${mainKeywords} github`
//       );
//     }
    
//     // Filter out duplicates and return
//     return Array.from(new Set(queries));
//   }

//   /**
//    * Identify the most relevant domains for a particular query
//    */
//   private identifyRelevantDomains(query: string): string[] {
//     const domains: string[] = [];
    
//     // General reference domains
//     domains.push('stackoverflow.com', 'github.com');
    
//     // Check for programming languages/technologies
//     if (/\bjavascript\b|\bjs\b/i.test(query)) {
//       domains.push('developer.mozilla.org', 'javascript.info', 'npmjs.com');
//     }
    
//     if (/\btypescript\b|\bts\b/i.test(query)) {
//       domains.push('typescriptlang.org', 'typescript-eslint.io');
//     }
    
//     if (/\bpython\b/i.test(query)) {
//       domains.push('docs.python.org', 'pypi.org', 'realpython.com');
//     }
    
//     if (/\bjava\b/i.test(query)) {
//       domains.push('docs.oracle.com', 'maven.apache.org');
//     }
    
//     if (/\bc#\b|\bcsharp\b/i.test(query)) {
//       domains.push('docs.microsoft.com', 'learn.microsoft.com');
//     }
    
//     if (/\bruby\b/i.test(query)) {
//       domains.push('ruby-lang.org', 'rubygems.org');
//     }
    
//     if (/\bgo\b|\bgolang\b/i.test(query)) {
//       domains.push('golang.org', 'go.dev');
//     }
    
//     if (/\brust\b/i.test(query)) {
//       domains.push('rust-lang.org', 'crates.io');
//     }
    
//     // Check for frameworks/libraries
//     if (/\breact\b/i.test(query)) {
//       domains.push('reactjs.org', 'react.dev', 'legacy.reactjs.org');
//     }
    
//     if (/\bangular\b/i.test(query)) {
//       domains.push('angular.io', 'angularjs.org');
//     }
    
//     if (/\bvue\b/i.test(query)) {
//       domains.push('vuejs.org', 'v3.vuejs.org');
//     }
    
//     if (/\bsvelte\b/i.test(query)) {
//       domains.push('svelte.dev');
//     }
    
//     if (/\bnextjs\b|\bnext\.js\b/i.test(query)) {
//       domains.push('nextjs.org', 'vercel.com');
//     }
    
//     if (/\bnode\b|\bnode\.js\b/i.test(query)) {
//       domains.push('nodejs.org', 'nodejs.dev');
//     }
    
//     if (/\bexpress\b/i.test(query)) {
//       domains.push('expressjs.com');
//     }
    
//     if (/\bflutter\b/i.test(query)) {
//       domains.push('flutter.dev', 'pub.dev');
//     }
    
//     if (/\bdjango\b/i.test(query)) {
//       domains.push('djangoproject.com');
//     }
    
//     if (/\blaravel\b/i.test(query)) {
//       domains.push('laravel.com');
//     }
    
//     if (/\bspring\b/i.test(query)) {
//       domains.push('spring.io');
//     }
    
//     // Check for databases
//     if (/\bsql\b|\bdatabase\b/i.test(query)) {
//       domains.push('db-engines.com');
      
//       if (/\bmysql\b/i.test(query)) {
//         domains.push('dev.mysql.com');
//       }
      
//       if (/\bpostgresql\b|\bpostgres\b/i.test(query)) {
//         domains.push('postgresql.org');
//       }
      
//       if (/\bmongodb\b/i.test(query)) {
//         domains.push('mongodb.com');
//       }
      
//       if (/\bredis\b/i.test(query)) {
//         domains.push('redis.io');
//       }
//     }
    
//     // Check for cloud platforms/devops
//     if (/\baws\b|\bamazon\s+web\s+services\b/i.test(query)) {
//       domains.push('aws.amazon.com', 'docs.aws.amazon.com');
//     }
    
//     if (/\bazure\b|\bmicrosoft\s+azure\b/i.test(query)) {
//       domains.push('azure.microsoft.com');
//     }
    
//     if (/\bgcp\b|\bgoogle\s+cloud\b/i.test(query)) {
//       domains.push('cloud.google.com');
//     }
    
//     if (/\bdocker\b/i.test(query)) {
//       domains.push('docs.docker.com');
//     }
    
//     if (/\bkubernetes\b|\bk8s\b/i.test(query)) {
//       domains.push('kubernetes.io');
//     }
    
//     // Education platforms for broader topics
//     domains.push(
//       'medium.com',
//       'dev.to',
//       'freecodecamp.org',
//       'geeksforgeeks.org',
//       'w3schools.com',
//       'javatpoint.com',
//       'tutorialspoint.com'
//     );
    
//     // Research and academic sources if query seems academic
//     if (/\bresearch\b|\bpaper\b|\bstudy\b|\btheory\b|\balgorithm\b|\bmathematical\b/i.test(query)) {
//       domains.push(
//         'arxiv.org',
//         'scholar.google.com',
//         'researchgate.net',
//         'ieee.org',
//         'acm.org'
//       );
//     }
    
//     return domains;
//   }

//   /**
//    * Check URL relevance to the query based on URL text
//    */
//   private checkUrlRelevance(url: string, query: string): number {
//     try {
//       const urlObj = new URL(url);
//       const path = urlObj.pathname.toLowerCase();
//       const keywords = query.toLowerCase()
//         .replace(/how to|what is|guide to|tutorial for|examples of|explain/gi, '')
//         .replace(/['"]/g, '')
//         .trim()
//         .split(/\s+/)
//         .filter(kw => kw.length > 3);
      
//       let relevanceScore = 0;
      
//       // Check for keywords in path
//       for (const keyword of keywords) {
//         if (path.includes(keyword)) {
//           relevanceScore += 0.2;
//         }
//       }
      
//       // Check for documentation, guides, etc.
//       if (path.includes('docs') || 
//           path.includes('guide') || 
//           path.includes('tutorial') || 
//           path.includes('reference') || 
//           path.includes('example') || 
//           path.includes('api')) {
//         relevanceScore += 0.3;
//       }
      
//       // Penalize certain paths
//       if (path.includes('login') || 
//           path.includes('signin') || 
//           path.includes('signup') || 
//           path.includes('register') || 
//           path.includes('cookie') || 
//           path.includes('privacy') ||
//           path.includes('terms') ||
//           path.includes('contact') ||
//           path.includes('about') ||
//           path.includes('pricing') ||
//           path.includes('download')) {
//         relevanceScore -= 0.3;
//       }
      
//       return Math.max(0, Math.min(1, relevanceScore));
//     } catch (e) {
//       return 0;
//     }
//   }

//   private async fallbackResearch(query: string, depth: number = 2): Promise<{
//     data: string;
//     sources: ResearchSource[];
//   }> {
//     try {
//       console.log("Using fallback AI research for:", query);
//       const researchPrompt = `
//         Conduct research on the topic: "${query}"
        
//         Provide specific, factual information including:
//         1. Key facts about this topic
//         2. Major perspectives on this issue
//         3. Recent developments (be specific about dates and details)
//         4. Important historical context
//         5. Expert opinions with their actual names and credentials
        
//         Format as a detailed research document with clear sections.
//         Include exact sources where possible (specific websites, publications, experts).
//         Admit when information is limited or uncertain.
        
//         Research depth level: ${depth} (higher means more detailed)
//       `;
      
//       const result = await this.model.generateContent(researchPrompt);
//       const researchText = result.response.text();
      
//       // Extract potential sources from the AI-generated content
//       const urlRegex = /(https?:\/\/[^\s]+)/g;
//       const extractedUrls = researchText.match(urlRegex) || [];
      
//       const sources = extractedUrls.map((url: string) => ({
//         url,
//         title: `Source: ${url.split('/')[2] || 'Unknown'}`,
//         relevance: 0.7,
//         timestamp: new Date().toISOString()
//       }));
      
//       // If no URLs were found, add some generic sources based on the query
//       if (sources.length === 0) {
//         const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
//         sources.push(
//           this.createSourceObject({
//             url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
//             title: `Wikipedia: ${query}`,
//             relevance: 0.8,
//             content: "",
//             timestamp: new Date().toISOString()
//           }),
//           this.createSourceObject({
//             url: `https://scholar.google.com/scholar?q=${searchQuery}`,
//             title: `Google Scholar: ${query}`,
//             relevance: 0.7,
//             content: "",
//             timestamp: new Date().toISOString()
//           })
//         );
//       }
      
//       return {
//         data: researchText,
//         sources
//       };
//     } catch (error) {
//       console.error("Error in fallbackResearch:", error);
//       // Even if AI fails, provide at least some informative response
//       const basicData = `Unable to retrieve information for: "${query}" due to service limitations.`;
      
//       const searchQuery = encodeURIComponent(query.replace(/\s+/g, '+'));
//       return {
//         data: basicData,
//         sources: [
//           this.createSourceObject({
//             url: `https://www.google.com/search?q=${searchQuery}`,
//             title: `Search: ${query}`,
//             relevance: 0.5,
//             content: basicData,
//             timestamp: new Date().toISOString()
//           })
//         ]
//       };
//     }
//   }

//   private async analyzeData(
//     query: string,
//     data: string,
//     sources: ResearchSource[]
//   ): Promise<string> {
//     // First, extract key facts from the raw data
//     const factExtractionPrompt = `
//       From the following research data on "${query}", extract only factual information.
//       Focus on extracting precise information that directly answers the research query.
      
//       Research Data:
//       ${data.substring(0, 20000)}
      
//       Return a comprehensive list of at least 20 key facts in this format:
//       1. [Detailed fact with specific references, statistics, or technical details when available]
//       2. [Detailed fact with specific references, statistics, or technical details when available]
//       ...
      
//       When extracting facts:
//       - Include version numbers, technical specifications, and exact terminology
//       - Note specific limitations or requirements when mentioned
//       - Include data points and statistics with their sources when available
//       - Note any contradictions between different sources
//       - Extract specific implementation examples or code patterns if relevant
//       - Include real-world usage examples and case studies
//       - Note performance metrics, compatibility information, and system requirements
//     `;
    
//     let extractedFacts = "";
//     try {
//       console.log("Extracting detailed facts from research data");
//       const factResult = await this.model.generateContent(factExtractionPrompt);
//       extractedFacts = factResult.response.text();
//     } catch (error) {
//       console.error("Error in fact extraction:", error);
//       extractedFacts = "Fact extraction failed due to technical limitations.";
//     }
    
//     // Extract code examples separately for technical topics
//     let codeExamples = "";
//     const isCodeRelated = /\bcode\b|\bprogramming\b|\bapi\b|\bjavascript\b|\bpython\b|\bjava\b|\bc\+\+\b|\bcsharp\b|\bruby\b|\bphp\b|\bswift\b|\bkotlin\b|\brust\b|\bhtml\b|\bcss\b/i.test(query);
    
//     if (isCodeRelated) {
//       const codeExtractionPrompt = `
//         From the research data, extract ONLY code examples, implementations, or technical patterns related to: "${query}"
        
//         Research Data:
//         ${data.substring(0, 20000)}
        
//         Format each example with:
//         - A title describing what the code does
//         - The programming language used
//         - The complete code snippet formatted properly
//         - A brief explanation of how it works
//         - Any necessary context (frameworks, libraries, etc.)
        
//         Extract at least 3-5 different code examples if available. Format with proper markdown code blocks.
//       `;
      
//       try {
//         console.log("Extracting code examples for technical query");
//         const codeResult = await this.model.generateContent(codeExtractionPrompt);
//         codeExamples = codeResult.response.text();
//       } catch (error) {
//         console.error("Error in code examples extraction:", error);
//         codeExamples = "";
//       }
//     }
    
//     // Now analyze the data, facts and code examples comprehensively
//     const prompt = `
//       Task: Produce an in-depth, expert-level analysis of the following research data to answer: "${query}"
      
//       Research Query: ${query}
      
//       Extracted Key Facts:
//       ${extractedFacts}
      
//       ${codeExamples ? `Technical Code Examples:\n${codeExamples}\n\n` : ''}
      
//       Research Data: 
//       ${data.substring(0, 15000)}
      
//       Source Analysis:
//       - Total Sources: ${sources.length}
//       - Source Domains: ${sources.map(s => {
//         try { 
//           return new URL(s.url).hostname; 
//         } catch(e) { 
//           return s.url; 
//         }
//       }).join(', ')}
//       - Source Credibility: ${this.analyzeSourceCredibility(sources)}
      
//       Instructions for Comprehensive Analysis:
//       1. Provide extremely detailed, technical insights that directly answer the research query
//       2. Organize the information hierarchically with clear sections and subsections
//       3. Include factual, quantitative data wherever possible
//       4. Compare and contrast different approaches, technologies, or viewpoints
//       5. Identify key factors, variables, or considerations that influence the topic
//       6. Explain complex concepts with clear examples or analogies
//       7. Highlight practical applications, implementation details, and real-world implications
//       8. Address limitations, challenges, and potential solutions
//       9. Provide context about the historical development and future directions
//       10. Include specific examples and case studies that illustrate key points
      
//       Format your response as a structured, professionally formatted report with:
//       - Executive Summary (concise overview - 150-200 words)
//       - Key Findings (comprehensive list of 10-15 major discoveries with details)
//       - Detailed Analysis (in-depth examination organized by subtopics)
//       - Technical Implementation (specific details, examples, and guidelines)
//       - Comparative Analysis (evaluation of different approaches, methods, or solutions)
//       - Practical Applications (real-world usage scenarios and implementation guidance)
//       - Limitations and Challenges (detailed discussion of constraints with potential solutions)
//       - Future Directions (emerging trends and developments)
//       - Conclusions (synthesized insights and recommendations)
      
//       Use direct citations when appropriate like [Source: domain.com].
//       Prioritize depth of analysis over breadth - provide detailed, technical explanations rather than superficial overviews.
//       Include as much specific data and factual information as possible to substantiate all claims and assertions.
//       Incorporate numerical data, statistics, technical specifications, and quantitative measurements.
//       If the topic is technical, include specific implementation details, architecture considerations, and technical requirements.
//     `;

//     try {
//       console.log("Generating comprehensive research analysis");
//       const result = await this.model.generateContent(prompt);
//       const analysisText = result.response.text();
      
//       // Further enhance the analysis with references and visualizations descriptions
//       const enhancementPrompt = `
//         Review and enhance this research analysis on "${query}" by:
        
//         1. Adding appropriate references and citations
//         2. Including descriptions of relevant visualizations (diagrams, flowcharts, etc.)
//         3. Adding detailed examples and case studies
//         4. Providing more technical depth and specific implementation details
        
//         Original Analysis:
//         ${analysisText}
        
//         Return the enhanced analysis with all the original content preserved, but with added depth,
//         technical precision, and extended examples. Do not remove any content from the original analysis.
//       `;
      
//       try {
//         const enhancedResult = await this.model.generateContent(enhancementPrompt);
//         return enhancedResult.response.text();
//       } catch (error) {
//         console.log("Enhancement failed, returning original analysis");
//         return analysisText;
//       }
//     } catch (error) {
//       console.error("Error in comprehensive analyzeData:", error);
//       return `Analysis could not be generated due to an error: ${error instanceof Error ? error.message : String(error)}. Please try a more specific query or check your internet connection.`;
//     }
//   }
  
//   /**
//    * Analyze the credibility of sources
//    */
//   private analyzeSourceCredibility(sources: ResearchSource[]): string {
//     if (!sources || sources.length === 0) return "No sources available";
    
//     // Count domains for credibility analysis
//     const domainCounts: Record<string, number> = {};
//     const highAuthorityDomains = [
//       'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
//       'docs.python.org', 'docs.oracle.com', 'docs.microsoft.com',
//       'arxiv.org', 'ieee.org', 'acm.org', 'scholar.google.com',
//       'research.google', 'research.microsoft.com', 'researchgate.net',
//       'nature.com', 'science.org', 'nejm.org', 'sciencedirect.com'
//     ];
    
//     let highAuthorityCount = 0;
//     let totalDomains = 0;
    
//     for (const source of sources) {
//       try {
//         // Ensure URL has protocol
//         let url = source.url || '';
//         if (!url.startsWith('http://') && !url.startsWith('https://')) {
//           url = 'https://' + url;
//         }
//         const domain = new URL(url).hostname;
//         domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        
//         if (highAuthorityDomains.some(authDomain => domain.includes(authDomain))) {
//           highAuthorityCount++;
//         }
        
//         totalDomains++;
//       } catch (e) {
//         // Skip invalid URLs
//       }
//     }
    
//     const domainsWithMultipleSources = Object.entries(domainCounts)
//       .filter(([domain, count]) => count > 1)
//       .map(([domain, count]) => `${domain} (${count} sources)`);
    
//     const credibilityAssessment = 
//       highAuthorityCount > totalDomains * 0.5 ? "High - Multiple authoritative sources" :
//       highAuthorityCount > totalDomains * 0.3 ? "Medium-High - Some authoritative sources" :
//       highAuthorityCount > totalDomains * 0.1 ? "Medium - Few authoritative sources" :
//       "Unverified - Limited authoritative sources";
    
//     return `${credibilityAssessment}. ${domainsWithMultipleSources.length > 0 ? 
//       `Multiple sources from: ${domainsWithMultipleSources.join(', ')}` : 
//       'No domains with multiple sources'}`;
//   }

//   private async refineQueries(query: string, initialData: string, plan: ResearchPlan): Promise<string[]> {
//     const prompt = `
//       Based on the initial research results and plan, suggest focused follow-up queries.
      
//       Original Query: ${query}
//       Research Plan: ${JSON.stringify(plan)}
//       Initial Findings: ${initialData.substring(0, 10000)}
      
//       After analyzing the initial research:
//       1. What knowledge gaps remain?
//       2. What contradictions need resolution?
//       3. What areas deserve deeper investigation?
//       4. What specialized perspectives should be explored?
      
//       Return exactly 3 refined queries in a valid JSON format with no text before or after: 
//       {"queries": ["query1", "query2", "query3"]}
//     `;

//     try {
//       const result = await this.model.generateContent(prompt);
//       let responseText = result.response.text();
      
//       // Try to extract JSON if it's wrapped in backticks or other markers
//       const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         responseText = jsonMatch[0];
//       }
      
//       try {
//         const { queries } = JSON.parse(responseText);
//         return queries;
//       } catch (e) {
//         console.error("Failed to parse refined queries JSON:", responseText);
//         throw e;
//       }
//     } catch (error) {
//       console.error("Error in refineQueries:", error);
//       return [
//         `${query} latest developments`,
//         `${query} expert analysis`,
//         `${query} future implications`
//       ];
//     }
//   }

//   private async synthesizeResearch(
//     query: string,
//     initialData: string,
//     followUpData: string[],
//     allSources: ResearchSource[],
//     researchPath: string[]
//   ): Promise<string> {
//     // Create a source map for easier citation
//     const sourceMap = allSources.reduce((map, source, index) => {
//       try {
//         const domain = new URL(source.url).hostname;
//         if (!map[domain]) {
//           map[domain] = {
//             count: 1,
//             urls: [source.url],
//             titles: [source.title],
//             relevanceSum: source.relevance
//           };
//         } else {
//           map[domain].count += 1;
//           map[domain].urls.push(source.url);
//           map[domain].titles.push(source.title);
//           map[domain].relevanceSum += source.relevance;
//         }
//       } catch (e) {
//         // Handle invalid URLs
//         console.warn(`Invalid URL in source: ${source.url}`);
//       }
//       return map;
//     }, {} as Record<string, {count: number, urls: string[], titles: string[], relevanceSum: number}>);
    
//     // Prepare source summary, prioritizing most relevant domains
//     const sourceSummary = Object.entries(sourceMap)
//       .sort((a, b) => (b[1].relevanceSum / b[1].count) - (a[1].relevanceSum / a[1].count))
//       .slice(0, 15) // Top 15 most relevant domains
//       .map(([domain, info]) => `${domain} (${info.count} sources, avg relevance: ${(info.relevanceSum / info.count).toFixed(2)})`)
//       .join(', ');
    
//     // Prepare research path with context
//     const formattedPath = researchPath.map((q, i) => {
//       if (i === 0) return `Initial query: "${q}"`;
//       if (i <= 5) return `Research area ${i}: "${q}"`;
//       return `Follow-up query ${i-5}: "${q}"`;
//     }).join('\n');
    
//     // Calculate data size and adjust chunk sizes based on our MAX_TOKEN_OUTPUT
//     const initialDataSize = Math.min(15000, initialData.length);
//     const followUpDataSize = Math.min(7000, Math.floor(this.MAX_TOKEN_OUTPUT / 8));
    
//     // Build the context with larger chunks of data
//     const researchContext = `
//       Original Query: "${query}"
      
//       Research Process:
//       ${formattedPath}
      
//       Source Diversity: Data was collected from ${allSources.length} sources across ${Object.keys(sourceMap).length} domains.
      
//       Most Relevant Source Domains: ${sourceSummary}
      
//       Initial Research Findings (summary):
//       ${initialData.substring(0, initialDataSize)}
      
//       Follow-up Research Findings (summaries):
//       ${followUpData.map((d, i) => `--- Follow-up Area ${i+1} ---\n${d.substring(0, followUpDataSize)}`).join('\n\n')}
//     `;

//     // Create a more comprehensive prompt that utilizes our higher token capacity
//     const prompt = `
//       Task: Synthesize all research data into a comprehensive, evidence-based report on "${query}".
      
//       Research Context:
//       ${researchContext}
      
//       Instructions:
//       1. Cross-reference information across multiple sources to verify accuracy - look for consensus among at least 3 sources when possible
//       2. Prioritize findings that are supported by multiple credible sources with higher relevance scores
//       3. Clearly identify areas where sources disagree and explain the different perspectives
//       4. Document the confidence level for each major conclusion (HIGH/MEDIUM/LOW)
//       5. Maintain objectivity and avoid speculation - clearly distinguish between facts and interpretations
//       6. Ensure all claims are backed by specific evidence from the research
//       7. Present alternative perspectives where relevant
//       8. Be specific about dates, numbers, versions, and technical details - include exact version numbers when mentioned
//       9. Provide in-depth analysis that goes beyond surface-level information
//       10. For technical topics, include code examples when available
//       11. For comparison topics, use tables to clearly show differences
//       12. Use numbered lists for steps, processes, or sequences of events
      
//       Format as a professional research report with these comprehensive sections:
      
//       EXECUTIVE SUMMARY
//       (Concise overview of the most important findings - approximately 300 words)
      
//       INTRODUCTION
//       (Topic background, significance, scope of the research)
      
//       METHODOLOGY
//       (Research approach, sources consulted, validation methods)
      
//       KEY FINDINGS
//       (Major discoveries organized by relevance and topic area)
      
//       DETAILED ANALYSIS
//       (In-depth examination of findings with supporting evidence)
      
//       TECHNICAL DETAILS
//       (Specifications, configurations, implementation details when applicable)
      
//       CODE EXAMPLES
//       (Any relevant code samples from the research)
      
//       COMPARATIVE ASSESSMENT
//       (Comparisons with alternatives or previous versions when applicable)
      
//       LIMITATIONS AND CONSIDERATIONS
//       (Constraints, caveats, areas of uncertainty)
      
//       FUTURE DIRECTIONS
//       (Emerging trends, upcoming developments, research gaps)
      
//       CONCLUSIONS
//       (Evidence-supported answers to the original query)
      
//       REFERENCES
//       (Sources organized by domain, with relevance scores)
      
//       Include specific citations when presenting factual information using the format [Source: domain.com].
//       Focus on delivering actionable insights with maximum detail based on verifiable data.
//       This is for an expert audience that wants comprehensive technical information without oversimplification.
//       YOUR RESPONSE SHOULD BE GREATLY DETAILED WITH SIGNIFICANT LENGTH - USE THE FULL AVAILABLE TOKEN CAPACITY.
//     `;

//     try {
//       console.log(`Synthesizing comprehensive research with ${allSources.length} sources across ${Object.keys(sourceMap).length} domains`);
//       // Generate content with maximum model capacity
//       const result = await this.model.generateContent({
//         contents: [{ role: 'user', parts: [{ text: prompt }] }],
//         generationConfig: {
//           maxOutputTokens: this.MAX_TOKEN_OUTPUT,
//           temperature: 0.2 // Lower temperature for more factual output
//         }
//       });
//       return result.response.text();
//     } catch (error) {
//       console.error("Error in synthesizeResearch:", error);
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       return `
// ## Research Synthesis Error

// The system encountered an error while attempting to synthesize the research findings: ${errorMessage}

// ### Available Research Data:
// - ${researchPath.length} research paths were explored
// - ${allSources.length} sources were consulted across ${Object.keys(sourceMap).length} different domains
// - Initial data collection was ${initialData.length} characters in length
// - ${followUpData.length} follow-up research streams were conducted

// Please retry your query or contact support if this issue persists.
//       `;
//     }
//   }

//   async research(query: string): Promise<ResearchResult> {
//     const startTime = Date.now();
//     this.startTime = startTime;
    
//     // Check cache first
//     const cachedResult = this.getCachedResult(query);
//     if (cachedResult) {
//       console.log(`Using cached research result for: "${query}"`);
//       return cachedResult;
//     }
    
//     console.log(`Starting deep research process for: "${query}"`);
    
//     try {
//       // 1. Create research plan
//       console.log(`[1/7] Creating research plan for: "${query}"`);
//       let researchPlan: ResearchPlan;
//       try {
//         researchPlan = await this.createResearchPlan(query);
//         console.log(`Research plan created with ${researchPlan.subQueries?.length || 0} sub-queries`);
//       } catch (planError) {
//         console.error("Failed to create research plan:", planError);
//         // Create a basic fallback plan
//         researchPlan = {
//           mainQuery: query,
//           objective: `Gather comprehensive information about ${query}`,
//           subQueries: [
//             `What is ${query}?`,
//             `Latest ${query} features`,
//             `${query} documentation`,
//             `${query} examples`,
//             `${query} benefits and limitations`
//           ],
//           researchAreas: ["overview", "details", "applications"],
//           explorationStrategy: "broad to specific",
//           priorityOrder: ["official sources", "technical details", "examples"]
//         };
//       }

//       // 2. Directly check authoritative sources first (major improvement)
//       console.log(`[2/7] Checking authoritative sources first`);
//       const authoritativeSources = this.getAuthoritativeSources(query);
      
//       let foundAuthoritativeData = false;
//       let authoritativeData = "";
//       let authoritativeSrcList: ResearchSource[] = [];
      
//       if (authoritativeSources.length > 0) {
//         try {
//           const results = await Promise.all(authoritativeSources.map(async (source) => {
//             try {
//               console.log(`Checking authoritative source: ${source}`);
//               const controller = new AbortController();
//               const timeout = setTimeout(() => controller.abort(), 12000); // Increased from 8000ms to 12000ms
              
//               const response = await fetch(source, {
//                 signal: controller.signal,
//             headers: {
//                   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
//                 }
//               });
              
//               clearTimeout(timeout);
              
//               if (!response.ok) {
//                 console.log(`Failed to fetch ${source}: ${response.status}`);
//                 return null;
//               }
              
//               const text = await response.text();
//               const extractedContent = this.extractRelevantContent(text, query, source);
              
//               if (extractedContent.length > 500) {
//                 // Extract title
//                 let title = source;
//                 const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
//           if (titleMatch && titleMatch[1]) {
//             title = titleMatch[1].trim();
//           }
          
//                 // Check if this is highly relevant content
//                 const relevanceScore = this.calculateRelevance(extractedContent, query);
                
//                 return this.createSourceObject({
//                   url: source,
//                   title,
//                   content: extractedContent,
//                   relevance: relevanceScore
//                 });
//               }
//               return null;
//             } catch (e) {
//               console.error(`Error fetching authoritative source ${source}:`, e);
//               return null;
//             }
//           }));
          
//           const validResults = results.filter(Boolean);
          
//           if (validResults.length > 0) {
//             // Sort by relevance
//             validResults.sort((a, b) => (b?.relevance ?? 0) - (a?.relevance ?? 0));
            
//             // Use the most relevant authoritative sources
//             authoritativeData = validResults.map(r => 
//               `### Source: ${r?.title || 'Unknown'} (${r?.url || '#'})\n${r?.content || ''}`
//             ).join('\n\n');
            
//             authoritativeSrcList = validResults.map(r => this.createSourceObject({
//               url: r?.url || '#',
//               title: r?.title || 'Unknown Source',
//               relevance: r?.relevance || 0.5,
//               content: r?.content || '',
//               timestamp: r?.timestamp || new Date().toISOString()
//             }));
            
//             if (authoritativeData.length > 2000) {
//               foundAuthoritativeData = true;
//               console.log(`Found ${validResults.length} relevant authoritative sources!`);
//             }
//           }
//         } catch (e) {
//           console.error("Error checking authoritative sources:", e);
//         }
//       }
      
//       // 3. Conduct initial research using web crawling, NOT AI generation
//       console.log(`[3/7] Conducting initial research on ${researchPlan.subQueries.length} sub-queries`);
      
//       // Use real web crawling for each sub-query
//       const initialResultPromises = researchPlan.subQueries.map((q, index) => {
//         // Stagger requests to avoid rate limiting (200ms between requests)
//         return new Promise<{data: string, sources: ResearchSource[]}>(resolve => {
//           setTimeout(async () => {
//             try {
//               console.log(`Researching sub-query ${index + 1}/${researchPlan.subQueries.length}: "${q}"`);
//               // Use web crawling, with fallback only as last resort
//               const result = await this.crawlWeb(q, 2);
//               resolve(result);
//             } catch (err) {
//               console.error(`Error in sub-query ${index + 1}:`, err);
//               resolve({
//                 data: `Error researching "${q}": ${err instanceof Error ? err.message : String(err)}`,
//                 sources: []
//               });
//             }
//           }, index * 200);
//         });
//       });
      
//       const initialResults = await Promise.all(initialResultPromises);
//       console.log(`Initial research complete: ${initialResults.length} areas covered`);
      
//       // Track research progress metrics
//       const dataStats = {
//         initialDataSize: 0,
//         initialSourceCount: 0,
//         refinedDataSize: 0,
//         refinedSourceCount: 0,
//         uniqueDomains: new Set<string>(),
//         authoritativeSourceCount: foundAuthoritativeData ? authoritativeSrcList.length : 0
//       };
      
//       // Combine initial results with authoritative data if found
//       let initialData = initialResults.map(r => r.data).join('\n\n');
//       if (foundAuthoritativeData) {
//         initialData = authoritativeData + '\n\n' + initialData;
//       }
      
//       // Combine and deduplicate sources
//       const initialSourceUrls = new Set<string>();
//       let initialSources: ResearchSource[] = [];
      
//       // First add authoritative sources if found
//       if (foundAuthoritativeData) {
//         authoritativeSrcList.forEach(source => {
//           initialSources.push(source);
//           initialSourceUrls.add(source.url);
//           try {
//             // Ensure URL has protocol
//             let url = source.url || '';
//             if (!url.startsWith('http://') && !url.startsWith('https://')) {
//               url = 'https://' + url;
//             }
//             const domain = new URL(url).hostname;
//             dataStats.uniqueDomains.add(domain);
//           } catch (e) {}
//         });
//       }
      
//       // Then add other sources, avoiding duplicates
//       initialResults.forEach(result => {
//         result.sources.forEach(source => {
//           if (!initialSourceUrls.has(source.url)) {
//             initialSources.push(source);
//             initialSourceUrls.add(source.url);
//             try {
//               // Ensure URL has protocol
//               let url = source.url || '';
//               if (!url.startsWith('http://') && !url.startsWith('https://')) {
//                 url = 'https://' + url;
//               }
//               const domain = new URL(url).hostname;
//               dataStats.uniqueDomains.add(domain);
//             } catch (e) {}
//           }
//         });
//       });
      
//       // Update stats
//       dataStats.initialDataSize = initialData.length;
//       dataStats.initialSourceCount = initialSources.length;
      
//       // 4. Fact validation step (new)
//       console.log(`[4/7] Validating facts from ${initialSources.length} sources`);
      
//       // Group sources by domain to detect consensus
//       const domainGroups: Record<string, {count: number, sources: ResearchSource[]}> = {};
//       initialSources.forEach(source => {
//         try {
//           // Ensure URL has protocol
//           let url = source.url || '';
//           if (!url.startsWith('http://') && !url.startsWith('https://')) {
//             url = 'https://' + url;
//           }
//           const domain = new URL(url).hostname;
//           if (!domainGroups[domain]) {
//             domainGroups[domain] = {count: 1, sources: [source]};
//           } else {
//             domainGroups[domain].count++;
//             domainGroups[domain].sources.push(source);
//           }
//         } catch (e) {}
//       });
      
//       // Calculate credibility score for each source
//       initialSources = initialSources.map(source => {
//         try {
//           // Ensure URL has protocol
//           let url = source.url || '';
//           if (!url.startsWith('http://') && !url.startsWith('https://')) {
//             url = 'https://' + url;
//           }
//           const domain = new URL(url).hostname;
//           const group = domainGroups[domain];
          
//           // Calculate credibility factors:
//           // 1. Multiple sources from same domain indicate consistency
//           // 2. Official documentation domains are more credible
//           let credibilityBoost = 0;
          
//           // More credibility for official docs
//           if (domain.includes('github.com') || 
//               domain.includes('docs.') || 
//               domain.includes('official') ||
//               domain.includes('.org') ||
//               domain.includes('stackoverflow.com')) {
//             credibilityBoost += 0.15;
//           }
          
//           // More credibility for multiple sources from same domain
//           if (group && group.count > 1) {
//             credibilityBoost += Math.min(0.1 * group.count, 0.3);
//           }
          
//           // Apply credibility adjustment to relevance
//           const adjustedRelevance = Math.min(source.relevance + credibilityBoost, 1.0);
          
//           return this.createSourceObject({
//             ...source,
//             relevance: adjustedRelevance
//           });
//         } catch (e) {
//           return source;
//         }
//       });
      
//       // 5. Initial analysis to identify knowledge gaps
//       console.log(`[5/7] Analyzing research data (${Math.round(initialData.length/1000)}KB)`);
//       let initialAnalysis = "";
//       try {
//         initialAnalysis = await this.analyzeData(query, initialData, initialSources);
//         console.log(`Initial analysis complete: ${Math.round(initialAnalysis.length/1000)}KB`);
//       } catch (analysisError) {
//         console.error("Initial analysis failed:", analysisError);
//         initialAnalysis = `Failed to analyze initial data: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`;
//       }
      
//       // 6. Refine queries based on initial analysis
//       console.log(`[6/7] Refining research queries based on analysis`);
//       let refinedQueries: string[] = [];
//       try {
//         // Extract knowledge gaps from analysis
//         const gapMatch = initialAnalysis.match(/knowledge gaps:?([\s\S]*?)(?:\n\n|\n##|\n\*\*|$)/i);
//         const gapText = gapMatch ? gapMatch[1].trim() : '';
        
//         if (gapText) {
//           console.log("Identified knowledge gaps:", gapText);
          
//           // Extract specific questions from gaps
//           const questions = gapText.split(/\n|\./).filter(line => 
//             line.trim().length > 10 && 
//             (line.includes('?') || /what|how|why|when|where|which|who/i.test(line))
//           );
          
//           if (questions.length > 0) {
//             // Use up to 3 specific gap questions
//             refinedQueries = questions.slice(0, 3).map(q => q.trim());
//           }
//         }
        
//         // If no specific gaps were found, use standard refinement
//         if (refinedQueries.length === 0) {
//           refinedQueries = await this.refineQueries(query, initialData, researchPlan);
//         }
        
//         console.log(`Refined ${refinedQueries.length} follow-up queries: ${refinedQueries.join(', ')}`);
//       } catch (refineError) {
//         console.error("Query refinement failed:", refineError);
//         // Create basic follow-up queries if refinement fails
//         refinedQueries = [
//           `${query} latest information`,
//           `${query} pros and cons`,
//           `${query} alternatives`
//         ];
//       }
      
//       // 7. Build full research path
//       const researchPaths = [query, ...researchPlan.subQueries, ...refinedQueries];
      
//       // 8. Deeper research on refined queries
//       console.log(`[7/7] Conducting deeper research on ${refinedQueries.length} refined queries`);
//       const refinedResultPromises = refinedQueries.map((q, index) => {
//         // Stagger requests further apart for follow-ups (300ms)
//         return new Promise<{data: string, sources: ResearchSource[]}>(resolve => {
//           setTimeout(async () => {
//             try {
//               console.log(`Researching refined query ${index + 1}/${refinedQueries.length}: "${q}"`);
//               const result = await this.crawlWeb(q, 3);
//               resolve(result);
//             } catch (err) {
//               console.error(`Error in refined query ${index + 1}:`, err);
//               resolve({
//                 data: `Error researching refined query "${q}": ${err instanceof Error ? err.message : String(err)}`,
//                 sources: []
//               });
//             }
//           }, index * 300);
//         });
//       });
      
//       const refinedResults = await Promise.all(refinedResultPromises);
//       console.log(`Deeper research complete: ${refinedResults.length} refined areas covered`);
      
//       // Extract and deduplicate refined data
//       const refinedData = refinedResults.map(r => r.data);
//       const refinedSources = refinedResults.flatMap(r => r.sources);
      
//       // Update stats
//       dataStats.refinedDataSize = refinedData.join('\n\n').length;
//       dataStats.refinedSourceCount = refinedSources.length;
//       refinedSources.forEach(s => {
//         try {
//           const domain = new URL(s.url).hostname;
//           dataStats.uniqueDomains.add(domain);
//         } catch (e) {}
//       });
      
//       // Combine all unique sources
//       const allSources = [...initialSources];
      
//       // Add only new sources from refinedSources (avoid duplicates)
//       const existingUrls = new Set(initialSources.map(s => s.url));
//       refinedSources.forEach(source => {
//         if (!existingUrls.has(source.url)) {
//           allSources.push(source);
//           existingUrls.add(source.url);
//         }
//       });
      
//       // 9. Final synthesis
//       console.log(`Synthesizing research from ${allSources.length} sources across ${dataStats.uniqueDomains.size} domains`);
//       let analysis;
//       try {
//         analysis = await this.synthesizeResearch(query, initialData, refinedData, allSources, researchPaths);
//       } catch (synthesisError) {
//         console.error("Research synthesis failed:", synthesisError);
//         analysis = `Error synthesizing research: ${synthesisError instanceof Error ? synthesisError.message : String(synthesisError)}`;
//       }
      
//       // Create the final research result
//       const result = {
//         query,
//         findings: [
//           {
//             key: "Research Data",
//             details: initialData + '\n\n' + refinedData.join('\n\n')
//           }
//         ],
//         sources: allSources,
//         confidenceLevel: "medium" as ResearchConfidenceLevel,
//         metadata: {
//           totalSources: allSources.length,
//           qualitySources: allSources.filter(s => s.validationScore && s.validationScore >= 0.6).length,
//           avgValidationScore: allSources.reduce((sum, s) => sum + (s.validationScore || 0), 0) / allSources.length,
//           executionTimeMs: Date.now() - startTime,
//           timestamp: new Date().toISOString()
//         },
//         // Add backward compatibility fields
//         analysis: analysis,
//         researchPath: researchPaths,
//         plan: researchPlan
//       } as ResearchResult & {
//         analysis: string;
//         researchPath: string[];
//         plan: ResearchPlan;
//       };
      
//       // Calculate and log performance metrics
//       const duration = (Date.now() - startTime) / 1000; // in seconds
//       console.log(`Research complete in ${duration.toFixed(1)}s`);
//       console.log(`Data collected: ${(dataStats.initialDataSize + dataStats.refinedDataSize) / 1024}KB`);
//       console.log(`Sources: ${allSources.length} from ${dataStats.uniqueDomains.size} domains`);
      
//       // Cache the result
//       this.cache.set(query, {
//         data: result,
//         timestamp: Date.now()
//       });
      
//       return result;
//     } catch (error) {
//       console.error("Research process failed:", error);
//       throw new Error(`Research failed: ${error instanceof Error ? error.message : String(error)}`);
//     }
//   }
  
//   // New helper method to get authoritative sources based on query
//   private getAuthoritativeSources(query: string): string[] {
//     const authoritativeSources: string[] = [];
    
//     // Extract key terms for better source matching
//     const queryLower = query.toLowerCase();
    
//     // Check for Next.js specific queries
//     if (queryLower.includes('next.js') || queryLower.includes('nextjs')) {
//       // Version specific (extract version if present)
//       const versionMatch = queryLower.match(/next\.?js\s+(\d+(?:\.\d+)?(?:\.\d+)?)/i);
//       const version = versionMatch ? versionMatch[1] : '';
      
//       if (version) {
//         const majorVersion = version.split('.')[0];
//         authoritativeSources.push(
//           `https://github.com/vercel/next.js/releases/tag/v${version}`,
//           `https://github.com/vercel/next.js/releases`,
//           `https://nextjs.org/blog/${majorVersion}`
//         );
//       } else {
//         authoritativeSources.push(
//           'https://nextjs.org/docs',
//           'https://github.com/vercel/next.js/releases',
//           'https://nextjs.org/blog'
//         );
//       }
//     }
    
//     // Add more patterns here for other tech stacks, topics, etc.
//     // ...
    
//     return authoritativeSources;
//   }
  
//   /**
//    * Calculate relevance of content using semantic understanding
//    */
//   private async calculateRelevanceWithEmbeddings(content: string, query: string): Promise<number> {
//     try {
//       // Generate embeddings for both query and content
//       const queryEmbedding = await this.generateEmbedding(query);
      
//       // For long content, we'll chunk it and find the most relevant chunk
//       let maxSimilarity = 0;
      
//       if (content.length > 4000) {
//         // Split content into chunks for more accurate embedding
//         const chunks = this.splitIntoChunks(content, 2000, 500); // 2000 chars with 500 overlap
        
//         // Get embedding for each chunk and find max similarity
//         for (const chunk of chunks) {
//           const chunkEmbedding = await this.generateEmbedding(chunk);
//           const similarity = this.calculateSimilarity(queryEmbedding, chunkEmbedding);
//           maxSimilarity = Math.max(maxSimilarity, similarity);
//         }
//       } else {
//         // For shorter content, just get one embedding
//         const contentEmbedding = await this.generateEmbedding(content);
//         maxSimilarity = this.calculateSimilarity(queryEmbedding, contentEmbedding);
//       }
      
//       // Adjust the score - semantic similarity typically ranges from 0 to 1
//       // Add a small base score to ensure even low similarities get some weight
//       return 0.2 + (maxSimilarity * 0.8);
//     } catch (error) {
//       console.error("Error in semantic relevance calculation:", error);
//       // Fall back to the old method in case of error
//       return this.calculateRelevanceLegacy(content, query);
//     }
//   }
  
//   /**
//    * Legacy relevance calculation method (kept as backup)
//    */
//   private calculateRelevanceLegacy(content: string, query: string): number {
//     // Basic implementation from original code
//     const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
//     const contentLower = content.toLowerCase();
    
//     // Count exact phrase matches (high weight)
//     const phraseMatchCount = (contentLower.match(new RegExp(query.toLowerCase(), 'g')) || []).length;
    
//     // Count individual term matches (lower weight)
//     let termMatchCount = 0;
//     queryTerms.forEach(term => {
//       termMatchCount += (contentLower.match(new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'g')) || []).length;
//     });
    
//     // Calculate content density score (matches per length)
//     const contentLength = content.length;
//     const densityScore = (phraseMatchCount * 5 + termMatchCount) / (contentLength / 500);
    
//     // Final relevance score calculation (0.0 to 1.0)
//     return Math.min(0.3 + (densityScore * 0.7), 1.0);
//   }
  
//   /**
//    * Split text into overlapping chunks for embedding
//    */
//   private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
//     const chunks: string[] = [];
//     let i = 0;
    
//     while (i < text.length) {
//       const chunk = text.slice(i, i + chunkSize);
//       chunks.push(chunk);
//       i += chunkSize - overlap;
//     }
    
//     return chunks;
//   }
  
//   /**
//    * Learn from search results and adapt strategy for future queries
//    */
//   private adaptSearchStrategy(query: string, results: { sources: ResearchSource[], data: string }): void {
//     // Store context about this query for future adaptation
//     const effectiveSources = results.sources.filter(s => s.relevance > 0.6);
    
//     if (effectiveSources.length > 0) {
//       // Track which domains provided relevant results
//       const relevantDomains = effectiveSources.map(source => {
//         try {
//           return new URL(source.url).hostname;
//         } catch (e) {
//           return null;
//         }
//       }).filter(Boolean) as string[];
      
//       // Track which terms in the query produced good results
//       const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      
//       // Store this context for future queries
//       this.queryContext.set(query, {
//         relevantDomains,
//         queryTerms,
//         effectiveSourceCount: effectiveSources.length,
//         timestamp: Date.now()
//       });
      
//       // Cleanup old context (keep only last 50 queries)
//       if (this.queryContext.size > 50) {
//         // Sort keys by timestamp and remove oldest
//         const sortedKeys = Array.from(this.queryContext.entries())
//           .sort((a, b) => a[1].timestamp - b[1].timestamp)
//           .map(entry => entry[0]);
        
//         // Remove oldest keys
//         for (let i = 0; i < sortedKeys.length - 50; i++) {
//           this.queryContext.delete(sortedKeys[i]);
//         }
//       }
//     }
//   }
  
//   /**
//    * Get recommended domains based on adaptation learning
//    */
//   private getAdaptiveDomains(query: string): string[] {
//     const recommendedDomains: Set<string> = new Set();
    
//     // Find similar previous queries
//     const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
    
//     // Check each stored query for similarity
//     try {
//       // Safe iteration using Array.from
//       const contexts = Array.from(this.queryContext.entries());
      
//       for (const [pastQuery, context] of contexts) {
//         // Check term overlap for basic similarity
//         const pastTerms = context.queryTerms || [];
//         const commonTerms = pastTerms.filter((term: string) => queryTerms.includes(term));
        
//         // If queries share terms, consider the domains that worked for that query
//         if (commonTerms.length >= Math.min(2, queryTerms.length / 2)) {
//           const domains = context.relevantDomains || [];
//           domains.forEach((domain: string) => recommendedDomains.add(domain));
//         }
//       }
//     } catch (error) {
//       console.error("Error in getAdaptiveDomains:", error);
//     }
    
//     return Array.from(recommendedDomains);
//   }

//   private calculateRelevance(content: string, query: string): number {
//     // For backward compatibility, since this is used in many places
//     // We'll run the simple version for now, as we're replacing it with 
//     // the async version (calculateRelevanceWithEmbeddings) gradually
//     return this.calculateRelevanceLegacy(content, query);
//   }

//   private async validateSource(source: ResearchSource, query: string): Promise<ResearchSource> {
//     try {
//       // Create a modified source with all required properties
//       const updatedSource: ResearchSource = { 
//         ...source,
//         // Ensure timestamp exists
//         timestamp: source.timestamp || new Date().toISOString()
//       };
      
//       // Check for technical consistency
//       const hasCodeSnippets = source.content.includes('```') || source.content.includes('`');
//       const hasTechnicalTerms = this.checkTechnicalTerms(source.content, query);
//       const consistentWithQuery = this.checkContentAlignment(source.content, query);
      
//       // Check for AI-generated content markers
//       const aiGenerationScore = this.checkForAiGenerated(source.content);
      
//       // Check for factual claims
//       const factualClaimsScore = this.assessFactualClaims(source.content);
      
//       // Calculate freshness score based on date patterns in the content
//       const freshnessScore = this.calculateFreshnessScore(source.content, query);
      
//       // Update validation metrics
//       updatedSource.validationScore = this.calculateValidationScore({
//         technicalConsistency: hasTechnicalTerms ? 0.8 : 0.4,
//         queryAlignment: consistentWithQuery,
//         domainAuthority: this.getDomainAuthorityScore(source.url || ''),
//         aiGenerated: aiGenerationScore,
//         factualClaims: factualClaimsScore,
//         freshness: freshnessScore,
//         hasCode: hasCodeSnippets ? 0.9 : 0.5
//       });
      
//       // Add validation metadata
//       updatedSource.validationMetadata = {
//         technicalTerms: hasTechnicalTerms,
//         consistentWithQuery,
//         aiGenerationLikelihood: aiGenerationScore > 0.7 ? 'high' : 
//                                aiGenerationScore > 0.4 ? 'medium' : 'low',
//         factualClaimsScore,
//         freshnessScore,
//         hasCode: hasCodeSnippets
//       };
      
//       return updatedSource;
//     } catch (error) {
//       console.error("Error validating source:", error);
//       return source; // Return the original source if validation fails
//     }
//   }
  
//   /**
//    * Calculates overall validation score using weighted factors
//    */
//   private calculateValidationScore(factors: {
//     technicalConsistency: number;
//     queryAlignment: number;
//     domainAuthority: number;
//     aiGenerated: number;
//     factualClaims: number;
//     freshness: number;
//     hasCode: number;
//   }): number {
//     // Weighted scores - higher weights for more important factors
//     const weights = {
//       technicalConsistency: 0.20,
//       queryAlignment: 0.20,
//       domainAuthority: 0.15,
//       aiGenerated: 0.15, // Inverse relationship - higher AI detection means lower score
//       factualClaims: 0.10,
//       freshness: 0.10,
//       hasCode: 0.10
//     };
    
//     // Calculate weighted score, inverting the AI generation score
//     let score = 
//       (factors.technicalConsistency * weights.technicalConsistency) +
//       (factors.queryAlignment * weights.queryAlignment) +
//       (factors.domainAuthority * weights.domainAuthority) +
//       ((1 - factors.aiGenerated) * weights.aiGenerated) + // Invert AI score
//       (factors.factualClaims * weights.factualClaims) +
//       (factors.freshness * weights.freshness) +
//       (factors.hasCode * weights.hasCode);
      
//     // Ensure score is between 0 and 1
//     score = Math.max(0, Math.min(1, score));
//     return parseFloat(score.toFixed(2));
//   }
  
//   /**
//    * Check if content contains relevant technical terms to validate authenticity
//    */
//   private checkTechnicalTerms(content: string, query: string): boolean {
//     // Extract key technical terms from query
//     const techTerms = this.extractTechnicalTerms(query);
    
//     // If no technical terms found, consider generic validation
//     if (techTerms.length === 0) return true;
    
//     // Check for presence of multiple technical terms
//     const contentLower = content.toLowerCase();
//     const termMatches = techTerms.filter(term => contentLower.includes(term.toLowerCase()));
    
//     // Return true if at least 30% of terms are present
//     return termMatches.length >= Math.max(1, Math.ceil(techTerms.length * 0.3));
//   }
  
//   /**
//    * Extract technical terms from query
//    */
//   private extractTechnicalTerms(query: string): string[] {
//     // Common technical terms in software development contexts
//     const techTermsDict = [
//       "api", "framework", "library", "component", "module", "function", "method", 
//       "class", "object", "interface", "type", "typescript", "javascript",
//       "react", "vue", "angular", "node", "npm", "yarn", "webpack", "babel",
//       "express", "mongodb", "sql", "database", "query", "mutation", "graphql",
//       "rest", "http", "session", "authentication", "authorization", "token", "jwt",
//       "oauth", "saml", "cors", "xss", "csrf", "security", "vulnerability",
//       "injection", "sanitization", "validation", "middleware", "plugin", "hook",
//       "event", "listener", "callback", "promise", "async", "await", "cache",
//       "memory", "storage", "local", "session", "cookie", "header", "request",
//       "response", "server", "client", "browser", "dom", "html", "css", "scss",
//       "animation", "transition", "transform", "media", "query", "responsive",
//       "mobile", "desktop", "device", "viewport", "layout", "grid", "flex",
//       "container", "deploy", "build", "compile", "lint", "test", "unit", "integration",
//       "e2e", "ci", "cd", "docker", "kubernetes", "cloud", "aws", "azure",
//       "gcp", "serverless", "lambda", "function", "s3", "bucket", "route53",
//       "cloudfront", "cdn", "load", "balancer", "vpc", "subnet", "version", "git",
//       "commit", "branch", "merge", "pull", "push", "rebase", "repository", "next.js",
//       "nuxt", "gatsby", "remix", "vite", "esbuild", "turbopack", "swr", "tanstack",
//       "query", "redux", "mobx", "context", "api", "hook", "ssr", "ssg", "isr",
//       "csr", "hydration", "route", "handler", "middleware", "fetch", "axios",
//       "data", "fetching", "url", "path", "param", "router", "navigation", "link"
//     ];
    
//     // Check for version numbers
//     const versionRegex = /v?\d+(\.\d+)+(-\w+)?/gi;
//     const versionMatches = query.match(versionRegex) || [];
    
//     // Extract potential terms from query
//     const words = query.toLowerCase().split(/\s+/);
//     const extractedTerms = words.filter(word => 
//       techTermsDict.includes(word) || 
//       word.endsWith('.js') || 
//       word.endsWith('.ts') ||
//       word.startsWith('npm:') ||
//       word.startsWith('yarn:') ||
//       word.includes('-js') ||
//       word.includes('-ts')
//     );
    
//     // Combine extracted terms with version numbers
//     return [...extractedTerms, ...versionMatches];
//   }
  
//   /**
//    * Check how well content aligns with query intent
//    */
//   private checkContentAlignment(content: string, query: string): number {
//     // Extract main keywords from query (excluding stopwords)
//     const stopwords = ["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "as"];
//     const keywords = query.toLowerCase().split(/\s+/).filter(word => 
//       !stopwords.includes(word) && word.length > 2
//     );
    
//     if (keywords.length === 0) return 0.5; // Default medium score if no keywords
    
//     // Count keyword occurrences in content
//     const contentLower = content.toLowerCase();
//     let matchCount = 0;
    
//     for (const keyword of keywords) {
//       // Use regex to count whole word occurrences
//       const regex = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'gi');
//       const matches = contentLower.match(regex) || [];
//       matchCount += matches.length;
//     }
    
//     // Calculate density score based on content length and matches
//     const contentWords = contentLower.split(/\s+/).length;
//     const keywordDensity = matchCount / Math.max(1, contentWords);
    
//     // Ideal density is around 1-5% - too low means unrelated, too high means keyword stuffing
//     const densityScore = keywordDensity < 0.01 ? keywordDensity * 50 :  // Scale up if below 1%
//                           keywordDensity > 0.08 ? 1 - ((keywordDensity - 0.08) * 10) : // Penalize if over 8%
//                           0.5 + (keywordDensity * 5); // Scale in the ideal range
    
//     return Math.max(0, Math.min(1, densityScore));
//   }
  
//   /**
//    * Check for signs that content might be AI-generated
//    */
//   private checkForAiGenerated(content: string): number {
//     // Indicators of AI-generated content
//     const aiMarkers = [
//       // Generic, vague language
//       "in conclusion", "to summarize", "as we can see", "it is important to note",
//       "it is worth mentioning", "it should be noted", "generally speaking",
      
//       // Repetitive phrases
//       "in this article", "in this guide", "in this tutorial", "in this post",
      
//       // Perfect structure markers
//       "firstly", "secondly", "thirdly", "lastly", "in summary",
      
//       // Common AI hallucination phrases
//       "according to recent studies", "experts say", "research shows", 
//       "studies have shown", "it is widely accepted",
      
//       // Disclaimer-like language
//       "please note that", "it's important to remember", "keep in mind that"
//     ];
    
//     // Count occurrences of AI markers
//     let markerCount = 0;
//     for (const marker of aiMarkers) {
//       const regex = new RegExp(`\\b${this.escapeRegExp(marker)}\\b`, 'gi');
//       const matches = content.match(regex) || [];
//       markerCount += matches.length;
//     }
    
//     // Check for unnaturally perfect paragraph structuring
//     const paragraphs = content.split(/\n\n+/);
//     const similarParagraphLengths = this.checkParagraphLengthConsistency(paragraphs);
    
//     // Check for lack of specialized terminology (inverse of technical terms)
//     // Lack of specific code, commands, technical jargon indicates generic content
//     const hasCodeBlocks = content.includes('```') || (content.match(/`[^`]+`/g) || []).length > 2;
    
//     // Calculate combined score
//     const markersScore = Math.min(1, markerCount / 5); // Cap at 1
//     const structureScore = similarParagraphLengths ? 0.7 : 0.3;
//     const codeScore = hasCodeBlocks ? 0.2 : 0.8; // Lower score (more likely human) if code blocks
    
//     // Final weighted score (higher = more likely AI generated)
//     return (markersScore * 0.4) + (structureScore * 0.3) + (codeScore * 0.3);
//   }
  
//   /**
//    * Check for highly consistent paragraph lengths, which is common in AI content
//    */
//   private checkParagraphLengthConsistency(paragraphs: string[]): boolean {
//     if (paragraphs.length < 3) return false;
    
//     // Get lengths of paragraphs
//     const lengths = paragraphs.map(p => p.length);
    
//     // Calculate standard deviation of lengths
//     const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
//     const squareDiffs = lengths.map(len => (len - mean) ** 2);
//     const variance = squareDiffs.reduce((sum, diff) => sum + diff, 0) / lengths.length;
//     const stdDev = Math.sqrt(variance);
    
//     // Calculate coefficient of variation (standardized measure of dispersion)
//     const cv = stdDev / mean;
    
//     // If CV is low, paragraphs are suspiciously uniform in length
//     return cv < 0.3 && paragraphs.length >= 5;
//   }
  
//   /**
//    * Assess the factual claims density in content
//    */
//   private assessFactualClaims(content: string): number {
//     // Check for specific fact patterns
//     const factPatterns = [
//       // Numbers and statistics
//       /\b\d+(\.\d+)?%\b/g, // Percentages
//       /\b(million|billion|trillion)\b/gi, // Large numbers
      
//       // Dates and time references
//       /\b(in|since|from|until) \d{4}\b/gi, // Year references
//       /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi, // Full dates
//       /\bv\d+(\.\d+)+(-\w+)?\b/gi, // Version numbers
      
//       // Citations and references
//       /\b(according to|as stated by|as reported by|cited by|reference|source)\b/gi,
      
//       // Specific named entities
//       /\b[A-Z][a-z]+ (API|SDK|library|framework|tool|protocol)\b/g, // Named technologies
      
//       // Technical specifications
//       /\b\d+(\.\d+)? (MB|GB|KB|TB|ms|seconds)\b/gi, // Measurements
//     ];
    
//     // Count matches
//     let factCount = 0;
//     for (const pattern of factPatterns) {
//       const matches = content.match(pattern) || [];
//       factCount += matches.length;
//     }
    
//     // Calculate density based on content length
//     const contentWords = content.split(/\s+/).length;
//     const factDensity = factCount / Math.max(100, contentWords) * 100;
    
//     // Score based on density - more facts is better
//     return Math.min(1, factDensity / 5); // Cap at 1
//   }
  
//   /**
//    * Calculate freshness score based on date mentions
//    */
//   private calculateFreshnessScore(content: string, query: string): number {
//     // Extract version number from query if present
//     const versionMatch = query.match(/v?\d+(\.\d+)+(-\w+)?/i);
//     const queryVersion = versionMatch ? versionMatch[0] : null;
    
//     // Look for date patterns in content
//     const datePatterns = [
//       // Full dates
//       /\b(january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi,
      
//       // Year patterns
//       /\b(in|since|from|until|for) (202\d|2019)\b/gi,
      
//       // Recent relative time
//       /\b(last|past) (month|week|year|few months)\b/gi,
      
//       // Version mentions
//       /\bv?\d+(\.\d+)+(-\w+)?\b/gi
//     ];
    
//     // Current year
//     const currentYear = new Date().getFullYear();
    
//     // Check for presence of dates
//     let latestYearFound = 0;
//     let hasRecentDate = false;
//     let hasVersionMatch = false;
    
//     // Check each pattern
//     for (const pattern of datePatterns) {
//       const matches = content.match(pattern) || [];
      
//       for (const match of matches) {
//         // Check for years
//         const yearMatch = match.match(/\b(202\d|2019)\b/);
//         if (yearMatch) {
//           const year = parseInt(yearMatch[0]);
//           latestYearFound = Math.max(latestYearFound, year);
//           if (year >= currentYear - 1) {
//             hasRecentDate = true;
//           }
//         }
        
//         // Check for version match with query
//         if (queryVersion && match.includes(queryVersion)) {
//           hasVersionMatch = true;
//         }
//       }
//     }
    
//     // Calculate score based on freshness signals
//     let score = 0.5; // Default middle score
    
//     if (hasRecentDate) score += 0.3;
//     if (latestYearFound === currentYear) score += 0.2;
//     if (hasVersionMatch) score += 0.3;
    
//     // Adjustment for query version
//     if (queryVersion && !hasVersionMatch) score -= 0.3;
    
//     return Math.max(0, Math.min(1, score));
//   }
  
//   /**
//    * Get authority score for domain
//    */
//   private getDomainAuthorityScore(url: string): number {
//     try {
//       // Ensure URL has protocol
//       if (!url.startsWith('http://') && !url.startsWith('https://')) {
//         url = 'https://' + url;
//       }
      
//       const domain = new URL(url).hostname.toLowerCase();
      
//       // High authority technical domains
//       const highAuthorityDomains = [
//         'github.com', 'stackoverflow.com', 'developer.mozilla.org', 
//         'nextjs.org', 'vercel.com', 'reactjs.org', 'nodejs.org', 
//         'npmjs.com', 'typescript.org', 'typescriptlang.org', 'medium.com',
//         'web.dev', 'developers.google.com', 'docs.microsoft.com',
//         'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
//         'smashingmagazine.com', 'css-tricks.com', 'youtube.com', 'freecodecamp.org'
//       ];
      
//       // Medium authority domains
//       const mediumAuthorityDomains = [
//         'dev.to', 'hashnode.com', 'digitalocean.com', 'hackernoon.com',
//         'blog.logrocket.com', 'codecademy.com', 'pluralsight.com', 
//         'udemy.com', 'coursera.org', 'w3schools.com', 'tutorialspoint.com',
//         'geeksforgeeks.org'
//       ];
      
//       // Check for exact domain match
//       if (highAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
//         return 0.9;
//       }
      
//       if (mediumAuthorityDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
//         return 0.7;
//       }
      
//       // Partially matching domains (subdomains or related)
//       const partialMatches = [...highAuthorityDomains, ...mediumAuthorityDomains].filter(
//         d => domain.includes(d.replace(/\.(com|org|net|io)$/, ''))
//       );
      
//       if (partialMatches.length > 0) {
//         return 0.6;
//       }
      
//       // Check for educational or government domains
//       if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
//         return 0.8;
//       }
      
//       // Default score for unknown domains
//       return 0.4;
//     } catch (error) {
//       console.error("Error parsing domain:", error);
//       return 0.3;
//     }
//   }
// }