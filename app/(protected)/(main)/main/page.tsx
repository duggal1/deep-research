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
  ClockIcon, // Added for elapsed time
  SettingsIcon, // Using a standard settings icon
  BrainCog,
  Settings,
  X,
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
import { ModernProgress } from '@/components/ui/modern-progress';
import { AuroraText } from '@/components/magicui/aurora-text';
import { ResearchSidebar } from '@/components/ui/research-sidebar';

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
  jobId?: string; // Expect jobId in response now
}

// Define the structure for a source
interface Source {
  id?: string; // Added ID from sidebar
  url: string;
  title?: string; // Made title optional to match sidebar
  description?: string;
  found?: number; // Added from sidebar
  accessed?: number; // Added from sidebar
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

// --- Types for Research Controls ---
interface ResearchControls {
  maxUrls: number;
  maxDepth: number; // FireCrawl depth (fixed at 5 but included for completeness)
  timeLimit: number; 
  jinaDepth: number; // Jina Reader depth/slicing limit
}

export default function RechartsHle() {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState<string | null>(null);
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
  
  // Add research controls state
  const [showControls, setShowControls] = useState<boolean>(false);
  const [researchControls, setResearchControls] = useState<ResearchControls>({
    maxUrls: 15,     // Initial value: 15, Max: 120
    maxDepth: 5,     // Fixed at 5 (unchangeable)
    timeLimit: 150,  // Initial value: 150, Max: 600
    jinaDepth: 10    // Initial value: 10, Max: 95
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayedSources, setDisplayedSources] = useState<Source[]>([]); // Keep track of sources displayed *below* the report

  // --- Warning message for high values ---
  const getDepthWarning = () => {
    if (researchControls.jinaDepth > 35) {
      return "Significantly improves quality but consumes more tokens and time";
    }
    return null;
  };
  
  const getUrlWarning = () => {
    if (researchControls.maxUrls > 30) {
      return "Boosts context and model response quality but increases processing time significantly";
    }
    return null;
  };

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

  // Consolidated function to handle deep research - Updated for research controls
  const handleDeepResearch = async (mode: 'think' | 'non-think') => {
    if (!query.trim() || loading) return;

    // Reset previous state
    setLoading(true);
    setLoadingMode(mode);
    setError(null);
    setReport(null);
    setDisplayedSources([]); // Clear sources displayed below report
    setElapsedTime(0);
    setFinalModelUsed(null);
    setFinalSourceCount(null);
    setCurrentJobId(null); // Clear previous job ID initially
    setSidebarOpen(true); // Open sidebar immediately

    startTimeRef.current = Date.now();

    // Timer interval (keep)
    const timerInterval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);

    try {
      console.log(`[DEEP RESEARCH START] Query: "${query}", Mode: ${mode}, Controls:`, researchControls);
      const res = await fetch('/api/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode,
          params: {
            maxUrls: researchControls.maxUrls,
            maxDepth: researchControls.maxDepth, // Still send, even if fixed server-side
            timeLimit: researchControls.timeLimit,
            jinaDepth: researchControls.jinaDepth
          }
        }),
      });

      clearInterval(timerInterval);
      if (startTimeRef.current) {
         setElapsedTime(Date.now() - startTimeRef.current);
         startTimeRef.current = null;
      }

