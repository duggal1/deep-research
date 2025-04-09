/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  BrainCog,
  LayoutList,
  BookText,
  Microscope,
  ScanSearch,
  FileCog,
  WifiOffIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Cache for favicons to prevent unnecessary reloads
const faviconCache = new Map<string, string>();

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

// Helper function to get favicon URL with caching
const getFaviconUrl = (domain: string): string => {
  if (!domain || typeof domain !== 'string') {
    return '';
  }
  
  const cleanDomain = domain.trim().toLowerCase();
  if (!cleanDomain) return '';
  
  // Check cache first
  if (faviconCache.has(cleanDomain)) {
    return faviconCache.get(cleanDomain) || '';
  }
  
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`;
  faviconCache.set(cleanDomain, faviconUrl);
  return faviconUrl;
};

// Activity types
type ActivityType = 'search' | 'plan' | 'crawl' | 'fetch' | 'analyze' | 'synthesize' | 'complete' | 'log' | 'error';
type ActivityStatus = 'pending' | 'active' | 'completed' | 'failed';

// Activity interface
interface ResearchActivity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: number;
  status: ActivityStatus;
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
  level?: 'info' | 'warn' | 'error';
}

// Socket messages interface
interface SocketMessage {
  type: 'activity' | 'source' | 'log' | 'complete' | 'error';
  data: ResearchActivity | Source | ResearchLog | { message: string, timestamp: number };
}

// Custom hook for SSE (Server-Sent Events) connection
function useEventSource(url: string | null, onMessage: (data: SocketMessage) => void, onError: () => void, onOpen: () => void) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  useEffect(() => {
    if (!url) {
      setConnected(false);
      if (eventSourceRef.current) {
        console.log('Closing existing SSE connection due to URL change/removal.');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    if (eventSourceRef.current) {
       console.log('Closing previous SSE connection before opening new one.');
       eventSourceRef.current.close();
    }

    console.log('Attempting to open SSE connection:', url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened:', url);
      setConnected(true);
      onOpen();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type && data.data) {
          onMessage(data as SocketMessage);
        } else {
           console.warn('Received malformed SSE message:', event.data);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err, 'Raw data:', event.data);
        onMessage({
          type: 'error',
          data: { message: `Failed to parse message: ${event.data.substring(0, 100)}...`, timestamp: Date.now() }
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setConnected(false);
      onError();
      if (eventSource.readyState === EventSource.CLOSED) {
          console.log("SSE connection closed by server or error.");
          eventSourceRef.current = null;
      } else if (eventSource.readyState === EventSource.CONNECTING) {
          console.log("SSE connection attempting to reconnect...");
      }
    };

    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection on cleanup');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
    };
  }, [url, onMessage, onError, onOpen]);
  
  return connected;
}

interface ResearchSidebarProps {
  open: boolean;
  jobId?: string;
  query: string;
  mode?: 'think' | 'non-think';
  onClose: () => void;
}

export function ResearchSidebar({ 
  open, 
  jobId, 
  query, 
  mode = 'non-think',
  onClose 
}: ResearchSidebarProps) {
  // Local state, reset when jobId/open changes
  const [activities, setActivities] = useState<ResearchActivity[]>([]);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [activeTab, setActiveTab] = useState<'activities' | 'sources'>('activities');
  const [isConnected, setIsConnected] = useState(false);
  const [initialConnectionMade, setInitialConnectionMade] = useState(false);

  const activityContainerRef = useRef<HTMLDivElement>(null);
  const currentJobIdRef = useRef<string | undefined>(jobId);

  // Memoize domain extraction for sources (recalculates when activeSources changes)
  const domainMap = useMemo(() => {
    const map = new Map<string, string>();
    activeSources.forEach(source => {
      if (source.url) {
        map.set(source.url, extractDomain(source.url));
      }
    });
    return map;
  }, [activeSources]);

  // Reset state when sidebar opens with a new job ID or closes
  useEffect(() => {
    if (open && jobId && jobId !== currentJobIdRef.current) {
      console.log(`Sidebar opened for new job: ${jobId}. Resetting state.`);
      setActivities([]);
      setActiveSources([]);
      setActiveTab('activities');
      setIsConnected(false);
      setInitialConnectionMade(false);
      currentJobIdRef.current = jobId;
    } else if (!open) {
       // Optionally reset state on close, or keep it if you want persistence while closed
       // Resetting ensures a clean slate when reopened.
       // console.log("Sidebar closed. Resetting state.");
       // setActivities([]);
       // setActiveSources([]);
       // setIsConnected(false);
       // setInitialConnectionMade(false);
       // currentJobIdRef.current = undefined;
    }
  }, [open, jobId]);

  // Handler for incoming SSE messages
  const handleSSEMessage = useCallback((data: SocketMessage) => {
    console.log('Received SSE message:', data);

    if (data.type === 'activity') {
      const newActivity = data.data as ResearchActivity;
      const validStatus: ActivityStatus = ['pending', 'active', 'completed', 'failed'].includes(newActivity.status) ? newActivity.status : 'pending';

      setActivities(prev => {
        const existsIndex = prev.findIndex(a => a.id === newActivity.id);
        if (existsIndex > -1) {
          const updated = [...prev];
          updated[existsIndex] = { ...newActivity, status: validStatus };
          return updated.sort((a, b) => a.timestamp - b.timestamp);
        } else {
          return [...prev, { ...newActivity, status: validStatus }].sort((a, b) => a.timestamp - b.timestamp);
        }
      });
    } else if (data.type === 'source') {
      const newSource = data.data as Source;
      setActiveSources(prev => {
        const exists = prev.some(s => s.url === newSource.url);
        if (!exists) {
          return [...prev, {
            ...newSource,
            id: newSource.id || `source-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`,
            found: newSource.found || Date.now()
          }];
        }
        return prev;
      });
    } else if (data.type === 'log' || data.type === 'error') {
        const logData = data.data as ResearchLog | { message: string, timestamp: number };
        const isError = data.type === 'error' || (logData as ResearchLog).level === 'error';
        const activity: ResearchActivity = {
            id: `log-${logData.timestamp}-${Math.random().toString(16).substring(2, 8)}`,
            type: isError ? 'error' : 'log',
            message: logData.message,
            timestamp: logData.timestamp,
            status: isError ? 'failed' : 'completed',
            url: (logData as ResearchLog).url,
        };
        setActivities(prev => [...prev, activity].sort((a, b) => a.timestamp - b.timestamp));

    } else if (data.type === 'complete') {
        const completeData = data.data as { message: string, timestamp: number };
        const finalActivity: ResearchActivity = {
             id: 'complete-final',
             type: 'complete',
             message: completeData.message || 'Research process completed.',
             timestamp: completeData.timestamp || Date.now(),
             status: 'completed',
         };
         setActivities(prev => {
             const filtered = prev.filter(a => a.type !== 'complete');
             return [...filtered, finalActivity].sort((a, b) => a.timestamp - b.timestamp);
         });
         setIsConnected(false);
    }
  }, []);

  const handleSSEError = useCallback(() => {
      console.log("SSE connection error occurred.");
      setIsConnected(false);
      setActivities(prev => {
           const errorActivity: ResearchActivity = {
               id: `error-${Date.now()}`,
               type: 'error',
               message: 'Connection to research stream lost. Attempting to reconnect...',
               timestamp: Date.now(),
               status: 'failed',
           };
           if (!prev.some(a => a.id.startsWith('error-'))) {
               return [...prev, errorActivity].sort((a,b) => a.timestamp - b.timestamp);
           }
           return prev;
       });
  }, []);

  const handleSSEOpen = useCallback(() => {
      console.log("SSE connection successfully opened.");
      setIsConnected(true);
      setInitialConnectionMade(true);
       setActivities(prev => prev.filter(a => !a.id.startsWith('error-')));
  }, []);

  // Connect to the SSE API for real-time updates
  const sseUrl = (open && jobId) ? `/api/research-stream?jobId=${jobId}` : null;
  useEventSource(sseUrl, handleSSEMessage, handleSSEError, handleSSEOpen);

  // Icons for activity types
  const activityIcons: Record<ActivityType, React.ReactNode> = useMemo(() => ({
    search: <SearchIcon className="h-4 w-4" />,
    plan: <LayoutList className="h-4 w-4" />,
    crawl: <ScanSearch className="h-4 w-4" />,
    fetch: <BookText className="h-4 w-4" />,
    analyze: <Microscope className="h-4 w-4" />,
    synthesize: <FileCog className="h-4 w-4" />,
    complete: <CircleCheck className="h-4 w-4 text-green-500" />,
    log: <FileTextIcon className="h-4 w-4 text-gray-500" />,
    error: <XIcon className="h-4 w-4 text-red-500" />
  }), []);

  // Status icons
  const statusIcons: Record<ActivityStatus, React.ReactNode> = useMemo(() => ({
    pending: <CircleDashed className="h-4 w-4 text-gray-400" />,
    active: <Loader2Icon className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CircleCheck className="h-4 w-4 text-green-500" />,
    failed: <XIcon className="h-4 w-4 text-red-500" />
  }), []);

  // Scroll to bottom when new activities are added
  useEffect(() => {
    if (activityContainerRef.current) {
      activityContainerRef.current.scrollTop = activityContainerRef.current.scrollHeight;
    }
  }, [activities]);

  // Activity item component with memoed rendering
  const ActivityItem = React.memo(({ activity }: { activity: ResearchActivity }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800/60 transition-colors",
        activity.status === 'active' && "bg-blue-50/50 dark:bg-blue-950/20",
        activity.status === 'failed' && "bg-red-50/50 dark:bg-red-950/20",
        activity.type === 'log' && "opacity-80",
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {statusIcons[activity.status]}
      </div>
      <div className="flex-grow min-w-0 font-serif">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
          <span className={cn(
             "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full",
             activity.status === 'failed' ? "bg-red-100/80 dark:bg-red-800/80 text-red-700 dark:text-red-300"
               : activity.type === 'log' ? "bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400"
               : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300"
          )}>
            {activityIcons[activity.type]}
            <span className="font-medium">{activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</span>
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {new Date(activity.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <p className={cn(
          "text-sm leading-relaxed tracking-tight",
          activity.status === 'failed' ? "text-red-700 dark:text-red-300" : "text-gray-700 dark:text-gray-300"
        )}>
          {activity.message}
        </p>
        {activity.url && activity.type !== 'log' && activity.type !== 'error' && (
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors group"
          >
            <div className="relative flex-shrink-0 h-5 w-5">
                <img
                    src={getFaviconUrl(domainMap.get(activity.url) || extractDomain(activity.url))}
                    alt=""
                    className="h-4 w-4 rounded-sm transition-transform group-hover:scale-110 block"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if(fallback) fallback.style.display = 'flex';
                    }}
                />
                <div
                    className="absolute inset-0 hidden items-center justify-center rounded-sm bg-gray-100 dark:bg-gray-800"
                >
                    <GlobeIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                </div>
            </div>
            <span className="truncate max-w-[200px]">{domainMap.get(activity.url) || extractDomain(activity.url)}</span>
            <ExternalLinkIcon className="h-3 w-3 opacity-70 group-hover:opacity-100 flex-shrink-0" />
          </a>
        )}
      </div>
    </motion.div>
  ));

  ActivityItem.displayName = 'ActivityItem';

  // Source item component with memoed rendering
  const SourceItem = React.memo(({ source }: { source: Source }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-gray-900/30 transition-colors group"
    >
      <div className="flex-shrink-0 mt-1">
        <div className="relative h-8 w-8">
          <img
            src={getFaviconUrl(domainMap.get(source.url) || extractDomain(source.url))}
            alt=""
            className="h-full w-full object-contain rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 shadow-sm group-hover:scale-105 transition-transform block"
            onError={(e) => {
                 const target = e.target as HTMLImageElement;
                 target.style.display = 'none';
                 const fallback = target.nextElementSibling as HTMLElement | null;
                 if(fallback) fallback.style.display = 'flex';
            }}
          />
          <div
            className="absolute inset-0 hidden items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
          >
            <GlobeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </div>
      <div className="flex-grow min-w-0 font-serif">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 tracking-tight transition-colors"
        >
          {source.title || extractDomain(source.url)}
          <ExternalLinkIcon className="ml-1 inline h-3 w-3 align-text-top opacity-70" />
        </a>
        {source.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1.5 leading-relaxed">{source.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {source.found && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <SearchCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                Found: {new Date(source.found).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
          )}
          {source.accessed && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <DatabaseIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              Accessed: {new Date(source.accessed).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  ));

  SourceItem.displayName = 'SourceItem';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm shadow-xl border-l border-gray-200/70 dark:border-gray-800/40 flex flex-col font-serif"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/40 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 tracking-tight text-lg">Research Activity</h3>
                {mode && (
                  <span className={cn(
                     "text-xs px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm",
                     mode === 'think'
                      ? "bg-purple-100/70 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "bg-blue-100/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  )}>
                    {mode === 'think' ? <BrainCog className="h-3 w-3" /> : <RefreshCwIcon className="h-3 w-3" />}
                    <span className="font-medium">{mode === 'think' ? 'Deep' : 'Fast'}</span>
                  </span>
                 )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                aria-label="Close sidebar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200/70 dark:border-gray-800/40 flex-shrink-0">
              <button
                onClick={() => setActiveTab('activities')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors duration-150",
                  activeTab === 'activities'
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/10"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                )}
                aria-selected={activeTab === 'activities'}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Component className="h-4 w-4" />
                  <span>Activities</span>
                  {activities.length > 0 && (
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                      {activities.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors duration-150",
                  activeTab === 'sources'
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-900/10"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                )}
                 aria-selected={activeTab === 'sources'}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <ListIcon className="h-4 w-4" />
                  <span>Sources</span>
                  {activeSources.length > 0 && (
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-mono px-1.5 py-0.5 rounded-full">
                      {activeSources.length}
                    </span>
                  )}
                </div>
              </button>
            </div>

            <div ref={activityContainerRef} className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {activeTab === 'activities' && (
                 <AnimatePresence initial={false}>
                   {activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 p-6 text-center text-gray-500 dark:text-gray-400 font-serif">
                       <p className="text-sm">Connecting to research stream...</p>
                     </div>
                   ) : (
                     activities.map(activity => (
                       <ActivityItem key={activity.id} activity={activity} />
                     ))
                   )}
                 </AnimatePresence>
              )}

              {activeTab === 'sources' && (
                 <AnimatePresence initial={false}>
                   {activeSources.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-48 p-6 text-center text-gray-500 dark:text-gray-400 font-serif">
                       <p className="text-sm">Waiting for sources...</p>
                     </div>
                   ) : (
                     activeSources.map(source => (
                       <SourceItem key={source.id || source.url} source={source} />
                     ))
                   )}
                 </AnimatePresence>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-gray-200/70 dark:border-gray-800/40 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/30">
              {initialConnectionMade ? (
                  isConnected ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <span className="flex h-2 w-2 rounded-full bg-current"></span>
                          <span className="font-medium">Connected</span>
                      </div>
                  ) : (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <WifiOffIcon className="h-3 w-3" />
                          <span className="font-medium">Connection lost. Retrying...</span>
                      </div>
                  )
              ) : (
                  <div className="flex items-center gap-1.5 text-gray-500">
                      <Loader2Icon className="h-3 w-3 animate-spin" />
                      <span className="font-medium">Connecting...</span>
                  </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 