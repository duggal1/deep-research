'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TerminalIcon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveLogsProps {
  jobId?: string;
  mode: 'think' | 'non-think' | null;
  className?: string;
  query?: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
}

export function LiveLogs({ jobId, mode, className, query = 'research query' }: LiveLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to simulate refreshing logs
  const refreshLogs = () => {
    setIsLoading(true);

    // Simulate a refresh by adding a new log entry
    setLogs(prevLogs => [
      ...prevLogs,
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `[REFRESH] Log display refreshed at ${new Date().toLocaleTimeString()}`
      }
    ]);

    // Simulate loading delay
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Set up simulated logs directly on the client side
  useEffect(() => {
    if (!mode) return;

    // Clear previous logs when job ID changes
    setLogs([]);

    // Generate a random depth between 8 and 15
    const maxDepth = Math.floor(Math.random() * 8) + 8;

    // Initial logs
    setLogs([
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `[REQUEST START] Initializing ${mode === 'think' ? 'deep thinking' : 'research'} process`
      },
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `[FIRECRAWL START] Initiating deep research - Pass 1`
      },
      {
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `[MODEL SELECTED] Using ${mode === 'think' ? 'gemini-2.5-pro-exp-03-25' : 'gemini-2.0-flash'} based on mode: ${mode}`
      }
    ]);

    // Create a more comprehensive set of log messages
    const generateLogMessages = () => {
      const messages: Array<{type: 'info' | 'success' | 'warning' | 'error', message: string}> = [];

      // Add initial API call logs
      messages.push({
        type: 'info',
        message: `[FIRECRAWL REQUEST] Query: "${query}", MaxDepth: ${maxDepth}, MaxUrls: ${mode === 'think' ? 150 : 50}`
      });

      // Add polling logs for each depth level
      for (let depth = 1; depth <= maxDepth; depth++) {
        messages.push({
          type: 'info',
          message: `[POLLING] Checking status for Job ID: ${jobId || 'job-' + Date.now()}`
        });

        messages.push({
          type: 'success',
          message: `[POLLING RESPONSE] Status: processing, Depth: ${depth}/${maxDepth}`
        });

        if (depth < maxDepth) {
          messages.push({
            type: 'info',
            message: `[POLLING WAIT] Status not completed, waiting 3s...`
          });
        }

        // Add some random discoveries at certain depths
        if (depth === 3) {
          messages.push({
            type: 'info',
            message: `[DISCOVERY] Found ${Math.floor(Math.random() * 15) + 10} relevant URLs at depth ${depth}`
          });
        }

        if (depth === Math.floor(maxDepth / 2)) {
          messages.push({
            type: 'info',
            message: `[PROGRESS] Analyzed ${Math.floor(Math.random() * 30) + 20} pages so far`
          });
        }

        // Add occasional warnings
        if (depth === 5) {
          messages.push({
            type: 'warning',
            message: `[RATE LIMIT] Approaching API rate limit, throttling requests`
          });
        }
      }

      // Add completion logs
      messages.push({
        type: 'success',
        message: `[POLLING COMPLETE] Job finished, found ${Math.floor(Math.random() * 40) + 30} sources`
      });

      // Add Gemini processing logs
      messages.push({
        type: 'info',
        message: `[GEMINI START] Initializing Gemini synthesis`
      });

      messages.push({
        type: 'info',
        message: `[GEMINI PROMPT] Synthesizing research data with ${mode === 'think' ? 'deep analysis' : 'standard processing'}`
      });

      messages.push({
        type: 'info',
        message: `[GEMINI PROCESSING] Generating comprehensive report...`
      });

      messages.push({
        type: 'success',
        message: `[GEMINI COMPLETE] Report generated successfully (${Math.floor(Math.random() * 15000) + 5000} tokens)`
      });

      return messages;
    };

    const logMessages = generateLogMessages();
    let index = 0;

    // Function to add logs with realistic timing
    const addNextLog = () => {
      if (index < logMessages.length) {
        setLogs(prevLogs => [
          ...prevLogs,
          {
            timestamp: new Date().toISOString(),
            ...logMessages[index]
          }
        ]);

        index++;

        // Vary the timing between log entries for realism
        // Make it faster for non-think mode, slower for think mode
        const baseDelay = mode === 'think' ? 1200 : 800;
        const randomFactor = Math.random() * 800;
        const nextDelay = baseDelay + randomFactor;

        timerRef.current = setTimeout(addNextLog, nextDelay);
      }
    };

    // Start adding logs after a short delay
    timerRef.current = setTimeout(addNextLog, 800);

    // Clean up timers on unmount or when jobId/mode/query changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [jobId, mode, query]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!mode) return null;

  return (
    <div className={cn("mt-4 bg-gray-900/90 text-gray-200 rounded-lg border border-gray-700 shadow-inner overflow-hidden", className)}>
      <div className="flex justify-between items-center bg-gray-800 px-4 py-2 border-gray-700 border-b">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-green-400" />
          <h3 className="font-mono font-medium text-gray-200 text-sm">Live Process Logs</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-700 px-2 py-0.5 rounded font-mono text-gray-300 text-xs">
            {logs ? logs.length : 0} entries
          </span>
          <button
            onClick={refreshLogs}
            className="hover:bg-gray-700 p-1 rounded-full transition-colors"
            aria-label="Refresh logs"
          >
            <RefreshCwIcon className={cn(
              "w-3.5 h-3.5 text-gray-400",
              isLoading && "animate-spin text-blue-400"
            )} />
          </button>
        </div>
      </div>

      <div className="space-y-1 p-3 max-h-[200px] overflow-y-auto font-mono text-xs">
        {logs && logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className="flex">
              <span className="flex-shrink-0 mr-2 text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={cn(
                log.type === 'error' && "text-red-400",
                log.type === 'success' && "text-green-400",
                log.type === 'warning' && "text-yellow-400",
                log.type === 'info' && "text-blue-400"
              )}>
                {log.message}
              </span>
            </div>
          ))
        ) : (
          <div className="py-4 text-gray-500 text-center">
            Waiting for logs...
          </div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}