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
  ServerCrashIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism as lightStyle } from 'react-syntax-highlighter/dist/cjs/styles/prism';
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
    // Removed dependency on loading state here, as the interval clearing handles it
    try {
      console.log('[Poll] Fetching progress...'); // Add log
      const res = await fetch('/api/research/progress', {
        cache: 'no-store', // Ensure fresh data
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Poll] Received data:', data); // Add log to see the raw data

        // Update progress metrics if available
        if (data.metrics) {
           console.log('[Poll] Updating progress state:', data.metrics); // Add log before state update
           // Ensure we are setting a valid metrics object
           setCurrentProgress(prev => ({
                sourcesCount: data.metrics.sourcesCount ?? prev?.sourcesCount ?? 0,
                domainsCount: data.metrics.domainsCount ?? prev?.domainsCount ?? 0,
                dataSize: data.metrics.dataSize ?? prev?.dataSize ?? '0KB',
                elapsedTime: data.metrics.elapsedTime ?? prev?.elapsedTime ?? 0,
           }));
           // Optional: Update status based on metrics
           // setCurrentStatus(deriveStatusFromMetrics(data.metrics));
        } else {
            console.log('[Poll] No metrics data in response.'); // Add log if metrics are missing
        }

        // Update live logs
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
           console.log('[Poll] Updating logs...'); // Add log
           setLiveLogs(prevLogs => {
             const existingLogsSet = new Set(prevLogs.map(log => log.substring(log.indexOf(']') + 2))); // Compare content only
             const newLogs = data.logs
               .filter((logContent: string) => !existingLogsSet.has(logContent)) // Filter by content
               .map((logContent: string) => `[${new Date().toLocaleTimeString()}] ${logContent}`); // Add timestamp
             return [...prevLogs, ...newLogs];
           });
           // Update current status with the latest log message
           if(data.logs.length > 0) {
               const latestLog = data.logs[data.logs.length - 1];
               const simplifiedStatus = latestLog
                    .replace(/\[\d+\/\d+\]\s*/, '')
                    .replace(/:\s*".*?"$/, '');
               setCurrentStatus(simplifiedStatus);
           }
        } else {
            console.log('[Poll] No logs data in response.'); // Add log if logs are missing
        }

      } else {
         console.warn('[Poll] Progress poll failed:', res.status);
      }
    } catch (error) {
      console.error('[Poll] Progress poll fetch error:', error);
    }
  }, []); // Remove loading dependency, useCallback will use the latest state via refs implicitly if needed, or pass state setters if absolutely required

  const handleResearch = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentProgress(null); // Explicitly reset progress
    setLiveLogs([]);
    setCurrentStatus('Initializing research...');
    setShowLiveLogs(false);

    // Start polling for progress immediately
    if (progressPollRef.current) clearInterval(progressPollRef.current);
    // Poll immediately once and then set interval
    pollResearchProgress();
    progressPollRef.current = setInterval(pollResearchProgress, 2500);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      // Stop polling once the main request is finished (success or failure)
      if (progressPollRef.current) clearInterval(progressPollRef.current);
      progressPollRef.current = null; // Clear the ref

      if (!res.ok) {
          let errorData: ResearchError = { code: 'FETCH_FAILED', message: `Request failed with status ${res.status}` };
          try {
              // Try to parse specific error from backend
              const jsonError = await res.json();
              if (jsonError.error) {
                  errorData = jsonError.error;
              }
          } catch (parseError) {
              // Ignore if response is not JSON
          }
          throw errorData; // Throw the structured error
      }

      const data = await res.json();

      // Backend should ideally return an error object if something failed internally
      if (data.error) {
          throw data.error as ResearchError;
      }

      // Success
      console.log('[Research] Success. Final data:', data); // Log final data
      setReport(data.report);
      // Ensure final metrics are set correctly
      if (data.metrics) {
         setCurrentProgress(data.metrics);
         setCurrentStatus(`Research complete in ${(data.metrics.elapsedTime / 1000).toFixed(1)}s`);
      } else {
         // Fallback status if metrics missing in final response (shouldn't happen ideally)
         setCurrentStatus('Research complete');
      }

      // Update history only on successful research
        const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
        saveHistory(newHistory);

    } catch (err) {
      console.error("Research handling error:", err);
      // Stop polling on error
      if (progressPollRef.current) clearInterval(progressPollRef.current);
      progressPollRef.current = null; // Clear the ref

      // Set the error state with the caught error object
      if (typeof err === 'object' && err !== null && 'message' in err) {
          setError(err as ResearchError);
      } else {
          setError({ code: 'UNKNOWN_CLIENT_ERROR', message: 'An unexpected client-side error occurred.' });
      }
      setReport(null); // Clear any partial report
      setCurrentStatus('Research failed'); // Update status
    } finally {
      setLoading(false);
      // Defensive clear just in case
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
      // Render as block if it's not inline OR if it contains newline characters
      const isBlock = !inline || codeString.includes('\n');

      if (isBlock) {
        // Choose syntax highlighter style based on theme
        const style = theme === 'dark' ? vscDarkPlus : lightStyle;

        return (
          <div className="group code-block relative my-4"> {/* Added class */}
            {/* Language Tag - Optional */}
             {language !== 'text' && (
               <div className="top-0 right-12 z-10 absolute bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded-bl font-mono text-gray-600 dark:text-zinc-300 text-xs select-none">
                {language}
              </div>
            )}
            {/* Copy Button - Always visible on hover/focus within */}
              <button
              onClick={() => handleCopyCode(codeString)}
              className="top-2 right-2 z-10 absolute bg-gray-100 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 p-1.5 rounded transition-opacity duration-150"
                aria-label="Copy code"
              >
              {copiedCode === codeString ? (
                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                <CopyIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            <SyntaxHighlighter
              style={style}
              language={language}
              PreTag="div"
              className="!bg-gray-50 dark:!bg-zinc-900 shadow-inner !mt-0 border border-gray-200 dark:border-zinc-700 rounded-lg !text-sm !leading-relaxed"
              showLineNumbers={codeString.split('\n').length > 1} // Show line numbers for multi-line blocks
              wrapLongLines={true}
              customStyle={{ // Consistent padding and base styling
                margin: 0,
                borderRadius: '0.5rem',
                padding: '1rem',
                fontSize: '0.875rem', // text-sm
                lineHeight: '1.6',   // leading-relaxed
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      // --- Inline Code Renderer ---
      // Render simple inline code
      return (
        <code className="bg-gray-100 dark:bg-zinc-700/50 mx-[0.2em] px-[0.4em] py-[0.2em] rounded font-mono text-[0.85em] text-gray-800 dark:text-pink-400 break-words" {...props}>
            {children}
          </code>
      );
    },

    // --- Table Renderer ---
    // Improved table styling for better readability and responsiveness
    table: ({ node, ...props }: any) => (
      <div className="shadow-sm my-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto"> {/* Enable horizontal scroll on small screens */}
          <table className="w-full min-w-[600px] text-sm border-collapse" {...props} /> {/* min-w ensures table doesn't break too easily */}
        </div>
      </div>
    ),
    tableHead: ({ node, ...props }: any) => (
      <thead className="bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600 border-b text-gray-700 dark:text-gray-200" {...props} />
    ),
    tableRow: ({ node, isHeader, ...props }: any) => (
      <tr className={`border-b border-gray-200 dark:border-gray-700 ${!isHeader ? "hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors" : ""}`} {...props} />
    ),
    tableCell: ({ node, isHeader, style, ...props }: any) => {
       // Check for alignment style from remark-gfm
      const align = style?.textAlign as 'left' | 'right' | 'center' | undefined;
      const cellProps = {
        className: `px-4 py-3 ${align ? `text-${align}` : 'text-left'}`, // Apply text alignment class
        ...props,
      };
      return isHeader ? <th {...cellProps} /> : <td {...cellProps} />;
    },

    // --- Heading Renderers ---
    // Consistent heading styles
    h1: ({ children }: any) => <h1 className="mt-8 mb-4 pb-2 border-gray-200 dark:border-gray-700 border-b font-serif font-bold text-gray-900 dark:text-gray-100 text-3xl">{children}</h1>,
    h2: ({ children }: any) => {
      const text = String(children);
      // Keep the icon mapping for specific section headers
      const sectionIconMap: Record<string, React.ElementType> = {
        'Research Path': ArrowRightIcon, 'Top Sources Sample': GlobeIcon, 'Source Analysis Overview': DatabaseIcon,
        'Comparative Assessment': RefreshCwIcon, 'Executive Summary': BookOpenIcon, 'Key Findings': CheckIcon,
        'Detailed Analysis': SearchIcon, 'Technical Details': FileTextIcon, 'Research Methodology': BrainIcon,
        'Code Examples': CopyIcon, 'Visual References': ImageIcon, 'Key Insights': AlertCircleIcon,
        'Confidence Level Assessment': DatabaseIcon, 'Conclusions': CheckIcon, 'References': BookOpenIcon,
         // Add more specific headers if needed
      };
      const matchingSection = Object.keys(sectionIconMap).find(section => text.startsWith(section));

      if (matchingSection) {
        const SectionIcon = sectionIconMap[matchingSection];
        return (
          <h2 className="flex items-center mt-10 mb-6 pb-3 border-b border-blue-200 dark:border-blue-800/50 font-serif font-bold text-blue-700 dark:text-blue-300 text-2xl">
            <div className="bg-blue-100 dark:bg-blue-900/50 mr-3 p-1.5 rounded-md">
              <SectionIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            {text}
          </h2>
        );
      }
      // Default H2 style
      return <h2 className="mt-8 mb-5 pb-2 border-gray-200 dark:border-gray-700 border-b font-serif font-bold text-gray-800 dark:text-gray-200 text-2xl">{children}</h2>;
    },
    h3: ({ children }: any) => <h3 className="mt-6 mb-4 font-serif font-semibold text-gray-800 dark:text-gray-300 text-xl">{children}</h3>,
    // Add h4, h5, h6 if needed

    // --- Link Renderer ---
    a: ({ node, href, children, ...props }: any) => {
      const url = href || '';
      const isExternal = url.startsWith('http');
      const textContent = Array.isArray(children) ? children.join('') : String(children);

      // Handle image links (if the link itself is the image URL)
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
        return (
           <a href={url} target="_blank" rel="noopener noreferrer" className="block shadow-sm hover:shadow-md my-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden transition-shadow">
             <img src={url} alt={textContent || 'Linked image'} className="max-w-full h-auto" loading="lazy" />
           </a>
         );
       }

       // Handle cases where the child is an image (common markdown pattern ![alt](src))
      if (node?.children?.[0]?.tagName === 'img') {
          // Render the image directly, possibly wrapped in a link if desired
          const imgNode = node.children[0];
        return (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block my-4">
                  <img
                      src={imgNode.properties.src}
                      alt={imgNode.properties.alt || 'Embedded image'}
                      className="shadow-sm hover:shadow-md mx-auto border border-gray-200 dark:border-gray-700 rounded-md max-w-full h-auto transition-shadow"
                loading="lazy"
              />
            </a>
        );
      }

      // Render normal links
      if (isExternal) {
        const domain = extractDomain(url);
        const faviconUrl = getFaviconUrl(domain); // Keep using favicon service
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center font-medium text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-400 hover:underline underline-offset-2 transition-colors"
            {...props}
          >
            {domain && ( // Show favicon only if domain is valid
              <img
                src={faviconUrl}
                alt={`${domain} favicon`}
                className="inline-block opacity-80 group-hover:opacity-100 mr-1.5 rounded-sm w-4 h-4 align-middle transition-opacity"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Hide on error
              />
            )}
            <span className="inline-block align-middle">{children}</span>
            <ExternalLinkIcon className="inline-block opacity-70 group-hover:opacity-100 ml-1 w-3.5 h-3.5 align-middle transition-opacity" />
          </a>
        );
      }

      // Internal links (if any)
      return (
        <a href={url} className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2" {...props}>
          {children}
        </a>
      );
    },

    // --- List Item Renderer ---
    // Updated to parse the new source format: "- **[Title](URL)** (Domain: ..., Relevance: ...)"
    li: ({ node, children, ordered, ...props }: any) => {
       const contentString = node.children?.map((child: any) => {
          if (child.type === 'text') return child.value;
          if (child.tagName === 'a') return child.children?.[0]?.value; // Get text from link if possible
          if (child.tagName === 'strong') return child.children?.[0]?.value; // Get text from strong tag
          return '';
        }).join('');

      // Regex to match the source format: **[Title](URL)** (Domain: ..., Relevance: ...)
      const sourceMatch = contentString?.match(/^\s*\[(.*?)\]\(.*?\) \(Domain: (.*?), Relevance: (.*?)\)\s*$/);

      if (sourceMatch && !ordered) { // Check if it's an unordered list item matching the source pattern
         const title = sourceMatch[1];
         const domain = sourceMatch[2];
         const relevance = sourceMatch[3];
         const url = node.children?.[0]?.children?.[0]?.properties?.href || '#'; // Extract URL from the nested 'a' tag

         const faviconUrl = getFaviconUrl(domain);

        return (
          <li className="group flex items-start mb-4" {...props}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white dark:bg-gray-800/70 hover:shadow-lg p-3 border border-gray-200 dark:border-gray-700/80 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg w-full transition-all duration-200"
            >
              {faviconUrl && (
                <div className="flex flex-shrink-0 justify-center items-center bg-gray-100 dark:bg-gray-700 p-1.5 border border-gray-200 dark:border-gray-600 rounded-md w-8 h-8 overflow-hidden">
                  <img
                    src={faviconUrl}
                    alt={domain}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                       const parent = target.parentElement;
                       if (parent) {
                         parent.innerHTML = `<span class="font-bold text-blue-500 dark:text-blue-400 text-sm">${domain.charAt(0).toUpperCase()}</span>`;
                       }
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-grow min-w-0">
                <div className="font-medium text-gray-900 dark:group-hover:text-blue-400 dark:text-gray-100 group-hover:text-blue-600 text-sm truncate transition-colors">
                  {title}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-gray-500 dark:text-gray-400 text-xs truncate">
                  <GlobeIcon className="w-3 h-3" />
                  {domain}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 ml-2">
                <div className="bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full font-medium text-blue-600 dark:text-blue-300 text-xs whitespace-nowrap">
                  {relevance}
                </div>
                <ExternalLinkIcon className="w-4 h-4 text-gray-400 dark:group-hover:text-blue-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
              </div>
            </a>
          </li>
        );
      }

       // --- Research Path Item Renderer ---
       // Detect research path items based on keywords
       const pathKeywords = ['Initial query:', 'Research area', 'Follow-up query', 'Step '];
       const isPathItem = pathKeywords.some(keyword => contentString?.startsWith(keyword));

       if (isPathItem && !ordered) {
           const queryMatch = contentString?.match(/"([^"]+)"/);
           const queryText = queryMatch ? queryMatch[1] : contentString;
           const prefix = contentString?.split('"')[0] || '';

           let PathIcon = ArrowRightIcon; // Default
           if (prefix.includes('Initial')) PathIcon = SearchIcon;
           else if (prefix.includes('area')) PathIcon = BrainIcon;

        return (
               <li className="group mb-2" {...props}>
                   <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 py-1.5 pl-3 border-blue-300 hover:border-blue-500 dark:border-blue-700 dark:hover:border-blue-500 border-l-2 rounded-r-md transition-colors">
                       <div className="flex-shrink-0 mr-2 text-blue-500 dark:text-blue-400">
                           <PathIcon className="w-4 h-4" />
              </div>
                       <div className="text-sm">
                           {prefix && <span className="mr-1 text-gray-500 dark:text-gray-400">{prefix}</span>}
                           <span className="font-medium text-gray-800 dark:group-hover:text-blue-400 dark:text-gray-200 group-hover:text-blue-600 transition-colors">
                               {queryMatch ? `"${queryText}"` : queryText}
                           </span>
              </div>
            </div>
          </li>
        );
      }

      // --- Default List Item Renderer ---
      return (
        <li className="group flex items-start mb-2" {...props}>
          <span className={`mt-1 mr-3 ${ordered ? 'text-gray-500 dark:text-gray-400 text-sm font-medium' : 'text-blue-500 dark:text-blue-400 flex-shrink-0'}`}>
            {ordered ? `${props.index + 1}.` : (
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-125 transition-transform">
              <circle cx="3" cy="3" r="3" fill="currentColor" />
            </svg>
            )}
          </span>
          <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</span>
        </li>
      );
    },

     // --- Paragraph Renderer ---
     // Handle potential hydration issues with nested components/links
    p: ({ node, children, ...props }: any) => {
         // Check if paragraph only contains whitespace or is empty
         if (node.children.every((child: any) => child.type === 'text' && /^\s*$/.test(child.value))) {
             return null; // Render nothing for empty paragraphs
         }

         // Check if the paragraph seems to only contain a link (potential source reference)
         const containsOnlyLink = node.children.length === 1 && node.children[0].tagName === 'a';
         if (containsOnlyLink) {
            // Render the link directly without the <p> wrapper if it's a source/citation
            const linkNode = node.children[0];
            const linkText = linkNode.children?.[0]?.value || '';
             if (linkText.toLowerCase().includes('source:')) {
                 // Render the link standalone, the 'a' renderer will handle it
                 return <>{children}</>;
             }
         }

         // Check if paragraph contains an image tag generated by markdown (e.g., ![alt](src))
         const containsImageTag = node.children.some((child: any) => child.tagName === 'img');
         if (containsImageTag) {
             // Render the paragraph content, the 'a' or 'img' renderer will handle the image
             return <div className="my-4">{children}</div>; // Use div for potentially block-level images
         }

         // Default paragraph rendering
      return <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props}>{children}</p>;
     },

     // --- Image Renderer ---
     img: ({ node, src, alt, ...props }: any) => (
       <span className="block my-6 text-center"> {/* Center the image block */}
         <img
           src={src}
           alt={alt || 'Research image'}
           className="shadow-md hover:shadow-lg mx-auto border border-gray-200 dark:border-gray-700 rounded-lg max-w-full h-auto transition-shadow cursor-pointer"
           loading="lazy"
           onClick={() => window.open(src, '_blank')} // Open image in new tab on click
           {...props}
         />
         {alt && <figcaption className="mt-2 text-gray-500 dark:text-gray-400 text-xs italic">{alt}</figcaption>}
       </span>
     ),
  };

  // --- Component Return ---
  return (
    // Apply bg-black for dark mode
    <div className="bg-gray-50 dark:bg-black min-h-screen font-sans"> {/* Changed font-serif to font-sans for better readability */}
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
              <AuroraText>Deep Research Engine</AuroraText>
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
            <div className="relative">
              <div className="left-0 absolute inset-y-0 flex items-center pl-4 pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Latest advancements in serverless computing for Next.js"
                className="bg-white dark:bg-gray-900/80 shadow-sm py-4 pr-32 pl-12 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/60 w-full text-gray-900 dark:text-gray-100 text-lg transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="top-1/2 right-3 absolute bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2 rounded-lg font-medium text-white text-base transition-all -translate-y-1/2 duration-200 disabled:cursor-not-allowed"
                aria-label="Start Research"
              >
                {loading ? (
                  <div className="flex justify-center items-center w-[96px]"> {/* Fixed width */}
                    <Loader2Icon className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                   <div className="flex justify-center items-center w-[96px]"> {/* Fixed width */}
                  <span>Research</span>
                  </div>
                )}
              </button>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-gray-900/50 shadow-sm p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                 <div className="flex items-center gap-2 overflow-x-auto text-gray-600 dark:text-gray-400">
                    <HistoryIcon className="flex-shrink-0 w-4 h-4" />
                  <span className="mr-1 font-medium text-xs">Recent:</span>
                    {searchHistory.map((q, i) => (
                    <button
                        key={i}
                      onClick={() => { if (!loading) setQuery(q); }}
                        disabled={loading}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700/80 disabled:opacity-60 shadow-sm hover:shadow px-2.5 py-1 rounded-full text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap transition-all duration-150"
                      title={q} // Show full query on hover
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
                  Clear All
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
              className="space-y-6 bg-white dark:bg-gray-900/70 shadow-lg backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-800 rounded-xl"
              >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-gray-200 dark:border-gray-700 border-b">
                  <div className="flex items-center gap-3">
                      <Loader2Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xl">
                    Researching...
                    </h3>
                  </div>
                {currentProgress && (
                  <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-medium text-gray-500 dark:text-gray-400 text-sm">
                    {`${(currentProgress.elapsedTime / 1000).toFixed(1)}s`}
                  </div>
                )}
                </div>

              {/* Current Status */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 text-sm">
                  <BrainIcon className="flex-shrink-0 w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span className="truncate">{currentStatus || 'Starting research...'}</span>
                      </div>
                    </div>

              {/* Metrics */}
              <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
                {/* Sources */}
                <div className="bg-gradient-to-br from-blue-50 dark:from-gray-800 to-blue-100 dark:to-blue-900/30 shadow-sm p-3 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                        <div className="flex items-center mb-1 font-medium text-blue-700 dark:text-blue-400 text-xs">
                    <GlobeIcon className="mr-1.5 w-3.5 h-3.5" /> Sources Found
                        </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {currentProgress?.sourcesCount.toLocaleString() ?? '...'}
                        </div>
                      </div>
                {/* Domains */}
                <div className="bg-gradient-to-br from-green-50 dark:from-gray-800 to-green-100 dark:to-green-900/30 shadow-sm p-3 border border-green-200 dark:border-green-800/50 rounded-lg">
                   <div className="flex items-center mb-1 font-medium text-green-700 dark:text-green-400 text-xs">
                    <DatabaseIcon className="mr-1.5 w-3.5 h-3.5" /> Unique Domains
                        </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {currentProgress?.domainsCount.toLocaleString() ?? '...'}
                        </div>
                      </div>
                {/* Data Size */}
                <div className="bg-gradient-to-br from-purple-50 dark:from-gray-800 to-purple-100 dark:to-purple-900/30 shadow-sm p-3 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                   <div className="flex items-center mb-1 font-medium text-purple-700 dark:text-purple-400 text-xs">
                    <FileTextIcon className="mr-1.5 w-3.5 h-3.5" /> Data Size
                        </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {currentProgress?.dataSize ?? '...KB'}
                      </div>
                    </div>
                  </div>

              {/* Live Logs Toggle & Display */}
                  <div className="space-y-2">
                <div className="flex justify-end items-center">
                      <button
                        onClick={() => setShowLiveLogs(!showLiveLogs)}
                     className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 px-3 py-1 rounded-full font-medium text-blue-600 dark:text-blue-400 text-xs transition-colors"
                      >
                     <FileTextIcon className="w-3 h-3" />
                     {showLiveLogs ? 'Hide Logs' : 'Show Live Logs'}
                      </button>
                    </div>

                <AnimatePresence>
                      {showLiveLogs && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                       className="mt-2 pt-2"
                     >
                       <div className="bg-gray-50 dark:bg-black/50 p-3 border border-gray-200 dark:border-gray-700 rounded-md max-h-[250px] overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                         {liveLogs.length > 0 ? (
                           liveLogs.map((log, index) => (
                             <div key={index} className="mb-1 text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">
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
          {error && !loading && ( // Only show error if not loading
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              className="flex items-start gap-4 bg-red-50 dark:bg-red-900/20 shadow-md p-5 border border-red-200 dark:border-red-800/50 rounded-xl text-red-700 dark:text-red-300"
              >
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/40 mt-0.5 p-2 rounded-full">
                 <ServerCrashIcon className="w-5 h-5 text-red-500" /> {/* More specific icon */}
                </div>
              <div className="flex-grow">
                <p className="mb-1 font-semibold text-red-800 dark:text-red-200">Research Failed ({error.code || 'Error'})</p>
                <p className="text-sm">{error.message || 'An unknown error occurred.'}</p>
                  <button
                  onClick={() => setError(null)} // Clear error on dismiss
                  className="bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800/60 mt-3 px-3 py-1 rounded-md font-medium text-red-700 dark:text-red-200 text-sm transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Report Display */}
          <AnimatePresence>
          {report && !loading && ( // Only show report if not loading
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} // Fade out directly
                transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800/50 shadow-xl backdrop-blur-md mt-8 p-6 md:p-8 border border-gray-200 dark:border-gray-700/80 rounded-xl" // Added margin top
              >
              {/* Report Header */}
                <div className="flex md:flex-row flex-col justify-between md:items-center gap-4 mb-6 pb-4 border-gray-200 dark:border-gray-700 border-b">
                <h2 className="flex items-center font-semibold text-gray-900 dark:text-gray-100 text-2xl">
                  <div className="bg-blue-100 dark:bg-blue-900/40 mr-3 p-2 rounded-full">
                      <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  Research Report
                </h2>
                {/* Final Metrics Display */}
                {currentProgress && (
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-700/60 p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 text-xs">
                        <div className="flex items-center gap-1" title="Sources Consulted">
                            <GlobeIcon className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-medium">{currentProgress.sourcesCount.toLocaleString()}</span> src
                        </div>
                        <div className="flex items-center gap-1" title="Unique Domains">
                            <DatabaseIcon className="w-3.5 h-3.5 text-green-500" />
                            <span className="font-medium">{currentProgress.domainsCount}</span> dom
                        </div>
                         <div className="flex items-center gap-1" title="Data Analyzed">
                            <FileTextIcon className="w-3.5 h-3.5 text-purple-500" />
                            <span className="font-medium">{currentProgress.dataSize}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Execution Time">
                            <RefreshCwIcon className="w-3.5 h-3.5 text-orange-500" />
                            <span className="font-medium">{(currentProgress.elapsedTime / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                    )}
                </div>

              {/* Markdown Report Content */}
              <div className="prose-img:shadow-md dark:prose-invert prose-img:rounded-lg max-w-none prose-headings:font-semibold dark:prose-a:text-blue-400 prose-a:text-blue-600 prose-table:text-sm prose-code:before:content-none prose-code:after:content-none prose prose-gray">
                  <ReactMarkdown
                  remarkPlugins={[remarkGfm]} // Github Flavored Markdown (tables, strikethrough, etc.)
                  rehypePlugins={[rehypeRaw]} // Allow HTML rendering (use with caution if content isn't trusted)
                  components={renderers} // Use our custom renderers
                >
                  {report}
                  </ReactMarkdown>
                </div>

              {/* Report Footer */}
              <div className="flex sm:flex-row flex-col justify-between items-center gap-4 mt-8 pt-6 border-gray-200 dark:border-gray-700 border-t">
                  <button
                    onClick={() => {
                     if (report) {
                       navigator.clipboard.writeText(report)
                         .then(() => alert('Report copied to clipboard!')) // Simple confirmation
                         .catch(err => console.error('Failed to copy report:', err));
                     }
                   }}
                   className="flex items-center gap-1.5 order-2 sm:order-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-md font-medium text-blue-600 dark:text-blue-300 text-sm transition-colors"
                 >
                   <CopyIcon className="w-4 h-4" />
                   Copy Full Report
                 </button>
                 <button
                  onClick={() => { setQuery(''); setReport(null); setError(null); }}
                  className="flex items-center gap-1.5 order-1 sm:order-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md font-medium text-gray-700 dark:text-gray-300 text-sm transition-colors"
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
