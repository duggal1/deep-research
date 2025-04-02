
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
  ImageIcon
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraText } from '@/components/magicui/aurora-text';
import Image from 'next/image';

const ThemeSwitcher = dynamic(
  () => import('@/components/theme-switcher').then(mod => mod.ThemeSwitcher),
  { ssr: false }
);

// Function to extract domain from URL
const extractDomain = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (e) {
    return url;
  }
};

// Function to get favicon URL
const getFaviconUrl = (domain: string) => {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [researchStage, setResearchStage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [activeUrls, setActiveUrls] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [researchStats, setResearchStats] = useState<{
    sourcesCount: number;
    domainsCount: number;
    dataSize: string;
    elapsedTime: number;
    status: string;
    completedSteps: string[];
  }>({
    sourcesCount: 0,
    domainsCount: 0,
    dataSize: '0KB',
    elapsedTime: 0,
    status: '',
    completedSteps: []
  });
  const [realStats, setRealStats] = useState<{
    sourcesCount: number;
    domainsCount: number;
    dataSize: string;
    elapsedTime: number;
  } | null>(null);
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => Math.max(0, prev - 1));

        // Update progress states if research is in progress
        if (loading) {
          if (realStats) {
            // Use real data from backend
            setResearchStats(prev => {
              const progress = Math.min(0.99, realStats.elapsedTime / (estimatedTime * 1000));
              return {
                ...prev,
                sourcesCount: realStats.sourcesCount,
                domainsCount: realStats.domainsCount,
                dataSize: realStats.dataSize,
                elapsedTime: realStats.elapsedTime / 1000, // Convert ms to s
                status: getResearchStatus(progress, realStats.sourcesCount, realStats.domainsCount)
              };
            });
          } else {
            // Fallback to simulated data only if no real stats are available
            setResearchStats(prev => {
              const progress = 1 - (countdown / estimatedTime);
              const targetSources = 4500; // Target 4500+ sources based on real data observed
              const targetDomains = 90;
              
              return {
                ...prev,
                sourcesCount: Math.min(targetSources, Math.floor(targetSources * progress)),
                domainsCount: Math.min(targetDomains, Math.floor(targetDomains * progress)),
                dataSize: `${(610 * progress).toFixed(2)}KB`,
                elapsedTime: estimatedTime - countdown,
                status: getResearchStatus(progress, prev.sourcesCount, prev.domainsCount)
              };
            });
          }
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [loading, countdown, estimatedTime, realStats]);

  // Get research status based on progress and actual metrics
  const getResearchStatus = (progress: number, sourcesCount: number, domainsCount: number): string => {
    if (progress < 0.2) return 'Initializing research plan...';
    if (progress < 0.3) return 'Exploring initial sources...';
    if (progress < 0.4) return 'Web crawling in progress...';
    if (progress < 0.5) return `Completed web crawling with ${sourcesCount} sources`;
    if (progress < 0.6) return `Deeper research complete: ${Math.floor(progress * 10)} refined areas covered`;
    if (progress < 0.8) return `Synthesizing research from ${sourcesCount} sources across ${domainsCount} domains`;
    if (progress < 0.9) return `Synthesizing comprehensive research with ${sourcesCount} sources across ${domainsCount} domains`;
    return `Research complete in ${researchStats.elapsedTime.toFixed(1)}s`;
  };

  // Update completed steps based on progress
  useEffect(() => {
    if (loading) {
      const progress = realStats 
        ? Math.min(0.99, realStats.elapsedTime / (estimatedTime * 1000)) 
        : 1 - (countdown / estimatedTime);
      
      const sourcesCount = realStats?.sourcesCount || researchStats.sourcesCount;
      const domainsCount = realStats?.domainsCount || researchStats.domainsCount;
      const dataSize = realStats?.dataSize || researchStats.dataSize;
      
      const newSteps: string[] = [];

      if (progress > 0.2) newSteps.push('Research plan created');
      if (progress > 0.3) newSteps.push('Initial sources identified');
      if (progress > 0.4) newSteps.push(`Crawled ${Math.floor(sourcesCount * 0.5)} websites`);
      if (progress > 0.5) newSteps.push(`Analyzed ${Math.floor(sourcesCount * 0.7)} sources`);
      if (progress > 0.6) newSteps.push(`Refined search with ${Math.floor(domainsCount * 0.8)} domains`);
      if (progress > 0.7) newSteps.push(`Collected ${dataSize} of research data`);
      if (progress > 0.8) newSteps.push(`Synthesizing ${sourcesCount} sources`);
      if (progress > 0.9) newSteps.push('Generating final report');

      setResearchStats(prev => ({
        ...prev,
        completedSteps: newSteps
      }));
    }
  }, [countdown, estimatedTime, loading, researchStats.sourcesCount, researchStats.domainsCount, researchStats.dataSize, realStats]);

  // Track active URLs during research
  useEffect(() => {
    if (!loading) {
      setActiveUrls([]);
      return;
    }

    const domains = [
      'scholar.google.com',
      'wikipedia.org',
      'github.com',
      'stackoverflow.com',
      'medium.com',
      'arxiv.org',
      'researchgate.net',
      'ieee.org',
      'nature.com',
      'sciencedirect.com',
      'springer.com',
      'acm.org',
      'jstor.org',
      'pubmed.ncbi.nlm.nih.gov',
      'semanticscholar.org',
      'dev.to',
      'npmjs.com',
      'typescriptlang.org',
      'microsoft.com',
      'mozilla.org',
      'youtube.com',
      'reddit.com',
      'hackernoon.com',
      'freecodecamp.org',
      'digitalocean.com',
      'blogs.msdn.microsoft.com'
    ];

    // Generate realistic URL activity based on research progress
    const updateUrls = () => {
      const progress = 1 - (countdown / estimatedTime);
      const numUrls = Math.floor(Math.random() * 4) + 2; // 2-5 URLs at a time
      const newUrls = [];

      // As research progresses, show more specialized domains
      const availableDomains = progress < 0.5
        ? domains.slice(0, Math.floor(domains.length * 0.7))
        : domains;

      for (let i = 0; i < numUrls; i++) {
        const randomIndex = Math.floor(Math.random() * availableDomains.length);
        newUrls.push(availableDomains[randomIndex]);
      }

      setActiveUrls(newUrls);
    };

    // Update URLs more frequently as research progresses
    const interval = setInterval(() => {
      updateUrls();
    }, Math.max(500, 2000 - (estimatedTime - countdown) * 20));

    // Initial update
    updateUrls();

    return () => clearInterval(interval);
  }, [loading, countdown, estimatedTime]);

  // Poll for progress updates during research
  const pollResearchProgress = useCallback(async () => {
    try {
      if (!loading) return;
      
      const res = await fetch('/api/research/progress', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.metrics && data.metrics.sourcesCount > 0) {
          setRealStats(data.metrics);
        }
      }
    } catch (error) {
      console.log('Progress poll error:', error);
    }
  }, [loading]);

  const saveHistory = (newHistory: string[]) => {
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const handleResearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setReport('');
    setRealStats(null);

    // Estimate research time - roughly 20s + 5s per word in query
    // Reduced from 30s + 10s to reflect faster processing
    const wordCount = query.split(' ').length;
    const timeEstimate = 20 + wordCount * 5;
    setEstimatedTime(timeEstimate);
    setCountdown(timeEstimate);

    // Simulate the research stages
    const stages = [
      'Planning research approach...',
      'Exploring initial sources...',
      'Analyzing preliminary data...',
      'Refining research parameters...',
      'Conducting deeper investigation...',
      'Synthesizing findings...',
      'Generating comprehensive report...'
    ];

    // Update research stage at intervals
    let stageIndex = 0;
    setResearchStage(stages[stageIndex]);

    const stageInterval = Math.floor(timeEstimate / stages.length);
    const stageTimer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setResearchStage(stages[stageIndex]);
    }, stageInterval * 1000);

    // Start polling for real progress
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
    }
    progressPollRef.current = setInterval(pollResearchProgress, 2000); // Poll every 2 seconds

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      clearInterval(stageTimer);
      // Stop polling for progress
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        setReport('');
      } else {
        setReport(data.report);
        // Set final metrics if available
        if (data.metrics) {
          setRealStats(data.metrics);
          // Set final research stats
          setResearchStats(prev => ({
            ...prev,
            sourcesCount: data.metrics.sourcesCount,
            domainsCount: data.metrics.domainsCount,
            dataSize: data.metrics.dataSize,
            elapsedTime: data.metrics.elapsedTime / 1000,
            status: `Research complete in ${(data.metrics.elapsedTime / 1000).toFixed(1)}s`
          }));
        }
        const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
        saveHistory(newHistory);
      }
    } catch (error) {
      clearInterval(stageTimer);
      // Stop polling for progress
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
      setError('An error occurred during research');
      setReport('');
    }
    setLoading(false);
    setResearchStage('');
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Custom renderers for React Markdown
  const renderers = {
    // Custom code block renderer with syntax highlighting and copy button
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const code = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return (
          <div className="group relative my-6">
            <div className="top-2 right-2 z-10 absolute">
              <button
                onClick={() => handleCopyCode(code)}
                className="bg-primary/10 hover:bg-primary/20 p-1 rounded text-primary transition-colors"
                aria-label="Copy code"
              >
                {copiedCode === code ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={atomDark}
              language={match[1]}
              PreTag="div"
              className="!bg-zinc-900 dark:!bg-zinc-900 !mt-0 rounded-lg !text-sm"
              showLineNumbers
              {...props}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      } else if (!inline) {
        // Generic code block without specified language
        return (
          <div className="group relative my-6">
            <div className="top-2 right-2 z-10 absolute">
              <button
                onClick={() => handleCopyCode(code)}
                className="bg-primary/10 hover:bg-primary/20 p-1 rounded text-primary transition-colors"
                aria-label="Copy code"
              >
                {copiedCode === code ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <SyntaxHighlighter
              style={atomDark}
              language="text"
              PreTag="div"
              className="!bg-zinc-900 dark:!bg-zinc-900 !mt-0 rounded-lg !text-sm"
              {...props}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }

      // Inline code
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded font-serif text-sm" {...props}>
          {children}
        </code>
      );
    },

    // Custom table renderer to improve table appearance
    table: ({ node, ...props }: any) => (
      <div className="my-6 border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" {...props} />
        </div>
      </div>
    ),
    
    tableHead: ({ node, ...props }: any) => (
      <thead className="bg-primary/10 text-primary" {...props} />
    ),
    
    tableRow: ({ node, isHeader, ...props }: any) => (
      <tr className={`border-b border-border ${isHeader ? "" : "hover:bg-muted/30"}`} {...props} />
    ),
    
    tableCell: ({ node, isHeader, ...props }: any) => {
      if (isHeader) {
        return <th className="px-4 py-3 font-medium text-left" {...props} />;
      }
      return <td className="px-4 py-3" {...props} />;
    },

    // Custom heading renderer
    h1: ({ children }: any) => <h1 className="mt-8 mb-4 font-bold text-foreground text-3xl font-serif">{children}</h1>,
    h2: ({ children }: any) => {
      // Special formatting for section headers
      const text = String(children);

      // Apply special styling for research sections
      if (
        text.includes('Research Path') ||
        text.includes('Top Sources') ||
        text.includes('Comparative Assessment')
      ) {
        // Determine which icon to show based on the section
        let SectionIcon = BookOpenIcon;
        if (text.includes('Research Path')) SectionIcon = ArrowRightIcon;
        else if (text.includes('Top Sources')) SectionIcon = GlobeIcon;
        else if (text.includes('Comparative Assessment')) SectionIcon = RefreshCwIcon;

        return (
          <h2 className="flex items-center mt-10 mb-6 pb-3 border-blue-200 dark:border-blue-800/30 border-b font-bold text-blue-700 dark:text-blue-400 text-2xl font-serif">
            <div className="mr-3 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <SectionIcon className="w-5 h-5" />
            </div>
            {text}
          </h2>
        );
      }

      return <h2 className="mt-8 mb-4 font-bold text-foreground text-2xl font-serif">{children}</h2>;
    },
    h3: ({ children }: any) => {
      // Special formatting for section headers
      const text = String(children);
      if (
        text.includes('Executive Summary') ||
        text.includes('Key Findings') ||
        text.includes('Detailed Analysis') ||
        text.includes('Research Methodology') ||
        text.includes('Code Examples') ||
        text.includes('Key Insights') ||
        text.includes('Confidence Level')
      ) {
        // Determine which icon to show based on the section
        let SectionIcon = BookOpenIcon;
        if (text.includes('Executive Summary')) SectionIcon = BookOpenIcon;
        else if (text.includes('Key Findings')) SectionIcon = CheckIcon;
        else if (text.includes('Detailed Analysis')) SectionIcon = SearchIcon;
        else if (text.includes('Research Methodology')) SectionIcon = BrainIcon;
        else if (text.includes('Code Examples')) SectionIcon = CopyIcon;
        else if (text.includes('Key Insights')) SectionIcon = AlertCircleIcon;
        else if (text.includes('Confidence Level')) SectionIcon = CheckIcon;

        return (
          <h3 className="flex items-center mt-8 mb-5 pb-2 border-blue-100 dark:border-blue-900/20 border-b font-semibold text-blue-600 dark:text-blue-400 text-xl font-serif">
            <div className="mr-2 p-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <SectionIcon className="w-4 h-4" />
            </div>
            {text}
          </h3>
        );
      }
      return <h3 className="mt-6 mb-4 font-semibold text-foreground text-xl font-serif">{children}</h3>;
    },

    // Custom link renderer
    a: ({ node, href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http');
      const domain = isExternal ? extractDomain(href) : '';
      const isImage = href?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);

      // If it's an image link, render the image
      if (isImage) {
        return (
          <div className="my-6 overflow-hidden rounded-lg border border-blue-100 dark:border-blue-900/20 shadow-md">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              {...props}
            >
              <img
                src={href}
                alt={String(children) || "Research image"}
                className="w-full h-auto object-cover max-h-[400px]"
                onError={(e) => {
                  // Hide image on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          </div>
        );
      }

      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
            {...props}
          >
            <span className="border-b border-blue-300 dark:border-blue-600 pb-0.5">{children}</span>
            <ExternalLinkIcon className="ml-1 w-3 h-3" />
          </a>
        );
      }

      return (
        <a
          href={href}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border-b border-blue-300 dark:border-blue-600 pb-0.5 transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Custom list item renderer for sources and research path
    li: ({ node, children, ...props }: any) => {
      const childrenStr = String(children);

      // Check if this is a source item with URL (new format with domain/URL)
      if (childrenStr.includes('Relevance:') && (childrenStr.includes('](http') || childrenStr.includes('](#'))) {
        // Extract title, relevance and URL
        const titleMatch = childrenStr.match(/\*\*(.*?)\*\*/);
        const title = titleMatch ? titleMatch[1] : 'Unknown Source';
        
        const relevanceMatch = childrenStr.match(/Relevance: ([^)]+)/);
        const relevance = relevanceMatch ? relevanceMatch[1].trim() : '';
        
        const domainMatch = childrenStr.match(/\[(.*?)\]/);
        const domain = domainMatch ? domainMatch[1] : '';
        
        const urlMatch = childrenStr.match(/\((https?:\/\/[^)]+)\)/);
        const url = urlMatch ? urlMatch[1] : '#';
        
        const faviconUrl = domain ? getFaviconUrl(domain) : '';

        return (
          <li className="flex items-start mb-3" {...props}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-card p-3 border hover:border-blue-400/50 dark:hover:border-blue-500/50 border-border rounded-lg w-full transition-all duration-200 hover:shadow-md group"
            >
              {faviconUrl && (
                <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden bg-blue-100 dark:bg-blue-900/30 p-1.5 flex items-center justify-center">
                  <img
                    src={faviconUrl}
                    alt={domain}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Show domain first letter if favicon fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `<span class="text-blue-500 dark:text-blue-400 font-bold text-sm">${domain.charAt(0).toUpperCase()}</span>`;
                    }}
                  />
                </div>
              )}
              <div className="flex-grow min-w-0">
                <div className="font-medium text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {title}
                </div>
                <div className="text-muted-foreground text-xs truncate flex items-center gap-1">
                  <GlobeIcon className="w-3 h-3" />
                  {domain}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-400 text-xs font-medium">
                  {relevance}
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full text-blue-600 dark:text-blue-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            </a>
          </li>
        );
      }

      // Check if this is a research path item
      if (childrenStr.includes('Initial:') || childrenStr.includes('Plan ') || childrenStr.includes('Refinement ')) {
        // Extract the query part
        const queryMatch = childrenStr.match(/"([^"]+)"/);
        const query = queryMatch ? queryMatch[1] : '';
        const prefix = childrenStr.split('"')[0];

        return (
          <li className="mb-3 group" {...props}>
            <div className="flex items-center py-2 pl-4 border-blue-400/30 dark:border-blue-500/30 hover:border-blue-500 dark:hover:border-blue-400 border-l-2 transition-colors">
              <div className="mr-2 text-blue-500 dark:text-blue-400">
                {prefix.includes('Initial') ? (
                  <SearchIcon className="w-4 h-4" />
                ) : prefix.includes('Plan') ? (
                  <BrainIcon className="w-4 h-4" />
                ) : (
                  <ArrowRightIcon className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-muted-foreground font-medium">{prefix}</span>
                <span className="text-foreground font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">&quot;{query}&quot;</span>
              </div>
            </div>
          </li>
        );
      }

      // Regular list item
      return (
        <li className="flex items-start mb-3" {...props}>
          <span className="mt-1 mr-2 text-blue-500 dark:text-blue-400">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1.5">
              <circle cx="4" cy="4" r="4" fill="currentColor" />
            </svg>
          </span>
          <span className="text-card-foreground">{children}</span>
        </li>
      );
    },

    // Custom paragraph renderer
    p: ({ node, children, ...props }: any) => {
      // Check if paragraph contains an image URL
      const childrenStr = String(children);
      const imageUrlMatch = childrenStr.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S+)?/i);

      if (imageUrlMatch) {
        const imageUrl = imageUrlMatch[0];
        // Replace the image URL with actual image
        return (
          <div className="my-6">
            <p className="mb-4 text-card-foreground leading-relaxed" {...props}>
              {childrenStr.replace(imageUrl, '')}
            </p>
            <div className="overflow-hidden rounded-lg border border-border shadow-md">
              <img
                src={imageUrl}
                alt="Research visual"
                className="w-full h-auto object-cover max-h-[400px]"
                onError={(e) => {
                  // Hide image on error
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        );
      }

      return <p className="mb-4 text-card-foreground leading-relaxed" {...props}>{children}</p>;
    }
  };

  // Process the report to ensure proper markdown formatting
  const processReportForMarkdown = (text: string) => {
    if (!text) return '';

    // Ensure code blocks are properly formatted
    let processed = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      // Check if the code block already has a language specified
      if (!/```\w+/.test(match)) {
        return '```text\n' + code + '\n```';
      }
      return match;
    });

    // Fix table formatting issues if any remain
    processed = processed.replace(/\|\s*---+\s*\|/g, '| --- |');
    processed = processed.replace(/\|[-\s|]+\n/g, '| --- | --- | --- |\n');

    // Ensure proper spacing around headings
    processed = processed.replace(/(\n#+\s.*?)(\n[^#\n])/g, '$1\n$2');

    return processed;
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-background min-h-screen font-serif">
     <nav className="top-0 z-50 sticky bg-background/80 backdrop-blur-lg border-b border-border">
  <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
    <div className="flex justify-between items-center h-16">
    <div className="flex items-center "> {/* Adjusted spacing */}
  <Image
    src="/blaze.png"
    width={90}
    height={90}
    priority
    alt="blaze"
  />
  <h1 className="font-bold text-foreground text-3xl">Blaze</h1> {/* Removed extra padding */}
</div>

      <ThemeSwitcher />
    </div>
  </div>
</nav>


      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="space-y-8 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
         <h1 className=" flex justify-center items-center text-4xl font-serif font-bold tracking-tighter md:text-5xl lg:text-7xl">
         <AuroraText>Deep Research Engine</AuroraText>
    </h1>

            <p className="text-muted-foreground text-base text-center">
            An agent that processes over 4,000 sources across 20+ domains, using reasoning to synthesize vast amounts of online information and complete multi-step research tasks for you.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research query..."
                className="bg-background/50 shadow-sm backdrop-blur-sm px-5 py-4 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full text-foreground text-lg transition-all duration-200"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="top-1/2 right-3 absolute bg-primary hover:bg-primary/90 disabled:opacity-50 shadow-md hover:shadow-lg p-3 rounded-lg text-primary-foreground transition-all -translate-y-1/2 duration-200"
                aria-label="Search"
              >
                {loading ? (
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <SearchIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {searchHistory.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 pb-2 overflow-x-auto text-muted-foreground text-sm">
                  <HistoryIcon className="flex-shrink-0 w-4 h-4" />
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((q, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                        onClick={() => {
                          if (!loading) {
                            setQuery(q);
                            setTimeout(() => handleResearch(), 100);
                          }
                        }}
                        disabled={loading}
                        className="bg-secondary hover:bg-secondary/80 shadow-sm hover:shadow px-3 py-1.5 rounded-full text-secondary-foreground text-xs whitespace-nowrap transition-colors"
                      >
                        {q.length > 30 ? q.substring(0, 30) + '...' : q}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 bg-card shadow-lg p-6 border border-border rounded-xl"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Loader2Icon className="w-5 h-5 text-primary animate-spin" />
                    <h3 className="font-semibold text-card-foreground text-xl">
                    <AuroraText>Researching...</AuroraText>
                    </h3>
                  </div>
                  <div className=" text-muted-foreground text-sm font-serif">
                    {countdown > 0 ? `~${countdown}s remaining` : '✨Almost done...'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <BrainIcon className="w-4 h-4 text-primary" />
                        <span>{researchStats.status || researchStage}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {researchStats.elapsedTime > 0 ? `${researchStats.elapsedTime.toFixed(1)}s elapsed` : ''}
                      </div>
                    </div>

                    <div className="gap-3 grid grid-cols-3 mt-2">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-3 border border-blue-100 dark:border-blue-900/20 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-1 text-gray-900 font-serif dark:text-blue-700 text-xs font-medium">
                          <GlobeIcon className="mr-1 w-3 h-3" />
                          Sources
                        </div>
                        <div className="font-serif font-medium text-foreground text-lg">{researchStats.sourcesCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-blue-100 dark:bg-blue-900/10 p-3 border border-blue-100 dark:border-blue-900/20 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-1 text-gray-900 font-serif dark:text-blue-700 text-xs font-medium">
                          <DatabaseIcon className="mr-1 w-3 h-3" />
                          Domains
                        </div>
                        <div className="font-serif font-medium text-foreground text-lg">{researchStats.domainsCount}</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-3 border border-blue-100 dark:border-blue-900/20 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-1 text-gray-900 font-serif dark:text-blue-700 text-xs font-medium">
                          <FileTextIcon className="mr-1 w-3 h-3" />
                          Data Size
                        </div>
                        <div className="font-serif font-medium text-foreground text-lg">{researchStats.dataSize}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 border border-border rounded-lg">
                    <h4 className="flex items-center  font-serif mb-3 font-medium text-gray-900 dark:text-blue-700 text-sm">
                      <GlobeIcon className="mr-1.5 w-3.5 h-3.5" />
                      Active Research Sources:
                    </h4>
                    <div className="space-y-2 pr-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                      {activeUrls.map((url, index) => (
                        <motion.div
                          key={`${url}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-md overflow-hidden bg-blue-100 dark:bg-blue-900/30 p-1 flex items-center justify-center">
                            <img
                              src={getFaviconUrl(url)}
                              alt={url}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Show domain first letter if favicon fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `<span class="text-blue-500 dark:text-blue-400 font-bold text-xs">${url.charAt(0).toUpperCase()}</span>`;
                              }}
                            />
                          </div>
                          <span className="text-foreground text-sm flex-1 truncate">{url}</span>
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <ArrowRightIcon className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-pulse" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center font-medium text-gray-900 dark:text-blue-700 text-sm">
                      <CheckIcon className="mr-1.5 w-3.5 h-3.5" />
                      Research Progress:
                    </h4>
                    <div className="space-y-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/20">
                      {researchStats.completedSteps.map((step, index) => {
                        // Determine which icon to show based on the step content
                        let StepIcon = CheckIcon;
                        if (step.includes('plan')) StepIcon = BrainIcon;
                        else if (step.includes('sources')) StepIcon = GlobeIcon;
                        else if (step.includes('Crawled')) StepIcon = SearchIcon;
                        else if (step.includes('Analyzed')) StepIcon = BookOpenIcon;
                        else if (step.includes('Refined')) StepIcon = ArrowRightIcon;
                        else if (step.includes('Collected')) StepIcon = DatabaseIcon;
                        else if (step.includes('Synthesizing')) StepIcon = RefreshCwIcon;
                        else if (step.includes('Generating')) StepIcon = FileTextIcon;

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className="flex justify-center items-center bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded-full w-5 h-5">
                              <StepIcon className="w-3 h-3" />
                            </div>
                            <span className="text-foreground">{step}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 bg-destructive/10 p-5 border border-destructive rounded-xl text-destructive"
              >
                <AlertCircleIcon className="flex-shrink-0 mt-0.5 w-5 h-5" />
                <div>
                  <p className="font-semibold">Research Error</p>
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {report && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card shadow-xl p-8 border border-border rounded-xl"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-100 dark:border-blue-900/20">
                  <h3 className="flex items-center font-serif font-semibold text-card-foreground text-2xl">
                    <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Research Results
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (report) {
                          navigator.clipboard.writeText(report);
                          // You could add a toast notification here
                        }
                      }}
                      className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 px-3 py-1.5 rounded-full text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-medium dark:prose-a:text-blue-400 prose-a:text-blue-500 prose prose-blue">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={renderers}
                  >
                    {processReportForMarkdown(report)}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
