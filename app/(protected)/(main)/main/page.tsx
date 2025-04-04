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
      // console.log('[Poll] Fetching progress...'); // Keep if needed for debugging
      const res = await fetch('/api/research/progress', { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        // console.log('[Poll] Received data:', data); // Keep if needed

        if (data.metrics) {
          // console.log('[Poll] Updating progress state:', data.metrics);
          setCurrentProgress(prev => ({
                sourcesCount: data.metrics.sourcesCount ?? prev?.sourcesCount ?? 0,
                domainsCount: data.metrics.domainsCount ?? prev?.domainsCount ?? 0,
                dataSize: data.metrics.dataSize ?? prev?.dataSize ?? '0KB',
                elapsedTime: data.metrics.elapsedTime ?? prev?.elapsedTime ?? 0,
           }));
        } else {
            // console.log('[Poll] No metrics data in response.');
        }

        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
           // console.log('[Poll] Updating logs...');
           const newLogsToAdd = data.logs
             .map((logContent: string) => `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${logContent}`); // Standard timestamp

           setLiveLogs(prevLogs => {
               // Efficiently add only unique new logs based on timestamp + content
               const existingLogEntries = new Set(prevLogs);
               const uniqueNewLogs = newLogsToAdd.filter(log => !existingLogEntries.has(log));
               // Keep max 100 logs, add new ones to the end
               return [...prevLogs, ...uniqueNewLogs].slice(-100);
           });

           if(newLogsToAdd.length > 0) {
               const latestLog = data.logs[data.logs.length - 1]; // Get original log content
                // Simplify status more effectively
                const simplifiedStatus = latestLog
                    .replace(/^Phase \d+(\.\d+)*:\s*/, '') // Remove Phase prefix
                    .replace(/\[\d+\/\d+\]\s*/, '') // Remove batch numbers
                    .replace(/Crawling (Level \d Batch \d+\/\d+).*/, 'Crawling...') // Simplify crawling logs
                    .replace(/Fetching initial results.*/, 'Fetching search results...')
                    .replace(/Extracting links from top \d+ sources.*/, 'Extracting links for deep crawl...')
                    .replace(/Starting Level \d crawl.*/, 'Crawling sources...')
                    .replace(/Prioritizing all \d+ collected sources.*/, 'Prioritizing sources...')
                    .replace(/Analyzing data from top \d+ sources.*/, 'Analyzing data...')
                    .replace(/Generating final analysis report.*/, 'Generating report...')
                    .replace(/Finalizing report and metrics.*/, 'Finalizing...')
                    .replace(/:\s*".*?"$/, ''); // Remove trailing query in quotes
               setCurrentStatus(simplifiedStatus.trim());
           }
        } else {
            // console.log('[Poll] No logs data in response.');
        }

      } else {
         console.warn('[Poll] Progress poll failed:', res.status);
      }
    } catch (error) {
      console.error('[Poll] Progress poll fetch error:', error);
    }
  }, []); // pollResearchProgress dependencies remain empty

  const handleResearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentProgress(null);
    setLiveLogs(['[' + new Date().toLocaleTimeString('en-US', { hour12: false }) + '] Initializing research...']); // Start with an initial log
    setCurrentStatus('Initializing research...');
    setShowLiveLogs(false); // Keep logs collapsed initially

    if (progressPollRef.current) clearInterval(progressPollRef.current);
    pollResearchProgress(); // Poll immediately
    progressPollRef.current = setInterval(pollResearchProgress, 2500); // Poll every 2.5 seconds

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (progressPollRef.current) clearInterval(progressPollRef.current);
      progressPollRef.current = null;

      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status}` };
          try {
              const jsonError = await res.json();
              if (jsonError.error) errorData = jsonError.error;
              // If report exists in error response, show it (e.g., partial analysis on timeout)
              if (jsonError.report) setReport(jsonError.report);
               // Set metrics even on error if available
               if (jsonError.metrics) setCurrentProgress(jsonError.metrics);
          } catch (parseError) { }
          throw errorData;
      }

      const data = await res.json();

      if (data.error) {
          // If report exists in error response, show it
          if (data.report) setReport(data.report);
           // Set metrics even on error if available
           if (data.metrics) setCurrentProgress(data.metrics);
          throw data.error as ResearchError;
      }

      // Success
      // console.log('[Research] Success. Final data:', data);
      setReport(data.report);
      if (data.metrics) {
         setCurrentProgress(data.metrics);
         setCurrentStatus(`Research complete in ${(data.metrics.elapsedTime / 1000).toFixed(1)}s`);
      } else {
         setCurrentStatus('Research complete');
      }

      const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
      saveHistory(newHistory);

    } catch (err) {
      console.error("Research handling error:", err);
      if (progressPollRef.current) clearInterval(progressPollRef.current);
      progressPollRef.current = null;

      if (typeof err === 'object' && err !== null && 'message' in err) {
          setError(err as ResearchError);
      } else {
          setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      }
      // Don't clear report if it was set during error handling above
      // setReport(null);
      setCurrentStatus('Research failed');
    } finally {
      setLoading(false);
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
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
    // --- Code Block Renderer ---
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const language = match ? match[1] : 'text'; // Default to 'text' if no language detected

      // Determine if it should be rendered as a block or inline
      // Render as block if it's explicitly not inline OR if it contains newline characters
      // OR if it's language-text but looks like a block (> 60 chars, maybe?)
       const isBlock = !inline || codeString.includes('\n') || (language === 'text' && codeString.length > 60);


      // --- BLOCK CODE ---
      if (isBlock && language !== 'text') { // Only apply syntax highlighting if language is detected
        const style = theme === 'dark' ? oneDark : oneLight; // Use better themes

        return (
          <div className="group code-block relative mb-6 shadow-md rounded-lg border border-gray-200 dark:border-gray-700/80"> {/* Increased bottom margin */}
            {/* Header Bar */}
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/80 px-4 py-2 border-b border-gray-200 dark:border-gray-700/80 rounded-t-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium">
                    <TerminalIcon className="w-4 h-4" />
                    <span>{language.toUpperCase()}</span>
                </div>
              <button
                onClick={() => handleCopyCode(codeString)}
                className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors duration-150"
                aria-label="Copy code"
              >
                {copiedCode === codeString ? (
                   <> <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> Copied </>
                ) : (
                   <> <CopyIcon className="w-3.5 h-3.5" /> Copy </>
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={style}
              language={language}
              PreTag="div"
              className="!bg-white dark:!bg-gray-900 !py-4 !px-0 rounded-b-lg !text-sm !leading-relaxed overflow-x-auto" // Improved background, padding, overflow
              showLineNumbers={codeString.split('\n').length > 3} // Show line numbers for more than 3 lines
              wrapLongLines={false} // Disable wrapping for code blocks
              lineNumberStyle={{ color: theme === 'dark' ? '#6b7280' : '#9ca3af', fontSize: '0.8em', paddingRight: '1em', userSelect: 'none' }} // Subtle line numbers
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.5rem 0.5rem', // Only bottom corners rounded
                // padding: '1rem', // Padding handled by className
                fontSize: '0.875rem', // text-sm
                lineHeight: '1.6',
                backgroundColor: theme === 'dark' ? '#111827' /* gray-900 */ : '#ffffff', // Ensure bg matches theme
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
      // Handle inline code or code blocks without a specific language (render as simple pre/code)
      return (
         // If it was determined to be a block (e.g., long text), render in a basic block format
         isBlock ? (
             <pre className="block bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 shadow-sm rounded-md p-3 mb-4 overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-words">
                 <code>{children}</code>
             </pre>
         ) : (
            // Otherwise, render inline
            <code className="bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-pink-400 font-mono text-[0.875em] px-[0.5em] py-[0.15em] mx-[0.1em] rounded-sm break-words" {...props}>
              {children}
            </code>
         )
      );
    },

    // --- Table Renderer ---
    table: ({ node, ...props }: any) => (
      <div className="shadow-md my-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full min-w-[600px] text-sm border-collapse divide-y divide-gray-200 dark:divide-gray-700" {...props} />
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      <thead className="bg-gray-100 dark:bg-gray-800/80" {...props} />
    ),
    tableRow: ({ node, isHeader, ...props }: any) => (
      <tr className={`border-b border-gray-200 dark:border-gray-700/80 ${!isHeader ? "odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800/40 dark:even:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" : ""}`} {...props} />
    ),
    tableCell: ({ node, isHeader, style, ...props }: any) => {
      const align = style?.textAlign as 'left' | 'right' | 'center' | undefined;
      let alignClass = 'text-left';
      if (align === 'right') alignClass = 'text-right';
      if (align === 'center') alignClass = 'text-center';

      const cellProps = {
        className: `px-4 py-3 ${alignClass} ${isHeader ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`, // Improved styling and alignment
        ...props,
      };
      return isHeader ? <th {...cellProps} /> : <td {...cellProps} />;
    },

    // --- Heading Renderers ---
    h1: ({ node, children, ...props }: any) => <h1 className="mt-10 mb-6 pb-3 border-b border-gray-300 dark:border-gray-600/80 font-sans font-bold text-gray-900 dark:text-gray-100 text-3xl tracking-tight" {...props}>{children}</h1>,
    h2: ({ node, children, ...props }: any) => {
      const text = String(children);
      const sectionIconMap: Record<string, React.ElementType> = {
        'Research Path': ArrowRightIcon, 'Top Sources Sample': GlobeIcon, 'Source Analysis Overview': DatabaseIcon,
        'Comparative Assessment': RefreshCwIcon, 'Executive Summary': BookOpenIcon, 'Key Findings': CheckIcon,
        'Detailed Analysis': SearchIcon, 'Technical Details': FileTextIcon, 'Research Methodology': BrainIcon,
        'Code Examples': TerminalIcon, 'Visual References': ImageIcon, 'Key Insights': AlertCircleIcon,
        'Confidence Level Assessment': CheckIcon, 'Conclusions': CheckIcon, 'References': BookOpenIcon,
        'Limitations': AlertCircleIcon, 'Future Directions': ArrowRightIcon, 'Introduction': BookOpenIcon,
      };
       // Find best matching section using startsWith
      const matchingSection = Object.keys(sectionIconMap).find(section => text.trim().startsWith(section));

      if (matchingSection) {
        const SectionIcon = sectionIconMap[matchingSection];
        return (
          <h2 className="flex items-center mt-12 mb-6 pb-3 border-b border-blue-200 dark:border-blue-800/50 font-sans font-semibold text-blue-700 dark:text-blue-300 text-2xl tracking-tight" {...props}>
            <div className="bg-blue-100 dark:bg-blue-900/50 mr-3 p-2 rounded-lg shadow-sm"> {/* Slightly larger icon background */}
              <SectionIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            {text}
          </h2>
        );
      }
      // Default H2 style
      return <h2 className="mt-10 mb-5 pb-2 border-b border-gray-200 dark:border-gray-700 font-sans font-semibold text-gray-800 dark:text-gray-200 text-2xl tracking-tight" {...props}>{children}</h2>;
    },
    h3: ({ node, children, ...props }: any) => <h3 className="mt-8 mb-4 font-sans font-semibold text-gray-800 dark:text-gray-300 text-xl" {...props}>{children}</h3>,
    // Add h4, h5, h6 if needed with decreasing font size and margin

    // --- Link Renderer ---
    a: ({ node, href, children, ...props }: any) => {
      const url = href || '';
      // Basic check for external links
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      const textContent = Array.isArray(children) ? children.join('') : String(children);

      // Handle image links (link IS the image)
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
         return (
           <a href={url} target="_blank" rel="noopener noreferrer" className="block shadow-md hover:shadow-lg my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-shadow duration-200">
             <img src={url} alt={textContent || 'Linked image'} className="max-w-full h-auto block" loading="lazy" />
           </a>
         );
      }

       // Handle images wrapped in links (![alt](src))
      if (node?.children?.[0]?.tagName === 'img') {
        const imgNode = node.children[0];
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block my-4">
            <img
              src={imgNode.properties.src}
              alt={imgNode.properties.alt || 'Embedded image'}
              className="shadow-md hover:shadow-lg mx-auto border border-gray-200 dark:border-gray-700 rounded-lg max-w-full h-auto transition-shadow duration-200"
              loading="lazy"
            />
          </a>
        );
      }

      // Normal External links
      if (isExternal) {
        let domain = '';
        let faviconUrl = '';
        try {
          domain = extractDomain(url);
          faviconUrl = getFaviconUrl(domain);
        } catch (e) {
             console.warn("Could not parse domain for favicon:", url);
        }

        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-4 decoration-blue-500/50 hover:decoration-blue-500 transition-all duration-150 break-words" // Added break-words
            {...props}
          >
            {faviconUrl && domain && ( // Only show favicon if URL is valid and domain parsed
              <img
                src={faviconUrl}
                alt={`${domain} favicon`}
                className="inline-block mr-0.5 rounded-sm w-4 h-4 align-text-bottom transition-opacity" // Removed opacity for always visible
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span>{children}</span>
            <ExternalLinkIcon className="inline-block opacity-70 group-hover:opacity-100 ml-0.5 w-3.5 h-3.5 align-text-bottom transition-opacity" />
          </a>
        );
      }

      // Internal/Relative links (if any)
      return (
        <a href={url} className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 decoration-blue-500/50 hover:decoration-blue-500 transition-colors" {...props}>
          {children}
        </a>
      );
    },

    // --- List Item Renderer ---
    // Updated to parse the new source format AND make the entire item clickable
    li: ({ node, children, ordered, ...props }: any) => {
       // Get text content cleanly, handling nested strong/a tags
       let textContent = '';
       node.children?.forEach((child: any) => {
           if (child.type === 'text') textContent += child.value;
           else if (child.children && child.children.length > 0) {
               child.children.forEach((grandChild: any) => {
                   if (grandChild.type === 'text') textContent += grandChild.value;
               });
           }
       });
       textContent = textContent.trim();

       // Regex to match the source format: [Title](URL) (Domain: ..., Relevance: ...)
       // Note: The URL is inside the link tag, not directly in textContent
       const sourceMatch = textContent.match(/^\[(.*?)\]\s*\(Domain: (.*?), Relevance: (.*?)\)\s*$/);
       // Attempt to extract URL from the first 'a' tag child
       const linkNode = node.children?.find((child: any) => child.tagName === 'a');
       const url = linkNode?.properties?.href || '#';

       // Check if it's an unordered list item matching the source pattern AND has a valid URL
      if (sourceMatch && !ordered && url !== '#') {
         const title = sourceMatch[1];
         const domain = sourceMatch[2];
         const relevance = sourceMatch[3];
         const faviconUrl = getFaviconUrl(domain);

         // *** RENDER THE ENTIRE LIST ITEM AS A CLICKABLE LINK ***
        return (
          <li className="group list-none p-0 m-0 mb-3" {...props}> {/* Reset list style, add bottom margin */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/40 p-3.5 border border-gray-200 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg w-full transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {faviconUrl && (
                <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 dark:bg-gray-700 p-1 border border-gray-200 dark:border-gray-600 rounded-md w-9 h-9 overflow-hidden"> {/* Slightly larger favicon area */}
                  <img
                    src={faviconUrl}
                    alt={domain}
                    className="w-5 h-5 object-contain" // Favicon size
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                       const parent = target.parentElement;
                       if (parent) { // Fallback to initial letter
                         parent.innerHTML = `<span class="font-bold text-blue-500 dark:text-blue-400 text-md">${domain.charAt(0).toUpperCase()}</span>`;
                       }
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-grow min-w-0">
                <div className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 text-sm leading-snug line-clamp-2 transition-colors"> {/* Allow 2 lines for title */}
                  {title}
                </div>
                <div className="flex items-center gap-1 mt-1 text-gray-500 dark:text-gray-400 text-xs truncate">
                  <GlobeIcon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{domain}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 ml-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 rounded-full font-semibold text-blue-700 dark:text-blue-300 text-xs whitespace-nowrap shadow-inner">
                  {relevance}
                </div>
                <ExternalLinkIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </a>
          </li>
        );
      }

       // --- Research Path Item Renderer ---
       const pathKeywords = ['Initial query:', 'Research area', 'Follow-up query', 'Step '];
       const isPathItem = pathKeywords.some(keyword => textContent?.startsWith(keyword));

       if (isPathItem && !ordered) {
           const queryMatch = textContent?.match(/"([^"]+)"/);
           const queryText = queryMatch ? queryMatch[1] : textContent;
           const prefix = textContent?.split('"')[0] || '';

           let PathIcon = ArrowRightIcon;
           if (prefix.includes('Initial')) PathIcon = SearchIcon;
           else if (prefix.includes('area')) PathIcon = BrainIcon;

        return (
           <li className="group list-none p-0 m-0 mb-1.5" {...props}> {/* Reset list style */}
               <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 py-1.5 pl-3 pr-2 border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500 border-l-2 rounded-r-md transition-colors">
                   <div className="flex-shrink-0 mr-2 text-gray-500 dark:text-gray-400">
                       <PathIcon className="w-4 h-4" />
                   </div>
                   <div className="text-sm text-gray-600 dark:text-gray-300">
                       {prefix && <span className="mr-1 text-gray-500 dark:text-gray-400">{prefix.replace(':', '').trim()}:</span>}
                       <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                           {queryMatch ? `"${queryText}"` : queryText}
                       </span>
                   </div>
               </div>
           </li>
         );
      }

      // --- Default List Item Renderer ---
      return (
        <li className="group flex items-start mb-2 ml-1" {...props}> {/* Added small left margin */}
           <span className={`mt-1 mr-2.5 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium w-5 text-right' : 'text-blue-500 dark:text-blue-400 flex-shrink-0'}`}> {/* Adjusted spacing */}
            {ordered ? `${(props.index ?? 0) + 1}.` : ( // Ensure index is defined
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-125 transition-transform">
              <circle cx="3" cy="3" r="3" fill="currentColor" />
            </svg>
            )}
          </span>
           <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</span> {/* Standard text */}
        </li>
      );
    },

     // --- Paragraph Renderer ---
    p: ({ node, children, ...props }: any) => {
       // Simple check for empty paragraphs
       if (node.children.every((child: any) => child.type === 'text' && /^\s*$/.test(child.value))) {
         return null; // Render nothing
       }

       // Check if paragraph only contains an image (common in markdown)
       const containsOnlyImage = node.children.length === 1 && (node.children[0].tagName === 'img' || (node.children[0].tagName === 'a' && node.children[0].children?.[0]?.tagName === 'img'));
       if (containsOnlyImage) {
         // Render children directly, the 'a' or 'img' renderer will handle it
         return <>{children}</>;
       }

       // Default paragraph rendering
      return <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>{children}</p>;
     },

     // --- Image Renderer ---
     img: ({ node, src, alt, ...props }: any) => (
       <span className="block my-6 text-center">
         <a href={src} target="_blank" rel="noopener noreferrer" title="Click to view full image"> {/* Wrap in link */}
           <img
             src={src}
             alt={alt || 'Research image'}
             className="shadow-lg hover:shadow-xl mx-auto border border-gray-200 dark:border-gray-700 rounded-lg max-w-full h-auto transition-all duration-200 cursor-pointer"
             loading="lazy"
             {...props}
           />
         </a>
         {alt && <figcaption className="mt-2 text-gray-500 dark:text-gray-400 text-xs italic">{alt}</figcaption>}
       </span>
     ),

     // --- Custom List Container Renderers ---
     // Apply specific styling to lists containing our custom source/path items
     ul: ({ node, children, className, ...props }: any) => {
         // Check if this list contains our custom source or path list items
         const containsCustomItems = node.children.some((child: any) => {
             if (child.tagName !== 'li') return false;
             // Rough check based on the expected structure in custom li renderers
             return child.children?.some((grandChild: any) =>
                 grandChild.tagName === 'a' || // Source item has 'a' tag wrapper
                 grandChild.children?.some((greatGrandChild: any) => greatGrandChild.tagName === 'svg') // Default li has svg
             );
         });

         // Apply specific class if it's a list of sources or paths to remove default padding/margins
         if (containsCustomItems) {
             return <ul className="list-none p-0 m-0 space-y-1" {...props}>{children}</ul>; // Remove list styles, add vertical space
         }
         // Default list styling
         return <ul className="list-disc space-y-2 pl-6 mb-4 text-gray-700 dark:text-gray-300" {...props}>{children}</ul>;
     },
     ol: ({ node, children, className, ...props }: any) => (
         <ol className="list-decimal space-y-2 pl-6 mb-4 text-gray-700 dark:text-gray-300" {...props}>{children}</ol>
     ),

     // --- Horizontal Rule ---
     hr: ({ node, ...props }: any) => (
         <hr className="my-8 border-gray-200 dark:border-gray-700/60" {...props} />
     ),

     // --- Blockquote ---
     blockquote: ({ node, children, ...props }: any) => (
         <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 pr-2 py-2 my-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-r-md shadow-inner" {...props}>
             {children}
         </blockquote>
     ),

  };

  // --- Component Return ---
  return (
    // Changed background, added font-sans
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
            <div className="relative group"> {/* Added group for focus-within styling */}
              <div className="absolute left-0 inset-y-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <SearchIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Latest advancements in serverless computing for Next.js"
                // Updated styling for modern look
                className="block w-full bg-white dark:bg-gray-900/80 shadow-md hover:shadow-lg focus:shadow-xl py-4 pr-36 pl-12 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                 // Updated button styling
                className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:from-gray-500 disabled:to-gray-600 shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-blue-400/30 px-5 h-[75%] rounded-lg font-semibold text-white text-base transition-all duration-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                aria-label="Start Research"
              >
                {loading ? (
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : (
                   <>
                     <span className="hidden sm:inline">Research</span>
                     <SearchIcon className="w-5 h-5 sm:hidden" /> {/* Icon for small screens */}
                   </>
                )}
              </button>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 bg-white dark:bg-gray-900/50 shadow-sm p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                 <div className="flex items-center gap-2 overflow-x-auto text-gray-600 dark:text-gray-400 text-sm">
                    <HistoryIcon className="flex-shrink-0 w-4 h-4" />
                    <span className="mr-1 font-medium text-xs uppercase tracking-wider">Recent:</span>
                    {searchHistory.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => { if (!loading) setQuery(q); }}
                        disabled={loading}
                        className="bg-gray-100 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-blue-900/50 disabled:opacity-60 shadow-sm hover:shadow px-3 py-1 rounded-full text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 text-xs whitespace-nowrap transition-all duration-150"
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

        {/* Loading State */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                 // Updated loading state styling
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
                {currentProgress && (
                  <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-medium text-gray-500 dark:text-gray-400 text-sm shadow-inner">
                    {`${(currentProgress.elapsedTime / 1000).toFixed(1)}s`}
                  </div>
                )}
                </div>

              {/* Current Status */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 p-4 border border-blue-200 dark:border-blue-800/50 rounded-lg shadow-sm">
                <div className="flex items-center gap-2.5 font-medium text-gray-800 dark:text-gray-200 text-sm">
                  <BrainIcon className="flex-shrink-0 w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span className="truncate">{currentStatus || 'Starting research...'}</span>
                      </div>
                    </div>

              {/* Metrics Grid */}
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
                  {/* Sources */}
                  <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 dark:from-gray-800/70 to-blue-100 dark:to-blue-900/40 shadow-md p-4 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                      <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                          <GlobeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                          <div className="mb-0.5 font-medium text-blue-800 dark:text-blue-300 text-xs uppercase tracking-wider">Sources Found</div>
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-xl">
                              {currentProgress?.sourcesCount.toLocaleString() ?? <Loader2Icon className="inline w-4 h-4 animate-spin" />}
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
                           <div className="font-bold text-gray-900 dark:text-gray-100 text-xl">
                               {currentProgress?.domainsCount.toLocaleString() ?? <Loader2Icon className="inline w-4 h-4 animate-spin" />}
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
                           <div className="font-bold text-gray-900 dark:text-gray-100 text-xl">
                               {currentProgress?.dataSize ?? <Loader2Icon className="inline w-4 h-4 animate-spin" />}
                           </div>
                       </div>
                   </div>
              </div>

              {/* Live Logs */}
                  <div className="space-y-2">
                     <div className="flex justify-end items-center">
                      <button
                        onClick={() => setShowLiveLogs(!showLiveLogs)}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-3 py-1 rounded-full font-medium text-gray-600 dark:text-gray-300 text-xs transition-colors shadow-sm"
                      >
                         <FileTextIcon className="w-3.5 h-3.5" />
                         {showLiveLogs ? 'Hide Logs' : 'Show Logs'}
                      </button>
                     </div>

                     <AnimatePresence>
                      {showLiveLogs && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto', maxHeight: '250px' }} // Added max height
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden" // Prevents content spill during animation
                        >
                          <div className="bg-gray-50 dark:bg-black/60 p-4 border border-gray-200 dark:border-gray-700/80 rounded-lg max-h-[250px] overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800/50 shadow-inner">
                            {liveLogs.length > 1 ? ( // Show logs if more than the initial one
                              liveLogs.map((log, index) => (
                                <div key={index} className="mb-1.5 text-gray-600 dark:text-gray-400/90 break-words whitespace-pre-wrap leading-relaxed last:mb-0">
                                  {log}
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-gray-500 dark:text-gray-400 italic">Waiting for research logs...</div>
                            )}
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
                className="flex items-start gap-4 bg-red-50 dark:bg-red-900/30 shadow-lg border border-red-200 dark:border-red-500/50 rounded-xl p-5 text-red-700 dark:text-red-300 mt-8" // Added margin top
              >
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/50 mt-0.5 p-2 rounded-full">
                 <ServerCrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              <div className="flex-grow">
                 <p className="mb-1 font-semibold text-red-800 dark:text-red-200 text-lg">Research Failed ({error.code || 'Error'})</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error.message || 'An unknown error occurred.'}</p>
                  {/* Optionally show partial report if available in error */}
                  {report && (
                     <details className="mt-3 text-xs border-t border-red-200 dark:border-red-500/30 pt-2">
                         <summary className="cursor-pointer font-medium text-red-600 dark:text-red-400">Show partial report/details</summary>
                         <div className="mt-2 p-3 bg-red-100/50 dark:bg-red-900/40 rounded max-h-48 overflow-y-auto font-mono text-red-700 dark:text-red-300">
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
          {report && !loading && !error && ( // Only show report if not loading AND no error
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }} // Slight delay for smoother transition
                // Updated Report Styling
                className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/95 shadow-xl backdrop-blur-xl mt-8 p-6 md:p-10 border border-gray-200 dark:border-gray-700/80 rounded-2xl"
              >
              {/* Report Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 pb-5 border-gray-200 dark:border-gray-700/80 border-b">
                  <h2 className="flex items-center gap-3 font-sans font-semibold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-inner">
                      <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Research Report
                  </h2>
                  {/* Final Metrics Display */}
                  {currentProgress && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-gray-50 dark:bg-gray-800/70 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-xs shadow-sm">
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

              {/* Markdown Report Content - Applied Tailwind Prose for base styling */}
              <div className="prose prose-lg dark:prose-invert prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700 prose-a:font-medium prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-blockquote:font-normal prose-blockquote:not-italic prose-table:text-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={renderers} // Use our enhanced custom renderers
                  >
                    {report}
                  </ReactMarkdown>
                </div>

              {/* Report Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 pt-6 border-gray-200 dark:border-gray-700/80 border-t">
                  <button
                    onClick={() => {
                      if (report) {
                        navigator.clipboard.writeText(report)
                          .then(() => alert('Report copied to clipboard!'))
                          .catch(err => console.error('Failed to copy report:', err));
                      }
                    }}
                    className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/70 px-4 py-2 rounded-lg font-medium text-blue-700 dark:text-blue-300 text-sm transition-colors shadow-sm hover:shadow-md"
                  >
                    <CopyIcon className="w-4 h-4" />
                    Copy Full Report
                  </button>
                  <button
                    onClick={() => { setQuery(''); setReport(null); setError(null); }}
                    className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors shadow-sm hover:shadow-md"
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
