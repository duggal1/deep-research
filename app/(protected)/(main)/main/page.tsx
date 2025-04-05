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
  TerminalIcon,
  LinkIcon, // Added for sources
  ClockIcon // Added for elapsed time
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ResearchError } from '@/lib/types';
import React from 'react';
import { cn } from '@/lib/utils';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { ModernProgress } from '@/components/ui/modern-progress';
import { LiveLogs } from '@/components/ui/live-logs';

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
  
  // Use a reliable service
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=64`; // Use size 64 for potentially better resolution
};

// Define the structure for the API response data
interface DeepResearchData {
  report: string;
  sources: Source[];
  originalAnalysis?: string; // Kept for potential future use/display
  depthAchieved?: number | string;
  sourceCount: number;
  modelUsed: string;
}

// Define the structure for a source
interface Source {
  url: string;
  title: string;
  description?: string; // Description might not always be present
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
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'think' | 'non-think' | null>(null); // Track which button triggered loading
  const [error, setError] = useState<ResearchError | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // Track elapsed time locally
  const [finalModelUsed, setFinalModelUsed] = useState<string | null>(null); // Store model used
  const [finalSourceCount, setFinalSourceCount] = useState<number | null>(null); // Store source count
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // Store current job ID
  const startTimeRef = useRef<number | null>(null); // Ref to store start time
  const { theme } = useTheme();

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

  // Consolidated function to handle deep research
  const handleDeepResearch = async (mode: 'think' | 'non-think') => {
    if (!query.trim() || loading) return;

    // Generate a new job ID for this research session
    const newJobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setCurrentJobId(newJobId);

    setLoading(true);
    setLoadingMode(mode); // Set which mode is loading
    setError(null);
    setReport(null);
    setSources([]); // Clear previous sources
    setElapsedTime(0); // Reset timer
    setFinalModelUsed(null);
    setFinalSourceCount(null);
    startTimeRef.current = Date.now(); // Record start time

    // Simple timer update interval while loading
    const timerInterval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100); // Update every 100ms for smoother display

    try {
      console.log(`[DEEP RESEARCH START] Query: "${query}", Mode: ${mode}`);
      const res = await fetch('/api/deep', { // Use the correct API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode, // Pass the selected mode
          // params: {} // Pass any optional params like maxDepth, maxUrls if needed
        }),
      });

      clearInterval(timerInterval); // Stop the timer interval
      if (startTimeRef.current) {
         // Set final elapsed time
         setElapsedTime(Date.now() - startTimeRef.current);
         startTimeRef.current = null;
      }


      // Check response status FIRST
      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status} - ${res.statusText}` };
          let errorJson: any = null;
          try {
              errorJson = await res.json(); // Try parsing error response
              console.error("[API ERROR RESPONSE]", errorJson);
              // Use detailed error from API if available
              if (errorJson?.error) {
                  errorData.message = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
                  if(errorJson.details) errorData.message += ` | Details: ${errorJson.details}`;
              } else if (errorJson?.message) {
                  errorData.message = errorJson.message;
              }
          } catch (parseError) {
              const textResponse = await res.text(); // Get raw text if JSON fails
              console.warn("Could not parse error response JSON. Raw response:", textResponse);
              errorData.message += ` | Response: ${textResponse.substring(0, 200)}...`; // Include part of raw response
          }
          // If report/sources exist in error response, maybe set them (less likely for deep)
          // if (errorJson?.report) setReport(errorJson.report);
          // if (errorJson?.sources) setSources(errorJson.sources);
          throw errorData; // Throw the extracted/created error object
      }

      const data: DeepResearchData & { success?: boolean; error?: any } = await res.json(); // Type assertion for expected success structure
      console.log("[DEEP RESEARCH SUCCESS]", data);

      // Check for application-level error *within* the successful response (e.g., success: false)
      if (data.success === false || data.error) {
          const errorMessage = data.error ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) : 'API returned success: false without specific error.';
          // Set partial data if available before throwing
          if (data.report) setReport(data.report);
          if (data.sources) setSources(data.sources);
          if (data.modelUsed) setFinalModelUsed(data.modelUsed);
          if (data.sourceCount) setFinalSourceCount(data.sourceCount);
          throw { code: 'API_APP_ERROR', message: errorMessage } as ResearchError;
      }
      if (!data.report) {
          throw { code: 'API_MISSING_DATA', message: 'API response successful but missing report data.' } as ResearchError;
      }

      // --- Success Case ---
      setReport(data.report);
      setSources(data.sources || []); // Ensure sources is always an array
      setFinalModelUsed(data.modelUsed || 'Unknown');
      setFinalSourceCount(data.sourceCount || data.sources?.length || 0);

      // Add query to history via API
      await addHistoryEntry(query);

    } catch (err) {
      console.error("Deep Research handling error:", err);
      clearInterval(timerInterval); // Ensure timer stops on error
      if (startTimeRef.current) {
         // Set final elapsed time on error too
         setElapsedTime(Date.now() - startTimeRef.current);
         startTimeRef.current = null;
      }

      // Set error state using the caught error object
      if (typeof err === 'object' && err !== null && 'message' in err) {
          const researchErr = err as ResearchError;
          setError({
              code: researchErr.code || 'UNKNOWN_CLIENT_ERROR',
              message: researchErr.message || 'An unexpected error occurred.'
          });
      } else {
          setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      }
      // Keep partial report/sources if they were set before the error was thrown
    } finally {
      setLoading(false);
      setLoadingMode(null); // Reset loading mode
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

  // --- Renderers ---
  // Most renderers can stay the same as they style standard Markdown elements.
  // We need to review `ul` and `li` if the report structure relies heavily on specific list formats
  // that are no longer generated or if we want to render the `sources` array differently.
  // Let's assume the report markdown is standard for now and render the `sources` array separately below the report.

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
          <div className="group code-block relative bg-white dark:bg-gray-950 shadow-sm my-6 border border-gray-200 dark:border-gray-700/80 rounded-lg overflow-hidden">
            {/* Cleaner Header Bar */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/70 px-4 py-2 border-gray-200 dark:border-gray-700/80 border-b">
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
                backgroundColor: style['pre[class*="language-"]']?.backgroundColor, // Use optional chaining
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
      <div className="shadow-sm my-6 border border-gray-200 dark:border-gray-700/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <table className="w-full text-sm border-collapse" {...props} />
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      // Clean header, simple background, bottom border
      <thead className="bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 border-b" {...props} />
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

      // Safer way to get text content from the node itself for analysis
       const getTextContent = (n: any): string => {
         if (!n) return '';
         if (n.type === 'text') return n.value || '';
         if (n.children) return n.children.map(getTextContent).join('');
         return '';
       };
       const content = getTextContent(node);
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
      // FIX: Use props.children which contains the already processed/rendered content
      let displayContent: React.ReactNode = props.children;
      // Apply currency formatting if needed (check if the rendered content matches pattern)
      // This might be less reliable if children include complex elements, but is safer than re-rendering
      if (!isHeader && isCurrency) {
         // Attempt formatting based on the analyzed node content
         displayContent = formatCurrency(trimmedContent);
      }


      const cellProps = {
        className: `
          px-4 py-2.5 ${alignClass} font-serif // Use serif by default
          ${isHeader
            ? 'font-semibold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider' // Simpler header
            : 'text-gray-700 dark:text-gray-300' // Default cell style
          }
          // Specific styling based on content type (subtle) - applied based on node analysis
          ${isCurrency ? 'font-mono text-green-700 dark:text-green-400' : ''}
          ${isPercentage ? 'font-mono text-purple-700 dark:text-purple-400' : ''}
          ${(isNumeric || hasRange) ? 'font-mono text-blue-700 dark:text-blue-400' : ''}
          ${isFinancialHeader ? 'bg-gray-100 dark:bg-gray-700/50' : ''} // Subtle highlight for financial headers
        `,
        ...props, // Pass down other props from react-markdown
      };

      // Render the cell with props.children as content
      return isHeader
        ? <th scope="col" {...cellProps}>{displayContent}</th>
        : <td {...cellProps}>{displayContent}</td>;
    },

    // --- Heading Renderers - Clean, Serif, Clear Hierarchy ---
    h1: ({ node, children, ...props }: any) => (
      <h1 className="mt-8 mb-5 pb-2 border-gray-300 dark:border-gray-600 border-b font-serif font-bold text-gray-900 dark:text-gray-100 text-3xl tracking-tight" {...props}>
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }: any) => {
       const text = String(children);
        // Keep icon logic, but make it visually cleaner
       const sectionIconMap: Record<string, React.ElementType> = {
         // Keep existing relevant icons
         'Executive Summary': BookOpenIcon,
         'Key Findings': CheckIcon,
         'Detailed Analysis': SearchIcon,
         'Technical Details': FileTextIcon,
         'Code Examples': TerminalIcon,
         'Visual References': ImageIcon,
         'Key Insights': AlertCircleIcon,
         'Confidence Level Assessment': CheckIcon,
         'Conclusions': CheckIcon,
         'References': BookOpenIcon, // Potentially use LinkIcon if rendering sources separately
         'Limitations': AlertCircleIcon,
         'Future Directions': ArrowRightIcon,
         'Introduction': BookOpenIcon,
         'Methodology': BrainIcon,
         'Comparison & Nuances': RefreshCwIcon,
         'Source Analysis': DatabaseIcon, // Added
         // Remove Research Path/Methodology/Sources if handled elsewhere or differently by API
       };
       const matchingSection = Object.keys(sectionIconMap).find(section => text.trim().startsWith(section));

       if (matchingSection) {
         const SectionIcon = sectionIconMap[matchingSection];
         return (
           <h2 className="flex items-center mt-10 mb-4 pb-2 border-gray-200 dark:border-gray-700 border-b font-serif font-semibold text-gray-800 dark:text-gray-200 text-2xl tracking-tight" {...props}>
              {/* Cleaner icon presentation */}
             <SectionIcon className="flex-shrink-0 mr-2.5 w-5 h-5 text-blue-600 dark:text-blue-400" />
             {text}
           </h2>
         );
       }
       // Default H2 - simple border bottom
       return (
         <h2 className="mt-10 mb-4 pb-2 border-gray-200 dark:border-gray-700 border-b font-serif font-semibold text-gray-800 dark:text-gray-200 text-2xl tracking-tight" {...props}>
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

      // Render images wrapped in links
      if (node?.children?.[0]?.tagName === 'img') {
        const imgNode = node.children[0];
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="group block my-5">
            <img
              src={imgNode.properties.src}
              alt={imgNode.properties.alt || 'Embedded image'}
              className="shadow-sm group-hover:shadow-md mx-auto border border-gray-200 dark:border-gray-700 rounded-md max-w-full h-auto transition-shadow"
              loading="lazy"
            />
          </a>
        );
      }
      // Handle image links (keep simple wrapper) - Moved after wrapped image check
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="group block my-5">
            <img
              src={url}
              alt={textContent || 'Linked image'}
              className="shadow-sm group-hover:shadow-md border border-gray-200 dark:border-gray-700 rounded-md max-w-full h-auto transition-shadow"
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
            faviconUrl = getFaviconUrl(domain); // Use helper function
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
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 dark:text-blue-400 decoration-blue-600/30 hover:decoration-blue-600/70 dark:decoration-blue-400/30 dark:hover:decoration-blue-400/70 underline underline-offset-2 break-words transition-colors duration-150"
          {...props}
        >
           {/* Subtle Favicon */}
          {isExternal && faviconUrl && (
            <img
              src={faviconUrl}
              alt="" // Decorative
              className="inline-block flex-shrink-0 mr-0.5 rounded-sm w-4 h-4 object-contain align-text-bottom" // Added object-contain
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
           {/* Display clean URL if text is URL, otherwise display children */}
           {/* Ensure children are rendered correctly */}
           <span>{isLinkTextUrl ? url.replace(/^(https?:)?\/\//, '').replace(/\/$/, '') : children}</span>
          {/* Subtle External Link Icon */}
          {isExternal && (
            <ExternalLinkIcon className="inline-block flex-shrink-0 opacity-60 group-hover:opacity-90 ml-0.5 w-3.5 h-3.5 align-text-bottom transition-opacity" />
          )}
        </a>
      );
    },

    // --- List Item Renderer V6 (Clean & Modern) ---
    // Simplified: Remove special handling for source/path items as they might not be generated
    // in the main report or will be handled by the separate sources list.
    li: ({ node, children, ordered, ...props }: any) => {
       return (
         <li className="flex items-start my-1 font-serif" {...props}> {/* Added font-serif */}
            {/* Simple marker */}
           <span className={`flex-shrink-0 mr-2.5 pt-1 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right' : 'text-blue-500 dark:text-blue-400'}`}>
            {ordered ? `${(props.index ?? 0) + 1}.` : (
              <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className="mt-0.5"><circle cx="3" cy="3" r="3" /></svg>
            )}
          </span>
            {/* Serif font for content */}
           <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</span> {/* Removed redundant font-serif */}
         </li>
       );
    },

    // --- List Wrappers - Remove specific class logic ---
    ul: ({ node, children, className, ...props }: any) => {
       // Default list styling - standard bullets
       return <ul className="space-y-1 mb-5 pl-5 font-serif list-disc" {...props}>{children}</ul>; {/* Added font-serif */}
    },
    ol: ({ node, children, className, ...props }: any) => (
       <ol className="space-y-1 mb-5 pl-5 font-serif list-decimal" {...props}>{children}</ol> // Standard ordered list, Added font-serif
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
       return <p className="mb-4 font-serif text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>{children}</p>;
    },

    // --- Blockquote Renderer - Clean & Simple ---
    blockquote: ({ node, children, ...props }: any) => (
        <blockquote className="my-5 py-1 pr-2 pl-4 border-gray-300 dark:border-gray-600 border-l-4 font-serif text-gray-600 dark:text-gray-400 italic" {...props}>
            {children}
        </blockquote>
    ),

  };

  // --- Source Item Component ---
  const SourceItem = ({ source }: { source: Source }) => {
    const domain = extractDomain(source.url);
    const faviconUrl = getFaviconUrl(domain);
    const isSecure = source.url.startsWith('https://');

    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 bg-white hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/60 shadow-sm hover:shadow-md p-3 border border-gray-200 hover:border-gray-300 dark:border-gray-700/80 dark:hover:border-gray-600 rounded-lg w-full transition-all duration-150"
      >
        {/* Subtle Favicon container */}
        <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 dark:bg-gray-700 mt-0.5 border border-gray-200 dark:border-gray-600 rounded w-8 h-8">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-5 h-5 object-contain" // Use object-contain
              loading="lazy"
              onError={(e) => {
                 const target = e.target as HTMLImageElement;
                 target.onerror = null; // Prevent infinite loop
                 target.style.display = 'none'; // Hide broken image icon
                 // Optionally display a fallback icon container
                 target.parentElement?.classList.add('favicon-error'); // Add class for potential styling
              }}
            />
          ) : (
            <LinkIcon className="w-4 h-4 text-gray-500" />
          )}
        </div>
        {/* Main content area */}
        <div className="flex-grow min-w-0 font-serif"> {/* Added font-serif */}
          <h4 className="font-medium text-gray-800 dark:group-hover:text-blue-300 dark:text-gray-100 group-hover:text-blue-700 line-clamp-1 transition-colors duration-150"> {/* Removed font-serif */}
            {source.title || domain || source.url} {/* Show title, fallback to domain/url */}
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2"> {/* Removed font-serif */}
             {source.description || source.url} {/* Show description or URL */}
          </p>
          {/* Domain info */}
           <div className="flex items-center gap-1.5 mt-1 text-gray-400 dark:text-gray-500 text-xs truncate">
             <GlobeIcon className="flex-shrink-0 w-3 h-3" />
             <span className="truncate">{domain}{isSecure ? ' 🔒' : ''}</span>
           </div>
        </div>
        <ExternalLinkIcon className="flex-shrink-0 self-center ml-2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </a>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12"> {/* Added padding */}
      {/* Title and Description */}
      <div className="space-y-8 mx-auto mb-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
           className="space-y-4 text-center"
        >
          <h1 className="flex justify-center items-center font-serif font-bold text-gray-900 dark:text-gray-100 text-4xl md:text-5xl lg:text-6xl tracking-tight">
            <span className="bg-clip-text bg-gradient-to-r from-blue-600 dark:from-blue-400 to-indigo-500 dark:to-indigo-300 text-transparent">
              Deep Research Engine
            </span>
          </h1>
           <p className="mx-auto max-w-2xl font-serif text-gray-600 dark:text-gray-400 text-lg">
             Enter a query to initiate AI-powered deep research. Choose &apos;Think&apos; for deeper analysis (Gemini Pro) or &apos;Research&apos; for faster results (Gemini Flash). {/* Updated description */}
          </p>
        </motion.div>

        {/* Search Input */}
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
              placeholder="e.g., Explain quantum entanglement with code examples"
              // Adjust right padding for buttons
              className="block bg-white dark:bg-gray-900/80 shadow-md hover:shadow-lg focus:shadow-xl py-4 pr-[12rem] sm:pr-[14rem] pl-12 border border-gray-300 dark:border-gray-700 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full font-serif text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleDeepResearch('non-think')} // Default Enter triggers 'non-think'
              disabled={loading}
            />

            {/* --- Button Container --- */}
            <div className="top-1/2 right-3 absolute flex items-center gap-2 h-[75%] -translate-y-1/2">
              {/* --- Think Button (Gemini Pro) --- */}
              <button
                onClick={() => handleDeepResearch('think')}
                disabled={loading || !query.trim()}
                title="Use Gemini Pro for Deeper Reasoning"
                className={cn(
                  "rounded-full transition-all flex items-center gap-1.5 px-2 py-1 border h-9 font-serif", // Adjusted padding/height slightly, Added font-serif
                  loading || !query.trim()
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed"
                    : "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600"
                )}
                aria-label="Think with Gemini Pro"
              >
                <div className="flex flex-shrink-0 justify-center items-center w-5 h-5">
                  <motion.div
                     animate={{ rotate: loading && loadingMode === 'think' ? 360 : 0 }}
                     transition={{
                       loop: loading && loadingMode === 'think' ? Infinity : 0,
                       ease: "linear",
                       duration: 1.5
                     }}
                  >
                    {loading && loadingMode === 'think' ? (
                      <Loader2Icon className="w-5 h-5 text-purple-500 dark:text-purple-400 animate-spin" />
                    ) : (
                      <BrainIcon className="w-5 h-5" />
                    )}
                  </motion.div>
                </div>
                <AnimatePresence>
                  {!(loading || !query.trim()) && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 overflow-hidden font-medium text-sm whitespace-nowrap"
                    >
                      Think
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* --- Research Button (Non-Think / Default) --- */}
              <button
                onClick={() => handleDeepResearch('non-think')}
                disabled={loading || !query.trim()}
                className="flex justify-center items-center bg-gradient-to-br from-blue-600 hover:from-blue-700 disabled:from-gray-500 to-blue-700 hover:to-blue-800 disabled:to-gray-600 disabled:opacity-50 shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/30 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 h-full font-serif font-semibold text-white text-base transition-all duration-200 disabled:cursor-not-allowed"
                aria-label="Start Standard Research"
              >
                {loading && loadingMode === 'non-think' ? ( // Show loader only if this button caused loading
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

      {/* Loading State - Simplified */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="space-y-6 bg-gradient-to-br from-white dark:from-gray-900 via-gray-50 dark:via-gray-950/90 to-gray-100 dark:to-black/90 shadow-2xl backdrop-blur-xl mt-8 p-6 md:p-8 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl overflow-hidden"
          >
             {/* Header */}
             <div className="flex sm:flex-row flex-col justify-between items-center gap-4">
               <div className="flex items-center gap-3">
                 <div className="relative flex justify-center items-center w-10 h-10">
                    {/* Simple Spinner */}
                    <Loader2Icon className="w-7 h-7 text-blue-600 dark:text-blue-500 animate-spin" />
                 </div>
                 <TextShimmerWave
      className='[--base-color:#0D74CE] [--base-gradient-color:#5EB1EF]'
      duration={1}
      spread={1}
      zDistance={1}
      scaleDistance={1.1}
      rotateYDistance={20}
    >
     Researching...
    </TextShimmerWave>
               </div>
               {/* Elapsed time */}
                <div className="bg-gradient-to-r from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 shadow-inner px-4 py-1.5 rounded-full font-mono font-medium tabular-nums text-blue-700 dark:text-blue-300 text-sm whitespace-nowrap">
                   <ClockIcon className="inline-block mr-1.5 w-4 h-4 align-text-bottom" />
                   {`${(elapsedTime / 1000).toFixed(1)}s`}
                 </div>
             </div>

             {/* Optional Mode Notification */}
              {loadingMode === 'think' && (
               <motion.div
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 transition={{ duration: 0.3, delay: 0.1 }}
                 className="bg-purple-50 dark:bg-purple-900/30 shadow-sm px-4 py-3 border-purple-500 border-l-4 rounded-r-lg text-purple-700 dark:text-purple-300"
               >
                 <div className="flex items-center gap-2">
                   <BrainIcon className="flex-shrink-0 w-5 h-5 text-purple-600 dark:text-purple-400" />
                   <p className="font-serif font-medium text-sm"> {/* Added font-serif */}
                     Engaging Gemini Pro for deeper analysis... this may take 1-3 minutes.
                   </p>
                 </div>
               </motion.div>
              )}

             {/* Modern Progress Bar with Gradient Effect */}
             <ModernProgress
               indeterminate={true}
               className="shadow-inner backdrop-blur-md rounded-full h-3"
               indicatorClassName={cn(
                 "rounded-full bg-gradient-to-r",
                 loadingMode === 'think'
                   ? "from-purple-500 via-pink-600 to-blue-500"
                   : "from-blue-600 via-pink-600 to-blue-500"
               )}
             />

             {/* Simplified message */}
              <div className="font-serif text-gray-600 dark:text-gray-400 text-center">
                Gathering and synthesizing information from the web...
             </div>

            {/* Live Logs Display */}
            <LiveLogs
              jobId={currentJobId || undefined}
              mode={loadingMode}
              query={query}
              className="mt-4"
            />

          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display (Mostly unchanged, ensure error object structure matches) */}
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
              <p className="font-serif text-red-700 dark:text-red-300 text-sm break-words">{error.message || 'An unknown error occurred.'}</p>
              {/* Optionally show partial report/sources if available in error state */}
              {(report || sources.length > 0) && (
                 <details className="mt-3 pt-2 border-t border-red-200 dark:border-red-500/30 font-serif text-xs"> {/* Added font-serif */}
                   <summary className="font-medium text-red-600 dark:text-red-400 cursor-pointer">Show partial data</summary> {/* Removed font-serif (inherits) */}
                   {report && <div className="bg-red-100/50 dark:bg-red-900/40 mt-2 p-3 rounded max-h-48 overflow-y-auto font-mono text-red-700 dark:text-red-300 scrollbar-thin scrollbar-thumb-red-400 dark:scrollbar-thumb-red-700">Report: {report}</div>}
                   {sources.length > 0 && <div className="bg-red-100/50 dark:bg-red-900/40 mt-2 p-3 rounded max-h-48 overflow-y-auto font-mono text-red-700 dark:text-red-300 scrollbar-thin scrollbar-thumb-red-400 dark:scrollbar-thumb-red-700">Sources: {JSON.stringify(sources, null, 2)}</div>}
                 </details>
              )}
              <button
                onClick={() => { setError(null); setReport(null); setSources([]); }} // Clear error and data
                className="bg-red-100 hover:bg-red-200 dark:bg-red-800/60 dark:hover:bg-red-700/70 mt-4 px-4 py-1.5 rounded-md font-serif font-medium text-red-700 dark:text-red-200 text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Display & Sources */}
      <AnimatePresence>
        {report && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-b from-white dark:from-gray-900 to-gray-50 dark:to-gray-900/95 shadow-xl backdrop-blur-xl mt-8 border border-gray-200 dark:border-gray-700/80 rounded-2xl overflow-hidden" // Added overflow-hidden
          >
            {/* Wrap content in padding */}
            <div className="p-6 md:p-10">
              {/* Report Header - Simplified Metrics */}
              <div className="flex md:flex-row flex-col justify-between md:items-center gap-4 mb-8 pb-5 border-gray-200 dark:border-gray-700/80 border-b">
                <h2 className="flex items-center gap-3 font-serif font-semibold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight">
                  <div className="bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 shadow-inner p-2.5 rounded-xl">
                    <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  Research Report
                </h2>
                {/* Final Metrics Display - Simplified */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white/70 dark:bg-gray-800/70 shadow-md p-3 border border-gray-200 dark:border-gray-700 rounded-lg font-serif text-gray-600 dark:text-gray-400 text-xs"> {/* Added font-serif */}
                  {finalSourceCount !== null && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md" title="Sources Analyzed">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{finalSourceCount.toLocaleString()}</span> {/* Removed font-serif */}
                      <span className="text-gray-500 dark:text-gray-500">sources</span>
                    </div>
                  )}
                  {elapsedTime > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md" title="Execution Time">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{(elapsedTime / 1000).toFixed(1)}s</span> {/* Removed font-serif */}
                    </div>
                  )}
                  {finalModelUsed && (
                     <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-md" title="Model Used">
                       <BrainIcon className="w-3.5 h-3.5 text-purple-500" />
                       <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{finalModelUsed.replace('gemini-2.5-pro-exp-03-25', 'Gemini Pro Exp').replace('gemini-2.0-flash', 'Gemini Flash')}</span> {/* Updated model name display, Removed font-serif */}
                     </div>
                   )}
                </div>
              </div>

              {/* Markdown Report Content */}
              <div className="blockquotes table tables prose-img:shadow-sm dark:prose-invert prose-td:px-4 prose-th:px-4 prose-td:py-2 prose-th:py-2 border borders prose-img:border dark:prose-hr:border-gray-700 dark:prose-img:border-gray-700 dark:prose-thead:border-gray-600 dark:prose-tr:border-gray-700/60 prose-hr:border-gray-200 prose-img:border-gray-200 prose-thead:border-gray-300 prose-tr:border-gray-200 prose-thead:border-b prose-tr:border-b prose-img:rounded-md max-w-none font-serif prose-blockquote:font-serif prose-headings:font-serif prose-li:font-serif prose-p:font-serif prose-table:font-serif prose-code:font-mono prose-strong:font-semibold prose-th:font-semibold dark:prose-a:text-blue-400 dark:prose-strong:text-gray-200 dark:prose-td:text-gray-300 dark:prose-th:text-gray-200 prose-a:text-blue-600 prose-strong:text-gray-800 prose-table:text-sm prose-th:text-left prose-headings:tracking-tight prose prose-base lg:prose-lg // Base prose styles // Allow content to fill container // Serif for paragraphs & lists // Serif for headings // Default link color (overridden by renderer) // Strong styling // Serif for // Mono for code (overridden by renderer) // Image styling // HR styling // Base font size, Added // Table head // Table header styling // Table cell padding // Table row // Dark mode text">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={renderers} // Use the updated renderers
                >
                  {report}
                </ReactMarkdown>
              </div>

             {/* Sources Section */}
             {sources && sources.length > 0 && (
                <div className="mt-12 pt-8 border-gray-200 dark:border-gray-700/80 border-t">
                  <h3 className="flex items-center gap-3 mb-6 font-serif font-semibold text-gray-800 dark:text-gray-200 text-xl md:text-2xl">
                     <LinkIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                     Sources Used ({sources.length})
                   </h3>
                   <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                     {sources.map((source, index) => (
                       <SourceItem key={source.url + '-' + index} source={source} />
                     ))}
                   </div>
                 </div>
              )}


              {/* Report Footer */}
              <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mt-10 pt-6 border-gray-200 dark:border-gray-700/80 border-t">
                <button
                  onClick={() => {
                    if (report) {
                      navigator.clipboard.writeText(report)
                        .then(() => alert('Report copied to clipboard!')) // Consider a less intrusive notification
                        .catch(err => console.error('Failed to copy report:', err));
                    }
                  }}
                  className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/70 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-serif font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors"
                >
                  <CopyIcon className="w-4 h-4" />
                  Copy Full Report
                </button>
                <button
                  onClick={() => { setQuery(''); setReport(null); setSources([]); setError(null); setElapsedTime(0); setFinalModelUsed(null); setFinalSourceCount(null); }}
                  className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-sm hover:shadow-md px-4 py-2 rounded-lg font-serif font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors"
                >
                  <SearchIcon className="w-4 h-4" />
                  New Research
                </button>
              </div>
            </div> {/* End padding wrapper */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}