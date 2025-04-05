"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [thinking, setThinking] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<ReadableStreamDefaultReader | null>(null);

  // Theme detection
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  // Handle form submission with streaming
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

  // Cleanup on unmount
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
      <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white transition-colors duration-500">
        <header className="top-0 right-0 left-0 z-50 fixed bg-white/90 dark:bg-black/90 backdrop-blur-xl dark:border-white/5 border-b border-black/5">
          <div className="flex justify-between items-center mx-auto px-8 py-6 max-w-6xl">
            <h1 className="font-semibold text-3xl tracking-tight">Gemini 2.5</h1>
            <button
              onClick={toggleTheme}
              className="hover:bg-black/10 dark:hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        <main className="mx-auto px-8 pt-24 pb-20 max-w-6xl">
          <form onSubmit={handleSubmit} className="mb-16">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prompt..."
              className="bg-transparent p-6 border dark:border-white/15 border-black/15 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 w-full h-40 text-lg tracking-tight transition-all resize-none placeholder-black/40 dark:placeholder-white/40"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-black dark:bg-white hover:opacity-90 disabled:opacity-60 mt-6 px-8 py-3 rounded-full font-medium text-white dark:text-black text-sm uppercase tracking-widest transition-opacity"
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </form>

          {thinking && (
            <div className="mb-8 text-black/60 dark:text-white/60 text-center">
              {thinking}
            </div>
          )}

          {response && (
            <section className="bg-white/80 dark:bg-black/80 backdrop-blur-md p-8 border dark:border-white/10 border-black/10 rounded-2xl">
              <h2 className="mb-6 font-semibold text-2xl tracking-tight">Response</h2>
              <div className="max-w-none text-black/90 dark:text-white/90 text-lg leading-relaxed prose prose-serif">
                {response.split("\n").map((line, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}