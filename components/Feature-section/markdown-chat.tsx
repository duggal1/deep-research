/* eslint-disable @next/next/no-img-element */
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
- Research suggests dark energy drives the universe's accelerated expansion, but it may not be constant, potentially weakening over time.
- Recent observations, like high-redshift supernovae and large-scale galaxy surveys, hint at evolving dark energy, challenging early 21st-century models.
- Gravitational wave events provide additional insights into expansion rates, though their impact on dark energy understanding is less direct.
- The evidence leans toward dynamical dark energy, but findings are not conclusive, with ongoing debates about the universe's future.

---

### Direct Answer

Dark energy is likely the main force behind the universe's accelerating expansion, but recent research suggests it might not be a fixed, unchanging force as once thought. Instead, it seems to be evolving, possibly weakening over time, which could change how we see the universe's future.

**High-Redshift Supernovae**  
Observations of distant supernovae, especially from the Dark Energy Survey (DES), have given us a clearer picture of how the universe expanded in the past. These studies show that while the standard model (where dark energy is constant) still fits, there are signs it might vary, refining our understanding beyond early 21st-century ideas that assumed it was always the same.

**Gravitational Wave Events**  
When black holes or neutron stars collide, they create ripples in space-time called gravitational waves. These events help measure how fast the universe is expanding by giving us distance and speed data. While they don't directly show changes in dark energy, they offer another way to check our models, adding to the overall picture compared to earlier models.

**Dark Energy Fluctuations**  
Recent surveys, like the Dark Energy Spectroscopic Instrument (DESI), suggest dark energy might not be steady but could be changing. This idea, seen in how galaxies are spread out, challenges the early belief that dark energy was a constant force, suggesting it might affect the universe differently over time.

Overall, these findings suggest dark energy is more complex than we thought, with ongoing research needed to confirm if it’s truly changing and what that means for the universe’s fate.

---

---

### Survey Note: Detailed Analysis of Mechanisms Driving the Universe's Accelerated Expansion

The accelerated expansion of the universe, first discovered in the late 1990s through observations of type Ia supernovae, has been a cornerstone of modern cosmology. As of April 2025, the prevailing mechanism is dark energy, a mysterious component estimated to constitute about 70% of the universe's energy density. However, recent observations have refined our understanding, suggesting that dark energy may not be a simple cosmological constant as proposed in early 21st-century models, but rather a dynamical entity with potential fluctuations over time. This section explores the latest data from high-redshift supernovae, gravitational wave events, and dark energy fluctuations, comparing them to earlier models and highlighting the implications for cosmology.

#### Background: Early 21st-Century Models
In the early 2000s, following the discovery of cosmic acceleration, the Lambda Cold Dark Matter (ΛCDM) model became the standard framework. This model posits that dark energy is a cosmological constant (Λ), a uniform energy density associated with empty space, driving the universe's expansion at a constant rate. It was consistent with observations from the cosmic microwave background (CMB), large-scale structure, and supernovae, suggesting a future of eternal expansion leading to a "big freeze." Alternative models, such as quintessence, proposed dynamical dark energy with varying density, but these were less favored due to lack of definitive evidence.

#### Recent Observations and Their Impact

