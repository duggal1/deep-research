// /* eslint-disable react-hooks/exhaustive-deps */


// "use client"

// import { Logo } from '@/components/logo'
// import { Activity, Globe as GlobeIcon, MessageSquare, Zap } from 'lucide-react'
// import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
// import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
// import { useEffect, useRef, useState } from 'react'
// import Image from 'next/image'
// import { useReducedMotion } from 'framer-motion'
// import { Globe } from './globe'
// import { MarkdownChat } from './markdown-chat'

// const CustomAnimations = () => (
//     <style jsx global>{`
//       @keyframes fadeInUp {
//         from {
//           opacity: 0;
//           transform: translateY(10px);
//         }
//         to {
//           opacity: 1;
//           transform: translateY(0);
//         }
//       }
  
//       @keyframes fadeIn {
//         from {
//           opacity: 0;
//         }
//         to {
//           opacity: 1;
//         }
//       }
  
//       .animate-fadeIn {
//         animation: fadeIn 0.3s ease-out forwards, fadeInUp 0.4s ease-out forwards;
//       }
  
//       .bg-gradient-radial {
//         background-image: radial-gradient(var(--tw-gradient-stops));
//       }
//     `}</style>
//   )

// interface Point {
//   x: number
//   y: number
// }

// interface Connection {
//   start: Point
//   end: Point
//   progress: number
// }

// interface AnimatedCounterProps {
//   target: number
//   suffix?: string
//   label?: string
// }

// interface AiScoreDataItem {
//     date: string;
//     model: string;
//     score: number;
//     timestamp: number;
// }
// export default function FeaturesCloud() {
//     return (
//         <section className="bg-white dark:bg-gray-950 px-4 py-16 md:py-32 font-sans">
//             <CustomAnimations />
//             <div className="grid md:grid-cols-2 shadow-sm mx-auto border dark:border-gray-700 rounded-xl max-w-5xl overflow-hidden">
//                 <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/50 transition-all duration-500">
//                     <div className="z-10 relative p-6 sm:p-12">
//                         <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
//                             <GlobeIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
//                             <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
//                                 Autonomous Lead Generation
//                             </span>
//                         </span>

//                         <p className="mt-8 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
//                             AI agents that autonomously identify and qualify high-value prospects across global markets.
//                         </p>

//                         <div className="inline-flex items-center mt-4 font-medium text-indigo-600 dark:text-indigo-400 text-sm cursor-pointer">
//                             <span>Learn more</span>
//                             <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                             </svg>
//                         </div>
//                     </div>

//                     <div aria-hidden className="relative">
//                         <div className="z-10 absolute inset-0 m-auto size-fit">
//                             <div className="z-10 relative flex items-center gap-2 bg-white dark:bg-gray-800 shadow-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg w-fit size-fit font-medium text-gray-700 dark:text-gray-200 text-xs">
//                                 <Image
//                                     src="/icons/axion-logo.png"
//                                     alt="Logo"
//                                     width={16}
//                                     height={16}
//                                     priority
//                                     className="mr-2"
//                                 />
//                                 AI agent closed <span className='font-semibold text-green-600 dark:text-green-400'>$1.2M</span> deal in New York
//                             </div>
//                         </div>

//                         {/* Ensured container has defined height (already present) */}
//                         <div className="relative h-[240px] overflow-hidden">
//                             <div className="absolute inset-0 flex justify-center items-center">
//                                 <Globe />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 <div className="group relative bg-white hover:bg-gray-50/80 dark:bg-gray-950 dark:hover:bg-gray-900/50 p-6 sm:p-12 md:border-0 dark:border-gray-700 border-t md:border-l overflow-hidden transition-all duration-500">
//                     <div className="z-10 relative">
//                         <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
//                             <MessageSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
//                             <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
//                                 Deep Research Engine
//                             </span>
//                         </span>

//                         <p className="my-6 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
//                             AI-powered research providing comprehensive analysis and synthesized insights on complex topics.
//                         </p>

