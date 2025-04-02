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

      // Check if result uses legacy format (has analysis property)
      const hasLegacyFormat = 'analysis' in result;
      
      // Extract content from findings instead of analysis
      let executiveSummary = '';
      let keyFindings = '';
      let detailedAnalysis = '';
      
      if (hasLegacyFormat && (result as any).analysis) {
        // Legacy format - extract from analysis
        const analysisLines = (result as any).analysis.split('\n');
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
            break;
          }

          if (currentSection === 'summary') {
            executiveSummary += line + '\n';
          } else if (currentSection === 'findings') {
            keyFindings += line + '\n';
          } else if (currentSection === 'analysis') {
            detailedAnalysis += line + '\n';
          }
        }
        
        // Use raw analysis as fallback
        executiveSummary = executiveSummary.trim() || analysisLines[0] || 'No summary available';
        keyFindings = keyFindings.trim() || (result as any).analysis.slice(0, 500) || 'No key findings available';
      } else if (result.findings && result.findings.length > 0) {
        // Get content from findings
        // Try to find specific findings by key
        const summaryFinding = result.findings.find(f => 
          f.key.toLowerCase().includes('summary') || 
          f.key.toLowerCase().includes('overview'));
        
        const keyFindingsList = result.findings.filter(f => 
          f.key.toLowerCase().includes('key') || 
          f.key.toLowerCase().includes('main') ||
          f.key.toLowerCase().includes('important'));
        
        const detailsFinding = result.findings.find(f => 
          f.key.toLowerCase().includes('details') || 
          f.key.toLowerCase().includes('analysis') ||
          f.key.toLowerCase().includes('information'));
        
        // Set content from findings or use first finding as fallback
        executiveSummary = summaryFinding ? summaryFinding.details : result.findings[0].details.slice(0, 300);
        keyFindings = keyFindingsList.length > 0 
          ? keyFindingsList.map(f => f.details).join('\n\n')
          : result.findings[0].details.slice(0, 500);
        detailedAnalysis = detailsFinding 
          ? detailsFinding.details 
          : result.findings.map(f => `${f.key}:\n${f.details}`).join('\n\n');
      }

      // Check if we have any valid sources
      if (!result.sources || result.sources.length === 0) {
        result.sources = [{
          url: "No sources found",
          title: "No sources available",
          relevance: 1,
          timestamp: new Date().toISOString(),
          content: "No source content available"
        }];
      }

      // Format research path - handle case where researchPath may not exist in new version
      const formattedPath = hasLegacyFormat && (result as any).researchPath
        ? (result as any).researchPath.map((query: string, i: number) => {
            // First query is the main query
            if (i === 0) return `Initial: "${query}"`;
            // Subsequent queries from the plan
            if ((result as any).plan && (result as any).plan.subQueries && i <= (result as any).plan.subQueries.length) {
              return `Plan ${i}: "${query}"`;
            }
            // Remaining are refined queries
            return `Refinement ${i - ((result as any).plan?.subQueries?.length || 0)}: "${query}"`;
          })
        : [`Initial: "${query}"`]; // Default if no research path

      // Format sources with relevance
      const formattedSources = result.sources
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10) // Limit to top 10 sources
        .map(s => ({
          title: s.title || "Unknown source",
          url: s.url || "#",
          relevance: (s.relevance * 100).toFixed(0) + '%'
        }));

      // Include code examples if available
      const codeExampleSection = result.codeExamples && result.codeExamples.length > 0
        ? `\n\nCode Examples:\n${result.codeExamples.map(ex => 
            `${ex.title}\n\`\`\`${ex.language}\n${ex.code}\n\`\`\``
          ).join('\n\n')}`
        : '';

      // Include insights if available
      const insightsSection = result.insights && result.insights.length > 0
        ? `\n\nKey Insights:\n${result.insights.map(insight => `- ${insight}`).join('\n')}` 
        : '';
      
      // Use confidenceLevel from new format or calculate from confidence in old format
      const confidenceLevel = result.confidenceLevel ? result.confidenceLevel.toUpperCase() :
        hasLegacyFormat && (result as any).confidence 
          ? ((result as any).confidence >= 0.8 ? 'HIGH' : 
             (result as any).confidence >= 0.5 ? 'MEDIUM' : 'LOW')
          : 'MEDIUM';
          
      return NextResponse.json({
        report: `
Executive Summary:
${executiveSummary}

Key Findings:
${keyFindings.split('\n').slice(0, 5).join('\n')}

Detailed Analysis:
${detailedAnalysis}${codeExampleSection}${insightsSection}

Research Methodology:
This deep research was conducted through iterative, autonomous exploration. The engine first created a research plan, then conducted initial investigations, identified knowledge gaps, and performed targeted follow-up research.

Research Path:
${formattedPath.join('\n')}

Top Sources:
${formattedSources.map(s => `- ${s.title} (Relevance: ${s.relevance})\n  ${s.url}`).join('\n')}

Confidence Level: ${confidenceLevel}
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