'use client';

import { useState, useEffect } from 'react';
import { ResearchResult } from '@/app/actions/deepResearch';

interface UseDeepResearchOptions {
  pollingInterval?: number;
  autoPolling?: boolean;
}

export function useDeepResearch(options: UseDeepResearchOptions = {}) {
  const { pollingInterval = 5000, autoPolling = true } = options;
  
  const [query, setQuery] = useState('');
  const [jobId, setJobId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingTimerId, setPollingTimerId] = useState<NodeJS.Timeout | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerId) clearInterval(pollingTimerId);
    };
  }, [pollingTimerId]);

  // Start research with a query
  const startResearch = async (researchQuery: string) => {
    if (!researchQuery.trim()) {
      setError('Query is required');
      return null;
    }

    setQuery(researchQuery);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/x/crawl?query=${encodeURIComponent(researchQuery)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start research');
      }

      setResults(data);
      
      if (autoPolling && (data.status === 'pending' || data.status === 'processing')) {
        setJobId(data.jobId);
        startPolling(data.jobId);
      }
      
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Check status of a research job
  const checkStatus = async (id: string = jobId) => {
    if (!id) {
      setError('Job ID is required');
      return null;
    }

    setJobId(id);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/x/crawl?jobId=${encodeURIComponent(id)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      setResults(data);
      
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
      }
      
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling for status updates
  const startPolling = (id: string = jobId) => {
    stopPolling();
    
    if (!id) return;
    
    const timerId = setInterval(() => {
      checkStatus(id);
    }, pollingInterval);
    
    setPollingTimerId(timerId);
  };

  // Stop polling for updates
  const stopPolling = () => {
    if (pollingTimerId) {
      clearInterval(pollingTimerId);
      setPollingTimerId(null);
    }
  };

  return {
    query,
    jobId,
    isLoading,
    results,
    error,
    isPolling: !!pollingTimerId,
    startResearch,
    checkStatus,
    startPolling,
    stopPolling,
    setQuery,
    setJobId,
  };
} 