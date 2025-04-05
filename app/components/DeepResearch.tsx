'use client';

import { useState, useEffect } from 'react';
import { ResearchResult } from '@/app/actions/deepResearch';

export default function DemoResearch() {
  const [query, setQuery] = useState('');
  const [jobId, setJobId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');
  const [statusInterval, setStatusInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to start new research
  const startResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`/api/x/crawl?query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResults(data);
      
      // If the research is in progress, start polling for status
      if (data.status === 'pending' || data.status === 'processing') {
        setJobId(data.jobId);
        startStatusPolling(data.jobId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start research');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check research status
  const checkStatus = async (id: string) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/x/crawl?jobId=${encodeURIComponent(id)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      setResults(data);
      
      // Stop polling if research is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        stopStatusPolling();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check status');
      stopStatusPolling();
    }
  };

  // Start polling for status updates
  const startStatusPolling = (id: string) => {
    stopStatusPolling(); // Clear any existing interval
    
    const interval = setInterval(() => {
      checkStatus(id);
    }, 5000); // Check every 5 seconds
    
    setStatusInterval(interval);
  };

  // Stop polling for status
  const stopStatusPolling = () => {
    if (statusInterval) {
      clearInterval(statusInterval);
      setStatusInterval(null);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, []);

  // Extract a preview of the final analysis
  const getAnalysisPreview = (text: string, maxLength: number = 500) => {
    if (!text) return '';
    
    // If text is shorter than max length, return it completely
    if (text.length <= maxLength) return text;
    
    // Otherwise, find a good breaking point (end of sentence) near maxLength
    const breakPoint = text.substring(0, maxLength).lastIndexOf('. ');
    if (breakPoint !== -1) {
      // Return up to the last complete sentence plus the period
      return text.substring(0, breakPoint + 1) + ' [...]';
    }
    
    // Fallback to simple truncation if no sentence break found
    return `${text.substring(0, maxLength)}...`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 font-serif">
      <h1 className="text-2xl font-bold mb-6 text-blue-700 dark:text-blue-400">Deep Research</h1>
      
      {/* Research Form */}
      <form onSubmit={startResearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-blue-300 dark:disabled:bg-blue-800/50 shadow-sm"
          >
            {isLoading ? 'Researching...' : 'Research'}
          </button>
        </div>
      </form>

      {/* Status Check Form */}
      <div className="mb-8 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-400">Check Research Status</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Enter job ID..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            onClick={() => checkStatus(jobId)}
            disabled={isLoading || !jobId.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-green-300 dark:disabled:bg-green-800/50 shadow-sm"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900/60 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-medium">
              <strong className="text-blue-700 dark:text-blue-400">Status:</strong> {results.status}
            </span>
            {results.currentDepth && results.maxDepth && (
              <span className="ml-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-sm">
                Progress: {results.currentDepth}/{results.maxDepth}
              </span>
            )}
          </div>
          
          {/* Final Analysis */}
          {results.data?.finalAnalysis && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-400">Final Analysis</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded whitespace-pre-wrap text-base leading-relaxed border border-gray-200 dark:border-gray-700 shadow-inner">
                {results.data.finalAnalysis}
              </div>
            </div>
          )}
          
          {/* Activities */}
          {results.data?.activities && results.data.activities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-400">Research Activities</h3>
              <ul className="space-y-1">
                {results.data.activities.slice(0, 5).map((activity, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium mt-0.5">
                      {activity.type}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {activity.message}
                    </span>
                  </li>
                ))}
                {results.data.activities.length > 5 && (
                  <li className="text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-700">
                    + {results.data.activities.length - 5} more activities
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Sources */}
          {results.data?.sources && results.data.sources.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-400">
                Sources ({results.data.sources.length})
              </h3>
              <div className="space-y-6">
                {results.data.sources.slice(0, 10).map((source, index) => (
                  <div key={index} className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium text-lg"
                      >
                        {source.title || 'Untitled'}
                      </a>
                      <span className="text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full px-2 py-1">
                        Source {index + 1}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate">{source.url}</div>
                    
                    {source.geminiAnalysis && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Analysis:</div>
                        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {source.geminiAnalysis}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {results.data.sources.length > 10 && (
                  <div className="text-center p-3 border border-dashed rounded-lg border-gray-300 dark:border-gray-700">
                    <button 
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      onClick={() => alert("Showing all sources feature coming soon!")}
                    >
                      Show {results.data.sources.length - 10} more sources
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 