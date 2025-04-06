"use client";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import Container from "@/components/Contanier";
import { TextEffect } from "@/components/ui/text-effect";

const Hero = () => {
    const [glowIntensity, setGlowIntensity] = useState(0);
    
    useEffect(() => {
        // Start transition after a small delay
        const startDelay = setTimeout(() => {
            // Use requestAnimationFrame for smoother animation
            let startTime: number;
            const duration = 500; // 2 seconds for extremely smooth transition
            
            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Use easeInOutCubic for extra smoothness
                const easeInOutCubic = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                setGlowIntensity(easeInOutCubic);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }, 800);
        
        return () => clearTimeout(startDelay);
    }, []);

    return (
        <div className="relative flex flex-col justify-center items-center py-20 w-full">
            {/* Initial blue glow that shows immediately with opacity based on transition */}
            <div 
                className="lg:hidden top-0 left-1/2 -z-10 absolute bg-blue-500 rounded-full size-40 transition-all -translate-x-1/2 duration-1000 ease-in-out"
                style={{ 
                    opacity: 0.7 - (glowIntensity * 0.3),
                    filter: `blur(${10 + (glowIntensity * 5)}rem)` 
                }}
            />
            
            {/* Primary intense glow with dynamic opacity */}
            <div 
                className="lg:hidden top-0 left-1/2 -z-10 absolute bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 rounded-full size-64 transition-all -translate-x-1/2 duration-1000 ease-in-out"
                style={{ 
                    opacity: glowIntensity * 0.85,
                    filter: `blur(${5 + (glowIntensity * 2)}rem)`,
                    boxShadow: `0 0 ${50 + (glowIntensity * 30)}px ${25 + (glowIntensity * 15)}px rgba(59,130,246,${0.4 + (glowIntensity * 0.25)})` 
                }}
            />
            
            {/* Secondary intense glow with dynamic opacity */}
            <div 
                className="lg:hidden top-10 right-1/3 -z-10 absolute bg-blue-400 rounded-full size-32 transition-all duration-1000 ease-in-out"
                style={{ 
                    opacity: glowIntensity * 0.7,
                    filter: `blur(${3 + (glowIntensity * 1.5)}rem)`,
                    boxShadow: `0 0 ${30 + (glowIntensity * 15)}px ${15 + (glowIntensity * 7)}px rgba(96,165,250,${0.3 + (glowIntensity * 0.25)})` 
                }}
            />

            <div className="relative flex flex-col justify-center items-center gap-y-8">
                <div className="flex flex-col justify-center items-center gap-y-4 text-center">
                    <Container className="hidden lg:block relative overflow-hidden">
                        <button className="group relative grid shadow-[0_1000px_0_0_hsl(0_0%_15%)_inset] mx-auto px-2 py-1 rounded-full overflow-hidden transition-colors duration-200">
                            <span>
                                <span className="absolute before:absolute inset-0 before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] rounded-full w-[100%] before:w-[200%] h-[100%] before:aspect-square overflow-hidden before:content-[''] before:rotate-[-90deg] animate-flip before:animate-rotate spark mask-gradient [mask:linear-gradient(white,_transparent_50%)] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
                            </span>
                            <span className="absolute inset-[1px] bg-background group-hover:bg-neutral-800 rounded-full transition-colors duration-200 backdrop" />
                            <span className="z-10 flex items-center py-0.5 text-gray-800 hover:text-neutral-100 dark:text-gray-50 text-sm">
                                <span className="flex justify-center items-center bg-gradient-to-r from-sky-400 to-blue-600 mr-2 px-2 py-[0.5px] rounded-full h-[18px] font-medium text-[9px] text-white tracking-wide">
                                    NEW
                                </span>
                                Explore the 2024 recap
                            </span>
                        </button>
                    </Container>
                    <Container delay={0.15}>
                        <TextEffect
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            as="h1"
                            className="mt-8 lg:mt-16 xl:text-[5.25rem] text-6xl md:text-7xl text-balance">
                            Modern Solutions for Customer Engagement
                        </TextEffect>
                        <TextEffect
                            per="line"
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            delay={0.5}
                            as="p"
                            className="mx-auto mt-8 max-w-2xl text-lg text-balance">
                            Highly customizable components for building modern websites and applications that look and feel the way you mean it.
                        </TextEffect>
                    </Container>

                    <Container delay={0.25} className="z-20">
                        <div className="flex justify-center items-center gap-x-4 mt-6">
                            <Link href="#" className="group flex items-center gap-2">
                                <Button size="lg">
                                    Start Free Trial
                                    <ArrowRightIcon className="size-4 transition-all group-hover:translate-x-1 duration-300" />
                                </Button>
                            </Link>
                        </div>
                    </Container>
                    <Container delay={0.3} className="relative">
                        <div className="relative backdrop-blur-lg mx-auto mt-10 p-2 border border-border rounded-xl lg:rounded-[32px] max-w-6xl">
                            {/* Dashboard glow with dynamic transition */}
                            <div 
                                className="top-1/8 left-1/2 -z-10 absolute inset-0 bg-blue-500 w-1/2 h-1/4 transition-all -translate-x-1/2 -translate-y-1/2 duration-1000 ease-in-out"
                                style={{ 
                                    opacity: 0.8 - (glowIntensity * 0.3),
                                    filter: `blur(${8 + (glowIntensity * 3)}rem)` 
                                }}
                            />
                            
                            {/* Primary dashboard intense glow with dynamic opacity */}
                            <div 
                                className="top-1/8 left-1/2 -z-10 absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-400 w-3/4 h-1/2 transition-all -translate-x-1/2 -translate-y-1/2 duration-1000 ease-in-out"
                                style={{ 
                                    opacity: glowIntensity * 0.9,
                                    filter: `blur(${5 + (glowIntensity * 2)}rem)`,
                                    boxShadow: `0 0 ${100 + (glowIntensity * 40)}px ${50 + (glowIntensity * 20)}px rgba(37,99,235,${0.4 + (glowIntensity * 0.2)})` 
                                }}
                            />
                            
                            {/* Secondary dashboard glow with dynamic opacity */}
                            <div 
                                className="hidden lg:block right-1/4 bottom-1/4 -z-20 absolute bg-blue-500 rounded-full w-1/3 h-1/3 transition-all duration-1000 ease-in-out"
                                style={{ 
                                    opacity: glowIntensity * 0.75,
                                    filter: `blur(${6 + (glowIntensity * 2)}rem)`,
                                    boxShadow: `0 0 ${70 + (glowIntensity * 25)}px ${35 + (glowIntensity * 10)}px rgba(59,130,246,${0.5 + (glowIntensity * 0.2)})` 
                                }}
                            />

                            <div className="bg-background border border-border rounded-lg lg:rounded-[22px]">
                                <Image
                                    src="/images/dashboard.png"
                                    alt="dashboard"
                                    width={1920}
                                    height={1080}
                                    className="rounded-lg lg:rounded-[20px]"
                                />
                            </div>
                        </div>
                        <div className="bottom-0 absolute inset-x-0 bg-gradient-to-t from-background to-transparent w-full h-1/2"></div>
                    </Container>
                </div>
            </div>
        </div>
    )
};

export default Hero;