/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  LinkIcon,
  GlobeIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SearchIcon,
  BookIcon,
  BookOpenIcon,
  FileTextIcon,
  BrainIcon,
  DatabaseIcon,
  RefreshCwIcon,
  CircleCheck,
  CircleDashed,
  ClockIcon,
  Component,
  ListIcon,
  XIcon,
  PanelRight,
  SearchCheck,
  VenetianMask,
  BrainCog,
  Bot,
  LayoutList,
  BookText,
  Microscope,
  ScanSearch,
  FileCog,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Helper function to extract domain from URL
const extractDomain = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    let urlToParse = url.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }
    const domain = new URL(urlToParse).hostname;
    return domain.replace(/^www\./, '');
  } catch (e) {
    const domainMatch = url.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9.]+)/);
    return domainMatch ? domainMatch[0] : '';
  }
};

// Helper function to get favicon URL
const getFaviconUrl = (domain: string): string => {
  if (!domain || typeof domain !== 'string') {
    return '';
  }
  
  const cleanDomain = domain.trim().toLowerCase();
  if (!cleanDomain) return '';
  
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`;
};

// Activity types
type ActivityType = 'search' | 'plan' | 'crawl' | 'fetch' | 'analyze' | 'synthesize' | 'complete';

// Activity interface
interface ResearchActivity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: number;
  status: 'pending' | 'active' | 'completed';
  url?: string;
}

// Source interface - modified to make id and found optional
interface Source {
  id?: string;
  url: string;
  title?: string;
  found?: number; // timestamp
  accessed?: number; // timestamp
  description?: string;
}

// Research log interface
interface ResearchLog {
  jobId: string;
  timestamp: number;
  message: string;
  url?: string;
  type?: string;
}

// Socket messages interface
interface SocketMessage {
  type: 'activity' | 'source' | 'log';
  data: ResearchActivity | Source | ResearchLog;
}

// Predefined activities based on sources
const generateActivities = (query: string, sources: Source[] = []): ResearchActivity[] => {
  const now = Date.now();
  
  // Create a base set of activities that will happen in all research
  const activities: ResearchActivity[] = [
    {
      id: 'search',
      type: 'search',
      message: `Searching for information about "${query}"`,
      timestamp: now,
      status: 'active',
    },
    {
      id: 'plan',
      type: 'plan',
      message: 'Planning research strategy and determining key areas to explore',
      timestamp: now + 5000, // 5 seconds later
      status: 'pending',
    },
    {
      id: 'crawl',
      type: 'crawl',
      message: 'Crawling websites to gather relevant information',
      timestamp: now + 10000, // 10 seconds later
      status: 'pending',
    },
  ];
  
  // Add activities for each source (up to 3)
  const sourcesToUse = sources.slice(0, 3);
  sourcesToUse.forEach((source, i) => {
    activities.push({
      id: `fetch-${source.id || i}`,
      type: 'fetch',
      message: `Fetching content from ${extractDomain(source.url)}`,
      timestamp: now + 15000 + (i * 5000), // staggered times
      status: 'pending',
      url: source.url,
    });
  });
  
  // Add final activities
  activities.push(
    {
      id: 'analyze',
      type: 'analyze',
      message: 'Analyzing gathered information and extracting key insights',
      timestamp: now + 30000, // 30 seconds later
      status: 'pending',
    },
    {
      id: 'synthesize',
      type: 'synthesize',
      message: 'Synthesizing research into comprehensive response',
      timestamp: now + 40000, // 40 seconds later
      status: 'pending',
    },
    {
      id: 'complete',
      type: 'complete',
      message: 'Research complete',
      timestamp: now + 50000, // 50 seconds later
      status: 'pending',
    }
  );
  
  return activities;
};

// Custom hook for SSE (Server-Sent Events) connection
function useEventSource(url: string | null, onMessage: (data: any) => void) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  useEffect(() => {
    if (!url) return;
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('SSE connection opened:', url);
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setConnected(false);
    };
    
    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [url, onMessage]);
  
  return connected;
}

interface ResearchSidebarProps {
  open: boolean;
  jobId?: string;
  query: string;
  mode?: 'think' | 'non-think';
  sources: Source[];
  onClose: () => void;
}

export function ResearchSidebar({ 
  open, 
  jobId, 
  query, 
  mode = 'non-think',
  sources,
  onClose 
}: ResearchSidebarProps) {
  const [activities, setActivities] = useState<ResearchActivity[]>([]);
  const [visibleActivities, setVisibleActivities] = useState<ResearchActivity[]>([]);
  const [logs, setLogs] = useState<ResearchLog[]>([]);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [activeTab, setActiveTab] = useState<'activities' | 'sources'>('activities');
  const activityContainerRef = useRef<HTMLDivElement>(null);
  
  // Simulation timer for updating activities status
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize predefined activities based on query
  useEffect(() => {
    if (query && open) {
      const initialActivities = generateActivities(query, sources);
      setActivities(initialActivities);
      
      // Initialize with just the first visible activity
      setVisibleActivities([initialActivities[0]]);
      
      // Initialize with provided sources
      if (sources.length > 0) {
        setActiveSources(sources.map(source => ({
          ...source,
          id: source.id || `source-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          found: source.found || Date.now()
        })));
      }
    }
  }, [query, open, sources]);
  
  // Simulate real-time activity updates
  useEffect(() => {
    if (!open || !activities.length) return;
    
    // Clear any existing simulation
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }
    
    const now = Date.now();
    
    // Simulation interval for updating activities
    simulationRef.current = setInterval(() => {
      const currentTime = Date.now();
      
      // Update activities based on their scheduled time
      setActivities(prev => 
        prev.map(activity => {
          // If it's time to activate this activity
          if (activity.status === 'pending' && currentTime >= activity.timestamp) {
            return { ...activity, status: 'active' };
          }
          
          // If it's active and has been active for a while, complete it
          if (activity.status === 'active' && currentTime >= activity.timestamp + 5000) {
            return { ...activity, status: 'completed' };
          }
          
          return activity;
        })
      );
      
      // Update visible activities based on scheduled time
      setVisibleActivities(prev => {
        const nextActivity = activities.find(a => 
          !prev.some(p => p.id === a.id) && 
          currentTime >= a.timestamp
        );
        
        if (nextActivity) {
          return [...prev, nextActivity];
        }
        
        return prev;
      });
      
    }, 1000);
    
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
        simulationRef.current = null;
      }
    };
  }, [open, activities]);
  
  // Connect to the SSE API for real-time updates
  const sseUrl = jobId ? `/api/research-stream?jobId=${jobId}` : null;
  const connected = useEventSource(sseUrl, (data) => {
    console.log('Received SSE message:', data);
    
    if (data.type === 'activity') {
      // Update or add new activity
      const newActivity = data.data as ResearchActivity;
      setActivities(prev => {
        // Check if this activity already exists
        const exists = prev.some(a => a.id === newActivity.id);
        
        if (exists) {
          // Update the existing activity
          return prev.map(a => a.id === newActivity.id ? newActivity : a);
        } else {
          // Add the new activity
          return [...prev, newActivity];
        }
      });
      
      // Add to visible activities if not already there
      setVisibleActivities(prev => {
        if (!prev.some(a => a.id === newActivity.id)) {
          return [...prev, newActivity];
        }
        return prev;
      });
    }
    
    if (data.type === 'source') {
      // Add new source
      const newSource = data.data as Source;
      setActiveSources(prev => {
        // Check if this source already exists
        const exists = prev.some(s => s.url === newSource.url);
        
        if (!exists) {
          return [...prev, newSource];
        }
        return prev;
      });
    }
    
    if (data.type === 'log') {
      // Add new log
      const newLog = data.data as ResearchLog;
      setLogs(prev => [...prev, newLog]);
    }
  });
  
  // Icons for activity types
  const activityIcons: Record<ActivityType, React.ReactNode> = {
    search: <SearchIcon className="h-4 w-4" />,
    plan: <LayoutList className="h-4 w-4" />,
    crawl: <ScanSearch className="h-4 w-4" />,
    fetch: <BookText className="h-4 w-4" />,
    analyze: <Microscope className="h-4 w-4" />,
    synthesize: <FileCog className="h-4 w-4" />,
    complete: <CircleCheck className="h-4 w-4" />
  };
  
  // Status icons
  const statusIcons = {
    pending: <CircleDashed className="h-4 w-4 text-gray-400" />,
    active: <Loader2Icon className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CircleCheck className="h-4 w-4 text-green-500" />
  };
  
  // Activity item component
  const ActivityItem = ({ activity }: { activity: ResearchActivity }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800/60 transition-all",
        activity.status === 'active' && "bg-blue-50/70 dark:bg-blue-950/30 backdrop-blur-sm"
      )}
    >
      <div className="flex-shrink-0 mt-1.5">
        {activity.status === 'pending' ? statusIcons.pending :
         activity.status === 'active' ? statusIcons.active :
         statusIcons.completed}
      </div>
      <div className="flex-grow min-w-0 font-serif">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
            {activityIcons[activity.type]}
            <span className="font-medium">{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</span>
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 tracking-tight leading-relaxed">
          {activity.message}
        </p>
        {activity.url && (
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm overflow-hidden">
              <img 
                src={getFaviconUrl(activity.url)} 
                alt="" 
                className="h-4 w-4 transition-transform group-hover:scale-110" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            </div>
            <span className="truncate max-w-[200px]">{extractDomain(activity.url)}</span>
            <ExternalLinkIcon className="h-3 w-3 opacity-70 group-hover:opacity-100" />
          </a>
        )}
      </div>
    </motion.div>
  );
  
  // Source item component
  const SourceItem = ({ source }: { source: Source }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-all backdrop-blur-sm group"
    >
      <div className="flex-shrink-0 mt-1">
        <div className="relative">
          <div className="h-8 w-8 rounded-md shadow-sm bg-white dark:bg-gray-800 p-1 overflow-hidden transition-transform group-hover:scale-105">
            <img 
              src={getFaviconUrl(source.url)} 
              alt=""
              className="h-full w-full object-contain" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div 
              className="absolute inset-0 hidden items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md"
            >
              <GlobeIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-grow min-w-0 font-serif">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 tracking-tight transition-colors"
        >
          {source.title || extractDomain(source.url)}
          <ExternalLinkIcon className="ml-1 inline h-3 w-3 align-text-top opacity-70" />
        </a>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{source.url}</p>
        {source.description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2 leading-relaxed">{source.description}</p>
        )}
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full p-0.5">
              <SearchCheck className="h-3 w-3" />
            </span>
            Found: {new Date(source.found || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {source.accessed && (
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full p-0.5">
                <DatabaseIcon className="h-3 w-3" />
              </span>
              Accessed: {new Date(source.accessed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
  
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop on small screens */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-xl border-l border-gray-200/80 dark:border-gray-800/50 flex flex-col font-serif"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/50">
              <div className="flex items-center gap-2.5">
                <PanelRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 tracking-tight">Research Activity</h3>
                {mode === 'think' && (
                  <span className="bg-purple-100/80 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                    <BrainCog className="h-3 w-3" />
                    <span className="font-medium">Deep</span>
                  </span>
                )}
                {mode === 'non-think' && (
                  <span className="bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                    <RefreshCwIcon className="h-3 w-3" />
                    <span className="font-medium">Fast</span>
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200/80 dark:border-gray-800/50">
              <button
                onClick={() => setActiveTab('activities')}
                className={cn(
                  "flex-1 py-3.5 text-sm font-medium transition-all",
                  activeTab === 'activities' 
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Component className="h-4 w-4" />
                  <span>Activities</span>
                  {visibleActivities.length > 0 && (
                    <span className="bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      {visibleActivities.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={cn(
                  "flex-1 py-3.5 text-sm font-medium transition-all",
                  activeTab === 'sources' 
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <ListIcon className="h-4 w-4" />
                  <span>Sources</span>
                  {activeSources.length > 0 && (
                    <span className="bg-green-100/80 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                      {activeSources.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {activeTab === 'activities' && (
                <div className="divide-y divide-gray-100/80 dark:divide-gray-800/50">
                  {visibleActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
                      <div className="bg-gray-100/80 dark:bg-gray-800/60 p-4 rounded-full mb-3 backdrop-blur-sm">
                        <SearchIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-medium">Waiting for research activities...</p>
                    </div>
                  ) : (
                    visibleActivities.map(activity => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))
                  )}
                </div>
              )}
              
              {activeTab === 'sources' && (
                <div className="divide-y divide-gray-100/80 dark:divide-gray-800/50">
                  {activeSources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
                      <div className="bg-gray-100/80 dark:bg-gray-800/60 p-4 rounded-full mb-3 backdrop-blur-sm">
                        <GlobeIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-medium">No sources discovered yet...</p>
                    </div>
                  ) : (
                    activeSources.map(source => (
                      <SourceItem key={source.id || source.url} source={source} />
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200/80 dark:border-gray-800/50 p-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm">
              {connected ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-medium">Connected to research stream</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                  <span className="font-medium">Using simulated research data</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 