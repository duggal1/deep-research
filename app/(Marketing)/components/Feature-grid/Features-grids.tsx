"use client"
import {Hle} from '@/components/charts/hle';
import { MarkdownChat } from '@/components/Feature-section/markdown-chat';
import Container from '@/components/global/Contanier';
import { Globe } from '@/components/magicui/globe';
import InteractiveRipple from '@/components/ripple/ripple';
import { Globes } from '@/components/ui/modern-globe';
import { Activity, Globe as GlobeIcon, MessageSquare, Zap } from 'lucide-react'

import Image from 'next/image'


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
  
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards, fadeInUp 0.4s ease-out forwards;
      }
  
      .bg-gradient-radial {
        background-image: radial-gradient(var(--tw-gradient-stops));
      }
    `}</style>
)

export default function FeaturesGrid() {
    return (
        <Container delay={0.1}>
        <section className="bg-white dark:bg-gray-950 px-4 py-12 md:py-24 font-sans">
            <CustomAnimations />
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mx-auto max-w-6xl">
                {/* Card 1 - Top Left */}
                <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/80 shadow-md border border-gray-100 dark:border-gray-800 rounded-xl h-[700px] overflow-hidden transition-all duration-500">
                    <div className="z-10 relative p-4 sm:p-6">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <GlobeIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
                                Global Knowledge Network
                            </span>
                        </span>

                        <p className="my-6 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
                            Accessing worldwide information sources to deliver comprehensive and accurate research results.
                        </p>
                    <Globes/>
                        <div className="inline-flex items-center mt-4 font-medium text-indigo-600 dark:text-indigo-400 text-sm cursor-pointer">
                            <span>Learn more</span>
                            <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>

                    <div aria-hidden className="relative p-6">
                        <div className="z-10 relative flex items-center gap-2 bg-white dark:bg-gray-800 shadow-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg w-fit size-fit font-medium text-gray-700 dark:text-gray-200 text-xs">
                            <Image
                                src="/blaze.png"
                                alt="Logo"
                                width={16}
                                height={16}
                                priority
                                className="mr-2"
                            />
                            AI agent closed <span className='font-semibold text-green-600 dark:text-green-400'>$1.2M</span> deal in New York
                        </div>
                    </div>
                </div>

                {/* Card 2 - Top Right */}
                <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/50 shadow-sm border dark:border-gray-700 rounded-xl h-[700px] overflow-hidden transition-all duration-500">
                    <div className="z-10 relative p-4 sm:p-6">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <MessageSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
                                Deep Research Engine
                            </span>
                        </span>

                        <p className="mb-4 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
                            AI-powered research providing comprehensive analysis and synthesized insights on complex topics.
                        </p>

                        <div className="w-full">
                            <MarkdownChat/>
                        </div>
                    </div>
                </div>

                {/* Card 3 - Bottom Left */}
                <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/80 shadow-md border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-500">
                    <div className="z-10 relative p-4 sm:p-6">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <Zap className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
                                AI Performance Benchmark
                            </span>
                        </span>

                        <p className="my-6 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
                            Tracking the evolution of AI capabilities over time.
                            <span className="text-zinc-600 dark:text-zinc-400"> Blaze Deep Research leads with a score of 33% in the latest benchmark.</span>
                        </p>
                        <div>
                        <InteractiveRipple/>
                        </div>
                       
                    </div>
                </div>

                {/* Card 4 - Bottom Right */}
                <div className="group relative hover:bg-gray-50/80 dark:hover:bg-gray-900/80 shadow-md border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-500">
                    <div className="z-10 relative p-4 sm:p-6">
                        <span className="flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                            <Activity className="size-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="bg-clip-text bg-gradient-to-r from-indigo-600 dark:from-indigo-400 to-violet-500 dark:to-violet-400 text-transparent">
                                Enterprise Analytics
                            </span>
                        </span>

                        <p className="my-6 font-semibold text-gray-900 dark:text-white text-2xl leading-tight">
                            Transforming raw business data into actionable insights with real-time performance tracking.
                        </p>

                       
                        
                        <Hle/>
                 
                    </div>
                </div>
            </div>
        </section>
        </Container>
    );
}