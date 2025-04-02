'use client';

import { useState, useEffect } from 'react';
import { SearchIcon, Loader2Icon, BookOpenIcon, HistoryIcon, AlertCircleIcon, BrainIcon, ExternalLinkIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

const ThemeSwitcher = dynamic(
  () => import('@/components/theme-switcher').then(mod => mod.ThemeSwitcher),
  { ssr: false }
);

export default function Home() {
  const [query, setQuery] = useState('');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [researchStage, setResearchStage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [countdown, setCountdown] = useState(0);

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

  const formatReportText = (text: string) => {
    // Process links to make them clickable
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    
    // Process sections with special formatting
    return text.split('\n').map((line, i) => {
      // Format headings
      if (line.includes('Executive Summary:') || 
          line.includes('Key Findings:') || 
          line.includes('Detailed Analysis:') ||
          line.includes('Research Methodology:') ||
          line.includes('Research Path:') ||
          line.includes('Top Sources:')) {
        return (
          <h3 key={i} className="mt-6 mb-3 font-semibold text-primary text-xl">
            {line}
          </h3>
        );
      } 
      // Format sources with links
      else if (line.trim().startsWith('-') && line.includes('http')) {
        return (
          <p key={i} className="flex items-start mb-2">
            <span className="mr-2">•</span>
            <span>
              {line.replace(linkRegex, (url) => '').replace('- ', '')}
              {line.match(linkRegex)?.map((url, j) => (
                <a 
                  key={j} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center ml-1 text-primary hover:underline"
                >
                  <ExternalLinkIcon className="mr-1 w-3 h-3" />
                  {url.length > 50 ? url.substring(0, 50) + '...' : url}
                </a>
              ))}
            </span>
          </p>
        );
      } 
      // Format research path items
      else if (line.includes('Initial:') || line.includes('Plan ') || line.includes('Refinement ')) {
        return (
          <p key={i} className="mb-2 pl-4 border-primary/30 border-l-2">
            {line}
          </p>
        );
      }
      // Regular paragraph
      else if (line.trim()) {
        return <p key={i} className="mb-4 text-card-foreground">{line}</p>;
      }
      // Empty line
      return <br key={i} />;
    });
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  return (
    <div className="bg-background min-h-screen font-serif">
      <nav className="border-b border-border">
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
          <div className="space-y-4">
            <h2 className="font-bold text-foreground text-4xl text-center">
              Deep Web Research Engine
            </h2>
            <p className="text-muted-foreground text-center">
              Powered by autonomous web exploration and advanced AI reasoning
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research query..."
                className="bg-background px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                disabled={loading}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="top-1/2 right-2 absolute bg-primary hover:bg-primary/90 disabled:opacity-50 p-2 rounded-md text-primary-foreground transition-colors -translate-y-1/2"
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
                      <button
                        key={i}
                        onClick={() => {
                          if (!loading) {
                            setQuery(q);
                            setTimeout(() => handleResearch(), 100);
                          }
                        }}
                        disabled={loading}
                        className="bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-full text-secondary-foreground text-xs whitespace-nowrap transition-colors"
                      >
                        {q.length > 30 ? q.substring(0, 30) + '...' : q}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={clearHistory}
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-4 bg-card shadow-lg p-6 border border-border rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Loader2Icon className="w-5 h-5 text-primary animate-spin" />
                  <h3 className="font-semibold text-card-foreground text-xl">Researching...</h3>
                </div>
                <div className="text-muted-foreground text-sm">
                  {countdown > 0 ? `~${countdown}s remaining` : 'Almost done...'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{
                      width: `${Math.max(5, Math.min(100, 100 - (countdown / estimatedTime * 100)))}%`
                    }}
                  />
                </div>
                <p className="flex items-center text-muted-foreground text-sm">
                  <BrainIcon className="mr-2 w-4 h-4 text-primary" />
                  {researchStage}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 p-4 border border-destructive rounded-lg text-destructive">
              <AlertCircleIcon className="flex-shrink-0 mt-0.5 w-5 h-5" />
              <div>
                <p className="font-semibold">Research Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {report && (
            <div className="bg-card shadow-lg p-6 border border-border rounded-lg">
              <h3 className="flex items-center mb-4 font-semibold text-card-foreground text-xl">
                <BookOpenIcon className="mr-2 w-5 h-5 text-primary" />
                Research Results
              </h3>
              <div className="dark:prose-invert max-w-none prose prose-sm">
                {formatReportText(report)}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}