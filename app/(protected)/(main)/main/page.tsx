/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SearchIcon,
  Loader2Icon,
  BookOpenIcon,
  HistoryIcon,
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
  try {
    // Ensure URL has a protocol for parsing
    let urlToParse = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      urlToParse = 'https://' + url;
    }
    const domain = new URL(urlToParse).hostname;
    return domain.replace(/^www\./, ''); // Remove www.
  } catch (e) {
    // Fallback for invalid URLs: try to extract domain-like pattern
    const domainMatch = url.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]+)/);
    return domainMatch ? domainMatch[0] : url; // Return matched pattern or original string
  }
};

// Function to get favicon URL using Google's service
const getFaviconUrl = (domain: string) => {
  // Use a reliable proxy or service if direct Google access is blocked/unreliable
  // For simplicity, we keep Google's service here.
  // Consider adding error handling for the image itself in the component.
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

// Define the structure for research metrics more explicitly
interface ResearchMetrics {
  sourcesCount: number;
  domainsCount: number;
  dataSize: string; // e.g., "123.45KB"
  elapsedTime: number; // in milliseconds
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<string | null>(null); // Use null for initial state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResearchError | null>(null); // Use specific error type
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showLiveLogs, setShowLiveLogs] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ResearchMetrics | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(''); // For displaying current step/status
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme(); // Get current theme

  // Define pathKeywords here so it's accessible to both li and ul renderers
  const pathKeywords = ['Initial query:', 'Research area', 'Follow-up query', 'Step ', '- Step '];

  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
        localStorage.removeItem('searchHistory'); // Clear corrupted history
      }
    }
  }, []);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, []);

  const saveHistory = (newHistory: string[]) => {
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  // Function to poll for progress updates
  const pollResearchProgress = useCallback(async () => {
    try {
      // console.log('[Poll] Fetching progress...');
      const res = await fetch('/api/research/progress', { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        // console.log('[Poll] Received data:', data);

        // Update metrics only if data.metrics is present
        if (data.metrics) {
          // console.log('[Poll] Updating progress state:', data.metrics);
          setCurrentProgress(prev => ({
                sourcesCount: data.metrics.sourcesCount ?? prev?.sourcesCount ?? 0,
                domainsCount: data.metrics.domainsCount ?? prev?.domainsCount ?? 0,
                dataSize: data.metrics.dataSize ?? prev?.dataSize ?? '0KB',
                elapsedTime: data.metrics.elapsedTime ?? prev?.elapsedTime ?? 0,
           }));
        }

        // Update logs if present
         if (data.logs && Array.isArray(data.logs)) {
           const newLogsWithTimestamp = data.logs
             .map((logContent: string) => `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${logContent}`);

           setLiveLogs(prevLogs => {
               const existingLogEntries = new Set(prevLogs);
               const uniqueNewLogs = newLogsWithTimestamp.filter((log: string) => !existingLogEntries.has(log));
               if (uniqueNewLogs.length > 0) {
                   return [...prevLogs, ...uniqueNewLogs].slice(-100);
               }
               return prevLogs;
           });

           // Update current status based on the *latest* log received
            if (data.logs.length > 0) {
               const latestLogContent = data.logs[data.logs.length - 1];
               const simplifiedStatus = latestLogContent
                    .replace(/^Phase \d+(\.\d+)*:\s*/, '') // Remove Phase prefix
                    .replace(/\[\d+\/\d+\]\s*/, '') // Remove batch numbers
                    // More specific status messages
                    .replace(/Fetching SERP: (.*)/, 'Searching: $1...')
                    .replace(/Extracted (\d+) links from (.*)\./, 'Found $1 links on $2')
                    .replace(/L(\d) Batch (\d+)\/(\d+) \[\d+ URLs\].*Added (\d+) sources.*/, 'Crawling L$1 ($2/$3): +$4 sources')
                    .replace(/L(\d) Batch (\d+)\/(\d+) \[\d+ URLs\].*sources$/, 'Crawling L$1 ($2/$3)...') // Fallback if no sources added yet
                    .replace(/Prioritizing (\d+) sources\.\.\./, 'Prioritizing $1 sources...')
                    .replace(/Analyzing data from top (\d+) sources.*/, 'Analyzing $1 sources...')
                    .replace(/Generating final analysis report.*/, 'Generating report...')
                    .replace(/Research process finished.*/, 'Finalizing report...')
                    .replace(/Finalizing report and metrics.*/, 'Finalizing...')
                    .replace(/Crawl Phase Complete\. Final Sources: (\d+)\..*/, '$1 sources analyzed')
                    .replace(/:\s*".*?"$/, '');
               setCurrentStatus(prevStatus => {
                   const newStatus = simplifiedStatus.trim();
                   return newStatus && newStatus !== prevStatus ? newStatus : prevStatus;
               });
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
    setCurrentProgress(null); // Start progress as null
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
    // Wrap in try/catch in case initial poll fails instantly
    try {
       await pollResearchProgress();
    } catch (pollError) {
       console.error("Initial poll failed:", pollError)
    }
    progressPollRef.current = setInterval(pollResearchProgress, 2500); // Poll every 2.5 seconds

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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
      // console.log('[Research] Success. Final data:', data);
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

      const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
      saveHistory(newHistory);

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

  const clearHistory = () => {
    saveHistory([]);
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

  // Enhanced renderers for React Markdown
  const renderers = {
    // --- Horizontal Rule Renderer ---
    hr: () => (
      <div className="flex justify-center items-center my-10">
        <div className="bg-gradient-to-r from-transparent via-blue-500/50 dark:via-blue-400/30 to-transparent shadow-sm rounded-full w-full max-w-4xl h-0.5"></div>
      </div>
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
           // Added slight shadow, refined border colors
          <div className="group code-block relative shadow-md dark:shadow-gray-900/50 dark:shadow-lg mb-6 border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Header Bar Styling Adjustment */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/60 px-4 py-2 border-gray-200 dark:border-gray-700 border-b rounded-t-lg">
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
               className="!px-4 !py-4 rounded-b-lg overflow-x-auto !text-sm !leading-relaxed scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800/50"
              showLineNumbers={codeString.split('\n').length > 3} // Show line numbers for more than 3 lines
              wrapLongLines={false} // Disable wrapping for code blocks
               // Adjusted line number style for subtlety
              lineNumberStyle={{ color: theme === 'dark' ? '#555e6e' : '#a0aec0', fontSize: '0.8em', paddingRight: '1.2em', userSelect: 'none' }}
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.5rem 0.5rem', // Only bottom corners rounded
                // padding: '1rem', // Padding handled by className
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
            // Inline code styling - more distinct
            <code className="bg-blue-100/50 dark:bg-blue-900/30 mx-[0.1em] px-[0.5em] py-[0.2em] border border-blue-200/80 dark:border-blue-800/50 rounded-md font-mono text-[0.875em] text-blue-800 dark:text-blue-300 break-words" {...props}>
              {children}
            </code>
         )
      );
    },

    // --- Table Renderer --- V3 - Ultra Modern Styling ---
    table: ({ node, ...props }: any) => (
      // Enhanced container with glass effect and stronger shadow
      <div className="bg-white/50 dark:bg-gray-900/50 shadow-xl dark:shadow-2xl dark:shadow-blue-900/10 backdrop-blur-sm my-10 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {/* Added subtle border styling and spacing */}
          <table className="w-full text-sm border-separate border-spacing-0" {...props} />
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      // Gradient header background with stronger visual hierarchy
      <thead className="top-0 z-10 sticky bg-gradient-to-br from-blue-50 dark:from-gray-800 to-gray-50 dark:to-gray-900 backdrop-blur-sm border-b-2 border-blue-200 dark:border-blue-800/60" {...props} />
    ),
    tableRow: ({ node, isHeader, ...props }: any) => (
      // Enhanced hover effects and more distinct alternating rows
      <tr
        className={`
          border-b border-gray-200/60 dark:border-gray-700/50
          ${!isHeader ?
            "odd:bg-white dark:odd:bg-gray-800/30 even:bg-blue-50/30 dark:even:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-all duration-200"
            : ""}
        `}
        {...props}
      />
    ),
    tableCell: ({ node, isHeader, style, ...props }: any) => {
      const align = style?.textAlign as 'left' | 'right' | 'center' | undefined;
      let alignClass = 'text-left';
      if (align === 'right') alignClass = 'text-right';
      if (align === 'center') alignClass = 'text-center';

      // Determine if this is a numeric cell for special formatting
      const content = node.children?.map((c: any) => c.value || '').join('') || '';
      const isNumeric = !isHeader && /^[\d.,]+%?$/.test(content.trim());

      const cellProps = {
        // Enhanced padding and typography with special handling for numeric cells
        className: `
          px-6 py-4 ${alignClass}
          ${isHeader
            ? 'font-semibold text-gray-700 dark:text-gray-100 uppercase text-xs tracking-wider'
            : isNumeric
              ? 'text-blue-700 dark:text-blue-300 font-medium tabular-nums'
              : 'text-gray-700 dark:text-gray-300'
          }
        `,
        ...props,
      };

      return isHeader
        ? <th scope="col" {...cellProps} />
        : <td {...cellProps} />;
    },

    // --- Heading Renderers ---
    h1: ({ node, children, ...props }: any) => <h1 className="mt-10 mb-6 pb-4 border-gray-300 dark:border-gray-600/80 border-b font-sans font-bold text-gray-900 dark:text-gray-100 text-3xl md:text-4xl tracking-tight" {...props}>{children}</h1>,
    // H2 styling refined
    h2: ({ node, children, ...props }: any) => {
      const text = String(children);
      const sectionIconMap: Record<string, React.ElementType> = {
        'Research Path': ArrowRightIcon, 'Top Sources Sample': GlobeIcon, 'Source Analysis Overview': DatabaseIcon,
        'Comparative Assessment': RefreshCwIcon, 'Executive Summary': BookOpenIcon, 'Key Findings': CheckIcon,
        'Detailed Analysis': SearchIcon, 'Technical Details': FileTextIcon, 'Research Methodology': BrainIcon,
        'Code Examples': TerminalIcon, 'Visual References': ImageIcon, 'Key Insights': AlertCircleIcon,
        'Confidence Level Assessment': CheckIcon, 'Conclusions': CheckIcon, 'References': BookOpenIcon,
        'Limitations': AlertCircleIcon, 'Future Directions': ArrowRightIcon, 'Introduction': BookOpenIcon,
        // Added from synthesis prompt
        'Methodology': BrainIcon, 'Technical Detail': FileTextIcon, 'Future Direction': ArrowRightIcon, 'Comprehensive Analysis': SearchIcon, 'Key Findings & Detailed Breakdown': FileTextIcon, 'Comparison & Nuances': RefreshCwIcon, 'Technical Deep Dive & Code Examples': TerminalIcon, 'Conclusion from Research Data': CheckIcon
      };
       // Find best matching section using startsWith
      const matchingSection = Object.keys(sectionIconMap).find(section => text.trim().startsWith(section));

      if (matchingSection) {
        const SectionIcon = sectionIconMap[matchingSection];
        return (
           // Use theme-consistent border, refined icon background
          <h2 className="flex items-center mt-12 mb-6 pb-3 border-b border-blue-200 dark:border-blue-800/60 font-sans font-semibold text-blue-700 dark:text-blue-300 text-2xl md:text-3xl tracking-tight" {...props}>
             {/* Softer icon background */}
            <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/40 to-blue-100 dark:to-blue-800/60 shadow mr-3.5 p-2.5 rounded-lg">
              <SectionIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            {text}
          </h2>
        );
      }
      // Default H2 style improved
      return <h2 className="mt-10 mb-5 pb-2 border-gray-200 dark:border-gray-700 border-b font-sans font-semibold text-gray-800 dark:text-gray-200 text-2xl md:text-3xl tracking-tight" {...props}>{children}</h2>;
    },
    h3: ({ node, children, ...props }: any) => <h3 className="mt-8 mb-4 font-sans font-semibold text-gray-800 dark:text-gray-200 text-xl md:text-2xl" {...props}>{children}</h3>,
    h4: ({ node, children, ...props }: any) => <h4 className="mt-6 mb-3 font-sans font-semibold text-gray-700 dark:text-gray-300 text-lg md:text-xl" {...props}>{children}</h4>,
    // Add h5, h6 if needed

    // --- Link Renderer V3 (Enhanced Universal Application) ---
    a: ({ node, href, children, ...props }: any) => {
      const url = href || '';
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      const textContent = Array.isArray(children) ? children.join('') : String(children);

      // Skip rendering specific list item links here, handled by 'li' renderer
      if (node?.parent?.tagName === 'li') {
        const parentText = node.parent.children?.map((c: any) => c.value || '').join('');
        if (parentText.includes('(Domain:') && parentText.includes(', Relevance:')) {
          // Let the 'li' renderer handle the full component for source items
          return <>{children}</>; // Render children (the title text) as-is within the li's anchor
        }
      }

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

      // --- Enhanced Universal Link Styling (External/Internal) ---
      let domain = '';
      let faviconUrl = '';
      if (isExternal) {
        try {
          domain = extractDomain(url);
          faviconUrl = getFaviconUrl(domain);
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
            className="group inline-flex items-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 shadow-sm hover:shadow px-3 py-1.5 border border-blue-200 dark:border-blue-700/50 rounded-md font-mono text-blue-700 hover:text-blue-800 dark:hover:text-blue-200 dark:text-blue-300 text-sm transition-all duration-200"
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

      // Standard link styling (enhanced)
      return (
        <a
          href={url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="group inline-flex items-center gap-1.5 hover:bg-blue-50/50 dark:hover:bg-blue-900/30 -mx-1 -my-0.5 px-1 py-0.5 rounded-md font-medium text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-400 decoration-2 decoration-blue-500/30 hover:decoration-blue-500/70 underline underline-offset-4 break-words transition-all duration-200"
          {...props}
        >
          {isExternal && faviconUrl && domain && (
            <img
              src={faviconUrl}
              alt={`${domain} favicon`}
              className="inline-block shadow-sm mr-0.5 rounded-sm w-4 h-4 align-text-bottom"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span className={isLinkTextUrl ? 'truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]' : ''}>
            {isLinkTextUrl ? url.replace(/^(https?:|)\/\//, '').replace(/\/$/, '') : children}
          </span>
          {isExternal && (
            <ExternalLinkIcon className="inline-block opacity-60 group-hover:opacity-100 ml-0.5 w-3.5 h-3.5 align-text-bottom transition-opacity shrink-0" />
          )}
        </a>
      );
    },

    // --- List Item Renderer ---
    li: ({ node, children, ordered, ...props }: any) => {
       // Get text content cleanly, handling nested strong/a tags
       let textContent = '';
       node.children?.forEach((child: any) => {
           if (child.type === 'text') textContent += child.value;
           else if (child.tagName === 'strong' || child.tagName === 'a') { // Look inside strong/a tags
               child.children?.forEach((grandChild: any) => {
                   if (grandChild.type === 'text') textContent += grandChild.value;
               });
           } else if (child.children && child.children.length > 0 && typeof child.children[0]?.value === 'string') { // Handle simple nested text
               textContent += child.children[0].value;
           }
       });
       textContent = textContent.trim();

       // Try matching source pattern first
       const sourceMatch = textContent.match(/^(.*?)\s*\(Domain: (.*?), Relevance: (.*?)\)\s*$/);
       const linkNode = node.children?.find((child: any) => child.tagName === 'a');
       const url = linkNode?.properties?.href || '#';
       const title = linkNode?.children?.find((c:any) => c.type === 'text')?.value || sourceMatch?.[1] || '';

       if (sourceMatch && !ordered && url !== '#') {
          const domain = sourceMatch[2];
          const relevance = sourceMatch[3];
          const faviconUrl = getFaviconUrl(domain);

          return (
             <li className="group m-0 mb-3 p-0 list-none" {...props}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                 // Keep this enhanced styling for source links
                 className="flex items-center gap-3 bg-white hover:bg-blue-50 dark:bg-gray-800/60 dark:hover:bg-blue-900/40 shadow-sm hover:shadow-md p-3.5 border border-gray-200 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg w-full transition-all duration-200"
              >
                {faviconUrl && (
                  <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 dark:bg-gray-700 p-1 border border-gray-200 dark:border-gray-600 rounded-md w-9 h-9 overflow-hidden">
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
                  </div>
                )}
                <div className="flex-grow min-w-0">
                   <div className="font-medium text-gray-800 dark:group-hover:text-blue-300 dark:text-gray-100 group-hover:text-blue-700 text-sm line-clamp-2 leading-snug transition-colors">
                     {title}
                   </div>
                   <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400 text-xs truncate">
                     <GlobeIcon className="flex-shrink-0 w-3 h-3" />
                     <span className="truncate">{domain}</span>
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
           <li className="group m-0 mb-1.5 p-0 list-none" {...props}>
               <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 py-1.5 pr-2 pl-3 border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500 border-l-2 rounded-r-md transition-colors">
                   <div className="flex-shrink-0 mr-2 text-gray-500 dark:text-gray-400">
                       <PathIcon className="w-4 h-4" />
                   </div>
                   <div className="text-gray-600 dark:text-gray-300 text-sm">
                       {prefix && <span className="mr-1.5 font-medium text-gray-500 dark:text-gray-400">{prefix.replace(':', '').trim()}:</span>}
                       <span className="font-medium text-gray-800 dark:group-hover:text-white dark:text-gray-200 group-hover:text-black transition-colors">
                           {stepMatch ? `"${queryText}"` : queryText}
                       </span>
                   </div>
               </div>
           </li>
         );
      }

      // --- Default List Item Renderer ---
      return (
        <li className="group flex items-start mb-2.5 ml-1" {...props}>
           <span className={`flex-shrink-0 mt-1 mr-3 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right' : 'text-blue-500 dark:text-blue-400'}`}>
            {ordered ? `${(props.index ?? 0) + 1}.` : (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
               <circle cx="4" cy="4" r="3" fill="currentColor" />
               <circle cx="4" cy="4" r="3.75" stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.5"/>
            </svg>
            )}
          </span>
           {/* Render children; the 'a' renderer handles link styling */}
           <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</span>
        </li>
      );
    },

    // ... other renderers (p, img, ul, ol, hr, blockquote) ...
    // Ensure 'ul' and 'ol' provide adequate spacing for nested items including links
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
             return <ul className="m-0 p-0 list-none" {...props}>{children}</ul>;
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
            <div className="flex justify-center items-center my-10">
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

        // Default paragraph rendering with slightly more space
        return <p className="mb-5 text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>{children}</p>;
     },

  };

  // --- Component Return ---
  return (
    <div className="bg-gray-50 dark:bg-gradient-to-br dark:from-gray-950 dark:to-black min-h-screen font-sans text-gray-800 dark:text-gray-200">
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        {/* Title and Description */}
        <div className="space-y-8 mx-auto mb-12 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
             className="space-y-4 text-center"
          >
            <h1 className="flex justify-center items-center font-bold text-gray-900 dark:text-gray-100 text-4xl md:text-5xl lg:text-6xl tracking-tight">
               {/* Using simple text instead of Aurora for better performance/simplicity */}
               Deep Research Engine
            </h1>
             <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-400 text-lg">
              Enter a query to initiate AI-powered deep research, synthesizing information from thousands of sources.
            </p>
          </motion.div>

          {/* Search Input and History */}
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
                // Updated styling for modern look
                className="block bg-white dark:bg-gray-900/80 shadow-md hover:shadow-lg focus:shadow-xl py-4 pr-36 pl-12 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                 // Updated button styling
                className="top-1/2 right-3 absolute flex justify-center items-center bg-gradient-to-br from-blue-600 hover:from-blue-700 disabled:from-gray-500 to-blue-700 hover:to-blue-800 disabled:to-gray-600 disabled:opacity-50 shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/30 px-5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 h-[75%] font-semibold text-white text-base transition-all -translate-y-1/2 duration-200 disabled:cursor-not-allowed"
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

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 bg-white dark:bg-gray-900/50 shadow-sm p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                 <div className="flex items-center gap-2 overflow-x-auto text-gray-600 dark:text-gray-400 text-sm">
                    <HistoryIcon className="flex-shrink-0 w-4 h-4" />
                    <span className="mr-1 font-medium text-xs uppercase tracking-wider">Recent:</span>
                    {searchHistory.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => { if (!loading) setQuery(q); }}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-blue-900/50 disabled:opacity-60 shadow-sm hover:shadow px-3 py-1 rounded-full text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap transition-colors"
                        title={q}
                      >
                      {q.length > 35 ? q.substring(0, 32) + '...' : q}
                    </button>
                    ))}
                </div>
                <button
                  onClick={clearHistory}
                  disabled={loading}
                  className="disabled:opacity-60 pr-1 font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-500 dark:text-gray-400 text-xs transition-colors"
                  aria-label="Clear search history"
                >
                  Clear
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Loading State V3 - Remove Placeholders */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 bg-white dark:bg-gray-900/80 shadow-xl backdrop-blur-lg p-6 border border-gray-200 dark:border-gray-700/80 rounded-xl"
              >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-gray-200 dark:border-gray-700/80 border-b">
                  <div className="flex items-center gap-3">
                      <Loader2Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xl">
                    Researching...
                    </h3>
                  </div>
                 {/* Display elapsed time: show 0.0s initially, then update */}
                <div className="bg-gray-100 dark:bg-gray-800 shadow-inner px-3 py-1 rounded-full font-medium tabular-nums text-gray-500 dark:text-gray-400 text-sm">
                   {/* Show live value or 0.0s as initial state */}
                   {`${((currentProgress?.elapsedTime ?? 0) / 1000).toFixed(1)}s`}
                </div>
                </div>

              {/* Current Status */}
              <div className="bg-gradient-to-r from-blue-50 dark:from-gray-800 to-indigo-50 dark:to-indigo-900/30 shadow-sm p-4 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                <div className="flex items-center gap-2.5 font-medium text-gray-800 dark:text-gray-200 text-sm">
                  <BrainIcon className="flex-shrink-0 w-4 h-4 text-blue-500 dark:text-blue-400" />
                  {/* Show current status, default to 'Initializing...' */}
                  <span className="truncate">{currentStatus || 'Initializing research...'}</span>
                </div>
              </div>

              {/* Metrics Grid V3 - Show 0 or live values, no '...' */}
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
                  {/* Sources */}
                  <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 dark:from-gray-800/70 to-blue-100 dark:to-blue-900/40 shadow-md p-4 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                      <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                          <GlobeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                          <div className="mb-0.5 font-medium text-blue-800 dark:text-blue-300 text-xs uppercase tracking-wider">Sources Found</div>
                          {/* Show live value or 0 */}
                          <div className="font-bold tabular-nums text-gray-900 dark:text-gray-100 text-xl">
                              {(currentProgress?.sourcesCount ?? 0).toLocaleString()}
                          </div>
                      </div>
                  </div>
                  {/* Domains */}
                   <div className="flex items-center gap-3 bg-gradient-to-br from-green-50 dark:from-gray-800/70 to-green-100 dark:to-green-900/40 shadow-md p-4 border border-green-200 dark:border-green-700/50 rounded-lg">
                       <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                           <DatabaseIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                       </div>
                       <div>
                           <div className="mb-0.5 font-medium text-green-800 dark:text-green-300 text-xs uppercase tracking-wider">Unique Domains</div>
                           {/* Show live value or 0 */}
                           <div className="font-bold tabular-nums text-gray-900 dark:text-gray-100 text-xl">
                               {(currentProgress?.domainsCount ?? 0).toLocaleString()}
                           </div>
                       </div>
                   </div>
                  {/* Data Size */}
                   <div className="flex items-center gap-3 bg-gradient-to-br from-purple-50 dark:from-gray-800/70 to-purple-100 dark:to-purple-900/40 shadow-md p-4 border border-purple-200 dark:border-purple-700/50 rounded-lg">
                       <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                           <FileTextIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                       </div>
                       <div>
                           <div className="mb-0.5 font-medium text-purple-800 dark:text-purple-300 text-xs uppercase tracking-wider">Data Size</div>
                           {/* Show live value or 0KB */}
                           <div className="font-bold tabular-nums text-gray-900 dark:text-gray-100 text-xl">
                               {currentProgress?.dataSize ?? '0KB'}
                           </div>
                       </div>
                   </div>
              </div>

              {/* Live Logs V3 - Show initial log immediately */}
                  <div className="space-y-2">
                     <div className="flex justify-end items-center">
                      <button
                        onClick={() => setShowLiveLogs(!showLiveLogs)}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-sm px-3 py-1 rounded-full font-medium text-gray-600 dark:text-gray-300 text-xs transition-colors"
                      >
                         <FileTextIcon className="w-3.5 h-3.5" />
                         {showLiveLogs ? 'Hide Logs' : 'Show Logs'}
                      </button>
                     </div>

                     <AnimatePresence>
                      {showLiveLogs && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto', maxHeight: '300px' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                           <div className="bg-gradient-to-br from-gray-50 dark:from-black/70 to-gray-100 dark:to-gray-900/80 shadow-inner p-4 border border-gray-200 dark:border-gray-700/80 rounded-lg max-h-[300px] overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800/50">
                             {/* Render logs directly; if empty, it will just be empty */}
                             {/* liveLogs is guaranteed to have at least the initial log */}
                            {liveLogs.map((log, index) => (
                              <div key={index} className="mb-1.5 last:mb-0 tabular-nums text-gray-600 dark:text-gray-400/90 break-words leading-relaxed whitespace-pre-wrap">
                                {log}
                              </div>
                            ))}
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
                 <p className="mb-1 font-semibold text-red-800 dark:text-red-200 text-lg">Research Failed ({error.code || 'Error'})</p>
                <p className="text-red-700 dark:text-red-300 text-sm">{error.message || 'An unknown error occurred.'}</p>
                  {/* Optionally show partial report if available in error */}
                  {report && (
                     <details className="mt-3 pt-2 border-t border-red-200 dark:border-red-500/30 text-xs">
                         <summary className="font-medium text-red-600 dark:text-red-400 cursor-pointer">Show partial report/details</summary>
                         <div className="bg-red-100/50 dark:bg-red-900/40 mt-2 p-3 rounded max-h-48 overflow-y-auto font-mono text-red-700 dark:text-red-300">
                             {report}
                         </div>
                     </details>
                  )}
                  <button
                    onClick={() => { setError(null); setReport(null); }} // Clear error and report
                    className="bg-red-100 hover:bg-red-200 dark:bg-red-800/60 dark:hover:bg-red-700/70 mt-4 px-4 py-1.5 rounded-md font-medium text-red-700 dark:text-red-200 text-sm transition-colors"
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
                  <h2 className="flex items-center gap-3 font-sans font-semibold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight">
                    <div className="bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 shadow-inner p-2.5 rounded-xl">
                      <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Research Report
                  </h2>
                  {/* Final Metrics Display */}
                  {currentProgress && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-gray-50 dark:bg-gray-800/70 shadow-sm p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-xs">
                          <div className="flex items-center gap-1" title="Sources Consulted">
                              <GlobeIcon className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{currentProgress.sourcesCount.toLocaleString()}</span> sources
                          </div>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <div className="flex items-center gap-1" title="Unique Domains">
                              <DatabaseIcon className="w-3.5 h-3.5 text-green-500" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{currentProgress.domainsCount}</span> domains
                          </div>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <div className="flex items-center gap-1" title="Data Analyzed">
                              <FileTextIcon className="w-3.5 h-3.5 text-purple-500" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{currentProgress.dataSize}</span>
                          </div>
                           <span className="text-gray-300 dark:text-gray-600">|</span>
                          <div className="flex items-center gap-1" title="Execution Time">
                              <RefreshCwIcon className="w-3.5 h-3.5 text-orange-500" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{(currentProgress.elapsedTime / 1000).toFixed(1)}s</span>
                          </div>
                      </div>
                  )}
                </div>

              {/* Markdown Report Content - Enhanced Styling */}
               <div className="dark:prose-blockquote:bg-blue-900/20 prose-blockquote:bg-blue-50/50 prose-img:shadow-lg dark:prose-invert prose-hr:my-10 prose-blockquote:px-4 prose-blockquote:py-1 dark:prose-blockquote:border-l-blue-700 prose-blockquote:border-l-blue-500 prose-hr:border-none prose-img:rounded-xl prose-blockquote:rounded-r-md max-w-none prose-hr:h-0 prose-headings:font-sans prose-code:font-mono prose-blockquote:font-normal prose-a:font-medium dark:prose-a:text-blue-400 dark:prose-blockquote:text-gray-300 dark:prose-li:marker:text-blue-400 dark:prose-strong:text-blue-300 prose-a:text-blue-600 prose-blockquote:text-gray-700 prose-li:marker:text-blue-600 prose-strong:text-blue-700 prose-code:text-sm prose-a:no-underline prose-blockquote:not-italic prose-code:before:content-none prose-code:after:content-none prose-headings:tracking-tight prose-a:transition-all prose-a:duration-200 prose prose-lg">
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
                    className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/70 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors"
                  >
                    <CopyIcon className="w-4 h-4" />
                    Copy Full Report
                  </button>
                  <button
                    onClick={() => { setQuery(''); setReport(null); setError(null); }}
                    className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors"
                  >
                    <SearchIcon className="w-4 h-4" />
                    New Research
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </main>
    </div>
  );
}
