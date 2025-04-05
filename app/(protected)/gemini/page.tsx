"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown"; // Add this dependency
import remarkGfm from "remark-gfm"; // For GitHub-flavored Markdown

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [thinking, setThinking] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<ReadableStreamDefaultReader | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setResponse("");
    setThinking("");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      streamRef.current = reader;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(5));
            if (data.type === "thinking") {
              setThinking(data.content);
            } else if (data.type === "content") {
              setResponse((prev) => prev + data.content);
              // Smooth scroll to bottom
              if (responseRef.current) {
                responseRef.current.scrollTop = responseRef.current.scrollHeight;
              }
            } else if (data.type === "final") {
              setResponse(data.content);
              setThinking("");
              setIsLoading(false);
            }
          }
        }
      }
    } catch (error) {
      setResponse("Error: Failed to connect to Gemini API");
      setThinking("");
      setIsLoading(false);
      console.error(error);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.cancel();
      }
    };
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className={`${isDark ? "dark" : ""} min-h-screen font-serif`}>
      <div className="bg-white dark:bg-gray-900 min-h-screen text-black dark:text-white transition-colors duration-300">
        {/* Header */}
        <header className="top-0 right-0 left-0 z-50 fixed bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200 dark:border-gray-800 border-b">
          <div className="flex justify-between items-center mx-auto px-6 py-4 max-w-5xl">
            <h1 className="font-bold text-2xl tracking-tight">Gemini 2.5</h1>
            <button
              onClick={toggleTheme}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto px-6 pt-20 pb-12 max-w-5xl">
          <form onSubmit={handleSubmit} className="mb-12">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prompt..."
              className="bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-full h-32 text-lg transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 mt-4 px-6 py-2 rounded-full font-medium text-white text-sm uppercase tracking-wider transition-all"
            >
              {isLoading ? "Processing..." : "Generate"}
            </button>
          </form>

          {/* Thinking Indicator */}
          {thinking && (
            <div className="mb-6 text-center">
              <span className="inline-block bg-gray-200 dark:bg-gray-700 px-4 py-1 rounded-full text-gray-600 dark:text-gray-300 text-sm animate-pulse">
                {thinking}
              </span>
            </div>
          )}

          {/* Response Section */}
          {response && (
            <section
              ref={responseRef}
              className="bg-white dark:bg-gray-800 shadow-lg p-6 border border-gray-200 dark:border-gray-700 rounded-xl max-h-[60vh] overflow-y-auto transition-all duration-300"
            >
              <h2 className="mb-4 font-semibold text-gray-800 dark:text-gray-200 text-xl tracking-tight">
                Response
              </h2>
              <div className="dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 animate-[fadeIn_0.3s_ease-in] prose prose-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Tailwind Animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}