##### High-Redshift Supernovae
High-redshift supernovae, particularly type Ia, serve as "standard candles" due to their consistent brightness, allowing precise distance measurements. The Dark Energy Survey (DES), culminating in its five-year dataset released in early 2024, analyzed approximately 1,500 high-redshift supernovae, significantly expanding on earlier samples like Pantheon+. This quintupled the number of high-quality supernovae at redshifts greater than 0.5, providing tighter constraints on cosmological parameters ([The Dark Energy Survey: Cosmology Results With ~1500 New High-redshift Type Ia Supernovae Using The Full 5-year Dataset](https://arxiv.org/html/2401.02929v3)). 

The DES results are consistent with ΛCDM but show hints of deviations, suggesting that dark energy's equation of state (w, the ratio of pressure to energy density) might vary. This aligns with observations from the Supernova Legacy Survey and Hubble Space Telescope, indicating dark energy has been present for at least 9 billion years, potentially evolving ([Dark Energy - Wikipedia](https://en.wikipedia.org/wiki/Dark_energy)). Compared to early models, these findings refine our understanding by suggesting a more dynamic history, challenging the assumption of constancy.

##### Gravitational Wave Events
Gravitational waves, detected since 2015 by observatories like LIGO and Virgo, arise from cataclysmic events such as binary black hole mergers. These "standard sirens" offer distance measurements through waveform analysis, and with electromagnetic counterparts (e.g., neutron star mergers), they provide redshift data for Hubble constant (H₀) estimation. Recent studies, such as those presented at the 2023 National Astronomy Meeting, suggest that future detectors could use gravitational lensing of waves to probe structure growth, indirectly informing dark energy models ([Gravitational waves may reveal nature of dark matter | UCL News](https://www.ucl.ac.uk/news/2023/aug/gravitational-waves-may-reveal-nature-dark-matter)).

However, their direct impact on dark energy understanding is less pronounced compared to supernovae. They primarily contribute by offering an independent measure of H₀, helping resolve tensions like the Hubble tension (discrepancy between early and late universe measurements). This refines early models by providing cross-verification, but their role in probing dark energy fluctuations is secondary, focusing more on compact object physics ([Gravitational-wave physics and astronomy in the 2020s and 2030s | Nature Reviews Physics](https://www.nature.com/articles/s42254-021-00303-8)).

##### Dark Energy Fluctuations
The term "dark energy fluctuations" likely refers to variations in dark energy density over time or space, a concept explored through large-scale structure surveys. The Dark Energy Spectroscopic Instrument (DESI), operational since 2021, has mapped nearly 15 million galaxies and quasars, providing the largest 3D map of the universe to date. Its first-year data, released in April 2024, and subsequent analyses suggest that dark energy may be weakening, with its influence potentially decreasing over the past 4–5 billion years ([Unexpected dark energy finding may change our understanding of the universe | CNN](https://www.cnn.com/2025/04/02/science/desi-dark-energy-results/index.html)).

This challenges the cosmological constant model, suggesting a dynamical dark energy akin to quintessence or other models like quintom-B, where the equation of state varies ([Study: Early dark energy could resolve cosmology’s two biggest puzzles | MIT News](https://news.mit.edu/2024/study-early-dark-energy-could-resolve-cosmologys-two-biggest-puzzles-0913)). DESI's findings, combined with baryon acoustic oscillation (BAO) measurements, indicate that dark energy's evolution could alter the universe's fate, potentially leading to a "big crunch" rather than eternal expansion ([Dark energy is weakening and the universe could (eventually) collapse, study says : NPR](https://www.npr.org/2025/03/20/nx-s1-5333843/dark-energy-weakening-universe-collapse-desi)). This is a significant refinement over early models, which assumed uniformity.

#### Comparative Analysis with Early 21st-Century Models
Early 21st-century models, rooted in ΛCDM, assumed dark energy was a constant, leading to predictions of indefinite acceleration and a cold, dark future. Recent observations refine this by suggesting:

- **Supernovae Data:** Increased precision from high-redshift samples shows potential evolution, hinting at dynamical models, unlike the static assumption of early models.
- **Gravitational Waves:** Offer independent H₀ measurements, helping test ΛCDM consistency, but their impact on dark energy dynamics is indirect, adding to the toolkit beyond early methods.
- **Dark Energy Fluctuations:** DESI's findings of weakening dark energy challenge constancy, suggesting a need for models with time-varying density, a departure from early uniform assumptions.

#### Implications and Future Directions
These refinements suggest a more complex universe, with dark energy potentially influencing expansion differently over cosmic history. If confirmed, this could lead to new physics, with implications for fundamental theories like general relativity. Future missions, such as NASA's Nancy Grace Roman Space Telescope (launching by May 2027) and the Vera C. Rubin Observatory (operational in 2025), will further probe these dynamics ([What is Dark Energy? Inside Our Accelerating, Expanding Universe - NASA Science](https://science.nasa.gov/dark-energy/)).

The controversy lies in the statistical significance of these findings, with some researchers noting that DESI's results are "tantalizing" but not conclusive, potentially due to statistical flukes or biases ([New Data Hint at Changing Dark Energy — and a Different Cosmic Fate - Sky & Telescope](https://skyandtelescope.org/astronomy-news/dark-energy-changing-different-cosmic-fate/)). This highlights the need for continued observation and cross-verification across methods.

#### Table: Comparison of Observations and Their Impact

| Observation Type          | Early 21st-Century Role                     | Recent Findings (as of April 2025)                     | Refinement Over Early Models                     |
|---------------------------|---------------------------------------------|-------------------------------------------------------|-------------------------------------------------|
| High-Redshift Supernovae  | Standard candles for expansion history      | Larger samples (e.g., DES 1,500+ SNe) suggest evolving dark energy | Hints at dynamical models, tighter constraints   |
| Gravitational Wave Events | Not significant, post-2015 discovery        | Independent H₀ measurements, potential for lensing studies | Cross-verifies expansion rate, indirect impact  |
| Dark Energy Fluctuations  | Assumed constant, no fluctuations           | DESI suggests weakening, potential time variation      | Challenges constancy, suggests dynamical nature |

This table summarizes how each observation type has evolved, refining our understanding beyond the static dark energy models of the early 21st century.

In conclusion, the evidence leans toward a dynamical dark energy, with recent observations providing a richer, more nuanced picture of cosmic acceleration, though further research is needed to solidify these findings.

---

### Key Citations
- [The Dark Energy Survey: Cosmology Results With ~1500 New High-redshift Type Ia Supernovae Using The Full 5-year Dataset](https://arxiv.org/html/2401.02929v3)
- [Unexpected dark energy finding may change our understanding of the universe](https://www.cnn.com/2025/04/02/science/desi-dark-energy-results/index.html)
- [Dark energy is weakening and the universe could (eventually) collapse, study says : NPR](https://www.npr.org/2025/03/20/nx-s1-5333843/dark-energy-weakening-universe-collapse-desi)
- [Gravitational waves may reveal nature of dark matter | UCL News](https://www.ucl.ac.uk/news/2023/aug/gravitational-waves-may-reveal-nature-dark-matter)
- [Study: Early dark energy could resolve cosmology’s two biggest puzzles | MIT News](https://news.mit.edu/2024/study-early-dark-energy-could-resolve-cosmologys-two-biggest-puzzles-0913)
- [What is Dark Energy? Inside Our Accelerating, Expanding Universe - NASA Science](https://science.nasa.gov/dark-energy/)
- [New Data Hint at Changing Dark Energy — and a Different Cosmic Fate - Sky & Telescope](https://skyandtelescope.org/astronomy-news/dark-energy-changing-different-cosmic-fate/)
- [Gravitational-wave physics and astronomy in the 2020s and 2030s | Nature Reviews Physics](https://www.nature.com/articles/s42254-021-00303-8)
- [Dark Energy - Wikipedia](https://en.wikipedia.org/wiki/Dark_energy)`,
            time: '2:02 PM'
        }
    // Only include the first two messages (one user, one AI) for this example
    ].slice(0, 2), []);

    // State for visible messages - initialize with empty array to control the flow
    const [visibleMessages, setVisibleMessages] = useState<Message[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
    const [typingText, setTypingText] = useState('')
    const [animationComplete, setAnimationComplete] = useState(false) // Track if animation is complete
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
        // If animation is already complete, don't do anything
        if (animationComplete) {
            return;
        }

        // If user prefers reduced motion, just show all messages immediately
        if (prefersReducedMotion) {
            setVisibleMessages(allMessages.slice(0, 2)); // Show the messages immediately
            setCurrentMessageIndex(2); // Set index past available messages
            setAnimationComplete(true); // Mark as complete
            return;
        }

        // Show first message immediately
        if (visibleMessages.length === 0 && allMessages.length > 0) {
            setVisibleMessages([allMessages[0]])
            setCurrentMessageIndex(1)
            return
        }

        // If we've shown all messages, mark as complete
        if (currentMessageIndex >= allMessages.length) {
            setAnimationComplete(true); // Mark as complete to prevent further updates
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
                }, 10); // Much faster user typing

                return () => clearInterval(typingInterval)
            } 
            // For outgoing messages (Deep Research response), simulate thinking then show chunks
            else {
                // Faster AI thinking time
                // Significantly reduced thinking time for faster response
                const thinkingTime = Math.min(600, nextMessage.text.length * 0.05);
                
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

                            // Much faster delay for rapid text display
                            const delay = chunkIndex > 0 && chunkIndex <= chunks.length
                                ? Math.max(50, Math.min(150, chunks[chunkIndex - 1].length * 0.2))
                                : 50;

                            setTimeout(showChunks, delay);
                        } else {
                            // Done showing all chunks
                            setTimeout(() => {
                                setIsTyping(false);
                                // Keep the final text displayed while typing indicator disappears
                                // setTypingText(''); // Don't clear typing text here
                                setVisibleMessages(prev => [...prev, { ...nextMessage, text: accumulatedText }]); // Add final message
                                setCurrentMessageIndex(prev => prev + 1);
                                // Mark animation as complete since this is the last message
                                setAnimationComplete(true);
                            }, 400);
                        }
                    };

                    showChunks();
                }, thinkingTime);
            }
        }

        // Start typing the next message with minimal delay
        const timer = setTimeout(() => {
            startTypingAnimation()
        }, 400) // Much shorter initial delay

        return () => clearTimeout(timer)
    // Ensure all dependencies are included
    }, [visibleMessages, currentMessageIndex, prefersReducedMotion, allMessages, animationComplete])

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

        // Enhanced prose classes with appropriate text size
        const proseBase = `prose prose-sm dark:prose-invert max-w-none font-sans prose-headings:font-medium prose-p:leading-relaxed`;
        // Enhanced classes for outgoing messages
        const proseOutgoing = `prose-light text-indigo-50 prose-headings:text-white prose-strong:text-white/90`;

        return (
            // Wrapper div with enhanced styling
            <div className={`${proseBase} ${isOutgoing ? proseOutgoing : 'text-gray-800 dark:text-gray-100 prose-headings:text-gray-900 dark:prose-headings:text-white/95'}`}>
                <ReactMarkdown
                    components={{
                        // Modern styles for markdown elements
                        h1: ({node, ...props}) => <h1 className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-600 dark:to-violet-400 mt-2 first:mt-0 mb-1.5 font-sans font-bold text-transparent text-base" {...props} />,
                        h2: ({node, ...props}) => <h2 className="mt-1.5 mb-1 font-sans font-semibold text-[0.95rem] text-indigo-700 dark:text-indigo-300" {...props} />,
                        h3: ({node, ...props}) => <h3 className="mt-1.5 mb-1 font-sans font-medium text-[0.9rem] text-indigo-600 dark:text-indigo-400" {...props} />,
                        p: ({node, ...props}) => <p className="mb-1.5 text-[0.9rem] text-gray-700 dark:text-gray-200 leading-tight" {...props} />,
                        ul: ({node, ...props}) => <ul className="space-y-0.5 mb-1.5 pl-3 text-[0.9rem] text-gray-700 dark:text-gray-200 list-disc list-outside" {...props} />,
                        ol: ({node, ...props}) => <ol className="space-y-0.5 mb-1.5 pl-3 text-[0.9rem] text-gray-700 dark:text-gray-200 list-decimal list-outside" {...props} />,
                        li: ({node, ...props}) => <li className="my-0.5 text-[0.9rem] text-gray-700 dark:text-gray-200" {...props} />,
                        // --- Enhanced Link Styling ---
                        a: ({node, ...props}) => (
                            <a
                                className={`font-medium no-underline transition-all duration-200 ease-in-out rounded-sm px-1 py-0.5 border text-[0.85rem]
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
                                <code className={`px-1.5 py-0.5 rounded-md text-[0.9rem] font-mono ${isOutgoing ? 'bg-white/15 border border-white/10' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border dark:border-indigo-800/50'}`} {...props}>
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
            className="flex flex-col space-y-3 bg-transparent p-3 rounded-2xl h-[500px] overflow-y-auto font-serif text-[14px] scroll-smooth custom-scrollbar"
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
                    className={`flex items-start gap-2 ${message.type === 'incoming' ? 'justify-start' : 'justify-end'}`}
                >
                    {/* User Avatar */}
                    {message.type === 'incoming' && (
                        <div className="flex-shrink-0 rounded-full w-7 h-7 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1601288496920-b6154fe3626a?q=80&w=1826&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fHw%3D%3D" alt="User Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Bubble Content */}
                    <div
                        className={`flex flex-col max-w-[85%] shadow-lg transition-all duration-300 ease-out ${
                            message.type === 'incoming'
                                ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-xl rounded-tl-md'
                                : 'bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-500 dark:to-violet-700 text-white rounded-xl rounded-tr-md border border-indigo-400/10 dark:border-violet-500/20'
                        } p-4`}
                    >
                        <div className="w-full">
                            {renderMarkdown(message.text, message.type === 'outgoing')}
                        </div>
                        <div className={`mt-1 text-right text-[9px] opacity-70 ${message.type === 'incoming' ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-100 dark:text-indigo-300'}`}>
                            {message.time}
                        </div>
                    </div>

                     {/* AI Avatar */}
                    {message.type === 'outgoing' && (
                        <div className="flex-shrink-0 rounded-full w-7 h-7 overflow-hidden">
                            <img src="https://raw.githubusercontent.com/duggal1/deep-research/refs/heads/main/public/blaze.png" alt="Deep Research Engine Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            ))}
            
            {isTyping && (
                <div className={`flex items-start gap-2 ${allMessages[currentMessageIndex]?.type === 'incoming' ? 'justify-start' : 'justify-end'}`}>
                    {/* Typing Avatar */}
                    {allMessages[currentMessageIndex]?.type === 'incoming' ? (
                         <div className="flex-shrink-0 rounded-full w-7 h-7 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1601288496920-b6154fe3626a?q=80&w=1826&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8MHx8fHw%3D%3D" alt="User Avatar" className="w-full h-full object-cover" />
                         </div>
                    ) : (
                        <div className="flex-shrink-0 rounded-full w-7 h-7 overflow-hidden">
                            <img src="https://raw.githubusercontent.com/duggal1/deep-research/refs/heads/main/public/blaze.png" alt="Deep Research Engine Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Typing Bubble Content */}
                    {allMessages[currentMessageIndex]?.type === 'incoming' ? (
                         <div className={`flex items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-xl rounded-tl-md shadow-lg border border-gray-100 dark:border-gray-800 h-[32px]`}>
                             <span className="flex space-x-2">
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '100ms' }}></span>
                                <span className="bg-indigo-400 dark:bg-indigo-500 rounded-full w-2 h-2 animate-dot-bounce" style={{ animationDelay: '200ms' }}></span>
                             </span>
                         </div>
                    ) : (
                        // Show partial response for AI typing
                        <div className={`flex flex-col bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-500 dark:to-violet-700 text-white shadow-lg p-4 rounded-xl rounded-tr-md max-w-[85%] border border-indigo-400/10 dark:border-violet-500/20`}>
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
