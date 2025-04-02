'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ArrowRightIcon
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

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
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [loading, countdown]);

  // Simulate active URLs during research
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
      'semanticscholar.org'
    ];

    // Simulate URL activity
    const updateUrls = () => {
      const numUrls = Math.floor(Math.random() * 3) + 1; // 1-3 URLs at a time
      const newUrls = [];

      for (let i = 0; i < numUrls; i++) {
        const randomIndex = Math.floor(Math.random() * domains.length);
        newUrls.push(domains[randomIndex]);
      }

      setActiveUrls(newUrls);
    };

    // Update URLs every 2-4 seconds
    const interval = setInterval(() => {
      updateUrls();
    }, Math.random() * 2000 + 2000);

    // Initial update
    updateUrls();

    return () => clearInterval(interval);
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

    // Estimate research time - roughly 30s + 10s per word in query
    const wordCount = query.split(' ').length;
    const timeEstimate = 30 + wordCount * 5;
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

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      clearInterval(stageTimer);

      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
        setReport('');
      } else {
        setReport(data.report);
        const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5);
        saveHistory(newHistory);
      }
    } catch (error) {
      clearInterval(stageTimer);
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
          <div className="relative group my-6">
            <div className="absolute right-2 top-2 z-10">
              <button
                onClick={() => handleCopyCode(code)}
                className="bg-primary/10 hover:bg-primary/20 text-primary rounded p-1 transition-colors"
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
              className="rounded-lg !mt-0 !bg-zinc-900 dark:!bg-zinc-900 !text-sm"
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
          <div className="relative group my-6">
            <div className="absolute right-2 top-2 z-10">
              <button
                onClick={() => handleCopyCode(code)}
                className="bg-primary/10 hover:bg-primary/20 text-primary rounded p-1 transition-colors"
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
              className="rounded-lg !mt-0 !bg-zinc-900 dark:!bg-zinc-900 !text-sm"
              {...props}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }

      // Inline code
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },

    // Custom heading renderer
    h1: ({ children }: any) => <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold mt-6 mb-3 text-foreground">{children}</h2>,
    h3: ({ children }: any) => {
      // Special formatting for section headers
      const text = String(children);
      if (
        text.includes('Executive Summary:') ||
        text.includes('Key Findings:') ||
        text.includes('Detailed Analysis:') ||
        text.includes('Research Methodology:') ||
        text.includes('Research Path:') ||
        text.includes('Top Sources:') ||
        text.includes('Code Examples:') ||
        text.includes('Key Insights:')
      ) {
        return (
          <h3 className="flex items-center mt-8 mb-4 font-semibold text-primary text-xl border-b border-primary/20 pb-2">
            {text}
          </h3>
        );
      }
      return <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h3>;
    },

    // Custom link renderer
    a: ({ node, href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http');
      const domain = isExternal ? extractDomain(href) : '';

      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-500 dark:text-blue-400 hover:underline font-medium"
            {...props}
          >
            {children}
            <ExternalLinkIcon className="ml-1 w-3 h-3" />
          </a>
        );
      }

      return (
        <a href={href} className="text-primary hover:underline" {...props}>
          {children}
        </a>
      );
    },

    // Custom list item renderer for sources
    li: ({ node, children, ...props }: any) => {
      const childrenStr = String(children);

      // Check if this is a source item with URL
      if (childrenStr.includes('http') && childrenStr.includes('Relevance:')) {
        const urlMatch = childrenStr.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : '';
        const domain = url ? extractDomain(url) : '';
        const faviconUrl = domain ? getFaviconUrl(domain) : '';

        // Extract title and relevance
        const titleMatch = childrenStr.match(/^([^(]+)/);
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Source';

        const relevanceMatch = childrenStr.match(/Relevance: ([^)]+)/);
        const relevance = relevanceMatch ? relevanceMatch[1].trim() : '';

        return (
          <li className="mb-3 flex items-start" {...props}>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors w-full">
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt={domain}
                  className="w-5 h-5 rounded-sm flex-shrink-0"
                />
              )}
              <div className="flex-grow min-w-0">
                <div className="font-medium text-foreground truncate">{title}</div>
                <div className="text-xs text-muted-foreground truncate">{domain}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {relevance}
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </li>
        );
      }

      // Check if this is a research path item
      if (childrenStr.includes('Initial:') || childrenStr.includes('Plan ') || childrenStr.includes('Refinement ')) {
        return (
          <li className="mb-2 pl-4 border-l-2 border-primary/30 py-1 text-muted-foreground" {...props}>
            {children}
          </li>
        );
      }

      // Regular list item
      return (
        <li className="mb-2 flex items-start" {...props}>
          <span className="mr-2 mt-1 text-primary">•</span>
          <span>{children}</span>
        </li>
      );
    },

    // Custom paragraph renderer
    p: ({ node, children, ...props }: any) => {
      return <p className="mb-4 leading-relaxed text-card-foreground" {...props}>{children}</p>;
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

    // Ensure URLs in source listings are properly formatted for markdown
    processed = processed.replace(
      /(- .+?)\(Relevance: (.+?)\)\s+(https?:\/\/[^\s]+)/g,
      '$1(Relevance: $2)\n[$3]($3)'
    );

    return processed;
  };

  return (
    <div className="bg-background min-h-screen font-serif">
      <nav className="border-b border-border backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <BookOpenIcon className="w-6 h-6 text-primary" />
              <h1 className="font-bold text-foreground text-2xl">DeepResearch</h1>
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
            <h2 className="font-black font-serif dark:text-white text-gray-900">
              Deep Web Research Engine
            </h2>
            <p className="text-muted-foreground text-center text-lg">
              Powered by autonomous web exploration and advanced AI reasoning
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
                className="bg-background/50 backdrop-blur-sm px-5 py-4 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full text-foreground shadow-sm transition-all duration-200 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="top-1/2 right-3 absolute bg-primary hover:bg-primary/90 disabled:opacity-50 p-3 rounded-lg text-primary-foreground transition-all duration-200 -translate-y-1/2 shadow-md hover:shadow-lg"
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
                        className="bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-full text-secondary-foreground text-xs whitespace-nowrap transition-colors shadow-sm hover:shadow"
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
                    <h3 className="font-semibold text-card-foreground text-xl">Researching...</h3>
                  </div>
                  <div className="text-muted-foreground text-sm font-mono">
                    {countdown > 0 ? `~${countdown}s remaining` : 'Almost done...'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <BrainIcon className="w-4 h-4 text-primary" />
                    <span>{researchStage}</span>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Active Research Sources:</h4>
                    <div className="space-y-2">
                      {activeUrls.map((url, index) => (
                        <motion.div
                          key={`${url}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <img
                            src={getFaviconUrl(url)}
                            alt={url}
                            className="w-4 h-4"
                          />
                          <span className="text-foreground">{url}</span>
                          <ArrowRightIcon className="w-3 h-3 text-primary animate-pulse" />
                        </motion.div>
                      ))}
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
                <h3 className="flex items-center mb-6 font-semibold text-card-foreground text-2xl border-b border-border pb-4">
                  <BookOpenIcon className="mr-3 w-6 h-6 text-primary" />
                  Research Results
                </h3>
                <div className="prose dark:prose-invert prose-headings:font-serif prose-headings:font-medium prose-a:text-blue-500 dark:prose-a:text-blue-400 max-w-none">
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