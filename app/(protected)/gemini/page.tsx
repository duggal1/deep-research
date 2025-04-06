"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response, thinkingMessage]);

  useEffect(() => {
    return () => {
      streamControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResponse("");
    setThinkingMessage("Thinking...");
    setError(null);
    streamControllerRef.current?.abort();
    streamControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
        signal: streamControllerRef.current.signal,
      });

      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || `API Error: ${res.statusText}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunkReceived = false;

      while (true) {
        try {
            const { done, value } = await reader.read();
            if (done) {
                console.log("Stream finished.");
                break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n\n").filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(5));

                  if (data.type === "content") {
                    if (!firstChunkReceived) {
                       setThinkingMessage(null);
                       firstChunkReceived = true;
                    }
                    setResponse((prev) => prev + data.content);
                  } else if (data.type === "final") {
                    console.log("Final message received.");
                  } else if (data.type === "error") {
                     setError(`Streaming Error: ${data.error}`);
                     console.error("Streaming Error:", data.error);
                     streamControllerRef.current?.abort();
                     setIsLoading(false);
                     setThinkingMessage(null);
                     return;
                  }
                } catch (parseError) {
                   console.error("Failed to parse stream data:", parseError, "Chunk:", line);
                }
              }
            }
        } catch(readError) {
            if (readError instanceof Error && readError.name === 'AbortError') {
                console.log("Fetch aborted");
            } else {
               console.error("Error reading stream:", readError);
               setError("Failed to read stream.");
            }
            break;
        }
      }
    } catch (error) {
       if (error instanceof Error && error.name !== 'AbortError') {
           console.error("Fetch Error:", error);
           setError(`Error: ${error.message}`);
       } else {
           console.log("Fetch aborted by user.");
       }
    } finally {
      setIsLoading(false);
      setThinkingMessage(null);
      streamControllerRef.current = null;
    }
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className={`${isDark ? "dark" : ""} min-h-screen font-sans`}>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen text-black dark:text-white transition-colors duration-300">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-gray-200 dark:border-gray-800 border-b">
          <div className="flex justify-between items-center mx-auto px-4 sm:px-6 py-3 max-w-5xl">
            <h1 className="font-semibold text-xl sm:text-2xl tracking-tight">
              Gemini Chat
            </h1>
            <button
              onClick={toggleTheme}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"> <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591" /> </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"> <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /> </svg>
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto px-4 sm:px-6 pt-8 pb-20 max-w-3xl">
          <div
            ref={responseRef}
            className="mb-6 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none p-4 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[40vh] max-h-[65vh] overflow-y-auto transition-all duration-300 smooth-scroll"
          >
            {error && (
                 <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                    <span className="font-medium">Error:</span> {error}
                 </div>
            )}
            {!error && !response && !thinkingMessage && (
                 <p className="text-center text-gray-500 dark:text-gray-400 italic mt-4">
                    Enter a prompt below to start chatting...
                 </p>
            )}
            {response && (
              <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
              </div>
            )}
             {thinkingMessage && (
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                     <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                     {thinkingMessage}
                  </span>
                </div>
             )}
          </div>

          <form onSubmit={handleSubmit} className="sticky bottom-5">
            <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your prompt here..."
                  className="bg-white dark:bg-gray-800 p-4 pr-20 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-full text-base transition-colors resize-none placeholder-gray-500 dark:placeholder-gray-400 shadow-md"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '3rem', maxHeight: '15rem' }}
                  onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 bottom-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                   aria-label="Send prompt"
                >
                   {isLoading ? (
                       <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                   ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"> <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /> </svg>
                   )}
                </button>
            </div>
          </form>
        </main>
      </div>

      <style jsx global>{`
        .smooth-scroll {
          scroll-behavior: smooth;
        }
        textarea {
           scrollbar-width: thin;
           scrollbar-color: #a0aec0 #edf2f7;
        }
        textarea::-webkit-scrollbar {
           width: 8px;
        }
        textarea::-webkit-scrollbar-track {
           background: #edf2f7;
           border-radius: 4px;
        }
        textarea::-webkit-scrollbar-thumb {
           background-color: #a0aec0;
           border-radius: 4px;
           border: 2px solid #edf2f7;
        }
        .dark textarea {
           scrollbar-color: #4a5568 #2d3748;
        }
        .dark textarea::-webkit-scrollbar-track {
           background: #2d3748;
        }
        .dark textarea::-webkit-scrollbar-thumb {
           background-color: #4a5568;
            border: 2px solid #2d3748;
        }
      `}</style>
    </div>
  );
}