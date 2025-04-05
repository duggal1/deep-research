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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Deep Research</h1>
      
      {/* Research Form */}
      <form onSubmit={startResearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
          >
            {isLoading ? 'Researching...' : 'Research'}
          </button>
        </div>
      </form>

      {/* Status Check Form */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Check Research Status</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Enter job ID..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            onClick={() => checkStatus(jobId)}
            disabled={isLoading || !jobId.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="border rounded p-4">
          <div className="mb-4">
            <strong>Status:</strong> {results.status}
            {results.currentDepth && results.maxDepth && (
              <span className="ml-2">
                Progress: {results.currentDepth}/{results.maxDepth}
              </span>
            )}
          </div>
          
          {/* Final Analysis */}
          {results.data?.finalAnalysis && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Final Analysis</h3>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-base leading-relaxed">
                {results.data.finalAnalysis}
              </div>
            </div>
          )}
          
          {/* Activities */}
          {results.data?.activities && results.data.activities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Research Activities</h3>
              <ul className="list-disc pl-5">
                {results.data.activities.slice(0, 5).map((activity, index) => (
                  <li key={index}>
                    [{activity.type}] {activity.message}
                  </li>
                ))}
                {results.data.activities.length > 5 && (
                  <li className="text-gray-500">
                    + {results.data.activities.length - 5} more activities
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Sources */}
          {results.data?.sources && results.data.sources.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Sources ({results.data.sources.length})</h3>
              <div className="space-y-6">
                {results.data.sources.slice(0, 10).map((source, index) => (
                  <div key={index} className="border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline font-medium text-lg"
                      >
                        {source.title || 'Untitled'}
                      </a>
                      <span className="text-sm bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                        Source {index + 1}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3 truncate">{source.url}</div>
                    
                    {source.geminiAnalysis && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Analysis:</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {source.geminiAnalysis}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {results.data.sources.length > 10 && (
                  <div className="text-center p-3 border border-dashed rounded-lg">
                    <button 
                      className="text-blue-600 hover:underline"
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