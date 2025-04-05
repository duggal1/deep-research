'use server';

import { revalidatePath } from 'next/cache';

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
}

// In-memory store for logs (in a production app, you'd use a database or Redis)
const logStore: Record<string, LogEntry[]> = {};

// Add a log entry
export async function addLogEntry(jobId: string, entry: LogEntry) {
  if (!logStore[jobId]) {
    logStore[jobId] = [];
  }
  
  logStore[jobId].push(entry);
  
  // Keep only the last 100 logs per job to prevent memory issues
  if (logStore[jobId].length > 100) {
    logStore[jobId] = logStore[jobId].slice(-100);
  }
  
  revalidatePath('/main');
  return { success: true };
}

// Get logs for a job
export async function getLogs(jobId: string): Promise<LogEntry[]> {
  return logStore[jobId] || [];
}

// Clear logs for a job
export async function clearLogs(jobId: string) {
  delete logStore[jobId];
  revalidatePath('/main');
  return { success: true };
}