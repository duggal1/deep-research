/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SearchIcon,
  Loader2Icon,
  BookOpenIcon,
  AlertCircleIcon,
  BrainIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  GlobeIcon,
  ArrowRightIcon,
  DatabaseIcon,
  RefreshCwIcon,
  FileTextIcon,
  ImageIcon,
  ServerCrashIcon,
  TerminalIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraText } from '@/components/magicui/aurora-text';
import { ResearchError } from '@/lib/types';
import React from 'react';
import { cn } from '@/lib/utils';

// Function to extract domain from URL
const extractDomain = (url: string) => {
  if (!url || typeof url !== 'string') {
    return ''; // Return empty string for invalid input
  }
  
  try {
    // Ensure URL has a protocol for parsing
    let urlToParse = url.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }
    const domain = new URL(urlToParse).hostname;
    return domain.replace(/^www\./, ''); // Remove www.
  } catch (e) {
    // Fallback for invalid URLs: try to extract domain-like pattern
    const domainMatch = url.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]+)/);
    return domainMatch ? domainMatch[0] : ''; // Return matched pattern or empty string
  }
};

// Function to get favicon URL using Google's service
const getFaviconUrl = (domain: string) => {
  if (!domain || typeof domain !== 'string') {
    return ''; // Return empty string for invalid domain
  }
  
  // Clean the domain string
  const cleanDomain = domain.trim().toLowerCase();
  if (!cleanDomain) return '';
  
  // Add a cache-busting parameter to prevent duplicate requests
  const cacheBuster = Date.now() % 10000; // Use modulo to keep number small
  
  // Use a reliable service with cache-busting parameter
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128&cb=${cacheBuster}`;
};

// Define the structure for research metrics more explicitly
interface ResearchMetrics {
  sourcesCount: number;
  domainsCount: number;
  dataSize: string; // e.g., "123.45KB"
  elapsedTime: number; // in milliseconds
}

// Helper function to format currency values
const formatCurrency = (value: string): string => {
  // Check if the value is already formatted
  if (value.match(/^[\$€£¥₹₽₩][\d,.]+[KMBTkmbt]?$/)) {
    return value; // Already formatted correctly
  }
  
  // Check if it's a number that needs currency formatting
  const numericMatch = value.match(/^[\d,.]+[KMBTkmbt]?$/);
  if (numericMatch) {
    return '$' + value; // Add dollar sign to numeric values
  }
  
  return value; // Return as-is if not a currency value
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResearchError | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showLiveLogs, setShowLiveLogs] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ResearchMetrics | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();

  const pathKeywords = ['Initial query:', 'Research area', 'Follow-up query', 'Step ', '- Step '];

  useEffect(() => {
    // Cleanup polling interval on component unmount
    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, []);

  const addHistoryEntry = async (queryToAdd: string) => {
    try {
      const res = await fetch('/api/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToAdd }),
      });
      if (!res.ok) {
        console.error('Failed to save search history item:', res.status);
      }
      // TODO: Optionally trigger a refresh of the sidebar's history state here if needed
    } catch (e) {
      console.error('Error saving search history item:', e);
    }
  };

  const pollResearchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/research/progress', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (res.ok) {
        const data = await res.json();

        // Update metrics if available (ensure we have defaults)
        if (data.metrics) {
          setCurrentProgress(prev => ({
            sourcesCount: data.metrics.sourcesCount ?? prev?.sourcesCount ?? 0,
            domainsCount: data.metrics.domainsCount ?? prev?.domainsCount ?? 0,
            dataSize: data.metrics.dataSize ?? prev?.dataSize ?? '0KB',
            elapsedTime: data.metrics.elapsedTime ?? prev?.elapsedTime ?? 0,
          }));
        }

        // Update logs if present and in the correct format
        if (data.logs && Array.isArray(data.logs)) {
          const newLogsWithTimestamp = data.logs
            .map((logContent: string) => {
              if (!logContent) return null; // Skip empty logs
              return `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${logContent}`;
            })
            .filter(Boolean); // Remove null entries

          setLiveLogs(prevLogs => {
            const existingLogEntries = new Set(prevLogs);
            const uniqueNewLogs = newLogsWithTimestamp.filter(
              (log: string) => !existingLogEntries.has(log)
            );
            
            if (uniqueNewLogs.length > 0) {
              return [...prevLogs, ...uniqueNewLogs].slice(-100); // Keep the last 100 logs
            }
            return prevLogs;
          });

          // Update current status based on the latest log
          if (data.logs.length > 0) {
            const latestLogContent = data.logs[data.logs.length - 1];
            // Skip empty logs for status updates
            if (latestLogContent && latestLogContent.trim()) {
              const simplifiedStatus = latestLogContent
                .replace(/^Phase \d+(\.\d+)*:\s*/, '') // Remove Phase prefix
                .replace(/\[\d+\/\d+\]\s*/, '') // Remove batch numbers
                .replace(/Fetching SERP: (.*)/, 'Searching: $1...')
                .replace(/Extracted (\d+) links from (.*)\./, 'Found $1 links on $2')
                .replace(/L(\d) Batch (\d+)\/(\d+) \[\d+ URLs\].*Added (\d+) sources.*/, 'Crawling L$1 ($2/$3): +$4 sources')
                .replace(/L(\d) Batch (\d+)\/(\d+) \[\d+ URLs\].*sources$/, 'Crawling L$1 ($2/$3)...') 
                .replace(/Prioritizing (\d+) sources\.\.\./, 'Prioritizing $1 sources...')
                .replace(/Analyzing data from top (\d+) sources.*/, 'Analyzing $1 sources...')
                .replace(/Generating final analysis report.*/, 'Generating report...')
                .replace(/Research process finished.*/, 'Finalizing report...')
                .replace(/Finalizing report and metrics.*/, 'Finalizing...')
                .replace(/Crawl Phase Complete\. Final Sources: (\d+)\..*/, '$1 sources analyzed')
                .replace(/:\s*".*?"$/, '');
                
              // Only update if we have meaningful new status
              if (simplifiedStatus.trim()) {
                setCurrentStatus(simplifiedStatus.trim());
              }
            }
          }
        }
      } else {
        console.warn('[Poll] Progress poll failed:', res.status);
      }
    } catch (error) {
      console.error('[Poll] Progress poll fetch error:', error);
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
        console.log('[Poll] Polling stopped due to fetch error.');
      }
    }
  }, []);

  const handleResearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentProgress({
      sourcesCount: 0,
      domainsCount: 0,
      dataSize: '0KB',
      elapsedTime: 0
    }); // Initialize with zeros
    const initialLog = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] Initializing research for: "${query}"...`;
    setLiveLogs([initialLog]); // Set initial log immediately
    setCurrentStatus('Initializing research...');
    setShowLiveLogs(false);

    // Clear any existing interval *before* starting new ones
    if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
    }

    // Start polling immediately and set interval
    try {
       await pollResearchProgress();
    } catch (pollError) {
       console.error("Initial poll failed:", pollError)
    }
    progressPollRef.current = setInterval(pollResearchProgress, 2000); // Poll every 2 seconds for more responsive updates

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          options: {
            maxDomains: 70, // Increased from default 20-23 to 60-70
            maxSources: 70, // Also increase sources to match domains
            timeout: 180 // Slightly increased timeout to allow for more domains (3 minutes)
          } 
        }),
      });

      // Stop polling AFTER the main fetch is complete (success or error)
      if (progressPollRef.current) {
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
          console.log('[Poll] Polling stopped after research fetch completed.');
      }

      // Check response status FIRST
      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status}` };
          let errorJson = null;
          try {
              errorJson = await res.json(); // Try parsing error response
              if (errorJson.error) errorData = errorJson.error;
          } catch (parseError) {
              console.warn("Could not parse error response JSON:", parseError);
          }
          // If report/metrics exist in error response, set them before throwing
          if (errorJson?.report) setReport(errorJson.report);
          if (errorJson?.metrics) setCurrentProgress(errorJson.metrics);
          throw errorData; // Throw the extracted/created error object
      }

      const data = await res.json();

      // Check for error *within* the successful response
      if (data.error) {
          if (data.report) setReport(data.report);
          if (data.metrics) setCurrentProgress(data.metrics);
          throw data.error as ResearchError; // Throw the error object from the response body
      }

      // --- Success Case ---
      setReport(data.report);
      if (data.metrics) {
         setCurrentProgress(data.metrics);
         setCurrentStatus(`Research complete in ${(data.metrics.elapsedTime / 1000).toFixed(1)}s`);
      } else {
          // Fallback if metrics somehow missing (shouldn't happen with backend changes)
          setCurrentProgress(prev => ({ // Update based on previous state if possible
               sourcesCount: prev?.sourcesCount ?? 0,
               domainsCount: prev?.domainsCount ?? 0,
               dataSize: prev?.dataSize ?? 'N/A',
               elapsedTime: prev?.elapsedTime ?? 0
           }));
         setCurrentStatus('Research complete');
      }

      // Add query to history via API
      await addHistoryEntry(query);

    } catch (err) {
      console.error("Research handling error:", err);
      // Ensure polling is stopped on error
      if (progressPollRef.current) {
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
          console.log('[Poll] Polling stopped due to research handling error.');
      }

      // Set error state using the caught error object
      if (typeof err === 'object' && err !== null && 'message' in err && 'code' in err) {
          setError(err as ResearchError); // Assume it matches ResearchError structure
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
           setError({ code: 'UNKNOWN_API_ERROR', message: (err as Error).message });
      } else {
          setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      }
      // Don't clear report if it was potentially set during error handling
      setCurrentStatus('Research failed');
    } finally {
      setLoading(false);
      // Final check to ensure polling is stopped
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
        console.log('[Poll] Polling stopped in finally block.');
      }
    }
  };

  const handleGeminiResearch = async () => {
    if (!query.trim() || loading) return;

    setIsGeminiLoading(true); // Set Gemini loading flag
    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentProgress({
      sourcesCount: 0,
      domainsCount: 0,
      dataSize: '0KB',
      elapsedTime: 0
    });
    const initialLog = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] Initializing GEMINI research for: "${query}"...`;
    setLiveLogs([initialLog]);
    setCurrentStatus('Initializing research (Gemini)...');
    setShowLiveLogs(false);

    if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
    }

    try {
       await pollResearchProgress();
    } catch (pollError) {
       console.error("Initial poll failed:", pollError)
    }
    progressPollRef.current = setInterval(pollResearchProgress, 2000);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          useGemini: true, // <-- Tell backend to use Gemini 2.5 Pro
          options: {
            // You might want different options for Gemini, or keep them same as handleResearch
            // Example: Using default engine options defined in backend for Gemini scenario
          }
        }),
      });

      if (progressPollRef.current) {
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
          console.log('[Poll] Polling stopped after research fetch completed.');
      }

      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status}` };
          let errorJson = null;
          try { errorJson = await res.json(); if (errorJson.error) errorData = errorJson.error; } catch {}
          if (errorJson?.report) setReport(errorJson.report);
          if (errorJson?.metrics) setCurrentProgress(errorJson.metrics);
          throw errorData;
      }

      const data = await res.json();

      // Check for error *within* the successful response
      if (data.error) {
          if (data.report) setReport(data.report);
          if (data.metrics) setCurrentProgress(data.metrics);
          throw data.error as ResearchError; // Throw the error object from the response body
      }

      // --- Success Case ---
      setReport(data.report);
      if (data.metrics) {
         setCurrentProgress(data.metrics);
         setCurrentStatus(`Research complete in ${(data.metrics.elapsedTime / 1000).toFixed(1)}s`);
      } else {
          // --- FIX START ---
          // Provide explicit defaults to ensure the object matches ResearchMetrics
          setCurrentProgress(prev => ({
               sourcesCount: prev?.sourcesCount ?? 0, // Default to 0 if prev or property is missing
               domainsCount: prev?.domainsCount ?? 0, // Default to 0
               dataSize: prev?.dataSize ?? 'N/A',   // Default to 'N/A'
               elapsedTime: prev?.elapsedTime ?? 0   // Default to 0
           }));
          // --- FIX END ---
         setCurrentStatus('Research complete');
      }
      await addHistoryEntry(query);

    } catch (err) {
      console.error("Gemini Research handling error:", err);
      if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }
      if (typeof err === 'object' && err !== null && 'message' in err && 'code' in err) setError(err as ResearchError);
      else if (typeof err === 'object' && err !== null && 'message' in err) setError({ code: 'UNKNOWN_API_ERROR', message: (err as Error).message });
      else setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      setCurrentStatus('Research failed');
    } finally {
      setLoading(false);
      setIsGeminiLoading(false); // Unset Gemini loading flag
      if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }
    }
  };

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
      // Optionally show an error message to the user
    });
  }, []);

  const renderers = {
    // --- Horizontal Rule Renderer - Clean & Simple ---
    hr: () => (
      <hr className="my-8 border-gray-200 dark:border-gray-700" /> // Simplified
    ),

    // --- Code Block Renderer - Kept structure, refined container/header ---
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const language = match ? match[1] : 'text'; // Default to 'text'

      const isBlock = !inline || codeString.includes('\n') || (language === 'text' && codeString.length > 60);

      // --- BLOCK CODE ---
      if (isBlock && language !== 'text') {
        const style = theme === 'dark' ? oneDark : oneLight;

        return (
           // Cleaner container: subtle border, less shadow
          <div className="group code-block relative my-6 border border-gray-200 dark:border-gray-700/80 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
            {/* Cleaner Header Bar */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/70 px-4 py-2 border-b border-gray-200 dark:border-gray-700/80">
              <div className="flex items-center gap-2 font-mono font-medium text-gray-500 dark:text-gray-400 text-xs">
                {/* <TerminalIcon className="w-4 h-4" /> // Icon optional, can uncomment if desired */}
                <span>{language.toUpperCase()}</span>
              </div>
              <button
                onClick={() => handleCopyCode(codeString)}
                 // Simple button style
                 className="flex items-center gap-1 bg-gray-200/70 hover:bg-gray-300/70 dark:bg-gray-700/70 dark:hover:bg-gray-600/70 px-2 py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-700 dark:text-gray-300 text-xs transition-colors duration-150"
                aria-label="Copy code"
              >
                {copiedCode === codeString ? (
                   <> <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-500" /> <span className="hidden sm:inline">Copied</span> </>
                ) : (
                   <> <CopyIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copy</span> </>
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={style}
              language={language}
              PreTag="div"
               // Adjusted padding, ensure bg from style is used
               className="!p-4 overflow-x-auto !text-sm !leading-relaxed scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800/50"
              showLineNumbers={codeString.split('\n').length > 3}
              wrapLongLines={false}
               // Subtle line number style
              lineNumberStyle={{ color: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: '0.8em', paddingRight: '1.2em', userSelect: 'none' }}
              customStyle={{
                margin: 0,
                borderRadius: '0',
                fontSize: '0.875rem', // text-sm
                lineHeight: '1.6',
                // Ensure background from theme is applied, removing double bg definition
                backgroundColor: style['pre[class*="language-"]'].backgroundColor,
              }}
              codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      // --- INLINE CODE ---
      // Simple, subtle inline style
      return (
         isBlock ? (
             // Basic block for plain text code - cleaner styling
             <pre className="block bg-gray-100 dark:bg-gray-800/50 my-4 p-3 border border-gray-200 dark:border-gray-700/80 rounded-md overflow-x-auto font-mono text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                 <code>{children}</code>
             </pre>
         ) : (
            // Cleaner inline code
            <code className="bg-gray-100 dark:bg-gray-800/60 mx-[0.1em] px-[0.4em] py-[0.1em] border border-gray-200 dark:border-gray-700/60 rounded font-mono text-[0.9em] text-gray-800 dark:text-gray-300 break-words" {...props}>
              {children}
            </code>
         )
      );
    },

    // --- Table Renderer V6 - Clean & Simple Data Table ---
    table: ({ node, ...props }: any) => (
      // Simple container, subtle border, focus on content
      <div className="my-6 border border-gray-200 dark:border-gray-700/80 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <table className="w-full text-sm border-collapse" {...props} />
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      // Clean header, simple background, bottom border
      <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-300 dark:border-gray-600" {...props} />
    ),
    tr: ({ node, isHeader, ...props }: any) => (
      // Simple row separation, subtle hover
      <tr
        className={`
          border-b border-gray-200 dark:border-gray-700/60 last:border-b-0
          ${!isHeader ? "hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors duration-100" : ""}
        `}
        {...props}
      />
    ),
    td: ({ node, isHeader, style, ...props }: any) => {
      const align = style?.textAlign as 'left' | 'right' | 'center' | undefined;
      let alignClass = 'text-left';
      if (align === 'right') alignClass = 'text-right';
      if (align === 'center') alignClass = 'text-center';

      const content = node.children?.map((c: any) => c.value || '').join('') || '';
      const trimmedContent = content.trim();

      // Simplified checks for styling
      const isCurrency = /^\s*[\$€£¥₹₽₩][\d,.]+[KMBTkmbt]?\s*$/.test(trimmedContent) ||
                        /^\s*[\d,.]+[KMBTkmbt]?\s*[\$€£¥₹₽₩]\s*$/.test(trimmedContent);
      const isPercentage = /^\s*[\d,.]+\s*%\s*$/.test(trimmedContent);
      const isNumeric = /^\s*[\d,.]+[KMBTkmbt]?\s*$/.test(trimmedContent) && !isCurrency && !isPercentage; // Exclude currency/percentage
      const hasRange = trimmedContent.includes('-') && /^\s*[\d,.]+\s*-\s*[\d,.]+\s*$/.test(trimmedContent.replace(/[KMBTkmbt%\$€£¥₹₽₩]/g, ''));

      // Example: Check for 'Valuation' or 'Funding' in header for potential financial context
       const isFinancialHeader = isHeader && (
         content.toLowerCase().includes('valuation') ||
         content.toLowerCase().includes('funding') ||
         content.toLowerCase().includes('revenue') ||
         content.toLowerCase().includes('investment') ||
         content.toLowerCase().includes('round') ||
         content.toLowerCase().includes('amount')
       );

      // Formatting logic (simplified)
      let displayContent = content;
      // Only apply currency formatting if it strictly matches the pattern or in financial context
      if (!isHeader && isCurrency) {
        displayContent = formatCurrency(trimmedContent); // Assuming formatCurrency exists and works
      }

      const cellProps = {
        className: `
          px-4 py-2.5 ${alignClass} font-serif // Use serif by default
          ${isHeader
            ? 'font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider' // Simpler header
            : 'text-gray-700 dark:text-gray-300' // Default cell style
          }
          // Specific styling based on content type (subtle)
          ${isCurrency ? 'font-mono text-green-700 dark:text-green-400' : ''}
          ${isPercentage ? 'font-mono text-purple-700 dark:text-purple-400' : ''}
          ${(isNumeric || hasRange) ? 'font-mono text-blue-700 dark:text-blue-400' : ''}
          ${isFinancialHeader ? 'bg-gray-100 dark:bg-gray-700/50' : ''} // Subtle highlight for financial headers
        `,
        ...props,
      };

      return isHeader
        ? <th scope="col" {...cellProps}>{displayContent}</th> // Render th for headers
        : <td {...cellProps}>{displayContent}</td>;
    },

    // --- Heading Renderers - Clean, Serif, Clear Hierarchy ---
    h1: ({ node, children, ...props }: any) => (
      <h1 className="mt-8 mb-5 pb-2 border-b border-gray-300 dark:border-gray-600 font-serif font-bold text-gray-900 dark:text-gray-100 text-3xl tracking-tight" {...props}>
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }: any) => {
       const text = String(children);
        // Keep icon logic, but make it visually cleaner
       const sectionIconMap: Record<string, React.ElementType> = {
         'Research Path': ArrowRightIcon,
         'Top Sources Sample': GlobeIcon,
         'Source Analysis Overview': DatabaseIcon,
         'Comparative Assessment': RefreshCwIcon,
         'Executive Summary': BookOpenIcon,
         'Key Findings': CheckIcon,
         'Detailed Analysis': SearchIcon,
         'Technical Details': FileTextIcon,
         'Research Methodology': BrainIcon,
         'Code Examples': TerminalIcon,
         'Visual References': ImageIcon,
         'Key Insights': AlertCircleIcon,
         'Confidence Level Assessment': CheckIcon,
         'Conclusions': CheckIcon,
         'References': BookOpenIcon,
         'Limitations': AlertCircleIcon,
         'Future Directions': ArrowRightIcon,
         'Introduction': BookOpenIcon,
         'Methodology': BrainIcon,
         'Technical Detail': FileTextIcon,
         'Future Direction': ArrowRightIcon,
         'Comprehensive Analysis': SearchIcon,
         'Key Findings & Detailed Breakdown': FileTextIcon,
         'Comparison & Nuances': RefreshCwIcon,
         'Technical Deep Dive & Code Examples': TerminalIcon,
         'Conclusion from Research Data': CheckIcon,
         'Research Process & Sources': BrainIcon, // Added from route.ts structure
         'Additional Research Insights': AlertCircleIcon, // Added from route.ts structure
         'Extended Research Analysis': SearchIcon, // Added from route.ts potential padding
       };
       const matchingSection = Object.keys(sectionIconMap).find(section => text.trim().startsWith(section));

       if (matchingSection) {
         const SectionIcon = sectionIconMap[matchingSection];
         return (
           <h2 className="flex items-center mt-10 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 font-serif font-semibold text-gray-800 dark:text-gray-200 text-2xl tracking-tight" {...props}>
              {/* Cleaner icon presentation */}
             <SectionIcon className="w-5 h-5 mr-2.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
             {text}
           </h2>
         );
       }
       // Default H2 - simple border bottom
       return (
         <h2 className="mt-10 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 font-serif font-semibold text-gray-800 dark:text-gray-200 text-2xl tracking-tight" {...props}>
           {children}
         </h2>
       );
     },
    h3: ({ node, children, ...props }: any) => (
      <h3 className="mt-8 mb-3 font-serif font-semibold text-gray-800 dark:text-gray-200 text-xl" {...props}>
        {children}
      </h3>
    ),
    h4: ({ node, children, ...props }: any) => (
      <h4 className="mt-6 mb-2 font-serif font-semibold text-gray-700 dark:text-gray-300 text-lg" {...props}>
        {children}
      </h4>
    ),
    h5: ({ node, children, ...props }: any) => (
      <h5 className="mt-5 mb-2 font-serif font-semibold text-gray-700 dark:text-gray-300 text-base" {...props}>
        {children}
      </h5>
    ),
    h6: ({ node, children, ...props }: any) => (
      <h6 className="mt-4 mb-1 font-serif font-semibold text-gray-600 dark:text-gray-400 text-sm" {...props}>
        {children}
      </h6>
    ),

    // --- Link Renderer V6 - Clean & Minimal ---
    a: ({ node, href, children, ...props }: any) => {
      const url = href || '';
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      const textContent = Array.isArray(children) ? children.join('') : String(children);

      // Basic check for source list items (simplified logic, relies on parent 'ul' class)
      const isSourceListItemLink = node?.parent?.parent?.properties?.className?.includes('source-list');

      // Render source list links plainly, styling is handled by the li/ul
      if (isSourceListItemLink) {
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 dark:text-gray-100 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-150 line-clamp-2" {...props}>
            {children}
          </a>
        );
      }

      // Handle image links (keep simple wrapper)
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block my-5 group">
            <img
              src={url}
              alt={textContent || 'Linked image'}
              className="max-w-full h-auto rounded-md border border-gray-200 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow"
              loading="lazy"
            />
          </a>
        );
      }
      // Handle images wrapped in links
      if (node?.children?.[0]?.tagName === 'img') {
        const imgNode = node.children[0];
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block my-5 group">
            <img
              src={imgNode.properties.src}
              alt={imgNode.properties.alt || 'Embedded image'}
              className="max-w-full h-auto rounded-md border border-gray-200 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow mx-auto"
              loading="lazy"
            />
          </a>
        );
      }

      // --- Standard Link Styling (Clean Underline) ---
      let domain = '';
      let faviconUrl = '';
      if (isExternal) {
        try {
          domain = extractDomain(url); // Assuming extractDomain exists
          if (domain && domain.length > 0) {
             // Use a smaller favicon size
            faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
          }
        } catch (e) { console.warn("Could not parse domain for favicon:", url); }
      }
      const isLinkTextUrl = textContent === url;

      return (
        <a
          href={url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          // Simple, clean underline style
          className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 decoration-blue-600/30 dark:decoration-blue-400/30 hover:decoration-blue-600/70 dark:hover:decoration-blue-400/70 break-words transition-colors duration-150"
          {...props}
        >
           {/* Subtle Favicon */}
          {isExternal && faviconUrl && (
            <img
              src={faviconUrl}
              alt="" // Decorative
              className="inline-block mr-0.5 w-4 h-4 rounded-sm flex-shrink-0 align-text-bottom"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
           {/* Display clean URL if text is URL, otherwise display children */}
          <span>{isLinkTextUrl ? url.replace(/^(https?:)?\/\//, '').replace(/\/$/, '') : children}</span>
          {/* Subtle External Link Icon */}
          {isExternal && (
            <ExternalLinkIcon className="inline-block ml-0.5 w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity flex-shrink-0 align-text-bottom" />
          )}
        </a>
      );
    },

    // --- List Item Renderer V6 (Clean & Modern) ---
    li: ({ node, children, ordered, ...props }: any) => {
       let textContent = '';
       let linkNode: any = null;
       node.children?.forEach((child: any) => {
         // Simplified text extraction for pattern matching
         if (child.type === 'text') textContent += child.value;
         else if (child.tagName === 'a') linkNode = child;
         else if (child.children?.length > 0 && child.children[0].type === 'text') textContent += child.children[0].value;
       });
       textContent = textContent.trim();

       // Simplified source pattern matching
       const sourcePattern = /\(Domain:\s*\*{0,2}(.*?)\*{0,2}.*?\|\s*Relevance:\s*\*{0,2}(.*?)\*{0,2}/;
       const sourceMatch = textContent.match(sourcePattern);
       const url = linkNode?.properties?.href || '#';
       const title = linkNode?.children?.find((c:any) => c.type === 'text')?.value || textContent.split('(')[0].trim() || '';

       // --- Source List Item Styling ---
       if (sourceMatch && !ordered && url !== '#' && node?.parent?.parent?.properties?.className?.includes('source-list')) {
          const domain = sourceMatch[1];
          const relevance = sourceMatch[2] || 'N/A';
          const faviconUrl = getFaviconUrl(domain); // Assuming getFaviconUrl exists
          const isSecure = url.startsWith('https://');

          return (
             <li className="m-0 p-0 list-none" {...props}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                // Clean card-like style for sources
                className="flex items-center gap-3 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/60 p-3 border border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg w-full transition-all duration-150 shadow-sm hover:shadow-md"
              >
                {/* Subtle Favicon container */}
                {domain && (
                  <div className="flex-shrink-0 flex justify-center items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded w-7 h-7">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="" className="w-4 h-4" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <GlobeIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                )}
                {/* Main content area */}
                <div className="flex-grow min-w-0">
                   {/* Render the link content (title) using the 'a' renderer's logic */}
                   {children}
                   {/* Domain info */}
                   <div className="flex items-center gap-1 mt-0.5 text-gray-500 dark:text-gray-400 text-xs truncate">
                     <GlobeIcon className="flex-shrink-0 w-3 h-3" />
                     <span className="truncate">{domain}{isSecure ? ' 🔒' : ''}</span>
                   </div>
                 </div>
                 {/* Relevance on the right */}
                 <div className="flex-shrink-0 ml-2">
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      {relevance}
                    </span>
                 </div>
              </a>
            </li>
          );
       }

       // --- Research Path Item Styling ---
       const pathKeywords = ['Initial query:', 'Research area', 'Follow-up query', 'Step ', '- Step ']; // Keep keywords
       const startsWithPathKeyword = pathKeywords.some(keyword => textContent.trim().startsWith(keyword));

       if (startsWithPathKeyword && !ordered && node?.parent?.parent?.properties?.className?.includes('research-path')) {
            const stepMatch = textContent.match(/^- Step (\d+):\s*"(.*)"$/) || textContent.match(/^(.*?):\s*"(.*)"$/);
            const prefix = stepMatch ? (stepMatch[0].includes("Step") ? `Step ${stepMatch[1]}` : stepMatch[1]) : textContent.split('"')[0].trim().replace(':', '');
            const queryText = stepMatch ? stepMatch[2] : textContent.match(/"([^"]+)"/)?.[1] || textContent;
            let PathIcon = ArrowRightIcon; // Default
            if (prefix.includes('Initial') || prefix.includes('Step 1')) PathIcon = SearchIcon;
            else if (prefix.includes('area')) PathIcon = BrainIcon;

         return (
            <li className="m-0 p-0 list-none" {...props}>
                {/* Cleaner path item style */}
               <div className="flex items-center bg-gray-50 dark:bg-gray-800/40 py-1.5 px-3 border-l-2 border-blue-400 dark:border-blue-600 rounded-r-md">
                   <PathIcon className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                   <div className="text-gray-600 dark:text-gray-300 text-sm font-serif">
                       {prefix && <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1.5">{prefix}:</span>}
                       <span className="text-gray-800 dark:text-gray-200">
                           {stepMatch ? `"${queryText}"` : queryText}
                       </span>
                   </div>
               </div>
           </li>
          );
       }

       // --- Default List Item Renderer (Clean) ---
       return (
         <li className="my-1 flex items-start" {...props}>
            {/* Simple marker */}
           <span className={`flex-shrink-0 mr-2.5 pt-1 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right' : 'text-blue-500 dark:text-blue-400'}`}>
            {ordered ? `${(props.index ?? 0) + 1}.` : (
              <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className="mt-0.5"><circle cx="3" cy="3" r="3" /></svg>
            )}
          </span>
            {/* Serif font for content */}
           <span className="text-gray-700 dark:text-gray-300 leading-relaxed font-serif">{children}</span>
         </li>
       );
    },

    // --- List Wrappers - Add specific classes for context ---
    ul: ({ node, children, className, ...props }: any) => {
       // Check if this list contains source or path items for specific styling
       const isSourceList = node.children.some((child: any) => {
          if (child.tagName !== 'li') return false;
          const childText = child.children?.map((c:any) => c.type === 'text' ? c.value : (c.children?.[0]?.value || '')).join('');
          return childText.includes('(Domain:') && childText.includes('Relevance:');
       });
       const isPathList = node.children.some((child: any) => {
           if (child.tagName !== 'li') return false;
           const childText = child.children?.map((c:any) => c.type === 'text' ? c.value : (c.children?.[0]?.value || '')).join('');
           return pathKeywords.some((keyword: string) => childText.trim().startsWith(keyword));
       });

       if (isSourceList) {
           // No bullets, custom spacing handled by li
           return <ul className="m-0 p-0 list-none space-y-2.5 source-list" {...props}>{children}</ul>;
       }
       if (isPathList) {
           // No bullets, custom spacing handled by li
           return <ul className="m-0 p-0 list-none space-y-1.5 research-path" {...props}>{children}</ul>;
       }
       // Default list styling - standard bullets/numbers
       return <ul className="space-y-1 mb-5 pl-5 list-disc" {...props}>{children}</ul>;
    },
    ol: ({ node, children, className, ...props }: any) => (
       <ol className="space-y-1 mb-5 pl-5 list-decimal" {...props}>{children}</ol> // Standard ordered list
    ),

    // --- Paragraph Renderer - Use Serif ---
    p: ({ node, children, ...props }: any) => {
       // Handle empty paragraphs
       if (React.Children.count(children) === 0 || (typeof children[0] === 'string' && children[0].trim() === '')) {
         return null;
       }
       // Handle '---' for hr rendering (keep this logic)
       if (node.children.length === 1 && node.children[0].type === 'text' && node.children[0].value.trim() === '---') {
         return <hr className="my-8 border-gray-200 dark:border-gray-700" />; // Render simple hr
       }
       // Render images directly if paragraph only contains an image
       const containsOnlyImage = node.children.length === 1 && (node.children[0].tagName === 'img' || (node.children[0].tagName === 'a' && node.children[0].children?.[0]?.tagName === 'img'));
       if (containsOnlyImage) {
         return <>{children}</>;
       }
       // Default paragraph with serif font
       return <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed font-serif" {...props}>{children}</p>;
    },

    // --- Blockquote Renderer - Clean & Simple ---
    blockquote: ({ node, children, ...props }: any) => (
        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 pr-2 py-1 my-5 italic text-gray-600 dark:text-gray-400 font-serif" {...props}>
            {children}
        </blockquote>
    ),

  };

  const metricCard = (metricKey: keyof ResearchMetrics, icon: React.ElementType, label: string, color: string) => {
    // Map color names to actual Tailwind classes
    // Add more colors if needed
    const colorClasses: Record<string, Record<string, string>> = {
      blue: {
        gradientFrom: 'from-blue-50 dark:from-gray-800/80',
        gradientTo: 'to-blue-100 dark:to-blue-900/40',
        border: 'border-blue-200 dark:border-blue-700/50',
        bgPattern: 'bg-[radial-gradient(#4299e1_1px,transparent_1px)]', // text-blue-500
        iconBg: 'bg-blue-100 dark:bg-blue-900/60',
        iconText: 'text-blue-600 dark:text-blue-400',
        label: 'text-blue-800 dark:text-blue-300',
      },
      green: {
        gradientFrom: 'from-green-50 dark:from-gray-800/80',
        gradientTo: 'to-green-100 dark:to-green-900/40',
        border: 'border-green-200 dark:border-green-700/50',
        bgPattern: 'bg-[radial-gradient(#48bb78_1px,transparent_1px)]', // text-green-500
        iconBg: 'bg-green-100 dark:bg-green-900/60',
        iconText: 'text-green-600 dark:text-green-400',
        label: 'text-green-800 dark:text-green-300',
      },
      purple: {
        gradientFrom: 'from-purple-50 dark:from-gray-800/80',
        gradientTo: 'to-purple-100 dark:to-purple-900/40',
        border: 'border-purple-200 dark:border-purple-700/50',
        bgPattern: 'bg-[radial-gradient(#9f7aea_1px,transparent_1px)]', // text-purple-500
        iconBg: 'bg-purple-100 dark:bg-purple-900/60',
        iconText: 'text-purple-600 dark:text-purple-400',
        label: 'text-purple-800 dark:text-purple-300',
      },
      amber: { // Added amber for potential elapsedTime card
        gradientFrom: 'from-amber-50 dark:from-gray-800/80',
        gradientTo: 'to-amber-100 dark:to-amber-900/40',
        border: 'border-amber-200 dark:border-amber-700/50',
        bgPattern: 'bg-[radial-gradient(#f6ad55_1px,transparent_1px)]', // text-amber-500
        iconBg: 'bg-amber-100 dark:bg-amber-900/60',
        iconText: 'text-amber-600 dark:text-amber-400',
        label: 'text-amber-800 dark:text-amber-300',
      },
      // Add more colors as needed
    };

    const styles = colorClasses[color] || colorClasses.blue; // Default to blue if color not found

    const metricValue = currentProgress?.[metricKey]; // Use optional chaining

    return (
      <div key={metricKey} className={`flex items-center gap-3 bg-gradient-to-br ${styles.gradientFrom} ${styles.gradientTo} shadow-lg p-4 border ${styles.border} rounded-xl relative overflow-hidden`}>
        {/* Subtle background pattern */}
        <div className={`absolute inset-0 opacity-5 dark:opacity-[3%] ${styles.bgPattern} [background-size:16px_16px]`}></div>
        <div className={`flex-shrink-0 ${styles.iconBg} p-3 rounded-full shadow-inner`}>
          {React.createElement(icon, { className: `w-5 h-5 ${styles.iconText}` })}
        </div>
        <div className="relative">
          <div className={`mb-0.5 font-medium ${styles.label} text-xs uppercase tracking-wider`}>{label}</div>
          <div className="font-bold font-mono tabular-nums text-gray-900 dark:text-gray-100 text-xl">
            {metricKey === 'elapsedTime'
              ? `${((metricValue ?? 0) as number / 1000).toFixed(1)}s`
              : typeof metricValue === 'number'
                ? (metricValue ?? 0).toLocaleString()
                : (metricValue ?? 'N/A') // Handle null/undefined safely
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8"> {/* Added padding */}
      {/* Title and Description */}
      <div className="space-y-8 mx-auto mb-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
           className="space-y-4 text-center"
        >
          <h1 className="flex justify-center items-center font-serif font-bold text-gray-900 dark:text-gray-100 text-4xl md:text-5xl lg:text-6xl tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
              Deep Research Engine
            </span>
          </h1>
           <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-400 text-lg font-serif">
            Enter a query to initiate AI-powered deep research, synthesizing information from thousands of sources.
          </p>
        </motion.div>

        {/* Search Input - History section removed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {/* Input Field */}
          <div className="group relative"> {/* Added group for focus-within styling */}
            <div className="left-0 absolute inset-y-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
              <SearchIcon className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Latest advancements in serverless computing for Next.js"
              // Adjust right padding to accommodate both buttons: pr-36 changed to pr-[calc(8rem+3rem)] or similar
              className="block bg-white dark:bg-gray-900/80 shadow-md hover:shadow-lg focus:shadow-xl py-4 pr-[12rem] sm:pr-[14rem] pl-12 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500 font-serif"
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()} // Default Enter triggers normal research
              disabled={loading}
            />

            {/* --- Button Container --- */}
            <div className="top-1/2 right-3 absolute flex items-center gap-2 -translate-y-1/2 h-[75%]">
              {/* --- Think Button (New) --- */}
              <button
  onClick={handleGeminiResearch}
  disabled={loading || !query.trim()}
  title="Use Gemini 2.5 Pro for Deeper Reasoning"
  className={cn(
    "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8",
    loading || !query.trim()
      ? "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 opacity-50 cursor-not-allowed"
      : "bg-sky-500/15 border-blue-600 text-blue-700 hover:text-blue-600 dark:hover:text-blue-400"
  )}
  aria-label="Think with Gemini"
>
  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
    <motion.div
      animate={{
        rotate: loading || !query.trim() ? 0 : 180,
        scale: loading || !query.trim() ? 1 : 1.1,
      }}
      whileHover={{
        rotate: loading || !query.trim() ? 0 : 15,
        scale: 1.1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 10,
        },
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 25,
      }}
    >
      {loading && isGeminiLoading ? (
        <Loader2Icon
          className={cn(
            "w-5 h-5 animate-spin",
            loading || !query.trim() ? "text-inherit" : "text-blue-500"
          )}
        />
      ) : (
        <BrainIcon
          className={cn(
            "w-5 h-5",
            loading || !query.trim() ? "text-inherit" : "text-blue-500"
          )}
        />
      )}
    </motion.div>
  </div>
  <AnimatePresence>
    {!(loading || !query.trim()) && (
      <motion.span
        initial={{ width: 0, opacity: 0 }}
        animate={{
          width: "auto",
          opacity: 1,
        }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="text-sm overflow-hidden whitespace-nowrap text-gray-800  dark:text-white flex-shrink-0"
      >
        Think
      </motion.span>
    )}
  </AnimatePresence>
</button>

              {/* --- Research Button (Existing) --- */}
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="flex justify-center items-center bg-gradient-to-br from-blue-600 hover:from-blue-700 disabled:from-gray-500 to-blue-700 hover:to-blue-800 disabled:to-gray-600 disabled:opacity-50 shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/30 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 h-full font-serif font-semibold text-white text-base transition-all duration-200 disabled:cursor-not-allowed"
                aria-label="Start Research"
              >
                {loading && !isGeminiLoading ? ( // Show loader only if this button caused loading
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="hidden sm:inline">Research</span>
                    <SearchIcon className="sm:hidden w-5 h-5" />
                  </>
                )}
              </button>
            </div>
            {/* --- End Button Container --- */}

          </div>
        </motion.div>
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-950/90 dark:to-black/90 shadow-2xl backdrop-blur-xl mt-8 p-6 md:p-8 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl space-y-6 overflow-hidden"
          >
            {/* --- Gemini Loading Notification (New) --- */}
            {isGeminiLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30 px-4 py-3 text-orange-700 dark:text-orange-300 rounded-r-lg shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <BrainIcon className="w-5 h-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                  <p className="text-sm font-medium font-serif">
                    Gemini engine is thinking and reasoning... this may take 2-3 minutes.
                  </p>
                </div>
              </motion.div>
            )}
            {/* --- End Gemini Notification --- */}

            {/* Header & Overall Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-10 h-10">
                    {/* Spinner */}
                    <svg className="absolute inset-0 w-full h-full animate-spin text-blue-500/30 dark:text-blue-400/30" viewBox="0 0 36 36" fill="none">
                      <circle className="opacity-25" cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3"></circle>
                    </svg>
                    {/* Progress Arc - Placeholder, replace with actual progress if available */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36" fill="none">
                      <circle
                        className="text-blue-600 dark:text-blue-500 transition-all duration-500"
                        cx="18" cy="18" r="16"
                        stroke="currentColor" strokeWidth="3"
                        strokeDasharray={100.5} // Circumference
                        strokeDashoffset={100.5 - ((currentProgress?.elapsedTime ?? 0) / (180 * 10))} // Placeholder: % of 3min timeout
                        strokeLinecap="round"
                      />
                    </svg>
                    <BrainIcon className="relative w-5 h-5 text-blue-600 dark:text-blue-500" />
                  </div>
                  <h3 className="font-serif font-semibold text-gray-900 dark:text-gray-100 text-xl md:text-2xl tracking-tight">
                    Research in Progress...
                  </h3>
                </div>
                {/* Elapsed time */}
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/60 shadow-inner px-4 py-1.5 rounded-full font-mono font-medium tabular-nums text-blue-700 dark:text-blue-300 text-sm">
                  {`${((currentProgress?.elapsedTime ?? 0) / 1000).toFixed(1)}s`}
                </div>
              </div>
              {/* Simplified Overall Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <motion.div
                   className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                   initial={{ width: "0%" }}
                   animate={{ width: `${Math.min(100, ((currentProgress?.elapsedTime ?? 0) / (180 * 10)))}%` }} // Placeholder %
                   transition={{ duration: 0.5, ease: "linear" }}
                />
              </div>
            </div>

            {/* Current Status Display */}
            <div className="bg-gradient-to-r from-gray-100 to-white dark:from-gray-800/70 dark:to-gray-900/50 shadow-inner p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3 font-serif text-gray-800 dark:text-gray-200 text-base">
                <div className="flex-shrink-0 w-5 h-5">
                   {/* Dynamic Icon based on status - add more cases if needed */}
                   {currentStatus.toLowerCase().includes('fetching') || currentStatus.toLowerCase().includes('searching') ? <SearchIcon className="text-blue-500 dark:text-blue-400 animate-pulse"/> :
                    currentStatus.toLowerCase().includes('crawling') ? <GlobeIcon className="text-green-500 dark:text-green-400 animate-pulse"/> :
                    currentStatus.toLowerCase().includes('analyzing') ? <BrainIcon className="text-purple-500 dark:text-purple-400 animate-pulse"/> :
                    currentStatus.toLowerCase().includes('generating') || currentStatus.toLowerCase().includes('finalizing') ? <FileTextIcon className="text-orange-500 dark:text-orange-400 animate-pulse"/> :
                    <Loader2Icon className="text-gray-500 dark:text-gray-400 animate-spin"/>
                   }
                </div>
                <span className="font-medium truncate">{currentStatus || 'Initializing research...'}</span>
              </div>
            </div>

            {/* Metrics Grid V5 - Cleaner & More Visual */}
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
              {/* Metric Card Template */}
              {metricCard('sourcesCount', GlobeIcon, 'Sources Found', 'blue')}
              {metricCard('domainsCount', DatabaseIcon, 'Unique Domains', 'green')}
              {metricCard('dataSize', FileTextIcon, 'Data Size', 'purple')}
              {metricCard('elapsedTime', RefreshCwIcon, 'Time Elapsed', 'amber')}
            </div>

            {/* Live Logs V4 - Improved Styling & Visibility */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 font-serif font-medium text-gray-600 dark:text-gray-400 text-sm">
                   <TerminalIcon className="w-4 h-4"/>
                   <span>Activity Log</span>
                </div>
                <button
                  onClick={() => setShowLiveLogs(!showLiveLogs)}
                  className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/60 dark:hover:bg-gray-600/80 shadow-sm px-3 py-1 rounded-full font-medium text-gray-600 dark:text-gray-300 text-xs transition-colors"
                >
                  {showLiveLogs ? 'Hide' : 'Show'}
                </button>
              </div>

              <AnimatePresence>
                {showLiveLogs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', maxHeight: '350px' }} // Increased max height
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-b from-gray-100 dark:from-black/60 to-gray-200/70 dark:to-gray-900/80 shadow-inner p-4 border border-gray-200 dark:border-gray-700/70 rounded-lg max-h-[350px] overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      {liveLogs.length === 0 ? (
                         <p className="text-gray-500 italic">Waiting for logs...</p>
                      ) : (
                         liveLogs.map((log, index) => {
                            // Basic log parsing for styling
                            const timeMatch = log.match(/^\[(.*?)\]/);
                            const time = timeMatch ? timeMatch[1] : '';
                            let content = timeMatch ? log.substring(timeMatch[0].length).trim() : log;
                            let icon = null;
                            let colorClass = "text-gray-600 dark:text-gray-400/90";

                            if (content.toLowerCase().includes('fetching') || content.toLowerCase().includes('searching')) { icon = <SearchIcon className="w-3 h-3 text-blue-500"/>; colorClass="text-blue-700 dark:text-blue-400"; }
                            else if (content.toLowerCase().includes('crawling') || content.toLowerCase().includes('found') || content.toLowerCase().includes('added')) { icon = <GlobeIcon className="w-3 h-3 text-green-500"/>; colorClass="text-green-700 dark:text-green-400"; }
                            else if (content.toLowerCase().includes('analyzing')) { icon = <BrainIcon className="w-3 h-3 text-purple-500"/>; colorClass="text-purple-700 dark:text-purple-400"; }
                            else if (content.toLowerCase().includes('generating') || content.toLowerCase().includes('finalizing')) { icon = <FileTextIcon className="w-3 h-3 text-orange-500"/>; colorClass="text-orange-700 dark:text-orange-400"; }
                            else if (content.toLowerCase().includes('error') || content.toLowerCase().includes('failed')) { icon = <AlertCircleIcon className="w-3 h-3 text-red-500"/>; colorClass="text-red-600 dark:text-red-400 font-medium"; }
                            else if (content.toLowerCase().includes('warn')) { icon = <AlertCircleIcon className="w-3 h-3 text-yellow-500"/>; colorClass="text-yellow-600 dark:text-yellow-400"; }

                            // Highlight domain fetching
                            if (content.match(/Fetching (L1|L2): (.+?)\.\.\./)) {
                               content = content.replace(/Fetching (L1|L2): (.+?)\.\.\./, `Fetching $1: <span class="font-semibold text-indigo-600 dark:text-indigo-400">$2</span>...`);
                            }


                            return (
                            <div key={index} className={`flex items-start gap-2 break-words leading-relaxed whitespace-pre-wrap ${colorClass}`}>
                               {time && <span className="flex-shrink-0 opacity-60 tabular-nums">[{time}]</span>}
                               {icon && <span className="flex-shrink-0 mt-[1px]">{icon}</span>}
                               <span dangerouslySetInnerHTML={{ __html: content }} />
                            </div>
                            );
                         })
                      )}
                       {/* Auto-scroll placeholder - implement with useRef and useEffect if needed */}
                       {/* <div ref={logEndRef} /> */}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-4 bg-red-50 dark:bg-red-900/30 shadow-lg mt-8 p-5 border border-red-200 dark:border-red-500/50 rounded-xl text-red-700 dark:text-red-300"
          >
            <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 mt-0.5 p-2 rounded-full">
              <ServerCrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-grow">
              <p className="mb-1 font-serif font-semibold text-red-800 dark:text-red-200 text-lg">Research Failed ({error.code || 'Error'})</p>
              <p className="text-red-700 dark:text-red-300 text-sm font-serif">{error.message || 'An unknown error occurred.'}</p>
              {/* Optionally show partial report if available in error */}
              {report && (
                <details className="mt-3 pt-2 border-t border-red-200 dark:border-red-500/30 text-xs">
                  <summary className="font-medium text-red-600 dark:text-red-400 cursor-pointer font-serif">Show partial report/details</summary>
                  <div className="bg-red-100/50 dark:bg-red-900/40 mt-2 p-3 rounded max-h-48 overflow-y-auto font-mono text-red-700 dark:text-red-300 scrollbar-thin scrollbar-thumb-red-400 dark:scrollbar-thumb-red-700">
                    {report}
                  </div>
                </details>
              )}
              <button
                onClick={() => { setError(null); setReport(null); }} // Clear error and report
                className="bg-red-100 hover:bg-red-200 dark:bg-red-800/60 dark:hover:bg-red-700/70 mt-4 px-4 py-1.5 rounded-md font-serif font-medium text-red-700 dark:text-red-200 text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Display */}
      <AnimatePresence>
        {report && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-b from-white dark:from-gray-900 to-gray-50 dark:to-gray-900/95 shadow-xl backdrop-blur-xl mt-8 p-6 md:p-10 border border-gray-200 dark:border-gray-700/80 rounded-2xl"
          >
            {/* Report Header */}
            <div className="flex md:flex-row flex-col justify-between md:items-center gap-4 mb-8 pb-5 border-gray-200 dark:border-gray-700/80 border-b">
              <h2 className="flex items-center gap-3 font-serif font-semibold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight">
                <div className="bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 shadow-inner p-2.5 rounded-xl">
                  <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                Research Report
              </h2>
              {/* Final Metrics Display - Modern Cards */}
              {currentProgress && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white/70 dark:bg-gray-800/70 shadow-md p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-xs">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-md" title="Sources Consulted">
                    <GlobeIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-serif font-semibold text-gray-700 dark:text-gray-300">{currentProgress.sourcesCount.toLocaleString()}</span> 
                    <span className="text-gray-500 dark:text-gray-500">sources</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-md" title="Unique Domains">
                    <DatabaseIcon className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-serif font-semibold text-gray-700 dark:text-gray-300">{currentProgress.domainsCount}</span>
                    <span className="text-gray-500 dark:text-gray-500">domains</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-md" title="Data Analyzed">
                    <FileTextIcon className="w-3.5 h-3.5 text-purple-500" />
                    <span className="font-serif font-semibold text-gray-700 dark:text-gray-300">{currentProgress.dataSize}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-md" title="Execution Time">
                    <RefreshCwIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-serif font-semibold text-gray-700 dark:text-gray-300">{(currentProgress.elapsedTime / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Markdown Report Content - Updated Prose Styles */}
            <div className="prose prose-base lg:prose-lg dark:prose-invert // Base prose styles
                          max-w-none // Allow content to fill container
                          prose-p:font-serif prose-li:font-serif // Serif for paragraphs & lists
                          prose-headings:font-serif prose-headings:tracking-tight // Serif for headings
                          prose-a:text-blue-600 dark:prose-a:text-blue-400 // Default link color (overridden by renderer)
                          prose-strong:font-semibold prose-strong:text-gray-800 dark:prose-strong:text-gray-200 // Strong styling
                          prose-blockquote:font-serif // Serif for blockquotes
                          prose-code:font-mono // Mono for code (overridden by renderer)
                          prose-img:rounded-md prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700 prose-img:shadow-sm // Image styling
                          prose-hr:border-gray-200 dark:prose-hr:border-gray-700 // HR styling
                          prose-table:text-sm // Base table font size
                          prose-thead:border-b prose-thead:border-gray-300 dark:prose-thead:border-gray-600 // Table head border
                          prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:text-left // Table header styling
                          prose-td:px-4 prose-td:py-2 // Table cell padding
                          prose-tr:border-b prose-tr:border-gray-200 dark:prose-tr:border-gray-700/60 // Table row border
                          dark:prose-td:text-gray-300 dark:prose-th:text-gray-200 // Dark mode table text
                          ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={renderers} // Use the updated renderers
              >
                {report}
              </ReactMarkdown>
            </div>

            {/* Report Footer */}
            <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mt-10 pt-6 border-gray-200 dark:border-gray-700/80 border-t">
              <button
                onClick={() => {
                  if (report) {
                    navigator.clipboard.writeText(report)
                      .then(() => alert('Report copied to clipboard!'))
                      .catch(err => console.error('Failed to copy report:', err));
                  }
                }}
                className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/70 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-serif font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors"
              >
                <CopyIcon className="w-4 h-4" />
                Copy Full Report
              </button>
              <button
                onClick={() => { setQuery(''); setReport(null); setError(null); }}
                className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-serif font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors"
              >
                <SearchIcon className="w-4 h-4" />
                New Research
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}