//                         <div className="inline-flex items-center mb-4 font-medium text-indigo-600 dark:text-indigo-400 text-sm cursor-pointer">
//                             <span>See example</span>
//                             <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                             </svg>
//                         </div>
//                     </div>
//                     <div aria-hidden className="flex flex-col gap-4">
//                         <MarkdownChat />
//                     </div>
//                 </div>
//                 <div className="col-span-full bg-gray-50/50 dark:bg-black/30 py-8 dark:border-gray-700 border-t">
//                     {/* <AnimatedMetric /> */}
//                 </div>
//                 {/* Added explicit height to parent div to ensure chart renders */}
//                 <div className="relative col-span-full dark:border-gray-700 border-t" style={{ height: '400px' }}>
//                     <div className="z-10 absolute px-6 md:px-12 pt-6 md:pt-12 pr-12 max-w-lg">
//                         <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
//                             <Zap className="size-4 text-indigo-600 dark:text-indigo-400" />
//                             <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
//                                 AI Performance Benchmark
//                             </span>
//                         </span>

//                         <p className="my-6 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
//                             Tracking the evolution of AI capabilities over time.
//                             <span className="text-zinc-600 dark:text-zinc-400"> Blaze Deep Research leads with a score of 33% in the latest benchmark.</span>
//                         </p>

//                         <div className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 text-sm cursor-pointer">
//                             <span>View benchmark details</span>
//                             <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                             </svg>
//                         </div>
//                     </div>
//                     <AnimatedAiScoreChart />
//                 </div>
//             </div>
//         </section>
//     );
// }

// const AnimatedCounter = ({ target, suffix = '', label = '' }: AnimatedCounterProps) => {
//     const [count, setCount] = useState<number>(0)
//     const countRef = useRef<number>(0)
//     const frameRef = useRef<number>(0)

//     useEffect(() => {
//         // Reset count when target changes
//         setCount(0)
//         countRef.current = 0

//         // Use requestAnimationFrame for smoother animation
//         const startTime = performance.now()
//         const duration = 2000 // 2 seconds

//         const animate = (currentTime: number) => {
//             // Calculate progress (0 to 1)
//             const elapsed = currentTime - startTime
//             const progress = Math.min(elapsed / duration, 1)

//             // Apply easing function for smoother animation
//             // Cubic easing out function: progress = 1 - Math.pow(1 - progress, 3)
//             const easedProgress = 1 - Math.pow(1 - progress, 3)

//             // Calculate current count value
//             const currentCount = easedProgress * target

//             // Only update state if value has changed significantly
//             if (Math.abs(currentCount - countRef.current) > 0.5) {
//                 countRef.current = currentCount
//                 setCount(Math.floor(currentCount))
//             }

//             // Continue animation if not complete
//             if (progress < 1) {
//                 frameRef.current = requestAnimationFrame(animate)
//             } else {
//                 // Ensure final value is exactly the target
//                 setCount(target)
//             }
//         }

//         // Start animation
//         frameRef.current = requestAnimationFrame(animate)

//         // Cleanup
//         return () => {
//             cancelAnimationFrame(frameRef.current)
//         }
//     }, [target])

//     return (
//         <div className="flex flex-col items-center">
//             <span className="flex items-baseline text-gray-900 dark:text-white">
//                 {count}{suffix}
//             </span>
//             {label && <span className="mt-2 text-zinc-600 dark:text-zinc-400 text-xl">{label}</span>}
//         </div>
//     )
// }

// const AnimatedMetric = () => {
//     const [count, setCount] = useState(0)
//     const targetValue = 33
//     const frameRef = useRef<number>(0)
//     const prefersReducedMotion = useReducedMotion()

//     // Throttle updates to improve performance
//     const throttleRef = useRef<number>(0)
//     const throttleTime = 50 // ms between updates

//     useEffect(() => {
//         // If reduced motion is preferred, just show the final value
//         if (prefersReducedMotion) {
//             setCount(targetValue)
//             return
//         }

