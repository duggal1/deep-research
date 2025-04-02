import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';
import { ResearchError } from '@/lib/types';

const researchEngine = new ResearchEngine();

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query?.trim()) {
      return NextResponse.json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Please provide a valid research query'
        } as ResearchError
      }, { status: 400 });
    }

    console.log(`Starting deep research on: "${query}"`);
    
    try {
      const result = await researchEngine.research(query);
      console.log(`Research completed for: "${query}"`);

      // Format analysis sections
      const analysisLines = result.analysis.split('\n');
      let executiveSummary = '';
      let keyFindings = '';
      let detailedAnalysis = '';
      
      // Extract sections (basic approach - could be more robust)
      let currentSection = '';
      for (const line of analysisLines) {
        if (line.toLowerCase().includes('executive summary')) {
          currentSection = 'summary';
          continue;
        } else if (line.toLowerCase().includes('key findings')) {
          currentSection = 'findings';
          continue;
        } else if (line.toLowerCase().includes('detailed analysis')) {
          currentSection = 'analysis';
          continue;
        } else if (line.toLowerCase().includes('conclusion')) {
          break; // Stop at conclusions for brevity
        }

        if (currentSection === 'summary') {
          executiveSummary += line + '\n';
        } else if (currentSection === 'findings') {
          keyFindings += line + '\n';
        } else if (currentSection === 'analysis') {
          detailedAnalysis += line + '\n';
        }
      }

      // Check if we have any valid sources
      if (!result.sources || result.sources.length === 0) {
        result.sources = [{
          url: "No sources found",
          title: "No sources available",
          relevance: 1,
          timestamp: new Date().toISOString()
        }];
      }

      // Use the formatted findings if available, otherwise use raw
      const formattedExecutiveSummary = executiveSummary.trim() || analysisLines[0] || 'No summary available';
      const formattedKeyFindings = keyFindings.trim() || result.analysis.slice(0, 500) || 'No key findings available';

      // Format research path to show the logic
      const formattedPath = result.researchPath.map((query, i) => {
        // First query is the main query
        if (i === 0) return `Initial: "${query}"`;
        // Subsequent queries from the plan
        if (result.plan && result.plan.subQueries && i <= result.plan.subQueries.length) {
          return `Plan ${i}: "${query}"`;
        }
        // Remaining are refined queries
        return `Refinement ${i - (result.plan?.subQueries?.length || 0)}: "${query}"`;
      });

      // Format sources with relevance
      const formattedSources = result.sources
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10) // Limit to top 10 sources
        .map(s => ({
          title: s.title || "Unknown source",
          url: s.url || "#",
          relevance: (s.relevance * 100).toFixed(0) + '%'
        }));

      return NextResponse.json({
        report: `
Executive Summary:
${formattedExecutiveSummary}

Key Findings:
${formattedKeyFindings.split('\n').slice(0, 5).join('\n')}

Detailed Analysis:
${detailedAnalysis || result.analysis}

Research Methodology:
This deep research was conducted through iterative, autonomous exploration. The engine first created a research plan, then conducted initial investigations, identified knowledge gaps, and performed targeted follow-up research.

Research Path:
${formattedPath.join('\n')}

Top Sources:
${formattedSources.map(s => `- ${s.title} (Relevance: ${s.relevance})\n  ${s.url}`).join('\n')}
        `.trim()
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=3600'
        }
      });
    } catch (researchError) {
      console.error('Research processing error:', researchError);
      
      const errorMessage = researchError instanceof Error 
        ? researchError.message
        : 'Unknown error during research processing';
        
      return NextResponse.json({
        error: {
          code: 'RESEARCH_PROCESSING_FAILED',
          message: 'An error occurred while processing the research data',
          details: errorMessage
        } as ResearchError
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message
      : 'Unknown error during research';
    
    const errorCode = errorMessage.includes('API key') 
      ? 'API_KEY_ERROR'
      : errorMessage.includes('timeout') || errorMessage.includes('time limit')
        ? 'RESEARCH_TIMEOUT'
        : 'RESEARCH_FAILED';
        
    return NextResponse.json({
      error: {
        code: errorCode,
        message: 'An error occurred during research',
        details: errorMessage
      } as ResearchError
    }, { status: 500 });
  }
}