      // Error handling (mostly keep, adjust for potential lack of sources in error)
      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status} - ${res.statusText}` };
          let errorJson: any = null;
          try {
              errorJson = await res.json();
              console.error("[API ERROR RESPONSE]", errorJson);
              if (errorJson?.jobId) setCurrentJobId(errorJson.jobId); // Capture Job ID even on error for sidebar
              if (errorJson?.error) {
                  errorData.message = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
                  if(errorJson.details) errorData.message += ` | Details: ${errorJson.details}`;
              } else if (errorJson?.message) {
                  errorData.message = errorJson.message;
              }
          } catch (parseError) {
              const textResponse = await res.text();
              console.warn("Could not parse error response JSON. Raw response:", textResponse);
              errorData.message += ` | Response: ${textResponse.substring(0, 200)}...`;
          }
          // Do not set report/sources from error response
          throw errorData;
      }

      const data: DeepResearchData & { success?: boolean; error?: any } = await res.json();
      console.log("[DEEP RESEARCH SUCCESS]", data);

      // Set Job ID from successful response
      if (data.jobId) {
          setCurrentJobId(data.jobId);
      } else {
          console.warn("No Job ID received in successful response.");
          // Handle case where Job ID might be missing?
      }

      // Application-level error check (keep)
      if (data.success === false || data.error) {
          const errorMessage = data.error ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) : 'API returned success: false without specific error.';
          if (data.report) setReport(data.report);
          // Don't set sources here directly, sidebar handles it
          if (data.modelUsed) setFinalModelUsed(data.modelUsed);
          if (data.sourceCount) setFinalSourceCount(data.sourceCount);
          throw { code: 'API_APP_ERROR', message: errorMessage } as ResearchError;
      }
      if (!data.report) {
          throw { code: 'API_MISSING_DATA', message: 'API response successful but missing report data.' } as ResearchError;
      }

      // --- Success Case ---
      setReport(data.report);
      // Set the sources *to be displayed below the report* from the final API response
      setDisplayedSources(data.sources || []);
      setFinalModelUsed(data.modelUsed || 'Unknown');
      setFinalSourceCount(data.sourceCount || data.sources?.length || 0);

      // Add query to history (keep)
      await addHistoryEntry(query);

    } catch (err) {
      console.error("Deep Research handling error:", err);
      clearInterval(timerInterval);
      if (startTimeRef.current) {
         setElapsedTime(Date.now() - startTimeRef.current);
         startTimeRef.current = null;
      }

      // Set error state (keep, adjust structure if needed)
      if (typeof err === 'object' && err !== null && 'message' in err) {
          const researchErr = err as ResearchError;
          setError({
              code: researchErr.code || 'UNKNOWN_CLIENT_ERROR',
              message: researchErr.message || 'An unexpected error occurred.'
          });
      } else {
          setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      }
      // Don't keep partial report/sources on error, rely on sidebar for activity log
      setReport(null);
      setDisplayedSources([]);
    } finally {
      setLoading(false);
      setLoadingMode(null);
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
          <div className="group code-block relative bg-white dark:bg-black/95 shadow-sm my-6 border border-gray-200 dark:border-gray-800/90 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/70 px-4 py-2 border-gray-200 dark:border-gray-700/80 border-b">
              <div className="flex items-center gap-2 font-mono font-medium text-gray-500 dark:text-gray-400 text-xs">
                {/* <TerminalIcon className="w-4 h-4" /> // Icon optional, can uncomment if desired */}
                <span>{language.toUpperCase()}</span>
              </div>
              <button
                onClick={() => handleCopyCode(codeString)}
                 // Simple button style
                 className="flex items-center gap-1 bg-gray-200/70 hover:bg-gray-300/70 dark:bg-gray-700/70 dark:hover:bg-gray-600/70 px-2 py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-medium text-gray-700 dark:text-gray-300 text-xs transition-colors duration-150"
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
          <table className="w-full text-sm border-collapse font-serif" {...props} />
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      // Clean header, simple background, bottom border
      <thead className="bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 border-b font-serif" {...props} />
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
        ? <th scope="col" className={cellProps}>{displayContent}</th>
        : <td className={cellProps}>{displayContent}</td>;
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
       const sectionIconMap: Record<string, React.ComponentType<any>> = {
         // Keep existing relevant icons
         'Executive Summary': BookOpenIcon,
         'Key Findings': CheckIcon,
         'Detailed Analysis': FileTextIcon,
         'Technical Details': TerminalIcon,
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
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 dark:text-blue-400 decoration-blue-600/30 hover:decoration-blue-600/70 dark:decoration-blue-400/30 dark:hover:decoration-blue-400/70 underline underline-offset-2 break-words transition-colors duration-150"
          {...props}
        >
           {/* Subtle Favicon */}
          {isExternal && faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="inline-block flex-shrink-0 mr-0.5 rounded-sm w-4 h-4 object-contain align-text-bottom"
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
         <li className="flex items-start my-1.5 font-serif" {...props}> {/* Increased spacing slightly */}
            {/* Simple marker */}
           <span className={`flex-shrink-0 mr-2.5 pt-1 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right font-sans' : 'text-blue-500 dark:text-blue-400'}`}> {/* Sans for numbers */}
            {ordered ? `${(props.index ?? 0) + 1}.` : (
              <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" className="mt-1"><circle cx="3" cy="3" r="3" /></svg> // Adjusted vertical alignment */}
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
       return <ul className="space-y-1 mb-5 pl-6 font-serif list-disc" {...props}>{children}</ul>; {/* Added pl-6 for better indent */}
    },
    ol: ({ node, children, className, ...props }: any) => (
       <ol className="space-y-1 mb-5 pl-6 font-serif list-decimal" {...props}>{children}</ol> // Standard ordered list, Added pl-6 */}
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
        className="group flex items-start gap-3 bg-white hover:bg-gray-50 dark:bg-black/90 dark:hover:bg-gray-900/60 shadow-sm hover:shadow-md dark:shadow-blue-500/5 p-3 border border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700 rounded-lg w-full transition-all duration-150 font-serif" // Base font-serif
      >
        {/* Favicon */}
        <div className="relative flex-shrink-0 mt-0.5 w-6 h-6"> {/* Smaller icon container */}
          <img
              src={faviconUrl}
              alt=""
              className="w-full h-full object-contain rounded-sm border border-gray-200 dark:border-gray-600 bg-white p-px" // Added border/bg
              loading="lazy"
              onError={(e) => {
                 const target = e.target as HTMLImageElement;
                 target.style.display = 'none';
                 const fallback = target.nextElementSibling as HTMLElement | null;
                 if(fallback) fallback.style.display = 'flex';
              }}
            />
          <div className="absolute inset-0 hidden items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-sm">
            <LinkIcon className="w-3 h-3 text-gray-500" /> {/* Smaller fallback */}
          </div>
        </div>
        {/* Content */}
        <div className="flex-grow min-w-0">
          <h4 className="font-medium text-gray-800 dark:group-hover:text-blue-300 dark:text-gray-100 group-hover:text-blue-700 line-clamp-1 transition-colors duration-150 text-sm"> {/* Smaller title */}
            {source.title || domain || source.url}
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mt-0.5"> {/* Smaller description/URL */}
             {source.description || source.url}
          </p>
           {/* Domain info - keep small */}
           <div className="flex items-center gap-1 mt-1 text-gray-400 dark:text-gray-500 text-xs truncate">
             <GlobeIcon className="flex-shrink-0 w-3 h-3" />
             <span className="truncate">{domain}</span>
             {/* Optionally indicate found/accessed time if available */}
             {source.found && (
                <span className="ml-2 text-gray-400 dark:text-gray-500">(Found: {new Date(source.found).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit'})})</span>
             )}
           </div>
        </div>
        <ExternalLinkIcon className="flex-shrink-0 self-center ml-2 w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" /> {/* Smaller icon */}
      </a>
    );
  };

  return (
    <div className="dark:bg-black sm:px-6 lg:px-8 py-12 min-h-screen px-4"> 
      {/* Title and Description */}
      <div className="space-y-8 mx-auto mb-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
           className="space-y-4 text-center"
        >
          <h1 className="flex justify-center items-center font-serif font-bold text-gray-900 dark:text-gray-100 text-4xl md:text-5xl lg:text-6xl tracking-tight">
             <AuroraText> Deep Research Engine </AuroraText>
          </h1>
           <p className="mx-auto max-w-2xl font-serif text-gray-600 dark:text-gray-400 text-lg">
             Enter a query to initiate AI-powered research. Choose &lsquo;Deep&apos; analysis (Gemini Pro) or &apos;Fast&apos; results (Gemini Flash).
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="group relative"> {/* Added group for focus-within styling */}
            <div className="left-0 absolute inset-y-0 flex items-center pl-4 text-gray-600 dark:text-gray-50 group-focus-within:text-blue-700 transition-colors pointer-events-none">
              <SearchIcon className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Latest advancements in quantum machine learning"
              className="block bg-white dark:bg-black/90 shadow-md hover:shadow-lg focus:shadow-xl py-3.5 pr-[12rem] sm:pr-[14rem] pl-12 border border-gray-300 dark:border-gray-800 focus:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-full font-serif text-gray-900 dark:text-gray-100 text-base transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleDeepResearch('non-think')} // Default Enter triggers 'non-think'
              disabled={loading}
            />

            {/* Button Container */}
            <div className="top-1/2 right-2.5 absolute flex items-center gap-1.5 h-[75%] -translate-y-1/2"> {/* Reduced gap, right offset */}
              {/* Settings button */}
              <button
                onClick={() => setShowControls(!showControls)}
                disabled={loading}
                title="Research Settings"
                className={cn(
                  "rounded-lg transition-all flex items-center justify-center w-9 h-9 border",
                  loading
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed"
                    : showControls // Highlight when controls are shown
                      ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                aria-label="Research Settings"
              >
                 <Settings className="w-5 h-5" /> {/* Use Lucide Settings */}
              </button>

              {/* Think Button (Gemini Pro) */}
              <button
                onClick={() => handleDeepResearch('think')}
                disabled={loading || !query.trim()}
                title="Deep Analysis (Gemini Pro)"
                className={cn(
                  "rounded-lg transition-all flex items-center gap-1.5 px-2.5 py-1 border h-9 font-sans text-sm",
                  loading || !query.trim()
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed"
                    : "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600"
                )}
                aria-label="Deep Analysis with Gemini Pro"
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
                      <BrainCog className="w-5 h-5" /> /* Consistent icon */
                    )}
                  </motion.div>
                </div>
                <span className="font-medium whitespace-nowrap">Deep</span>
              </button>

              {/* Research Button (Non-Think / Default) */}
              <button
                onClick={() => handleDeepResearch('non-think')}
                disabled={loading || !query.trim()}
                title="Fast Research (Gemini Flash)"
                className={cn(
                  "flex justify-center items-center bg-gradient-to-r from-blue-600 hover:from-blue-700 disabled:from-gray-500 to-blue-500 hover:to-blue-600 disabled:to-gray-600 disabled:opacity-60 shadow-md hover:shadow-lg disabled:shadow-none px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 h-9 font-sans font-medium text-white text-sm transition-all duration-150 disabled:cursor-not-allowed"
                )}
                aria-label="Fast Research with Gemini Flash"
              >
                {loading && loadingMode === 'non-think' ? (
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {/* Use Icon only on small screens, Text on larger */}
                    <span className="hidden sm:inline">Fast</span>
                    <ArrowRightIcon className="sm:hidden w-4 h-4" /> {/* Use different icon maybe? */}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Research Controls Panel */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-black/90 shadow-lg p-5 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <h3 className="mb-5 font-serif font-semibold text-gray-800 dark:text-gray-200 text-lg">Research Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5"> {/* Reduced gap */}
                  {/* Jina Reader Depth */}
                  <div className="space-y-1.5"> {/* Reduced spacing */}
                    <div className="flex justify-between items-center">
                      <label htmlFor="jinaDepth" className="block font-serif font-medium text-gray-700 dark:text-gray-300 text-sm"> {/* Serif */}
                        Depth
                      </label>
                      <span className="inline-flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded font-sans font-medium text-purple-700 dark:text-purple-300 text-xs"> {/* Sans for badge */}
                        {researchControls.jinaDepth}
                      </span>
                    </div>
                    <div className="relative h-2 flex items-center"> {/* Gradient Slider */}
                      {/* ... keep slider input and gradient div ... */}
                    </div>
                    <p className="font-serif text-gray-500 dark:text-gray-500 text-xs italic"> {/* Serif */}
                      Content extraction depth (10-95)
                    </p>
                    {getDepthWarning() && ( /* Warning Style - Serif */
                       <div className="mt-1 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-md">
                         <AlertCircleIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-amber-500" />
                         <p className="font-serif text-amber-700 dark:text-amber-300 text-xs"> {/* Serif */}
                           {getDepthWarning()}
                         </p>
                       </div>
                     )}
                  </div>

                  {/* URL Limit */}
                  <div className="space-y-1.5"> {/* Serif labels/descriptions */}
                     {/* ... keep structure, apply font-serif to label/p/warning */}
                  </div>
                  {/* Time Limit */}
                  <div className="space-y-1.5"> {/* Serif labels/descriptions */}
                     {/* ... keep structure, apply font-serif to label/p */}
                  </div>
                </div>
                
                {/* Reset Button - Sans-serif for button text */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setResearchControls({ maxUrls: 15, maxDepth: 5, timeLimit: 150, jinaDepth: 10 })}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg font-sans font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors" // Sans-serif
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading State - Remove placeholder text */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="space-y-5 bg-gradient-to-br from-white dark:from-black via-gray-50 dark:via-gray-950 to-gray-100 dark:to-black/95 shadow-xl dark:shadow-blue-500/5 mt-8 p-6 border border-gray-200/80 dark:border-gray-800/80 rounded-xl overflow-hidden"
            >
               {/* Header */}
               <div className="flex sm:flex-row flex-col justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                     <Loader2Icon className="w-6 h-6 text-gray-800 dark:text-gray-200 animate-spin" />
                     <span className="font-serif font-semibold text-xl text-gray-800 dark:text-gray-200"> {/* Serif */}
                       Researching...
                     </span>
                  </div>
                  {/* Elapsed time (Sans-serif/Mono better here) */}
                  <div className="bg-gradient-to-r from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 shadow-inner px-3 py-1 rounded-full font-mono font-medium tabular-nums text-blue-700 dark:text-blue-300 text-sm whitespace-nowrap">
                     <ClockIcon className="inline-block mr-1.5 w-4 h-4 align-text-bottom" />
                     {`${(elapsedTime / 1000).toFixed(1)}s`}
                  </div>
               </div>

               {/* Mode Notification (Serif) */}
                {loadingMode === 'think' && (
                 <motion.div /* ... animation ... */ className="bg-purple-50 dark:bg-purple-950/20 shadow-sm px-4 py-3 border-purple-500 border-l-4 rounded-r-lg text-purple-700 dark:text-purple-300">
                   <div className="flex items-center gap-2">
                     <BrainCog className="flex-shrink-0 w-5 h-5 text-purple-600 dark:text-purple-400" /> {/* Consistent icon */}
                     <p className="font-serif font-medium text-sm"> {/* Serif */}
                       Using Deep analysis mode... this may take 1-3 minutes.
                     </p>
                   </div>
                 </motion.div>
                )}

               {/* Progress Bar (Keep) */}
               <ModernProgress /* ... props ... */ />

               {/* Show research sidebar button (Sans-serif for button) */}
               <div className="font-serif text-gray-600 dark:text-gray-400 text-center text-sm"> {/* Serif description */}
                 <div className="flex flex-col items-center gap-2">
                   <p>Follow the progress in the activity panel.</p> {/* Simpler text */}
                   <button
                     onClick={() => setSidebarOpen(!sidebarOpen)}
                     className="flex items-center gap-1.5 mt-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-lg font-sans font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors" // Sans-serif
                   >
                     {sidebarOpen ? 'Hide' : 'Show'} Activity
                      {/* Simple chevron or similar icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <polyline points={sidebarOpen ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}></polyline>
                      </svg>
                   </button>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div /* ... animation ... */
               // Cleaner error box
              className="flex items-start gap-4 bg-red-50 dark:bg-red-950/20 shadow-lg mt-8 p-5 border border-red-200 dark:border-red-600/30 rounded-xl text-red-700 dark:text-red-300"
            >
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 mt-0.5 p-2 rounded-full">
                <AlertCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-grow">
                <p className="mb-1 font-serif font-semibold text-red-800 dark:text-red-200 text-lg">Research Failed</p>
                <p className="font-serif text-red-700 dark:text-red-300 text-sm break-words">{error.message || 'An unknown error occurred.'}</p>
                <button
                   onClick={() => { setError(null); /* Clear only error */ }}
                   className="bg-red-100 hover:bg-red-200 dark:bg-red-800/60 dark:hover:bg-red-700/70 mt-4 px-3 py-1.5 rounded-lg font-sans font-medium text-red-700 dark:text-red-200 text-sm transition-colors"
                 >
                  Dismiss
                </button>
              </div>
               {/* Button to close sidebar on error if it's open */}
               {sidebarOpen && (
                   <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 text-red-400 hover:text-red-600 dark:text-red-600 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                       <X className="w-4 h-4" />
                   </button>
               )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Display & Sources (Apply Serif, use displayedSources) */}
        <AnimatePresence>
          {report && !loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-b from-white dark:from-black to-gray-50 dark:to-black/95 shadow-xl dark:shadow-blue-500/5 mt-8 border border-gray-200 dark:border-gray-800/80 rounded-2xl overflow-hidden"
            >
              {/* Padding wrapper */}
              <div className="p-6 md:p-10">
                {/* Report Header (Serif title, Sans/Mono for badges) */}
                <div className="flex md:flex-row flex-col justify-between md:items-center gap-4 mb-6 pb-4 border-gray-200 dark:border-gray-700/60 border-b">
                  <h2 className="flex items-center gap-3 font-serif font-semibold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight"> {/* Serif */}
                    <div className="bg-gradient-to-br from-blue-100 dark:from-blue-900/50 to-indigo-100 dark:to-indigo-900/60 p-2 rounded-lg"> {/* Smaller icon bg */}
                      <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Research Report
                  </h2>
                  {/* Metrics Display (Sans/Mono fonts) */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 bg-gray-50 dark:bg-gray-800/50 shadow-inner p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-xs font-sans"> {/* Base Sans */}
                    {finalSourceCount !== null && (
                      <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded" title="Sources Analyzed">
                        <LinkIcon className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{finalSourceCount.toLocaleString()}</span>
                        <span className="text-gray-500 dark:text-gray-500">sources</span>
                      </div>
                    )}
                    {elapsedTime > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-mono" title="Execution Time"> {/* Mono for time */}
                        <ClockIcon className="w-3 h-3 text-amber-500" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{(elapsedTime / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    {finalModelUsed && (
                       <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded" title="Model Used">
                         <BrainCog className="w-3 h-3 text-purple-500" /> {/* Consistent icon */}
                          {/* Updated Model Name Logic */}
                         <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
                           { finalModelUsed.includes('pro') ? 'Gemini Pro' :
                             finalModelUsed.includes('flash') ? 'Gemini Flash' :
                             finalModelUsed /* Fallback to raw name */
                           }
                         </span>
                       </div>
                     )}
                  </div>
                </div>

                {/* Markdown Report Content (Ensure renderers apply serif) */}
                <div className="prose prose-base lg:prose-lg prose-serif dark:prose-invert prose-img:rounded-md prose-img:shadow-sm prose-img:border dark:prose-hr:border-gray-700 dark:prose-img:border-gray-700 dark:prose-thead:border-gray-600 dark:prose-tr:border-gray-700/60 max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={renderers}
                  >
                    {report}
                  </ReactMarkdown>
                </div>

               {/* Sources Section (Displayed below report, use displayedSources state) */}
               {displayedSources && displayedSources.length > 0 && (
                  <div className="mt-10 pt-6 border-gray-200 dark:border-gray-700/60 border-t">
                    <h3 className="flex items-center gap-2.5 mb-5 font-serif font-semibold text-gray-800 dark:text-gray-200 text-xl md:text-2xl"> {/* Serif */}
                       <LinkIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                       Sources Referenced ({displayedSources.length})
                     </h3>
                     <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                       {displayedSources.map((source, index) => (
                         <SourceItem key={(source.id || source.url) + '-' + index} source={source} />
                       ))}
                     </div>
                   </div>
                )}


                {/* Report Footer (Sans-serif for buttons) */}
                <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mt-10 pt-6 border-gray-200 dark:border-gray-700/60 border-t">
                  <button
                    onClick={() => {
                      if (report) {
                        navigator.clipboard.writeText(report)
                          .then(() => alert('Report copied to clipboard!'))
                          .catch(err => console.error('Failed to copy report:', err));
                      }
                    }}
                    className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/70 shadow-sm px-3 py-1.5 rounded-lg font-sans font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors"
                  >
                    <CopyIcon className="w-4 h-4" />
                    Copy Report
                  </button>
                  <button
                    onClick={() => { setQuery(''); setReport(null); setDisplayedSources([]); setError(null); setElapsedTime(0); setFinalModelUsed(null); setFinalSourceCount(null); setCurrentJobId(null); setSidebarOpen(false); }}
                    className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-sm px-3 py-1.5 rounded-lg font-sans font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors"
                  >
                    <SearchIcon className="w-4 h-4" />
                    New Research
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Research Sidebar (Pass relevant props) */}
        <ResearchSidebar
          open={sidebarOpen}
          jobId={currentJobId || undefined}
          query={query}
          mode={loadingMode || undefined}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
}