//         let startTime: number | null = null
//         const duration = 3000 // 3 seconds for animation loop

//         const animate = (timestamp: number) => {
//             // Throttle updates
//             if (timestamp - throttleRef.current < throttleTime) {
//                 frameRef.current = requestAnimationFrame(animate)
//                 return
//             }

//             throttleRef.current = timestamp

//             if (!startTime) startTime = timestamp
//             const progress = ((timestamp - startTime) % duration) / duration // Loop progress

//             // Use cubic easing for smoother animation
//             const easedProgress = 1 - Math.pow(1 - Math.min(progress, 1), 3)
//             setCount(targetValue * easedProgress)
//             frameRef.current = requestAnimationFrame(animate)

//         }

//         // Small delay to ensure component is fully mounted
//         const timer = setTimeout(() => {
//             frameRef.current = requestAnimationFrame(animate)
//         }, 100)

//         return () => {
//             clearTimeout(timer)
//             cancelAnimationFrame(frameRef.current)
//         }
//     }, [prefersReducedMotion, targetValue])

//     return (
//         <div className="text-center">
//             <p className="font-semibold text-gray-900 dark:text-white text-4xl lg:text-7xl">{count.toFixed(1)}%</p>
//             <p className="mt-2 text-zinc-500 dark:text-zinc-400">Top AI Benchmark Score (Blaze)</p>
//         </div>
//     )
// }

// const aiScoreChartConfig = {
//     score: {
//         label: 'AI Score (%)',
//         color: '#8B5CF6',
//     },
// } satisfies ChartConfig;

// const rawAiScoreData = [
//     { date: '2024-01-24', model: 'Grok-2', score: 5 },
//     { date: '2024-04-24', model: 'ChatGPT-4 Omni', score: 5 },
//     { date: '2024-09-24', model: 'OpenAI O1', score: 10 },
//     { date: '2024-12-24', model: 'Gemini Thinking', score: 6 },
//     { date: '2025-02-25', model: 'DeepSeek', score: 8 },
//     { date: '2025-03-25', model: 'OpenAI O3 Mini', score: 9 },
//     { date: '2025-04-04', model: 'O3 Mini High', score: 11 },
//     { date: '2025-04-25', model: 'OpenAI Deep Research', score: 28 },
//     { date: '2025-04-25', model: 'Blaze Deep Research', score: 33 },
// ];

// const aiScoreData: AiScoreDataItem[] = rawAiScoreData.map(item => ({
//     ...item,
//     timestamp: new Date(item.date).getTime(),
// }));

// const smoothTransition = (
//     currentValue: number,
//     targetValue: number,
//     step: number = 0.1
// ): number => {
//     if (Math.abs(currentValue - targetValue) < 0.1) {
//         return targetValue
//     }
//     return currentValue + (targetValue - currentValue) * step
// }

// const AnimatedAiScoreChart = () => {
//     const [animatedData, setAnimatedData] = useState<AiScoreDataItem[]>(
//         aiScoreData.map(d => ({ ...d, score: 0 }))
//     );
//     const targetDataRef = useRef<AiScoreDataItem[]>(aiScoreData);
//     const frameRef = useRef<number>(0);
//     const prefersReducedMotion = useReducedMotion();

//     useEffect(() => {
//         if (prefersReducedMotion) {
//             setAnimatedData(aiScoreData);
//             return;
//         }

//         let startTime: number | null = null;
//         const duration = 2000;

//         const animate = (timestamp: number) => {
//             if (startTime === null) {
//                 startTime = timestamp;
//             }
//             const elapsed = timestamp - startTime;
//             const progress = Math.min(elapsed / duration, 1);

//             const easedProgress = 1 - Math.pow(1 - progress, 3);

//             setAnimatedData(() =>
//                 targetDataRef.current.map((targetItem) => {
//                     const animatedScore = targetItem.score * easedProgress;
//                     return {
//                         ...targetItem,
//                         score: animatedScore,
//                     };
//                 })
//             );

