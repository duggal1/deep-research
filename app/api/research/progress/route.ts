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

// --- Centralized State ---
let researchLogs: string[] = [];
let currentMetrics: CurrentMetrics = { // Initialize with defaults
  sourcesCount: 0,
  domainsCount: 0,
  dataSize: '0KB',
  elapsedTime: 0
};
// ---

// --- State Update Functions ---
export function addLog(log: string) {
  researchLogs.push(log);
  if (researchLogs.length > 100) {
    researchLogs = researchLogs.slice(-100);
  }
}

export function clearLogs() {
  researchLogs = [];
}

// New function to update metrics
export function updateMetrics(newMetrics: Partial<CurrentMetrics>) {
  currentMetrics = { ...currentMetrics, ...newMetrics };
  // Optional: Log metric updates for debugging
  // console.log('[Progress State] Metrics updated:', currentMetrics);
}

// New function to clear metrics
export function clearMetrics() {
  currentMetrics = {
    sourcesCount: 0,
    domainsCount: 0,
    dataSize: '0KB',
    elapsedTime: 0
  };
   // Optional: Log metric clearing
   // console.log('[Progress State] Metrics cleared.');
}
// ---

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    // Directly return the current module-level state
    return NextResponse.json({
      metrics: currentMetrics, // Return the shared metrics object
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