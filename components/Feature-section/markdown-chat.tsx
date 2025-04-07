"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { User, Bot } from 'lucide-react'; // Keep icons

// Define types for our components
interface Message {
  id: number
  type: 'incoming' | 'outgoing'
  text: string
  time: string
}

// Animated Deep Research Messages Component - Enhanced Styling
export const MarkdownChat = () => {
    // Import React Markdown dynamically to avoid SSR issues
    // Define a more specific type for ReactMarkdown
    type ReactMarkdownComponentProps = {
        components?: Record<string, React.ComponentType<any>>;
        children: string;
    };

    type ReactMarkdownComponent = React.ComponentType<ReactMarkdownComponentProps>;

    const [ReactMarkdown, setReactMarkdown] = useState<ReactMarkdownComponent | null>(null);
    
    useEffect(() => {
        // Dynamically import ReactMarkdown
        import('react-markdown').then(module => {
            setReactMarkdown(() => module.default);
        });
    }, []);

    // Define messages with Markdown support - use useMemo to prevent unnecessary re-renders
    const allMessages = React.useMemo<Message[]>(() => [
        {
            id: 1,
            type: 'incoming' as 'incoming',
            text: "Given the latest cosmological data available as of April 6, 2025, what are the most plausible mechanisms driving the accelerated expansion of the universe, and how do recent observations of high-redshift supernovae, gravitational wave events, and dark energy fluctuations refine our understanding of these processes compared to models proposed in the early 21st century?",
            time: '2:01 PM'
        },
        {
            id: 2,
            type: 'outgoing' as 'outgoing',
            text: `### Key Points

- Research suggests dark energy drives the universe's accelerated expansion, but it may not be constant, possibly weakening over time.

- Recent observations, like high-redshift supernovae and DESI data, indicate dark energy might evolve, challenging early 21st-century models.

- Gravitational wave events offer indirect insights, while dark energy fluctuations hint at changing behavior, adding complexity to our understanding.

- The evidence leans toward evolving dark energy, but more data is needed, with ongoing debate about its nature and future implications.

### Direct Answer

Dark energy is likely the main force behind the universe's accelerating expansion, but recent findings suggest it might not be a steady force as once thought. Instead, it seems to be changing, possibly getting weaker over time, which could mean the universe might not keep expanding forever but could eventually slow down or even collapse.

**Recent Observations and Their Impact**

New data from high-redshift supernovae, collected by projects like the Dark Energy Survey ([Dark Energy Survey Results](https://news.fnal.gov/2024/01/final-supernova-results-from-dark-energy-survey-offer-unique-insights-into-the-expansion-of-the-universe/)), show the largest and most precise measurements yet. These align with the standard model but don't rule out the idea that dark energy varies. Gravitational wave observations, while mainly about testing gravity, can indirectly help by checking how gravity behaves on large scales, potentially affecting dark energy models. Additionally, the Dark Energy Spectroscopic Instrument (DESI) suggests dark energy might be weakening, which we call "fluctuations" here, meaning it's not constant as early models assumed.

**Comparison to Early Models**

In the early 2000s, scientists thought dark energy was a constant, like a fixed background energy. Now, with these new observations, we see it might change, refining our view. This shift could mean big changes for how we predict the universe's future, moving away from the idea of endless expansion to possibly a collapse, which is a major update from what we believed 25 years ago.

---

### Survey Note: Detailed Analysis of Mechanisms Driving Accelerated Expansion

This section provides a comprehensive overview of the current understanding of the universe's accelerated expansion, focusing on the most plausible mechanisms and how recent observations refine our knowledge compared to early 21st-century models. It incorporates detailed findings from high-redshift supernovae, gravitational wave events, and dark energy fluctuations, ensuring a thorough examination for researchers and enthusiasts alike.

#### Background on Accelerated Expansion

The accelerated expansion of the universe was first discovered in 1998 through observations of type Ia supernovae by the Supernova Cosmology Project and the High-Z Supernova Search Team ([Accelerating Expansion of the Universe](https://en.wikipedia.org/wiki/Accelerating_expansion_of_the_universe)). These "standard candles," with nearly uniform brightness, allowed distance measurements compared to their redshift, revealing that the universe's expansion is speeding up. This finding led to the hypothesis of dark energy, a mysterious force making up about 70% of the universe's energy density, as per current consensus ([AccessScience on Accelerating Universe](https://www.accessscience.com/content/accelerating-universe/800550)).

Early 21st-century models, particularly the Lambda-CDM model, assumed dark energy was a cosmological constant, a uniform energy density filling space, driving steady acceleration. This model was consistent with observations like the cosmic microwave background (CMB) and galaxy clustering, but its nature remained speculative, with candidates including vacuum energy or scalar fields like quintessence.

#### Most Plausible Mechanisms as of April 2025

As of April 6, 2025, the most plausible mechanisms for the accelerated expansion center on dark energy, but recent data suggest it may not be constant. The leading mechanisms include:

1.  **Dark Energy as a Cosmological Constant**: This remains the simplest explanation, where dark energy is a constant energy density, consistent with Einstein's initial cosmological constant idea. It fits well with many observations but struggles to explain recent tensions, like the Hubble constant discrepancy.

2.  **Evolving Dark Energy**: Recent findings from the Dark Energy Spectroscopic Instrument (DESI) suggest dark energy might be weakening over time. A study published in March 2025 indicated that DESI's analysis of nearly 15 million galaxies and quasars shows dark energy's impact may be decreasing, challenging the constant model ([Reuters on Dark Energy Changing](https://www.reuters.com/science/evidence-mounts-that-universes-dark-energy-is-changing-over-time-2025-03-19/)). This could imply dynamic models like quintessence, where dark energy's density varies, or even new physics beyond the standard model.

### Key Citations

- [Dark Energy Survey Results offer unique insights into the expansion of the universe](https://news.fnal.gov/2024/01/final-supernova-results-from-dark-energy-survey-offer-unique-insights-into-the-expansion-of-the-universe/)

- [The Dark Energy Survey: Cosmology Results with ~1500 New High-redshift Type Ia Supernovae Using The Full 5-year Dataset](https://arxiv.org/abs/2401.02929)

- [Evidence mounts that universe's dark energy is changing over time](https://www.reuters.com/science/evidence-mounts-that-universes-dark-energy-is-changing-over-time-2025-03-19/)

- [New observations of the universe show how mysterious dark energy may be evolving](https://abc17news.com/cnn-other/2025/04/02/new-observations-of-the-universe-show-how-mysterious-dark-energy-may-be-evolving/)

- [Dark energy: mysterious cosmic force appears to be weakening, say scientists](https://www.theguardian.com/science/2025/mar/19/dark-energy-mysterious-cosmic-force-weakening-universe-expansion)

- [Gravitational waves may reveal nature of dark matter](https://www.ucl.ac.uk/news/2023/aug/gravitational-waves-may-reveal-nature-dark-matter)

- [Dark Energy and Dark Matter research at Harvard & Smithsonian](https://www.cfa.harvard.edu/research/topic/dark-energy-and-dark-matter)

- [Frontiers in Astronomy and Space Sciences on Multi-Messenger Gravitational Waves](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2018.00044/full)

- [MIT News on Early Dark Energy resolving cosmological puzzles](https://news.mit.edu/2024/study-early-dark-energy-could-resolve-cosmologys-two-biggest-puzzles-0913)

- [New Scientist on DESI 2025 and understanding dark energy](https://www.newscientist.com/article/mg26435232-300-could-2025-be-the-year-we-finally-start-to-understand-dark-energy/)

- [NPR on Dark Energy potentially weakening and universe collapse](https://www.npr.org/2025/03/20/nx-s1-5333843/dark-energy-weakening-universe-collapse-desi)

- [CNN on DESI findings and evolving dark energy](https://www.cnn.com/2025/04/02/science/desi-dark-energy-results/index.html)

- [Quanta Magazine on Dark Energy possibly getting weaker](https://www.quantamagazine.org/is-dark-energy-getting-weaker-new-evidence-strengthens-the-case-20250319/)

- [Washington Post on universe expansion and weakening dark energy](https://www.washingtonpost.com/science/2025/03/19/universe-dark-energy-nasa-telescope/)

- [Labrujulaverde on dark energy possibly being an illusion](https://www.labrujulaverde.com/en/2024/12/scientists-claim-dark-energy-does-not-exist-and-accelerated-expansion-of-universe-is-an-illusion-caused-by-gravity-slowing-down-time/)

- [Penn Today on Dark Energy Survey uncovering universe complexity](https://penntoday.upenn.edu/news/dark-energy-survey-uncovers-clues-universes-complexity)

- [AccessScience on the accelerating universe](https://www.accessscience.com/content/accelerating-universe/800550)

- [Accelerating expansion of the universe Wikipedia page](https://en.wikipedia.org/wiki/Accelerating_expansion_of_the_universe)

- [Expansion of the universe Wikipedia page](https://en.wikipedia.org/wiki/Expansion_of_the_universe)

- [Dark energy Wikipedia page](https://en.wikipedia.org/wiki/Dark_energy)`,
            time: '2:02 PM'
        }
    // Only include the first two messages (one user, one AI) for this example
    ].slice(0, 2), []);

    // State for visible messages
    const [visibleMessages, setVisibleMessages] = useState<Message[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
    const [typingText, setTypingText] = useState('')
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const prefersReducedMotion = useReducedMotion()

    // Function to scroll to bottom of chat
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            // Use smooth scroll behavior
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    // Effect to handle message display and typing animation
    useEffect(() => {
        // If user prefers reduced motion, just show all messages
        if (prefersReducedMotion) {
            setVisibleMessages(allMessages.slice(0, 2)); // Show the messages immediately
            setCurrentMessageIndex(2); // Set index past available messages
            return;
        }

        // Show first message immediately
        if (visibleMessages.length === 0 && allMessages.length > 0) {
            setVisibleMessages([allMessages[0]])
            setCurrentMessageIndex(1)
            return
        }

        // If we've shown all messages, do nothing further for this example
        if (currentMessageIndex >= allMessages.length) {
             // Optional: Add a delay and reset if you want it to loop
            const resetTimer = setTimeout(() => {
                setVisibleMessages([allMessages[0]]);
                setCurrentMessageIndex(1);
            }, 100000); // Reset after 5 seconds
            return () => clearTimeout(resetTimer);
            return;
        }

        // Start typing animation for next message
        const startTypingAnimation = () => {
            const nextMessage = allMessages[currentMessageIndex]
            if (!nextMessage) return; // Guard against undefined message

            setIsTyping(true)

            // For incoming messages, type character by character (though we only have one incoming)
            if (nextMessage.type === 'incoming') {
                let charIndex = 0
                const text = nextMessage.text
                const typingInterval = setInterval(() => {
                    if (charIndex <= text.length) {
                        setTypingText(text.substring(0, charIndex))
                        charIndex++
                        scrollToBottom()
                    } else {
                        clearInterval(typingInterval)
                        setIsTyping(false)
                        setTypingText('')
                        setVisibleMessages(prev => [...prev, nextMessage])
                        setCurrentMessageIndex(prev => prev + 1)
                    }
                }, 25); // Slightly slower user typing

                return () => clearInterval(typingInterval)
            } 
            // For outgoing messages (Deep Research response), simulate thinking then show chunks
            else {
                // First, simulate AI thinking
                // Adjust thinking time based on complexity/length
                const thinkingTime = Math.min(1800, nextMessage.text.length * 0.18);
                
                setTimeout(() => {
                    // Then start showing chunks of text, split by paragraphs
                    const chunks = nextMessage.text.split('\n\n');
                    let chunkIndex = 0;
                    let accumulatedText = ''; // Store text as it's revealed
                    
                    const showChunks = () => {
                        if (chunkIndex < chunks.length) {
                            accumulatedText += (accumulatedText ? '\n\n' : '') + chunks[chunkIndex];
                            setTypingText(accumulatedText); // Update with accumulated text
                            chunkIndex++;
                            scrollToBottom();

                            // Calculate delay based on chunk length for more natural feel
                            const delay = chunkIndex > 0 && chunkIndex <= chunks.length
                                ? Math.max(150, Math.min(600, chunks[chunkIndex - 1].length * 1.0))
                                : 200;

                            setTimeout(showChunks, delay);
                        } else {
                            // Done showing all chunks
                            setTimeout(() => {
                                setIsTyping(false);
                                // Keep the final text displayed while typing indicator disappears
                                // setTypingText(''); // Don't clear typing text here
                                setVisibleMessages(prev => [...prev, { ...nextMessage, text: accumulatedText }]); // Add final message
                                setCurrentMessageIndex(prev => prev + 1);
                            }, 400);
                        }
                    };

                    showChunks();
                }, thinkingTime);
            }
        }

        // Start typing the next message after a delay
        const timer = setTimeout(() => {
            startTypingAnimation()
        }, 1200) // Initial delay before AI starts "typing"

        return () => clearTimeout(timer)
    // Ensure all dependencies are included
    }, [visibleMessages, currentMessageIndex, prefersReducedMotion, allMessages])

    // Effect to scroll to bottom when messages change or typing occurs
    useEffect(() => {
        scrollToBottom()
    }, [visibleMessages, typingText])

    // Render markdown content
    const renderMarkdown = (content: string, isOutgoing: boolean) => {
        if (!ReactMarkdown) {
             // Fallback rendering if ReactMarkdown is not loaded yet
            return <div className={`whitespace-pre-wrap font-sans ${isOutgoing ? 'text-indigo-50' : 'text-gray-700 dark:text-gray-300'}`}>{content}</div>;
        }

        // Enhanced prose classes for a more modern look
        const proseBase = `prose prose-sm dark:prose-invert max-w-none font-sans prose-headings:font-medium prose-p:leading-relaxed`;
        // Enhanced classes for outgoing messages
        const proseOutgoing = `prose-light text-indigo-50 prose-headings:text-white prose-strong:text-white/90`;

        return (
            // Wrapper div with enhanced styling
            <div className={`${proseBase} ${isOutgoing ? proseOutgoing : 'text-gray-800 dark:text-gray-100 prose-headings:text-gray-900 dark:prose-headings:text-white/95'}`}>
                <ReactMarkdown
                    components={{
                        // Modern styles for markdown elements
                        h1: ({node, ...props}) => <h1 className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-600 dark:to-violet-400 mt-3 first:mt-0 mb-2.5 font-sans font-bold text-md text-transparent" {...props} />,
                        h2: ({node, ...props}) => <h2 className="mt-2.5 mb-2 font-sans font-semibold text-[0.95rem] text-indigo-700 dark:text-indigo-300" {...props} />,
                        h3: ({node, ...props}) => <h3 className="mt-2 mb-1.5 font-sans font-medium text-[0.9rem] text-indigo-600 dark:text-indigo-400" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2.5 text-gray-700 dark:text-gray-200 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="space-y-1 mb-2.5 pl-4 text-gray-700 dark:text-gray-200 list-disc list-outside" {...props} />,
                        ol: ({node, ...props}) => <ol className="space-y-1 mb-2.5 pl-4 text-gray-700 dark:text-gray-200 list-decimal list-outside" {...props} />,
                        li: ({node, ...props}) => <li className="my-0.5 text-gray-700 dark:text-gray-200" {...props} />,
                        // --- Enhanced Link Styling ---
                        a: ({node, ...props}) => (
                            <a
                                className={`font-medium no-underline transition-all duration-200 ease-in-out rounded-md px-1.5 py-0.5 border
                                    ${isOutgoing
                                        ? 'text-white border-white/20 hover:bg-white/10 hover:border-white/30'
                                        : 'text-indigo-600 border-indigo-200/30 hover:border-indigo-400/50 hover:bg-indigo-50/30 dark:text-indigo-300 dark:border-indigo-500/20 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-900/30'
                                    }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                            />
                        ),
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({node, ...props}) => <em className="opacity-90 italic" {...props} />,
                        // --- Enhanced Code Styling ---
                        code: ({ node, inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                // Code blocks with modern styling
                                <div className="bg-gradient-to-r from-gray-50 dark:from-gray-900 to-gray-100 dark:to-gray-800 my-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto custom-scrollbar">
                                    <code className={`language-${match[1]} !bg-transparent !p-0 text-xs font-mono`} {...props}>
                                        {children}
                                    </code>
                                </div>
                            ) : (
                                // Modern inline code
                                <code className={`px-1.5 py-0.5 rounded-md text-[0.8rem] font-mono ${isOutgoing ? 'bg-white/15 border border-white/10' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border dark:border-indigo-800/50'}`} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        // --- Modern Blockquote Styling ---
                        blockquote: ({node, ...props}) => (
                            <blockquote
                                className={`pl-3 border-l-2 my-3 italic ${
                                    isOutgoing
                                    ? 'border-white/40 text-white/90 bg-white/5 py-1 rounded-r-md'
                                    : 'border-indigo-400 dark:border-indigo-500 text-gray-600 dark:text-gray-300 bg-indigo-50/30 dark:bg-indigo-900/20 py-1 rounded-r-md'
                                }`}
                                {...props}
                            />
                        ),
                        hr: ({node, ...props}) => <hr className={`my-4 ${isOutgoing ? 'border-white/20' : 'border-indigo-200/50 dark:border-indigo-800/50'}`} {...props}/>
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div
            ref={chatContainerRef}
            className="flex flex-col space-y-4 bg-transparent p-4 rounded-2xl h-[500px] overflow-y-auto font-serif text-[13px] scroll-smooth custom-scrollbar"
        >
            {/* --- Enhanced Global Styles --- */}
            <style jsx global>{`
                /* Specific styles for outgoing prose */
                .prose-light h1, .prose-light h2, .prose-light h3, .prose-light strong { color: white; }
                .prose-light p, .prose-light li { color: rgba(238, 242, 255, 0.95); } /* Brighter indigo-50 */
                .prose-light ul, .prose-light ol { --tw-prose-bullets: rgba(199, 210, 254, 0.8); --tw-prose-counters: rgba(199, 210, 254, 0.8); } /* Brighter indigo bullets */
                .prose-light blockquote { border-left-color: rgba(199, 210, 254, 0.6); color: rgba(238, 242, 255, 0.9); }
                .prose-light hr { border-color: rgba(255, 255, 255, 0.15); }

                /* Enhanced dark mode prose adjustments with more vibrant colors */
                .dark .prose-invert {
                     --tw-prose-body: theme(colors.gray.200);
                     --tw-prose-headings: theme(colors.white);
                     --tw-prose-lead: theme(colors.gray.300);
                     --tw-prose-bold: theme(colors.indigo.200);
                     --tw-prose-counters: theme(colors.indigo.400);
                     --tw-prose-bullets: theme(colors.violet.500);
                     --tw-prose-hr: theme(colors.indigo.800);
                     --tw-prose-quotes: theme(colors.indigo.100);
                     --tw-prose-quote-borders: theme(colors.violet.500);
                     --tw-prose-captions: theme(colors.indigo.300);
                     --tw-prose-code: theme(colors.indigo.100);
                     --tw-prose-pre-code: theme(colors.gray.200);
                     --tw-prose-pre-bg: rgba(109, 40, 217, 0.15);
                     --tw-prose-th-borders: theme(colors.indigo.600);
                     --tw-prose-td-borders: theme(colors.indigo.800);
                }

                /* --- Modern Custom Scrollbar --- */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px; /* Even thinner */
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(99, 102, 241, 0.2); /* Indigo with transparency */
                    border-radius: 10px;
                }
                 /* Dark mode scrollbar thumb */
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(139, 92, 246, 0.3); /* Violet with transparency */
                }
                 /* Hover state for scrollbar thumb */
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(99, 102, 241, 0.4); /* Darker on hover */
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(139, 92, 246, 0.5); /* Darker on hover */
                }
                 /* Firefox scrollbar */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(99, 102, 241, 0.2) transparent;
                }
               .dark .custom-scrollbar {
                    scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
                }

                /* --- Bounce animation for typing indicator --- */
                 @keyframes bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.8; }
                    50% { transform: translateY(-3px); opacity: 1; }
                 }
                 .animate-dot-bounce {
                    animation: bounce 1.2s infinite ease-in-out;
                 }

                 /* --- Pulse animation for AI typing dot --- */
                 @keyframes pulse-dot {
                     0%, 100% { opacity: 0.5; }
                     50% { opacity: 1; }
                 }
                 .animate-dot-pulse {
                     animation: pulse-dot 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                 }
            `}</style>

            {visibleMessages.map((message) => (
                <div 
                    key={message.id}
                    className={`flex items-start gap-3 ${message.type === 'incoming' ? 'justify-start' : 'justify-end'}`}
                >
                    {/* User Avatar */}
                    {message.type === 'incoming' && (
                        <div className="flex-shrink-0 rounded-full w-8 h-8 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1601288496920-b6154fe3626a?q=80&w=1826&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fHw%3D%3D" alt="User Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Bubble Content */}
                    <div
                        className={`flex flex-col max-w-[85%] shadow-lg transition-all duration-300 ease-out ${
                            message.type === 'incoming'
                                ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-md'
                                : 'bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-500 dark:to-violet-700 text-white rounded-2xl rounded-tr-md border border-indigo-400/10 dark:border-violet-500/20'
                        } p-4`}
                    >
                        <div className="w-full">
                            {renderMarkdown(message.text, message.type === 'outgoing')}
                        </div>
                        <div className={`mt-2 text-right text-[11px] opacity-70 ${message.type === 'incoming' ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-100 dark:text-indigo-300'}`}>
                            {message.time}
                        </div>
                    </div>

                     {/* AI Avatar */}
                    {message.type === 'outgoing' && (
                        <div className="flex-shrink-0 rounded-full w-8 h-8 overflow-hidden">
                            <img src="https://raw.githubusercontent.com/duggal1/deep-research/refs/heads/main/public/blaze.png" alt="Deep Research Engine Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            ))}
            
            {isTyping && (
                <div className={`flex items-start gap-3 ${allMessages[currentMessageIndex]?.type === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                    {/* Typing Avatar */}
                    {allMessages[currentMessageIndex]?.type === 'incoming' ? (
                         <div className="flex-shrink-0 rounded-full w-8 h-8 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1601288496920-b6154fe3626a?q=80&w=1826&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fHw%3D%3D" alt="User Avatar" className="w-full h-full object-cover" />
                         </div>
                    ) : (
                        <div className="flex-shrink-0 rounded-full w-8 h-8 overflow-hidden">
                            <img src="https://raw.githubusercontent.com/duggal1/deep-research/refs/heads/main/public/blaze.png" alt="Deep Research Engine Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Typing Bubble Content */}
                    {allMessages[currentMessageIndex]?.type === 'incoming' ? (
                         <div className={`flex items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-md shadow-lg border border-gray-100 dark:border-gray-800 h-[40px]`}>
                             <span className="flex space-x-2">
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '100ms' }}></span>
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '200ms' }}></span>
                             </span>
                         </div>
                    ) : (
                        // Show partial response for AI typing
                        <div className={`flex flex-col bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-500 dark:to-violet-700 text-white shadow-lg p-4 rounded-2xl rounded-tr-md max-w-[85%] border border-indigo-400/10 dark:border-violet-500/20`}>
                            <div className="w-full">
                                {renderMarkdown(typingText, true)}
                                {/* Enhanced pulsing dot */}
                                <div className="flex items-center gap-1.5 mt-2 h-2">
                                    <span className="bg-violet-200 dark:bg-violet-300 rounded-full w-1.5 h-1.5 animate-dot-pulse"></span>
                                    <span className="bg-violet-200 dark:bg-violet-300 rounded-full w-1.5 h-1.5 animate-dot-pulse" style={{ animationDelay: '300ms' }}></span>
                                    <span className="bg-violet-200 dark:bg-violet-300 rounded-full w-1.5 h-1.5 animate-dot-pulse" style={{ animationDelay: '600ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