//             if (progress < 1) {
//                 frameRef.current = requestAnimationFrame(animate);
//             }
//         };

//         const timer = setTimeout(() => {
//             frameRef.current = requestAnimationFrame(animate);
//         }, 100);

//         return () => {
//             clearTimeout(timer);
//             cancelAnimationFrame(frameRef.current);
//         };
//     }, [prefersReducedMotion]);

//     const formatDateTick = (timestamp: number) => {
//         const date = new Date(timestamp);
//         return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
//     };

//     const CustomAiScoreTooltip = ({ active, payload, label }: any) => {
//         if (active && payload && payload.length) {
//             const dataPoint = payload[0].payload as AiScoreDataItem;
//             return (
//                 <div className="bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-sm p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
//                     <p className="mb-1 font-medium text-gray-700 dark:text-gray-300 text-xs">
//                         {dataPoint.model} ({new Date(dataPoint.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
//                     </p>
//                     <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">
//                         Score: {payload[0].value.toFixed(1)}%
//                     </p>
//                 </div>
//             );
//         }
//         return null;
//     };

//     const CustomAiScoreDot = (props: any) => {
//         const { cx, cy, stroke, payload } = props;
//         const isBlaze = payload.model === 'Blaze Deep Research';

//         return (
//             <g>
//                 {isBlaze && (
//                     <circle cx={cx} cy={cy} r={8} fill={stroke} fillOpacity={0.3} />
//                 )}
//                 <circle cx={cx} cy={cy} r={isBlaze ? 5 : 3} fill={stroke} stroke="#fff" strokeWidth={1} />
//             </g>
//         );
//     };

//     return (
//         <ChartContainer className="dark:bg-gray-950/30 rounded-b-xl h-96 aspect-auto" config={aiScoreChartConfig}>
//             <ResponsiveContainer width="100%" height="100%">
//                 <LineChart
//                     data={animatedData}
//                     margin={{ top: 30, right: 40, left: 0, bottom: 20 }}
//                 >
//                     <defs>
//                         <linearGradient id="lineAIScore" x1="0" y1="0" x2="1" y2="0">
//                             <stop offset="0%" stopColor="#A78BFA" />
//                             <stop offset="100%" stopColor="#7C3AED" />
//                         </linearGradient>
//                     </defs>

//                     <CartesianGrid
//                         vertical={false}
//                         horizontal={true}
//                         stroke="rgba(203, 213, 225, 0.2)"
//                         strokeDasharray="4 4"
//                     />
//                     <XAxis
//                         dataKey="timestamp"
//                         type="number"
//                         domain={['dataMin', 'dataMax']}
//                         tickFormatter={formatDateTick}
//                         stroke="rgba(156, 163, 175, 0.7)"
//                         tickLine={false}
//                         axisLine={false}
//                         padding={{ left: 20, right: 20 }}
//                     />
//                     <YAxis
//                         dataKey="score"
//                         domain={[0, 'dataMax + 5']}
//                         stroke="rgba(156, 163, 175, 0.7)"
//                         tickLine={false}
//                         axisLine={false}
//                         tickFormatter={(value) => `${value}%`}
//                     />
//                     <Tooltip
//                         content={<CustomAiScoreTooltip />}
//                         cursor={{
//                             stroke: 'rgba(167, 139, 250, 0.5)',
//                             strokeWidth: 1,
//                             strokeDasharray: '3 3'
//                         }}
//                     />
//                     <Line
//                         type="monotone"
//                         dataKey="score"
//                         stroke="url(#lineAIScore)"
//                         strokeWidth={3}
//                         dot={<CustomAiScoreDot />}
//                         activeDot={{ r: 6, strokeWidth: 1, fill: '#7C3AED' }}
//                         isAnimationActive={false}
//                     />
//                 </LineChart>
//             </ResponsiveContainer>
//         </ChartContainer>
//     );
// }