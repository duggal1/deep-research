import { NextResponse } from 'next/server';
import { ResearchEngine } from '@/lib/research';

// Use the same research engine instance as the main route
const researchEngine = new ResearchEngine();

// Store research logs
let researchLogs: string[] = [];

// Add log entry
export function addLog(log: string) {
  researchLogs.push(log);
  // Keep only the last 100 logs to prevent memory issues
  if (researchLogs.length > 100) {
    researchLogs = researchLogs.slice(-100);
  }
}

// Clear logs when research is complete
export function clearLogs() {
  researchLogs = [];
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // Get current research progress
    const metrics = researchEngine.getCurrentProgress();

    return NextResponse.json({
      metrics,
      logs: researchLogs,
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