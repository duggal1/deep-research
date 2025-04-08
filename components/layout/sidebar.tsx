/* eslint-disable @next/next/no-img-element */
 'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  PanelLeftOpen,
  PanelRightOpen,
  History,
  Settings,
  PlusCircle,
  MessageSquareText, // Icon for history items
  Trash2,
  Loader2Icon,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs'; 

// Define the structure for search history items from API
interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const { user } = useUser(); // Get user info from Clerk

  // Function to fetch history from the API
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/search-history');
      if (res.ok) {
        const data: SearchHistoryItem[] = await res.json();
        setHistory(data);
      } else {
        console.error('Failed to fetch search history:', res.status);
        setHistory([]); // Clear history on error
      }
    } catch (e) {
      console.error('Error fetching search history:', e);
      setHistory([]); // Clear history on error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Function to clear history via API
  const clearHistory = async () => {
    if (!confirm('Are you sure you want to delete all research history? This cannot be undone.')) {
      return;
    }
    setIsDeletingHistory(true);
    try {
      const res = await fetch('/api/search-history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]); // Clear state on successful deletion
      } else {
        console.error('Failed to clear search history:', res.status);
        alert('Failed to clear history. Please try again.');
      }
    } catch (e) {
      console.error('Error clearing search history:', e);
      alert('An error occurred while clearing history.');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  useEffect(() => {
    // Load search history from API on component mount
    fetchHistory();
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Function to format date (optional)
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const renderHistoryItem = (item: SearchHistoryItem) => (
    <TooltipProvider key={item.id} delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
            {/* TODO: Make these clickable to re-run the query */}
          <Button
            variant="ghost"
            className="justify-start hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 w-full h-auto font-normal text-gray-700 dark:text-gray-300 text-sm text-left"
            // onClick={() => { /* TODO: Add function to set query on main page */ }}
          >
            <MessageSquareText className="flex-shrink-0 mr-2 w-4 h-4" />
            <span className="flex-1 truncate">{item.query}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={5}>
            <p>{item.query}</p>
            <p className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col
          transition-all duration-300 ease-in-out
          bg-background border-r border-gray-200 dark:border-gray-700/80
          ${isExpanded ? 'w-64' : 'w-20'}
        `}
      >
        <div className="flex flex-shrink-0 justify-between items-center px-4 border-gray-200 dark:border-gray-700/80 border-b h-16">
          {isExpanded && (
            <Link href="/main" className="font-bold text-blue-600 dark:text-blue-400 text-lg">
              Deep Research
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
            {isExpanded ? <PanelLeftOpen className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          <TooltipProvider delayDuration={100}>
            <nav className="space-y-2">
                {/* New Research Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/main">
                            <Button variant={pathname === '/main' ? "secondary" : "ghost"} className={`w-full ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                                <PlusCircle className={`h-5 w-5 ${isExpanded ? 'mr-2' : ''}`} />
                                {isExpanded && <span>New Research</span>}
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    {!isExpanded && <TooltipContent side="right" sideOffset={5}>New Research</TooltipContent>}
                </Tooltip>

                {/* History Section */}
                <Separator className="my-4" />
                <div className={`flex items-center ${isExpanded ? 'justify-between px-2' : 'justify-center'}`}>
                    {isExpanded && <h3 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase">History</h3>}
                     {!isExpanded && (
                        <Tooltip>
                            <TooltipTrigger asChild><History className="w-5 h-5 text-gray-500 dark:text-gray-400"/></TooltipTrigger>
                            <TooltipContent side="right" sideOffset={5}>History</TooltipContent>
                        </Tooltip>
                     )}
                     {isExpanded && history.length > 0 && (
                         <Tooltip>
                             <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={clearHistory} disabled={isDeletingHistory} className="w-7 h-7">
                                    {isDeletingHistory ? <Loader2Icon className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500"/>}
                                </Button>
                             </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={5}>Clear History</TooltipContent>
                         </Tooltip>
                     )}
                </div>

                {isLoadingHistory ? (
                    <div className={`flex justify-center items-center py-4 ${isExpanded ? '' : 'h-10'}`}>
                        <Loader2Icon className="w-5 h-5 text-gray-400 animate-spin"/>
                    </div>
                ) : history.length === 0 ? (
                    <p className={`px-2 text-xs text-center text-gray-500 dark:text-gray-400 ${isExpanded ? 'py-2' : 'hidden'}`}>No history yet.</p>
                ) : (
                    <div className="space-y-1 mt-2">
                        {isExpanded
                            ? history.map(renderHistoryItem)
                            : history.slice(0, 5).map(item => ( // Show limited icons when collapsed
                                <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                        {/* TODO: Make icons clickable */}
                                        <Button variant="ghost" size="icon" className="justify-center w-full">
                                            <MessageSquareText className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={5}>{item.query}</TooltipContent>
                                </Tooltip>
                            ))
                        }
                    </div>
                )}

            </nav>
          </TooltipProvider>
        </ScrollArea>

        {/* Footer Section - Settings & User */}
        <div className="flex-shrink-0 mt-auto p-3 border-gray-200 dark:border-gray-700/80 border-t">
            <TooltipProvider delayDuration={100}>
                {/* Settings Link */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/settings">
                            <Button variant={pathname === '/settings' ? "secondary" : "ghost"} className={`w-full ${isExpanded ? 'justify-start' : 'justify-center'}`}>
                                <Settings className={`h-5 w-5 ${isExpanded ? 'mr-2' : ''}`} />
                                {isExpanded && <span>Settings</span>}
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    {!isExpanded && <TooltipContent side="right" sideOffset={5}>Settings</TooltipContent>}
                </Tooltip>
                 {/* User Info (Optional) */}
                {user && isExpanded && (
                    <div className="flex items-center gap-2 mt-3 px-2 text-gray-600 dark:text-gray-400 text-sm">
                        <img src={user.imageUrl} alt={user.fullName || 'User'} className="rounded-full w-6 h-6" />
                        <span className="truncate">{user.fullName || user.primaryEmailAddress?.emailAddress}</span>
                    </div>
                 )}
            </TooltipProvider>
        </div>
      </aside>

      {/* Mobile Sidebar Trigger (Optional but recommended) */}
      <div className="md:hidden top-4 left-4 z-50 absolute">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <PanelRightOpen className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col bg-background p-0 w-64">
            {/* Reuse sidebar content structure for mobile */}
            <div className="flex flex-shrink-0 justify-between items-center px-4 border-b h-16">
              <Link href="/main" className="font-bold text-lg">
                Deep Research
              </Link>
               <SheetClose asChild>
                  <Button variant="ghost" size="icon"><PanelLeftOpen className="w-5 h-5" /></Button>
              </SheetClose>
            </div>
             <ScrollArea className="flex-1 px-2 py-4">
                <nav className="space-y-2">
                    <SheetClose asChild>
                        <Link href="/main">
                            <Button variant={pathname === '/main' ? "secondary" : "ghost"} className="justify-start w-full">
                                <PlusCircle className="mr-2 w-5 h-5" /> New Research
                            </Button>
                        </Link>
                    </SheetClose>

                     <Separator className="my-4" />
                     <div className="flex justify-between items-center px-2">
                         <h3 className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase">History</h3>
                          {history.length > 0 && (
                             <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                       <Button variant="ghost" size="icon" onClick={clearHistory} disabled={isDeletingHistory} className="w-7 h-7">
                                           {isDeletingHistory ? <Loader2Icon className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500"/>}
                                       </Button>
                                    </TooltipTrigger>
                                   <TooltipContent side="right" sideOffset={5}>Clear History</TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                         )}
                     </div>
                     {isLoadingHistory ? (
                         <div className="flex justify-center items-center py-4"><Loader2Icon className="w-5 h-5 animate-spin"/></div>
                     ) : history.length === 0 ? (
                         <p className="px-2 py-2 text-gray-500 text-xs text-center">No history yet.</p>
                     ) : (
                         <div className="space-y-1 mt-2">
                             {history.map(item => (
                                 <SheetClose asChild key={item.id}>
                                     {renderHistoryItem(item)}
                                 </SheetClose>
                             ))}
                         </div>
                     )}

                </nav>
             </ScrollArea>
             <div className="flex-shrink-0 mt-auto p-3 border-t">
                 <SheetClose asChild>
                    <Link href="/settings">
                        <Button variant={pathname === '/settings' ? "secondary" : "ghost"} className="justify-start w-full">
                            <Settings className="mr-2 w-5 h-5" /> Settings
                        </Button>
                    </Link>
                 </SheetClose>
                 {/* User Info (Optional) */}
                {user && (
                    <div className="flex items-center gap-2 mt-3 px-2 text-gray-600 dark:text-gray-400 text-sm">
                        <img src={user.imageUrl} alt={user.fullName || 'User'} className="rounded-full w-6 h-6" />
                        <span className="truncate">{user.fullName || user.primaryEmailAddress?.emailAddress}</span>
                    </div>
                 )}
             </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}