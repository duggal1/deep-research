import { NextResponse } from 'next/server';
// Remove direct ResearchEngine import if getCurrentProgress is removed from it
// import { ResearchEngine } from '@/lib/research';

// Define the structure for metrics explicitly, mirroring ResearchMetrics in page.tsx
interface CurrentMetrics {
  sourcesCount: number;
  domainsCount: number;
  dataSize: string; // e.g., "123.45KB"
  elapsedTime: number; // in milliseconds
}

// --- Centralized State with Improved Structure ---
let researchLogs: string[] = [];
let currentMetrics: CurrentMetrics = { // Initialize with defaults
  sourcesCount: 0,
  domainsCount: 0,
  dataSize: '0KB',
  elapsedTime: 0
};
let lastUpdated: number = Date.now();
let researchActive: boolean = false;
// ---

// --- State Update Functions ---
export function addLog(log: string) {
  researchLogs.push(log);
  if (researchLogs.length > 150) { // Increased from 100 to 150
    researchLogs = researchLogs.slice(-150);
  }
  lastUpdated = Date.now();
  researchActive = true;
}

export function clearLogs() {
  researchLogs = [];
  lastUpdated = Date.now();
  researchActive = true;
}

// Enhanced function to update metrics
export function updateMetrics(newMetrics: Partial<CurrentMetrics>) {
  currentMetrics = { ...currentMetrics, ...newMetrics };
  lastUpdated = Date.now();
  researchActive = true;
  // For debugging metrics updates
  console.log('[Progress State] Metrics updated:', JSON.stringify(currentMetrics));
}

// Enhanced function to clear metrics
export function clearMetrics() {
  currentMetrics = {
    sourcesCount: 0,
    domainsCount: 0,
    dataSize: '0KB',
    elapsedTime: 0
  };
  lastUpdated = Date.now();
  researchActive = true;
  console.log('[Progress State] Metrics cleared.');
}

// Function to mark research as inactive after completion
export function markResearchComplete() {
  researchActive = false;
  console.log('[Progress State] Research marked as complete.');
}
// ---

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // Calculate time since last update
    const timeSinceUpdate = Date.now() - lastUpdated;
    const isStale = timeSinceUpdate > 30000; // 30 seconds with no updates
    
    // If metrics show no activity and it's been stale for a while, reset progress
    if (!researchActive && isStale && currentMetrics.sourcesCount === 0) {
      console.log('[Progress Route] Returning empty progress due to inactivity.');
      return NextResponse.json({
        metrics: null,
        logs: [],
        active: false,
        timestamp: Date.now()
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }

    // Always return the current state, even if minimal
    return NextResponse.json({
      metrics: currentMetrics,
      logs: researchLogs,
      active: researchActive,
      lastUpdated: lastUpdated,
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
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}