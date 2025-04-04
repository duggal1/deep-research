import { NextResponse } from 'next/server';
import { performDeepResearch, checkResearchStatus, ResearchParams } from '@/app/actions/deepResearch';

// Cache setup
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const jobId = searchParams.get('jobId')?.trim();
    
    // Parse optional parameters
    const maxDepth = searchParams.get('maxDepth') ? parseInt(searchParams.get('maxDepth') || '8', 10) : undefined;
    const timeLimit = searchParams.get('timeLimit') ? parseInt(searchParams.get('timeLimit') || '120', 10) : undefined;
    const maxUrls = searchParams.get('maxUrls') ? parseInt(searchParams.get('maxUrls') || '20', 10) : undefined;
    const fullContent = searchParams.get('fullContent') === 'true';
    
    // Set cache key considering parameters
    const cacheKey = query ? `${query}_depth${maxDepth || 'default'}_urls${maxUrls || 'default'}` : '';

    // Validate input
    if (!query && !jobId) {
        return NextResponse.json({ 
            error: 'Either query or jobId is required' 
        }, { status: 400 });
    }

    try {
        // Check status if jobId is provided
        if (jobId) {
            const status = await checkResearchStatus(jobId);
            return NextResponse.json(status);
        }

        // Handle new research query
        if (query) {
            // Check cache
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
                console.log(`Cache hit for: ${cacheKey}`);
                return NextResponse.json(cached.data);
            }

            // Prepare research parameters
            const params: ResearchParams = {};
            if (maxDepth !== undefined) params.maxDepth = maxDepth;
            if (timeLimit !== undefined) params.timeLimit = timeLimit;
            if (maxUrls !== undefined) params.maxUrls = maxUrls;
            if (fullContent !== undefined) params.fullContent = fullContent;

            console.log(`Performing research with params:`, params);
            
            // Perform new research
            const result = await performDeepResearch(query, params);
            
            // Cache successful results
            if (result.data?.sources?.length > 0) {
                cache.set(cacheKey, { 
                    data: result, 
                    timestamp: Date.now() 
                });
            }

            return NextResponse.json(result);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        
        return NextResponse.json({
            error: error.message || 'An error occurred',
            query,
            jobId
        }, { status: 500 });
    }
}

export const config = {
    runtime: 'edge',
};