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
    // --- Horizontal Rule Renderer ---
    hr: () => (
      // Using a slightly thinner, more subtle divider
      <div className="my-8 border-t border-gray-200 dark:border-gray-700/50"></div>
    ),
    // --- Code Block Renderer ---
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const language = match ? match[1] : 'text'; // Default to 'text' if no language detected

      // Determine if it should be rendered as a block or inline
       const isBlock = !inline || codeString.includes('\n') || (language === 'text' && codeString.length > 60);


      // --- BLOCK CODE ---
       // Style adjustments for better visual hierarchy and theme consistency
      if (isBlock && language !== 'text') { // Only apply syntax highlighting if language is detected
        const style = theme === 'dark' ? oneDark : oneLight; // Use better themes

        return (
           // Added elevation and refined border
          <div className="group code-block relative shadow-md dark:shadow-gray-900/50 dark:shadow-lg mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header Bar Styling Adjustment */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/60 px-4 py-2 border-gray-200 dark:border-gray-700 border-b">
                <div className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400 text-xs">
                    <TerminalIcon className="w-4 h-4" />
                    <span>{language.toUpperCase()}</span>
                </div>
              <button
                onClick={() => handleCopyCode(codeString)}
                 // Slightly softer button style
                 className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600/80 px-2.5 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-700 dark:text-gray-300 text-xs transition-colors duration-150"
                aria-label="Copy code"
              >
                {copiedCode === codeString ? (
                   <> <CheckIcon className="w-3.5 h-3.5 text-green-500 dark:text-green-400" /> Copied </>
                ) : (
                   <> <CopyIcon className="w-3.5 h-3.5" /> Copy </>
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={style}
              language={language}
              PreTag="div"
               // Removed specific bg-white/dark:bg-gray-900 to inherit from style, adjusted padding
               className="!px-4 !py-4 overflow-x-auto !text-sm !leading-relaxed scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800/50"
              showLineNumbers={codeString.split('\n').length > 3} // Show line numbers for more than 3 lines
              wrapLongLines={false} // Disable wrapping for code blocks
               // Adjusted line number style for subtlety
              lineNumberStyle={{ color: theme === 'dark' ? '#555e6e' : '#a0aec0', fontSize: '0.8em', paddingRight: '1.2em', userSelect: 'none' }}
              customStyle={{
                margin: 0,
                borderRadius: '0', // No border radius needed since parent has it
                fontSize: '0.875rem', // text-sm
                lineHeight: '1.6',
                 // Ensure background from theme is applied
                 backgroundColor: theme === 'dark' ? style['pre[class*="language-"]'].backgroundColor : style['pre[class*="language-"]'].backgroundColor,
              }}
              codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }} // Ensure monospace font
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      // --- INLINE CODE ---
       // Enhanced inline code styling
      return (
         isBlock ? (
              // Basic block format for text/long inline code - improved styling
             <pre className="block bg-gray-100 dark:bg-gray-800/70 shadow-sm mb-4 p-3.5 border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto font-mono text-gray-800 dark:text-gray-200 text-sm break-words whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                 <code>{children}</code>
             </pre>
         ) : (
            // Inline code styling - modern with subtle blue tones
            <code className="bg-blue-100/50 dark:bg-blue-900/30 mx-[0.1em] px-[0.5em] py-[0.2em] border border-blue-200/80 dark:border-blue-800/50 rounded-md font-mono text-[0.875em] text-blue-800 dark:text-blue-300 break-words" {...props}>
              {children}
            </code>
         )
      );
    },

    // --- Table Renderer V5 - Ultra Modern Data Table Styling ---
    table: ({ node, ...props }: any) => {
      // Check if this is likely a financial table by looking at the headers
      const isFinancialTable = node.children?.[0]?.children?.[0]?.children?.some((cell: any) => {
        const content = cell.children?.map((c: any) => c.value || '').join('') || '';
        return content.toLowerCase().includes('valuation') || 
               content.toLowerCase().includes('funding') ||
               content.toLowerCase().includes('revenue') ||
               content.toLowerCase().includes('investment');
      });

      return (
        // Enhanced container with elegant glass effect and stronger visual hierarchy
        <div className={`bg-white/90 dark:bg-gray-900/80 shadow-xl dark:shadow-blue-900/10 backdrop-blur-sm my-8 border ${
          isFinancialTable 
            ? 'border-green-200/80 dark:border-green-800/60' 
            : 'border-gray-200/80 dark:border-gray-700/60'
        } rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <table className="w-full text-sm border-separate border-spacing-0" {...props} />
          </div>
        </div>
      );
    },
    tableHead: ({ node, ...props }: any) => {
      // Check if this is likely a financial table by looking at the headers
      const isFinancialTable = node.children?.[0]?.children?.some((cell: any) => {
        const content = cell.children?.map((c: any) => c.value || '').join('') || '';
        return content.toLowerCase().includes('valuation') || 
               content.toLowerCase().includes('funding') ||
               content.toLowerCase().includes('revenue') ||
               content.toLowerCase().includes('investment');
      });

      return (
        // Modern gradient header with strong hierarchy and blur effect
        <thead className={`top-0 z-10 sticky backdrop-blur-sm ${
          isFinancialTable 
            ? 'bg-gradient-to-r from-green-50 via-green-50/90 to-green-50/80 dark:from-gray-800 dark:via-green-900/20 dark:to-gray-800/95 border-b-2 border-green-200 dark:border-green-800/60' 
            : 'bg-gradient-to-r from-blue-50 via-blue-50/90 to-indigo-50/80 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800/95 border-b-2 border-blue-200 dark:border-blue-800/60'
        } shadow-sm`} {...props} />
      );
    },
    tr: ({ node, isHeader, ...props }: any) => (
      <tr
        className={`
          border-b border-gray-200/70 dark:border-gray-700/50
          ${!isHeader ?
            "odd:bg-white/70 dark:odd:bg-gray-800/40 even:bg-blue-50/40 dark:even:bg-blue-900/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors duration-200"
            : ""}
        `}
        {...props}
      />
    ),
    td: ({ node, isHeader, style, ...props }: any) => {
      const align = style?.textAlign as 'left' | 'right' | 'center' | undefined;
      let alignClass = 'text-left';
      if (align === 'right') alignClass = 'text-right';
      if (align === 'center') alignClass = 'text-center';

      // Get cell content as string
      const content = node.children?.map((c: any) => c.value || '').join('') || '';
      const trimmedContent = content.trim();
      
      // Enhanced pattern matching for financial and numeric data
      const isCurrency = /^\s*[\$€£¥₹₽₩][\d,.]+[KMBTkmbt]?\s*$/.test(trimmedContent) || 
                        /^\s*[\d,.]+[KMBTkmbt]?\s*[\$€£¥₹₽₩]\s*$/.test(trimmedContent);
      const isPercentage = /^\s*[\d,.]+\s*%\s*$/.test(trimmedContent);
      const isNumeric = /^\s*[\d,.]+[KMBTkmbt]?\s*$/.test(trimmedContent);
      const hasRange = trimmedContent.includes('-') && 
                      /^\s*[\d,.]+\s*-\s*[\d,.]+\s*$/.test(trimmedContent.replace(/[KMBTkmbt%\$€£¥₹₽₩]/g, ''));
      
      // Check for valuation table headers and financial metrics
      const isValuationHeader = isHeader && (
        content.toLowerCase().includes('valuation') || 
        content.toLowerCase().includes('funding') || 
        content.toLowerCase().includes('revenue') ||
        content.toLowerCase().includes('investment') || 
        content.toLowerCase().includes('round') ||
        content.toLowerCase().includes('amount')
      );
      
      // Check if this is a financial metric row
      const isFinancialMetric = !isHeader && (
        content.toLowerCase().includes('revenue') || 
        content.toLowerCase().includes('profit') || 
        content.toLowerCase().includes('valuation') ||
        content.toLowerCase().includes('funding') ||
        content.toLowerCase().includes('investment') ||
        content.toLowerCase().includes('cash flow') ||
        content.toLowerCase().includes('round')
      );
      
      // Check if this is likely a feature/comparison table
      const isFeatureTable = isHeader && (
        content.toLowerCase().includes('feature') || 
        content.toLowerCase().includes('property') || 
        content.toLowerCase().includes('capability')
      );
      
      // Check if this is a comparison value cell (pros/cons)
      const isPositiveValue = !isHeader && (
        content.toLowerCase().includes('yes') || 
        content.toLowerCase().includes('supported') || 
        content.toLowerCase().includes('available') ||
        content.toLowerCase().includes('better') ||
        content.toLowerCase().includes('faster')
      );
      
      const isNegativeValue = !isHeader && (
        content.toLowerCase().includes('no') || 
        content.toLowerCase().includes('not supported') || 
        content.toLowerCase().includes('unavailable') ||
        content.toLowerCase().includes('worse') ||
        content.toLowerCase().includes('slower')
      );

      // Format content for display - apply currency formatting intelligently
      let displayContent = content;
      // Only apply currency formatting in specific cases - tables with financial data
      if (!isHeader && (isCurrency || (isNumeric && isFinancialMetric))) {
        const tableElement = node.parent?.parent?.parent?.parent;
        const isFinancialTable = tableElement?.children?.[0]?.children?.[0]?.children?.some((cell: any) => {
          const cellContent = cell.children?.map((c: any) => c.value || '').join('') || '';
          return cellContent.toLowerCase().includes('valuation') || 
                 cellContent.toLowerCase().includes('funding') ||
                 cellContent.toLowerCase().includes('revenue') ||
                 cellContent.toLowerCase().includes('investment');
        });
        
        if (isFinancialTable) {
          // Apply currency formatting
          displayContent = formatCurrency(trimmedContent);
          // Mark as currency for proper styling
          if (!isCurrency) {
            // isCurrency = true;
          }
        }
      }
      
      const cellProps = {
        className: `
          px-6 py-4 ${alignClass}
          ${isHeader
            ? `font-serif font-semibold text-gray-700 dark:text-gray-100 uppercase text-xs tracking-wider ${isValuationHeader ? 'bg-green-50/50 dark:bg-green-900/30' : isFeatureTable ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`
            : isCurrency
              ? 'font-mono text-green-700 dark:text-green-300 font-medium tabular-nums'
              : isPercentage
                ? 'font-mono text-purple-700 dark:text-purple-300 font-medium tabular-nums'
                : isNumeric || hasRange
                  ? 'font-mono text-blue-700 dark:text-blue-300 font-medium tabular-nums'
                  : isFinancialMetric
                    ? 'font-serif text-gray-800 dark:text-gray-200 font-medium'
                    : isPositiveValue
                      ? 'text-green-700 dark:text-green-300 font-medium'
                      : isNegativeValue
                        ? 'text-red-600 dark:text-red-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
        }
      `,
        ...props,
      };

      return isHeader
        ? <th scope="col" {...cellProps} />
        : <td {...cellProps} />;
    },

    // --- Heading Renderers with Serif Font and Enhanced Visual Hierarchy ---
    h1: ({ node, children, ...props }: any) => (
      <h1 className="mt-10 mb-6 pb-4 border-gray-300 dark:border-gray-600/80 border-b font-serif font-bold text-gray-900 dark:text-gray-100 text-3xl md:text-4xl tracking-tight" {...props}>
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }: any) => {
      const text = String(children);
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
        // Added from synthesis prompt
        'Methodology': BrainIcon, 
        'Technical Detail': FileTextIcon, 
        'Future Direction': ArrowRightIcon, 
        'Comprehensive Analysis': SearchIcon, 
        'Key Findings & Detailed Breakdown': FileTextIcon, 
        'Comparison & Nuances': RefreshCwIcon, 
        'Technical Deep Dive & Code Examples': TerminalIcon, 
        'Conclusion from Research Data': CheckIcon
      };
       // Find best matching section using startsWith
      const matchingSection = Object.keys(sectionIconMap).find(section => text.trim().startsWith(section));

      if (matchingSection) {
        const SectionIcon = sectionIconMap[matchingSection];
        return (
          <h2 className="flex items-center mt-12 mb-6 pb-3 border-b border-blue-200 dark:border-blue-800/60 font-serif font-semibold text-blue-700 dark:text-blue-300 text-2xl md:text-3xl tracking-tight" {...props}>
            <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/40 to-blue-100 dark:to-blue-800/60 shadow-sm mr-3.5 p-2.5 rounded-lg">
              <SectionIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            {text}
          </h2>
        );
      }
      // Default H2 style improved
      return (
        <h2 className="mt-10 mb-5 pb-2 border-gray-200 dark:border-gray-700 border-b font-serif font-semibold text-gray-800 dark:text-gray-200 text-2xl md:text-3xl tracking-tight" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }: any) => (
      <h3 className="mt-8 mb-4 font-serif font-semibold text-gray-800 dark:text-gray-200 text-xl md:text-2xl" {...props}>
        {children}
      </h3>
    ),
    h4: ({ node, children, ...props }: any) => (
      <h4 className="mt-6 mb-3 font-serif font-semibold text-gray-700 dark:text-gray-300 text-lg md:text-xl" {...props}>
        {children}
      </h4>
    ),
    h5: ({ node, children, ...props }: any) => (
      <h5 className="mt-4 mb-2 font-serif font-semibold text-gray-700 dark:text-gray-300 text-base md:text-lg" {...props}>
        {children}
      </h5>
    ),
    h6: ({ node, children, ...props }: any) => (
      <h6 className="mt-4 mb-2 font-serif font-semibold text-gray-600 dark:text-gray-400 text-sm md:text-base" {...props}>
        {children}
      </h6>
    ),

    // --- Link Renderer V5 (Complete Overhaul) ---
    a: ({ node, href, children, ...props }: any) => {
      const url = href || '';
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      const textContent = Array.isArray(children) ? children.join('') : String(children);

      // Check if this link is inside a source list item (identified by the specific text pattern)
      const parentLi = node?.parent;
      let isSourceListItemLink = false;
      if (parentLi && parentLi.tagName === 'li') {
        let parentTextContent = '';
        parentLi.children?.forEach((child: any) => {
           if (child.type === 'text') parentTextContent += child.value;
           else if (child.tagName === 'strong' || child.tagName === 'a') {
               child.children?.forEach((grandChild: any) => {
                   if (grandChild.type === 'text') parentTextContent += grandChild.value;
               });
           } else if (child.children && child.children.length > 0 && typeof child.children[0]?.value === 'string') {
               parentTextContent += child.children[0].value;
           }
        });
        parentTextContent = parentTextContent.trim();
        if (parentTextContent.includes('(Domain:') && parentTextContent.includes('| Relevance:')) {
          isSourceListItemLink = true;
        }
      }

      // If it's a link within our custom source list item, render it simply.
      // The `li` renderer handles the overall structure and styling.
      if (isSourceListItemLink) {
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }

      // --- Existing logic for other links (images, code links, standard external/internal links) ---

      // Handle image links
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block shadow-lg hover:shadow-xl my-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300"
          >
            <img
              src={url}
              alt={textContent || 'Linked image'}
              className="block group-hover:opacity-90 max-w-full h-auto transition-opacity"
              loading="lazy"
            />
          </a>
        );
      }

      // Handle images wrapped in links
      if (node?.children?.[0]?.tagName === 'img') {
        const imgNode = node.children[0];
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block my-6"
          >
            <img
              src={imgNode.properties.src}
              alt={imgNode.properties.alt || 'Embedded image'}
              className="group-hover:opacity-90 shadow-lg hover:shadow-xl mx-auto border border-gray-200 dark:border-gray-700 rounded-xl max-w-full h-auto transition-all duration-300"
              loading="lazy"
            />
          </a>
        );
      }

      // --- Improved Link Styling for Modern UI ---
      let domain = '';
      let faviconUrl = '';

      if (isExternal) {
        try {
          domain = extractDomain(url);
          // Only set favicon if we have a valid domain
          if (domain && domain.length > 0) {
            faviconUrl = getFaviconUrl(domain);
          }
        } catch (e) {
          console.warn("Could not parse domain for favicon:", url);
        }
      }

      // Determine if the link text itself is a URL (common in markdown)
      const isLinkTextUrl = textContent === url;

      // Check if this is a code-like link (e.g., nextjs.org/docs)
      const isCodeLink = textContent.match(/^`[^`]+`$/);
      const codeContent = isCodeLink ? textContent.replace(/^`|`$/g, '') : '';

      // Special styling for code-like links
      if (isCodeLink) {
        return (
          <a
            href={url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="group inline-flex items-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 shadow-sm hover:shadow-md active:shadow px-3 py-2 border border-blue-200 dark:border-blue-700/50 hover:border-blue-300 dark:hover:border-blue-600 rounded-md font-serif text-blue-700 hover:text-blue-800 dark:hover:text-blue-200 dark:text-blue-300 text-sm transition-all duration-200 cursor-pointer"
            {...props}
          >
            {isExternal && faviconUrl && domain && (
              <img
                src={faviconUrl}
                alt={`${domain} favicon`}
                className="inline-block mr-2 rounded-sm w-4 h-4"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span>{codeContent}</span>
            {isExternal && (
              <ExternalLinkIcon className="inline-block opacity-70 group-hover:opacity-100 ml-1.5 w-3.5 h-3.5 transition-opacity shrink-0" />
            )}
          </a>
        );
      }

      // Modern link styling for regular links
      return (
        <a
          href={url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="group relative inline-flex items-center gap-1.5 hover:bg-blue-50/80 active:bg-blue-100/80 dark:hover:bg-blue-900/40 dark:active:bg-blue-800/50 -mx-1.5 -my-1 px-1.5 py-1 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 rounded-md font-medium text-blue-600 hover:text-blue-700 active:text-blue-800 dark:hover:text-blue-300 dark:active:text-blue-200 dark:text-blue-400 decoration-2 decoration-blue-500/30 hover:decoration-blue-500/70 underline underline-offset-4 break-words transition-all duration-150 cursor-pointer"
          {...props}
        >
          {isExternal && faviconUrl && domain && domain.length > 0 && (
            <img
              src={faviconUrl}
              alt={`${domain} favicon`}
              className="inline-block shadow-sm mr-0.5 rounded-sm w-4 h-4 align-text-bottom flex-shrink-0"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className={isLinkTextUrl ? 'truncate max-w-[20ch] sm:max-w-[30ch] md:max-w-[40ch]' : ''}>
            {isLinkTextUrl ? url.replace(/^(https?:)?\/\//, '').replace(/\/$/, '') : children}
          </span>
          {isExternal && (
            <ExternalLinkIcon className="inline-block opacity-60 group-hover:opacity-100 ml-0.5 w-3.5 h-3.5 align-text-bottom transition-opacity shrink-0" />
          )}
        </a>
      );
    },

    // --- List Item Renderer V5 (Enhanced Modern) ---
    li: ({ node, children, ordered, ...props }: any) => {
       // Get text content cleanly, handling nested strong/a tags
       let textContent = '';
       let linkNode: any = null; // Initialize linkNode

       node.children?.forEach((child: any) => {
           if (child.type === 'text') {
             textContent += child.value;
           } else if (child.tagName === 'strong') {
             child.children?.forEach((grandChild: any) => {
                 if (grandChild.type === 'text') textContent += grandChild.value;
             });
           } else if (child.tagName === 'a') {
              linkNode = child; // Store the link node
              child.children?.forEach((grandChild: any) => {
                  if (grandChild.type === 'text') textContent += grandChild.value;
              });
           } else if (child.children && child.children.length > 0 && typeof child.children[0]?.value === 'string') {
              textContent += child.children[0].value;
           }
       });
       textContent = textContent.trim();

       // Match source pattern more robustly - allow for more variations in formatting from route.ts
       const sourcePattern = /^\s*\[?(.*?)\]?\(.*?\)\s*\(Domain:\s*\*{0,2}(.*?)\*{0,2}(?:\s*🔒)?\)\s*(?:\|\s*Relevance:\s*\*{0,2}(.*?)\*{0,2})?(?:.*?)$/;
       const sourceMatch = textContent.match(sourcePattern);
       // Find the link node again if needed (if the first child isn't the link)
       if (!linkNode) {
         linkNode = node.children?.find((child: any) => child.tagName === 'a');
       }
       const url = linkNode?.properties?.href || '#';
       const title = sourceMatch?.[1] || linkNode?.children?.find((c:any) => c.type === 'text')?.value || textContent.split('(')[0].trim() || ''; // Extract title more robustly

       if (sourceMatch && !ordered && url !== '#') {
          const domain = sourceMatch[2];
          const relevance = sourceMatch[3] || 'N/A'; // Handle optional relevance
          const faviconUrl = getFaviconUrl(domain);
          const isSecure = url.startsWith('https://'); // Check if URL is secure

          return (
             <li className="group m-0 mb-3 p-0 list-none" {...props}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                // Apply the full styling here for the source item link
                className="flex items-center gap-3 bg-white hover:bg-blue-50 dark:bg-gray-800/60 dark:hover:bg-blue-900/40 shadow-sm hover:shadow-md p-3.5 border border-gray-200 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg w-full transition-all duration-200"
              >
                {domain && (
                  <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 dark:bg-gray-700 p-1 border border-gray-200 dark:border-gray-600 rounded-md w-9 h-9 overflow-hidden shadow-sm">
                    {faviconUrl ? (
                      <img
                        src={faviconUrl}
                        alt={domain}
                        className="w-5 h-5 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="font-bold text-blue-500 text-md dark:text-blue-400">${domain.charAt(0).toUpperCase()}</span>`;
                          }
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-bold text-blue-500 text-md dark:text-blue-400">{domain.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                )}
                <div className="flex-grow min-w-0">
                   <div className="font-serif font-medium text-gray-800 dark:group-hover:text-blue-300 dark:text-gray-100 group-hover:text-blue-700 text-sm line-clamp-2 leading-snug transition-colors">
                     {title} {/* Use the extracted title */}
                   </div>
                   <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400 text-xs truncate">
                     <GlobeIcon className="flex-shrink-0 w-3 h-3" />
                     <span className="truncate">{domain}{isSecure ? ' 🔒' : ''}</span>
                   </div>
                 </div>
                 <div className="flex flex-shrink-0 items-center gap-2 ml-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 shadow-inner px-2.5 py-1 rounded-full font-semibold text-blue-700 dark:text-blue-300 text-xs whitespace-nowrap">
                      {relevance}
                    </div>
                    <ExternalLinkIcon className="w-4 h-4 text-gray-400 dark:group-hover:text-blue-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                  </div>
              </a>
            </li>
          );
       }

       // Check for path item
       const startsWithPathKeyword = pathKeywords.some(keyword =>
           textContent?.trim().startsWith(keyword) ||
           (node.children?.[0]?.type === 'text' && node.children[0].value?.trim().startsWith(keyword))
       );
       if (startsWithPathKeyword && !ordered) {
           // Extract step number and query text more robustly
           const stepMatch = textContent?.match(/^- Step (\d+):\s*"(.*)"$/) || textContent?.match(/^(.*?):\s*"(.*)"$/);
           const prefix = stepMatch ? (stepMatch[0].includes("Step") ? `Step ${stepMatch[1]}` : stepMatch[1]) : textContent?.split('"')[0] || '';
           const queryText = stepMatch ? stepMatch[2] : textContent?.match(/"([^"]+)"/)?.[1] || textContent;

           let PathIcon = ArrowRightIcon;
           if (prefix.includes('Initial') || prefix.includes('Step 1')) PathIcon = SearchIcon;
           else if (prefix.includes('area') || prefix.includes('Step')) PathIcon = BrainIcon;

        return (
           <li className="group m-0 mb-2 p-0 list-none" {...props}>
               <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 py-2 pr-3 pl-3 border-l-3 border-blue-400 hover:border-blue-500 dark:border-blue-700 dark:hover:border-blue-500 rounded-r-md transition-colors">
                   <div className="flex-shrink-0 mr-2.5 text-blue-500 dark:text-blue-400">
                       <PathIcon className="w-4 h-4" />
                   </div>
                   <div className="text-gray-600 dark:text-gray-300 text-sm">
                       {prefix && <span className="mr-1.5 font-medium font-serif text-gray-500 dark:text-gray-400">{prefix.replace(':', '').trim()}:</span>}
                       <span className="font-medium font-serif text-gray-800 dark:group-hover:text-white dark:text-gray-200 group-hover:text-black transition-colors">
                           {stepMatch ? `"${queryText}"` : queryText}
                       </span>
                   </div>
               </div>
           </li>
         );
      }

      // --- Default List Item Renderer ---
      return (
        <li className="group flex items-start mb-2.5" {...props}>
           <span className={`flex-shrink-0 mt-1 mr-3 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right' : 'text-blue-500 dark:text-blue-400'}`}>
            {ordered ? `${(props.index ?? 0) + 1}.` : (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
               <circle cx="4" cy="4" r="3" fill="currentColor" />
               <circle cx="4" cy="4" r="3.75" stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.5"/>
            </svg>
            )}
          </span>
           <span className="text-gray-700 dark:text-gray-300 leading-relaxed font-serif">{children}</span>
        </li>
      );
    },

    // --- List Wrappers ---
    ul: ({ node, children, className, ...props }: any) => {
       // Check if this list contains our custom source or path list items
       const containsCustomItems = node.children.some((child: any) => {
            if (child.tagName !== 'li') return false;
            const childText = child.children?.map((c:any) => c.value || '').join('');
            const isSourceItem = childText.includes('(Domain:') && childText.includes(', Relevance:');
            const isPathItem = pathKeywords.some((keyword: any) => childText.trim().startsWith(keyword));
            return isSourceItem || isPathItem;
       });

       // Apply specific class if it's a list of sources or paths
       if (containsCustomItems) {
           return <ul className="m-0 p-0 list-none space-y-2" {...props}>{children}</ul>;
       }
       // Default list styling
       return <ul className="space-y-2.5 mb-5 pl-6 text-gray-700 dark:text-gray-300 list-disc" {...props}>{children}</ul>;
    },
    ol: ({ node, children, className, ...props }: any) => (
       <ol className="space-y-2.5 mb-5 pl-6 text-gray-700 dark:text-gray-300 list-decimal" {...props}>{children}</ol>
    ),

    // --- Paragraph Renderer ---
    p: ({ node, children, ...props }: any) => {
       // Simple check for empty paragraphs
       if (React.Children.count(children) === 0 || (typeof children[0] === 'string' && children[0].trim() === '')) {
         return null; // Render nothing for empty paragraphs
       }

       // Check if paragraph contains only "---" (which should be rendered as hr)
       if (node.children.length === 1 &&
           node.children[0].type === 'text' &&
           node.children[0].value.trim() === '---') {
         // Render a custom horizontal rule instead
         return (
           <div className="flex justify-center items-center my-8">
             <div className="bg-gradient-to-r from-transparent via-blue-500/50 dark:via-blue-400/30 to-transparent shadow-sm rounded-full w-full max-w-4xl h-0.5"></div>
           </div>
         );
       }

       // Check if paragraph only contains an image
       const containsOnlyImage = node.children.length === 1 && (node.children[0].tagName === 'img' || (node.children[0].tagName === 'a' && node.children[0].children?.[0]?.tagName === 'img'));
       if (containsOnlyImage) {
         // Render children directly, the 'a' or 'img' renderer will handle it
         return <>{children}</>;
       }

       // Default paragraph rendering with font-serif and improved spacing
       return <p className="mb-5 text-gray-700 dark:text-gray-300 leading-relaxed font-serif" {...props}>{children}</p>;
    },

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
              className="block bg-white dark:bg-gray-900/80 shadow-md hover:shadow-lg focus:shadow-xl py-4 pr-36 pl-12 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500 font-serif"
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
              disabled={loading}
            />
            <button
              onClick={handleResearch}
              disabled={loading || !query.trim()}
              className="top-1/2 right-3 absolute flex justify-center items-center bg-gradient-to-br from-blue-600 hover:from-blue-700 disabled:from-gray-500 to-blue-700 hover:to-blue-800 disabled:to-gray-600 disabled:opacity-50 shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/30 px-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 h-[75%] font-serif font-semibold text-white text-base transition-all -translate-y-1/2 duration-200 disabled:cursor-not-allowed"
              aria-label="Start Research"
            >
              {loading ? (
                <Loader2Icon className="w-5 h-5 animate-spin" />
              ) : (
                 <>
                   <span className="hidden sm:inline">Research</span>
                   <SearchIcon className="sm:hidden w-5 h-5" /> {/* Icon for small screens */}
                 </>
              )}
            </button>
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

            {/* Markdown Report Content - Enhanced Styling */}
            <div className="prose-blockquote:border-l-blue-500 dark:prose-blockquote:border-l-blue-700 
                          prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-900/20 
                          prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-md 
                          prose-blockquote:not-italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 
                          prose-blockquote:font-normal prose-blockquote:shadow-sm

                          prose-code:bg-blue-100/50 dark:prose-code:bg-blue-900/30 prose-code:border 
                          prose-code:border-blue-200/80 dark:prose-code:border-blue-800/50 
                          prose-code:rounded-md prose-code:px-1 prose-code:py-0.5 prose-code:font-mono 
                          prose-code:text-blue-800 dark:prose-code:text-blue-300 prose-code:text-sm
                          prose-code:before:content-none prose-code:after:content-none

                          prose-img:shadow-lg prose-img:rounded-xl prose-img:border 
                          prose-img:border-gray-200 dark:prose-img:border-gray-700

                          prose-hr:border-none prose-hr:my-10 prose-hr:h-0 

                          prose-li:marker:text-blue-600 dark:prose-li:marker:text-blue-400

                          prose-a:text-blue-600 dark:prose-a:text-blue-400 
                          prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                          
                          prose-strong:text-blue-700 dark:prose-strong:text-blue-300 prose-strong:font-semibold

                          prose-headings:font-serif prose-headings:tracking-tight
                          
                          max-w-none prose prose-lg dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={renderers}
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