
"use client"

import { Logo } from '@/components/logo'
import { Activity, Globe as GlobeIcon, MessageSquare, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useReducedMotion } from 'framer-motion'
// Import Globe component for 3D globe visualization
import { Globe } from './globe'

// Define custom animations
// We'll add a style tag to define our custom animations
const CustomAnimations = () => (
    <style jsx global>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards, fadeInUp 0.4s ease-out forwards;
      }

      .animate-pulse-slow {
        animation: pulse 3s ease-in-out infinite;
      }

      .bg-gradient-radial {
        background-image: radial-gradient(var(--tw-gradient-stops));
      }

      /* Dark mode specific animations */
      .dark .animate-glow {
        animation: glow 2s ease-in-out infinite alternate;
      }

      @keyframes glow {
        from {
          box-shadow: 0 0 5px rgba(99, 102, 241, 0.2);
        }
        to {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
        }
      }
    `}</style>
  )

// Define types for our components
interface Point {
  x: number
  y: number
}

interface Connection {
  start: Point
  end: Point
  progress: number
}

interface Message {
  id: number
  type: 'incoming' | 'outgoing'
  text: string
  time: string
}

interface AnimatedCounterProps {
  target: number
  suffix?: string
  label?: string
}

interface ChartDataItem {
  month: string
  desktop: number
  mobile: number
}

export default function FeaturesCloud() {
    return (
        <section className="bg-white dark:bg-black px-4 py-16 md:py-32 font-serif">
            <CustomAnimations />
            <div className="grid md:grid-cols-2 shadow-sm mx-auto border dark:border-gray-800 rounded-xl max-w-5xl overflow-hidden">
                <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/50 transition-all duration-500">
                    <div className="z-10 relative p-6 sm:p-12">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <Globe className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-700 dark:from-indigo-400 to-violet-600 dark:to-violet-400 text-transparent">
                                Autonomous Lead Generation
                            </span>
                        </span>

                        <p className="mt-8 font-semibold dark:text-white text-2xl leading-tight">
                            AI agents that autonomously identify and qualify high-value prospects across global markets.
                        </p>

                        <div className="inline-flex items-center mt-4 font-medium text-indigo-600 dark:text-indigo-400 text-sm">
                            <span>Learn more</span>
                            <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>

                    <div aria-hidden className="relative">
                        <div className="z-10 absolute inset-0 m-auto size-fit">
                            <div className="z-10 relative flex items-center gap-2 bg-white dark:bg-gray-800 shadow-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg w-fit size-fit font-medium dark:text-gray-200 text-xs">
                                 <Image
                                    src="/icons/axion-logo.png"
                                    alt="Logo"
                                    width={20}
                                    height={20}
                                    priority
                                    className="mr-4"
                                 />
                                <span className="text-lg"></span> AI agent closed <span className='text-green-600 dark:text-green-400'>$1.2M </span> deal in NewYork
                            </div>
                        </div>

                        <div className="relative h-[240px] overflow-hidden">
                            <div className="z-10 absolute inset-0"></div>
                            <div className="absolute inset-0 flex justify-center items-center">
                                <Globe />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="group relative bg-white hover:bg-gray-50/80 dark:bg-black dark:hover:bg-gray-900/50 p-6 sm:p-12 md:border-0 dark:border-gray-800 border-t md:border-l overflow-hidden transition-all duration-500">
                    <div className="z-10 relative">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <MessageSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-700 dark:from-indigo-400 to-violet-600 dark:to-violet-400 text-transparent">
                                Deep Research Engine
                            </span>
                        </span>

                        <p className="my-6 font-semibold dark:text-white text-2xl leading-tight">
                            AI-driven research that delivers comprehensive, accurate answers to complex questions.
                        </p>

                        <div className="inline-flex items-center mb-4 font-medium text-indigo-600 dark:text-indigo-400 text-sm">
                            <span>Learn more</span>
                            <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                    <div aria-hidden className="flex flex-col gap-4">
                        <AnimatedDeepResearchMessages />
                    </div>
                </div>
                <div className="col-span-full bg-gray-50/50 dark:bg-gray-900/50 py-8 dark:border-gray-800 border-t">
                    <AnimatedMetric />
                </div>
                <div className="relative col-span-full dark:border-gray-800 border-t">
                    <div className="z-10 absolute px-6 md:px-12 pt-6 md:pt-12 pr-12 max-w-lg">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <Activity className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-700 dark:from-indigo-400 to-violet-600 dark:to-violet-400 text-transparent">
                                AI Performance Metrics
                            </span>
                        </span>

                        <p className="my-6 font-semibold dark:text-white text-2xl leading-tight">
                            Real-time analytics that track AI model performance on complex reasoning tasks.
                            <span className="text-zinc-500 dark:text-zinc-400"> Compare leading models across time.</span>
                        </p>

                        <div className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 text-sm">
                            <span>View dashboard</span>
                            <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                    <AnimatedAIScoreChart />
                </div>
            </div>
        </section>
    )
}

// 3D Globe Component with endless motion
// This replaces the static map with a more engaging 3D visualization
const AnimatedGlobeMap = () => {
    // Extremely optimized configuration for maximum performance
    const globeConfig = {
        width: 600, // Smaller size for better performance
        height: 600, // Smaller size for better performance
        devicePixelRatio: 1.0, // Minimum for extreme performance
        phi: 0,
        theta: 0.3,
        dark: 0,
        diffuse: 0.4,
        mapSamples: 8000, // Reduced for better performance
        mapBrightness: 1.2,
        baseColor: [1, 1, 1],
        markerColor: [99/255, 102/255, 241/255], // Indigo color
        glowColor: [1, 1, 1],
        markers: [
            // Reduced number of markers for better performance
            { location: [40.7128, -74.006], size: 0.1 },  // New York
            { location: [51.5074, -0.1278], size: 0.09 },  // London
            { location: [35.6762, 139.6503], size: 0.08 }, // Tokyo
            { location: [1.3521, 103.8198], size: 0.07 },  // Singapore
            { location: [-23.5505, -46.6333], size: 0.07 }, // São Paulo
        ],
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Add a subtle glow effect behind the globe */}
            <div
                className="absolute inset-0 bg-gradient-radial from-indigo-100/30 to-transparent"
                style={{
                    transform: 'translate(-50%, -50%)',
                    top: '50%',
                    left: '50%',
                    width: '150%',
                    height: '150%',
                    zIndex: 0
                }}
            />

            {/* The 3D Globe with endless rotation */}
            <Globe
                config={globeConfig}
                className="z-10"
            />

            {/* Add a notification that appears to float over the globe */}
            <div
                className="top-1/4 right-1/4 z-20 absolute -translate-y-1/2 translate-x-1/2 transform"
                style={{
                    animation: 'float 6s ease-in-out infinite'
                }}
            >
                <div className="flex items-center gap-2 bg-white shadow-md px-3 py-1.5 border rounded-lg font-medium text-xs">
                    <span className="text-lg">🤖</span> AI agent closed $1.2M deal in Tokyo
                </div>
            </div>

            {/* Add floating animation */}
            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(-50%) translateX(50%) translateZ(0); }
                    50% { transform: translateY(-60%) translateX(45%) translateZ(0); }
                    100% { transform: translateY(-50%) translateX(50%) translateZ(0); }
                }
            `}</style>
        </div>
    )
}

