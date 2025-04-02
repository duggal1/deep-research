import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';

// Use the same research engine instance as the main route
const researchEngine = new ResearchEngine();

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // Get current research progress
    const metrics = researchEngine.getCurrentProgress();
    
    return NextResponse.json({ 
      metrics,
      timestamp: Date.now()
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error getting research progress:', error);
    return NextResponse.json({
      error: 'Failed to retrieve research progress',
      timestamp: Date.now()
    }, { status: 500 });
  }
} 