// Animated Deep Research Messages Component
const AnimatedDeepResearchMessages = () => {
    // Optimized image URLs with smaller sizes for better performance
    const userAvatarUrl = "https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?q=70&w=150&auto=format&fit=crop"
    const deepResearchAvatarUrl = "/icons/axion-logo.png" // Using the same logo for now

    // Pre-define all messages to avoid state changes and re-renders
    const allMessages: Message[] = [
        {
            id: 1,
            type: 'incoming',
            text: "Given the latest cosmological data available as of April 6, 2025, what are the most plausible mechanisms driving the accelerated expansion of the universe, and how do recent observations of high-redshift supernovae, gravitational wave events, and dark energy fluctuations refine our understanding of these processes compared to models proposed in the early 21st century?",
            time: '1:48 PM'
        },
        {
            id: 2,
            type: 'outgoing',
            text: '### Key Points
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

1. **Dark Energy as a Cosmological Constant**: This remains the simplest explanation, where dark energy is a constant energy density, consistent with Einstein's initial cosmological constant idea. It fits well with many observations but struggles to explain recent tensions, like the Hubble constant discrepancy.

2. **Evolving Dark Energy**: Recent findings from the Dark Energy Spectroscopic Instrument (DESI) suggest dark energy might be weakening over time. A study published in March 2025 indicated that DESI's analysis of nearly 15 million galaxies and quasars shows dark energy's impact may be decreasing, challenging the constant model ([Reuters on Dark Energy Changing](https://www.reuters.com/science/evidence-mounts-that-universes-dark-energy-is-changing-over-time-2025-03-19/)). This could imply dynamic models like quintessence, where dark energy's density varies, or even new physics beyond the standard model.

3. **Alternative Theories**: Some researchers propose that accelerated expansion might be an illusion, caused by our position in a less dense region (Hubble bubble) or modified gravity theories. A 2024 study suggested dark energy might not exist, with expansion explained by gravity's time-dilation effects ([Labrujulaverde on Dark Energy Illusion](https://www.labrujulaverde.com/en/2024/12/scientists-claim-dark-energy-does-not-exist-and-accelerated-expansion-of-universe-is-an-illusion-caused-by-gravity-slowing-down-time/)), but these remain less supported by current data.

The DESI results, announced at the American Physical Society’s Global Physics Summit in March 2025, suggest that dark energy's equation of state might evolve, potentially leading to a "big crunch" scenario instead of endless expansion ([The Guardian on Dark Energy Weakening](https://www.theguardian.com/science/2025/mar/19/dark-energy-mysterious-cosmic-force-weakening-universe-expansion)). This is a significant shift, with implications for the universe's fate, and is currently under intense scrutiny.

#### Impact of Recent Observations

Recent observations have refined our understanding, particularly through three key areas: high-redshift supernovae, gravitational wave events, and dark energy fluctuations.

##### High-Redshift Supernovae

The Dark Energy Survey (DES) released its full 5-year dataset in January 2024, analyzing ~1500 high-redshift Type Ia supernovae, classified using machine learning on light curves ([DES Cosmology Results](https://arxiv.org/abs/2401.02929)). This sample, combined with low-redshift data, provides the tightest constraints on cosmology from supernovae to date. The results are consistent with ΛCDM but do not rule out evolving dark energy, suggesting a possible variation in dark energy density over cosmic time. This refines early models by offering more precise measurements, potentially supporting dynamic dark energy models over a constant.

For instance, a January 2024 article highlighted that DES findings are consistent with standard models but open to complexity, noting that dark energy density could vary, which was not considered in early 2000s models ([Penn Today on DES Results](https://penntoday.upenn.edu/news/dark-energy-survey-uncovers-clues-universes-complexity)). This precision helps test alternative theories, like quintessence, which were speculative in the early 21st century.

##### Gravitational Wave Events

Gravitational wave observations, primarily from LIGO and Virgo, have been pivotal for testing general relativity and understanding dark matter, with indirect implications for dark energy. A 2023 study suggested that gravitational waves from black hole mergers could reveal dark matter properties, potentially constraining modified gravity theories that compete with dark energy explanations ([UCL News on Gravitational Waves](https://www.ucl.ac.uk/news/2023/aug/gravitational-waves-may-reveal-nature-dark-matter)). While not directly measuring dark energy, these observations test the gravitational framework, which is crucial for dark energy models.

For example, theories like Horndeski gravity, which modify gravity to explain acceleration without dark energy, can be tested via gravitational wave speeds. A 2018 review noted that gravitational wave data restrict modifications to gravity, indirectly supporting or challenging dark energy models ([Frontiers on Multi-Messenger GW](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2018.00044/full)). This is a refinement over early models, which lacked such data, offering new ways to probe dark energy indirectly.

##### Dark Energy Fluctuations

The term "dark energy fluctuations" likely refers to the evolving nature of dark energy, as suggested by recent DESI findings. In March 2025, DESI's data showed signs that dark energy is weakening, with implications for the universe's expansion rate decreasing over the past 4-5 billion years ([Washington Post on Universe Expansion](https://www.washingtonpost.com/science/2025/03/19/universe-dark-energy-nasa-telescope/)). This is a significant departure from early models, which assumed a constant cosmological constant, and aligns with dynamic models like early dark energy, proposed to resolve Hubble tension ([MIT News on Early Dark Energy](https://news.mit.edu/2024/study-early-dark-energy-could-resolve-cosmologys-two-biggest-puzzles-0913)).

These fluctuations, if confirmed, suggest dark energy's equation of state (w) might vary, with DESI's 3D map of 31 million galaxies set for release in 2025 potentially shedding more light ([New Scientist on DESI 2025](https://www.newscientist.com/article/mg26435232-300-could-2025-be-the-year-we-finally-start-to-understand-dark-energy/)). This refines early models by introducing temporal variability, a concept not considered in the constant dark energy framework of the early 2000s.

#### Comparison to Early 21st-Century Models

Early 21st-century models, post-1998, established dark energy as a cosmological constant within the ΛCDM framework, consistent with CMB and supernova data. These models predicted endless expansion, leading to a "big freeze" scenario, where the universe becomes cold and empty. However, recent observations challenge this:

- **Constant vs. Evolving**: Early models assumed dark energy was static, with a fixed density. Now, DESI and DES suggest it might evolve, potentially weakening, which could lead to a "big crunch" instead of endless expansion, as noted in March 2025 reports ([NPR on Dark Energy Weakening](https://www.npr.org/2025/03/20/nx-s1-5333843/dark-energy-weakening-universe-collapse-desi)).

- **Precision and Complexity**: Early models lacked the precision of modern surveys. DES's 1500 supernovae and DESI's 15 million galaxy map offer finer details, revealing tensions like the Hubble constant discrepancy, suggesting more complex models are needed, as per a 2025 CNN article ([CNN on DESI Findings](https://www.cnn.com/2025/04/02/science/desi-dark-energy-results/index.html)).

- **Future Implications**: Early models predicted a desolate future; now, evolving dark energy opens possibilities like contraction, fundamentally altering our cosmic fate predictions, as discussed in a Quanta Magazine piece from March 2025 ([Quanta on Dark Energy Weakening](https://www.quantamagazine.org/is-dark-energy-getting-weaker-new-evidence-strengthens-the-case-20250319/)).

This refinement is crucial, as it shifts from a static to a dynamic view, potentially requiring new physics, and aligns with ongoing debates about the universe's ultimate fate.

#### Summary Table: Comparison of Observations

| Observation Type               | Early 21st-Century Impact                     | Recent Refinement (2025)                          |
|--------------------------------|-----------------------------------------------|--------------------------------------------------|
| High-Redshift Supernovae       | Established acceleration, assumed constant DE | DES data suggest possible variation, tighter constraints |
| Gravitational Waves            | Limited, focused on GR tests                 | Indirect constraints on DE via gravity modifications |
| Dark Energy Fluctuations       | Not considered, assumed constant             | DESI shows possible weakening, evolving models preferred |

This table highlights how recent observations build on early findings, refining our understanding with more dynamic and complex models.

In conclusion, as of April 6, 2025, the field is at a pivotal moment, with evolving dark energy gaining traction, driven by DES, DESI, and other surveys. This marks a significant evolution from early 21st-century models, promising deeper insights into the universe's past, present, and future.

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
- [Dark energy Wikipedia page](https://en.wikipedia.org/wiki/Dark_energy).',
            time: '10:51 PM'
        },
       
    ]

    // Minimal state for maximum performance
    const [isTyping, setIsTyping] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Check for reduced motion preference
    const prefersReducedMotion = useReducedMotion()

    // State for streaming text
    const [currentIncomingText, setCurrentIncomingText] = useState("")
    const [currentOutgoingText, setCurrentOutgoingText] = useState("")
    const [activeMessageIndex, setActiveMessageIndex] = useState(0)
    const streamingRef = useRef<boolean>(false)

    // EXTREME speed streaming (900+ tokens per second)
    // Hyper-optimized for maximum performance
    const streamText = async (text: string, setter: (text: string) => void) => {
        let currentText = "";
        streamingRef.current = true;
        setIsTyping(true);

        // For 900+ tokens per second, we need extremely fast streaming with no delays
        // Use larger chunks and minimal state updates
        const chunkSize = 8; // Stream 8 characters at once for maximum speed

        // Use requestAnimationFrame for smoother performance than setTimeout
        const streamChunk = async (index: number) => {
            if (index >= text.length) {
                streamingRef.current = false;
                setIsTyping(false);
                return;
            }

            // Get next chunk
            const end = Math.min(index + chunkSize, text.length);
            const chunk = text.substring(index, end);
            currentText += chunk;

            // Update state only on animation frame for better performance
            setter(currentText);

            // Use requestAnimationFrame for next chunk - smoother than setTimeout
            requestAnimationFrame(() => streamChunk(end));
        };

        // Start streaming with requestAnimationFrame
        requestAnimationFrame(() => streamChunk(0));
    };

    // Hyper-optimized animation loop for maximum performance
    const animateConversation = async () => {
        if (streamingRef.current) return;

        // If user prefers reduced motion, show all messages immediately
        if (prefersReducedMotion) {
            // Just show the final state
            setCurrentIncomingText(allMessages[0].text);
            setCurrentOutgoingText(allMessages[1].text);
            return;
        }

        // Reset texts
        setCurrentIncomingText("");
        setCurrentOutgoingText("");

        // Get current message pair - safely
        const desktoppairIndex = Math.floor(activeMessageIndex % Math.floor(allMessages.length / 2));
        const incomingIndex = pairIndex * 2;
        const outgoingIndex = pairIndex * 2 + 1;

        // Safely get messages with fallbacks
        const incomingMsg = incomingIndex < allMessages.length ? allMessages[incomingIndex] : allMessages[0];
        const outgoingMsg = outgoingIndex < allMessages.length ? allMessages[outgoingIndex] : allMessages[1];

        // Show incoming message with typing indicator - extremely fast
        await streamText(incomingMsg.text, setCurrentIncomingText);

        // Minimal pause before AI response
        await new Promise(resolve => setTimeout(resolve, 150));

        // Show outgoing message with typing indicator - extremely fast
        await streamText(outgoingMsg.text, setCurrentOutgoingText);

        // Shorter wait before next conversation for faster cycling
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Move to next conversation pair
        setActiveMessageIndex(prev => prev + 1);
    };

    // Start animation on mount and handle cleanup
    useEffect(() => {
        // Small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
            if (!streamingRef.current) {
                animateConversation();
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            streamingRef.current = false;
        };
    }, [activeMessageIndex, prefersReducedMotion]);

    // Render the current conversation - fixed to prevent undefined errors
    const renderConversation = () => {
        // Safely calculate indices and get messages
        const pairIndex = Math.floor(activeMessageIndex % Math.floor(allMessages.length / 2));
        const incomingIndex = pairIndex * 2;
        const outgoingIndex = pairIndex * 2 + 1;

        // Safely get messages with fallbacks
        const incomingMsg = incomingIndex < allMessages.length ? allMessages[incomingIndex] : allMessages[0];
        const outgoingMsg = outgoingIndex < allMessages.length ? allMessages[outgoingIndex] : allMessages[1];

        return (
            <>
                {currentIncomingText && (
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="relative shadow-sm border-2 border-white dark:border-gray-700 rounded-full w-6 h-6 overflow-hidden">
                  Blaze Deep Research (last point)
        if (index === chartData.length - 1 && dataKey === 'desktop') {
            return (
                <g>
                    {/* Glow effect */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill="none"
                        stroke="#F59E0B"
                        strokeOpacity={0.4}
                        strokeWidth={3}
                        className="animate-pulse-slow"
                    />
                    {/* Main dot */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#F59E0B"
                        stroke="#fff"
                        strokeWidth={2}
                        className="dark:animate-glow"
                    />
                </g>              <Image
            )                        src={userAvatarUrl}
                                    alt="User"Blaze Deep Research (last point)
        if (index === chartData.length - 1 && dataKey === 'desktop') {
            return (
                <g>
                    {/* Glow effect */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill="none"
                        stroke="#F59E0B"
                        strokeOpacity={0.4}
                        strokeWidth={3}
                        className="animate-pulse-slow"
                    />
                    {/* Main dot */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#F59E0B"
                        stroke="#fff"
                        strokeWidth={2}
                        className="dark:animate-glow"
                    />
                </g>
            )                        fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">{incomingMsg?.time || "Just now"}</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 shadow-sm mt-1.5 p-3 border dark:border-gray-700 rounded-xl w-4/5 dark:text-gray-200 text-xs">
label} 2025</p>
                    <div className="text-gray-600 dark:text-gray-400">Score:</span>
                            <span className="ml-1 font-medium text-gray-800 dark:text-gray-200">{modelName}</span>
                        </p>
                        <p className="flex items-center text-xs">
                            <span className="bg-indigo-600 dark:bg-indigo-500 mr-2 rounded-full w-2 h-2"></span>
                                {currentIncomingText}
                        </div>
                    </div>
                )}

                {currentOutgoingText && (
                    <div>
                            <span className="flex justify-end items-center gap-2">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">{outgoingMsg?.time || "Just now"}</span>
                            <div className="relative shadow-sm border-2 border-white dark:border-gray-700 rounded-full w-6 h-6 overflow-hidden">
                                <Image
                                    src={deepResearchAvatarUrl}
                                    alt="Deep Research"
                                    width={24}
                                    height={24}
                                    className="object-cover"
 label} 2025</p>
                    <div className="text-gray-600 dark:text-gray-400">Score:</span>
                            <span className="ml-1 font-medium text-gray-800 dark:text-gray-200">{modelName}</span>
                        </p>
                        <p className="flex items-center text-xs">
                            <span className="bg-indigo-600 dark:bg-indigo-500 mr-2 rounded-full w-2 h-2"></span>
                                       priority
                                />
                            </div>
                        </div>
                            <span className="bg-indigo-600 dark:bg-indigo-700 shadow-sm mb-1 ml-auto p-3 rounded-xl w-4/5 text-white text-xs">
                            {currentOutgoingText}
                        </div>
                    </div>
                         {/* Green Gradient for Mobile */}
                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="lineMobile" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>

           )}
            </>
        );
    };

    // Function to render typing indicator - optimized for performance
    const renderTypingIndicator = (isIncoming: boolean) => {
        return (
            <div
                className={`flex items-center gap-2 ${isIncoming ? '' : 'justify-end'}`}
                style={{ transform: 'translateZ(0)' }} // Hardware acceleration
            >
                {isIncoming && (
                    <div className="relative shadow-sm border-2 border-white dark:border-gray-700 rounded-full w-6 h-6 overflow-hidden">
                        <Image
                            src={userAvatarUrl}
                            alt="User"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}
                <div className={`${isIncoming ? 'bg-white dark:bg-gray-800 border dark:border-gray-700' : 'bg-indigo-600 dark:bg-indigo-700'} px-4 py-2 rounded-full inline-flex shadow-sm`}>
                    <span className="flex gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isIncoming ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-white'} animate-pulse`} style={{ animationDuration: '0.8s', animationDelay: '-0.3s' }}></span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isIncoming ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-white'} animate-pulse`} style={{ animationDuration: '0.8s', animationDelay: '-0.15s' }}></span>
                    className="dark:stroke-gray-700/30"
                         {/* Green Gradient for Mobile */}
                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="lineMobile" x1="0" y1="0" x2="1" y2="0">,
                        className: 'dark:stroke-gray-700'
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>

                   <span className={`w-1.5 h-1.5 rounded-full ${isIncoming ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-white'} animate-pulse`} style={{ animationDuration: '0.8s' }}></span>
                    </span>
                </div>
                {!isIncoming && (
                    <div className="relative shadow-sm border-2 border-white dark:border-gray-700 rounded-full w-6 h-6 overflow-hidden">
                        <Image
                            src={deepResearchAvatarUrl}
                            alt="Deep Research"
                            width={24}
                            height={24}
                            className="object-cover"
                            priority
                        />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 h-[300px] overflow-hidden" ref={containerRef} style={{ transform: 'translateZ(0)' }}>
            <div
                className="transition-all animate-fadeIn duration-200 ease-out"
                style={{
                    transform: 'translateZ(0)', // Hardware acceleration
                    willChange: 'transform, opacity', // Hint to browser for optimization
                    backfaceVisibility: 'hidden', // Additional performance optimization
                    perspective: 1000, // Improves animation smoothness
                    contain: 'content', // Additional performance optimization
                }}
                    className="dark:stroke-gray-700/30"
            >
                {/* Render the streaming conversation */}
                {renderConversation()}

                {/* Typing indicator - only show when actively typing */}
         ,
                        className: 'dark:stroke-gray-700'       {isTyping && renderTypingIndicator(currentIncomingText && !currentOutgoingText)}
            </div>
        </div>
    )
}

// Animated Counter Component
const AnimatedCounter = ({ target, suffix = '', label = '' }: AnimatedCounterProps) => {
    const [count, setCount] = useState<number>(0)
    const countRef = useRef<number>(0)
    const frameRef = useRef<number>(0)

    useEffect(() => {
        // Reset count when target changes
        setCount(0)
        countRef.current = 0

        // Use requestAnimationFrame for smoother animation
        const startTime = performance.now()
        const duration = 2000 // 2 seconds

        const animate = (currentTime: number) => {
            // Calculate progress (0 to 1)
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Apply easing function for smoother animation
            // Cubic easing out function: progress = 1 - Math.pow(1 - progress, 3)
            const easedProgress = 1 - Math.pow(1 - progress, 3)

            // Calculate current count value
            const currentCount = easedProgress * target

            // Only update state if value has changed significantly
            if (Math.abs(currentCount - countRef.current) > 0.5) {
                countRef.current = currentCount
                setCount(Math.floor(currentCount))
            }

            // Continue animation if not complete
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate)
            } else {
                // Ensure final value is exactly the target
                setCount(target)
            }
        }

        // Start animation
        frameRef.current = requestAnimationFrame(animate)

        // Cleanup
        return () => {
            cancelAnimationFrame(frameRef.current)
        }
    }, [target])

    return (
        <div className="flex flex-col items-center">
            <span className="flex items-baseline">
                {count}{suffix}
            </span>
            {label && <span className="mt-2 text-zinc-600 text-xl">{label}</span>}
        </div>
    )
}

// Animated Metric Component with endless loop
// Optimized for performance and respects reduced motion preferences
const AnimatedMetric = () => {
    const [count, setCount] = useState(0)
    const targetValue = 33.0 // Updated to match Blaze Deep Research score
    const frameRef = useRef<number>(0)
    const prefersReducedMotion = useReducedMotion()

    // Throttle updates to improve performance
    const throttleRef = useRef<number>(0)
    const throttleTime = 50 // ms between updates

    useEffect(() => {
        // If reduced motion is preferred, just show the final value
        if (prefersReducedMotion) {
            setCount(targetValue)
            return
        }

        let startTime: number | null = null
        const duration = 5000 // 5 seconds for full animation

        const animate = (timestamp: number) => {
            // Throttle updates
            if (timestamp - throttleRef.current < throttleTime) {
                frameRef.current = requestAnimationFrame(animate)
                return
            }

            throttleRef.current = timestamp

            if (!startTime) startTime = timestamp
            const progress = (timestamp - startTime) / duration

            if (progress < 1) {
                // Use cubic easing for smoother animation
                const easedProgress = 1 - Math.pow(1 - Math.min(progress, 1), 3)
                setCount(targetValue * easedProgress)
                frameRef.current = requestAnimationFrame(animate)
            } else {
                // Reset animation
                setCount(0)
                startTime = null
                frameRef.current = requestAnimationFrame(animate)
            }
        }

        // Small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
            frameRef.current = requestAnimationFrame(animate)
        }, 100)

        return () => {
            clearTimeout(timer)
            cancelAnimationFrame(frameRef.current)
        }
    }, [prefersReducedMotion])

    return (
        <div className="text-center">
            <p className="font-semibold dark:text-white text-4xl lg:text-7xl">{count.toFixed(1)}%</p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">Blaze Deep Research accuracy score</p>
        </div>
    )
}

// Define interface for AI model score data
interface AIScoreDataItem {
    date: string;
    model: string;
    score: number;
    x: string; // Date for x-axis
    y: number; // Score for y-axis
}

// Chart data and configuration with 2025 modern color palette
const aiScoreChartConfig = {
    score: {
        label: 'AI Score',
        color: '#6366F1', // Modern indigo
    }
} satisfies ChartConfig

// Initial chart data with AI model scores
const initialAIScoreData: AIScoreDataItem[] = [
    { date: '2024-04-24', model: 'ChatGPT-4 Omni', score: 5, x: '2024-04-24', y: 5 },
    { date: '2024-01-24', model: 'Grok-2', score: 5, x: '2024-01-24', y: 5 },
    { date: '2024-09-24', model: 'OpenAI O1', score: 10, x: '2024-09-24', y: 10 },
    { date: '2024-12-24', model: 'Gemini Thinking', score: 6, x: '2024-12-24', y: 6 },
    { date: '2025-02-25', model: 'DeepSeek', score: 8, x: '2025-02-25', y: 8 },
    { date: '2025-03-25', model: 'OpenAI O3 Mini', score: 9, x: '2025-03-25', y: 9 },
    { date: '2025-04-04', model: 'O3 Mini High', score: 11, x: '2025-04-04', y: 11 },
    { date: '2025-04-25', model: 'OpenAI Deep Research', score: 28, x: '2025-04-25', y: 28 },
    { date: '2025-04-25', model: 'Blaze Deep Research', score: 33, x: '2025-04-25', y: 33 }
]

// Helper function to smoothly transition between values
const smoothTransition = (
    currentValue: number,
    targetValue: number,
    step: number = 0.1
): number => {
    if (Math.abs(currentValue - targetValue) < step) {
        return targetValue
    }
    return currentValue + (targetValue - currentValue) * step
}

// Ultra-modern 2025 AI Score Chart Component with sleek animations
// Optimized for performance and respects reduced motion preferences
const AnimatedAIScoreChart = () => {
    const [chartData, setChartData] = useState<AIScoreDataItem[]>(initialAIScoreData)
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const targetValuesRef = useRef<{[key: string]: {score: number}}>({})
    const frameRef = useRef<number>(0)
    const animationPhaseRef = useRef<number>(0)
    const prefersReducedMotion = useReducedMotion()

    // Throttle function to limit how often we update state
    const throttleRef = useRef<number>(0)
    const throttleTime = 30 // ms between updates (about 30fps instead of 60fps)

    useEffect(() => {
        // Initialize target values with more dynamic patterns
        const initialTargets = chartData.reduce((acc, item) => {
            acc[item.date] = {
                score: item.score
            }
            return acc
        }, {} as {[key: string]: {score: number}})

        targetValuesRef.current = initialTargets

        // If user prefers reduced motion, just set static data and return
        if (prefersReducedMotion) {
            // Apply a single subtle wave to make the chart look more natural
            // but don't animate it continuously
            const staticData = initialAIScoreData.map((item, index) => {
                const baseScore = item.score

                // Add a subtle wave pattern (static)
                const scoreWave = Math.sin(index * 0.5) * (baseScore * 0.05)

                return {
                    ...item,
                    score: baseScore + scoreWave,
                    y: baseScore + scoreWave
                }
            })

            setChartData(staticData)
            return
        }

        // Function to create wave-like patterns in the data
        const createWavePattern = () => {
            const phase = animationPhaseRef.current
            animationPhaseRef.current = (phase + 0.03) % (Math.PI * 2) // Slower animation

            const dates = Object.keys(targetValuesRef.current)

            dates.forEach((date, index) => {
                const baseScore = initialAIScoreData[index % initialAIScoreData.length].score

                // Create smooth wave patterns with different frequencies
                // Reduced amplitude for more subtle animation
                const scoreWave = Math.sin(phase + index * 0.5) * (baseScore * 0.05)

                targetValuesRef.current[date] = {
                    score: baseScore + scoreWave
                }
            })
        }

        // Function to animate chart data with fluid motion
        const animateChart = (timestamp: number) => {
            // Throttle updates to improve performance
            if (timestamp - throttleRef.current < throttleTime) {
                frameRef.current = requestAnimationFrame(animateChart)
                return
            }

            throttleRef.current = timestamp

            // Update wave pattern
            createWavePattern()

            setChartData(prevData => {
                const newData = prevData.map((item, index) => {
                    const target = targetValuesRef.current[item.date]
                    if (!target) return item

                    // Faster transitions for more fluid animation
                    const newScore = smoothTransition(item.score, target.score, 0.08)

                    return {
                        ...item,
                        score: newScore,
                        y: newScore
                    }
                })

                return newData
            })

            frameRef.current = requestAnimationFrame(animateChart)
        }

        // Start animation with a small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
            frameRef.current = requestAnimationFrame(animateChart)
        }, 100)

        return () => {
            clearTimeout(timer)
            cancelAnimationFrame(frameRef.current)
        }
    }, [prefersReducedMotion])

    // Custom dot component for enhanced visual appeal
    const CustomDot = (props: any) => {
        const { cx, cy, index, dataKey } = props
        const isHovered = index === hoverIndex
        const item = chartData[index]

        // Different colors for different models
        let color = '#6366F1' // Default indigo

        if (item) {
            if (item.model.includes('Blaze')) {
                color = '#F59E0B' // Amber for Blaze
            } else if (item.model.includes('Deep Research')) {
                color = '#10B981' // Green for Deep Research
            } else if (item.model.includes('O3')) {
                color = '#3B82F6' // Blue for O3
            }
        }

        return (
            <g>
                {/* Glow effect */}
                {isHovered && (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="none"
                        stroke={color}
                        strokeOpacity={0.3}
                        strokeWidth={2}
                    />
                )}
                {/* Main dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5 : 3}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{
                        transition: 'r 0.2s ease-out',
                    }}
                />
            </g>
        )
    }

    // Custom tooltip content
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-white/95 dark:bg-gray-800/95 shadow-lg backdrop-blur-sm p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <p className="mb-1 font-medium text-gray-800 dark:text-gray-200 text-xs">{new Date(label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    <div className="space-y-1">
                        <p className="flex items-center text-xs">
                            <span className="bg-indigo-600 dark:bg-indigo-500 mr-2 rounded-full w-2 h-2"></span>
                            <span className="text-gray-600 dark:text-gray-400">Model:</span>
                            <span className="ml-1 font-medium text-gray-800 dark:text-gray-200">{item.model}</span>
                        </p>
                        <p className="flex items-center text-xs">
                            <span className="bg-green-600 dark:bg-green-500 mr-2 rounded-full w-2 h-2"></span>
                            <span className="text-gray-600 dark:text-gray-400">Score:</span>
                            <span className="ml-1 font-medium text-gray-800 dark:text-gray-200">{item.score.toFixed(1)}%</span>
                        </p>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <ChartContainer className="h-120 md:h-96 aspect-auto" config={aiScoreChartConfig}>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                onMouseMove={(e) => {
                    if (e.activeTooltipIndex !== undefined) {
                        setHoverIndex(e.activeTooltipIndex);
                    }
                }}
                onMouseLeave={() => setHoverIndex(null)}
            >
                <defs>
                    {/* Gradient for Score */}
                    <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="lineScore" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>

                    {/* Dark mode gradients */}
                    <linearGradient id="fillScoreDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="lineScoreDark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>

                    {/* Glow Effect */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Ultra-modern grid */}
                <CartesianGrid
                    vertical={false}
                    horizontal={true}
                    stroke="rgba(203, 213, 225, 0.3)"
                    strokeDasharray="3 6"
                />

                {/* Custom Tooltip */}
                <ChartTooltip
                    content={<CustomTooltip />}
                    cursor={{
                        stroke: '#E2E8F0',
                        strokeWidth: 1,
                        strokeDasharray: '4 4'
                    }}
                />

                {/* Area for Score */}
                <Area
                    type="monotone"
                    dataKey="y"
                    stroke="url(#lineScore)"
                    strokeWidth={3}
                    fill="url(#fillScore)"
                    dot={(props) => <CustomDot {...props} />}
                    activeDot={(props) => <CustomDot {...props} />}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    </ChartContainer>
    )
}