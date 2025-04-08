"use client";
import { ArrowRightIcon, PlayIcon } from "lucide-react"; // Added PlayIcon
import Link from "next/link";
import { useState, useEffect, useRef } from "react"; // Added useRef

import { Button } from "@/components/ui/button";

import { TextEffect } from "@/components/ui/text-effect";
import Container from "@/components/Contanier";

// Assuming Container component exists and works as intended
// Assuming TextEffect component exists and works as intended
// Assuming Button component exists and works as intended

const Hero = () => {
    const [glowIntensity, setGlowIntensity] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false); // State for video playback
    const videoRef = useRef<HTMLVideoElement>(null); // Ref for video element

    useEffect(() => {
        // Glow animation effect
        const startDelay = setTimeout(() => {
            let startTime: number;
            const duration = 500;

            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);

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

    // Function to toggle video play/pause
    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                // Note: Standard controls will handle pause, but we can force it if needed
                // videoRef.current.pause();
                // setIsPlaying(false);
                // For simplicity, let browser controls handle pause once playing starts.
                // This function primarily handles the *initial* play.
            } else {
                videoRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.error("Video play failed:", error);
                    // Handle autoplay restrictions if necessary (e.g., show message)
                });
            }
        }
    };

    // Optional: Reset state if video pauses via controls
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handlePause = () => {
             // Only set isPlaying to false if it was truly paused by user/browser,
             // not just at the end of a loop cycle before restarting.
             // The 'loop' attribute handles restarting, so 'paused' event might fire briefly.
             // A small delay helps check if it's a real pause.
             setTimeout(() => {
                if (videoElement.paused && !videoElement.ended) {
                    // setIsPlaying(false); // Re-enable this if you want the overlay back on pause
                }
             }, 100); // Small delay
        };

        // const handlePlay = () => setIsPlaying(true); // Redundant due to handlePlayPause setting state

        // videoElement.addEventListener('play', handlePlay);
        videoElement.addEventListener('pause', handlePause);

        return () => {
            // videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
        };
    }, [isPlaying]); // Rerun effect if isPlaying changes


    return (
        <div className="relative flex flex-col justify-center items-center py-20 w-full overflow-hidden"> {/* Added overflow-hidden */}
            {/* Glow effects (kept as is, adjust colors/positions if needed) */}
            <div
                className="lg:hidden top-0 left-1/2 -z-10 absolute bg-blue-500 rounded-full size-40 transition-all -translate-x-1/2 duration-1000 ease-in-out"
                style={{
                    opacity: 0.7 - (glowIntensity * 0.3),
                    filter: `blur(${10 + (glowIntensity * 5)}rem)`
                }}
            />
            <div
                className="lg:hidden top-0 left-1/2 -z-10 absolute bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 rounded-full size-64 transition-all -translate-x-1/2 duration-1000 ease-in-out"
                style={{
                    opacity: glowIntensity * 0.85,
                    filter: `blur(${5 + (glowIntensity * 2)}rem)`,
                    boxShadow: `0 0 ${50 + (glowIntensity * 30)}px ${25 + (glowIntensity * 15)}px rgba(59,130,246,${0.4 + (glowIntensity * 0.25)})`
                }}
            />
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
                    {/* Optional: Keep or update the "NEW" banner */}
                    <Container className="hidden lg:block relative overflow-hidden">
                         <button className="group relative grid shadow-[0_1000px_0_0_hsl(0_0%_15%)_inset] mx-auto px-2 py-1 rounded-full overflow-hidden transition-colors duration-200">
                            <span>
                                <span className="absolute before:absolute inset-0 before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] rounded-full w-[100%] before:w-[200%] h-[100%] before:aspect-square overflow-hidden before:content-[''] before:rotate-[-90deg] animate-flip before:animate-rotate spark mask-gradient [mask:linear-gradient(white,_transparent_50%)] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
                            </span>
                            <span className="absolute inset-[1px] bg-background group-hover:bg-neutral-800 rounded-full transition-colors duration-200 backdrop" />
                            <span className="z-10 flex items-center py-0.5 text-gray-800 hover:text-neutral-100 dark:text-gray-50 text-sm">
                            <span className="flex justify-center items-center bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-md mr-2 px-2 py-[1px] rounded-full h-[20px] font-semibold text-[10px] text-white tracking-tight">
  BETA
</span>

                                Introducing the Blaze Research Engine
                            </span>
                        </button>
                    </Container>

                    {/* Updated Headline and Sub-headline */}
                    <Container delay={0.15}>
                        <TextEffect
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            as="h1"
                            className="mt-8 lg:mt-16 xl:text-[5.25rem] text-6xl md:text-7xl text-balance">
                           Blaze: AI Built for Exhaustive Research
                        </TextEffect>
                        <TextEffect
                            per="line"
                            preset="fade-in-blur"
                            speedSegment={0.3}
                            delay={0.5}
                            as="p"
                            className="mx-auto mt-8 max-w-2xl text-lg text-balance">
                           Launch AI agents to rip through mountains of data, stitch together buried details, and deliver unfiltered answers—faster and more thorough than anything else.
                        </TextEffect>
                    </Container>

                    <Container delay={0.25} className="z-20">
                        <div className="flex justify-center items-center gap-x-4 mt-6">
                            <Link href="#early-access" className="group flex items-center gap-2"> {/* Changed href */}
                                <Button size="lg" variant="default"> {/* Ensure variant is set */}
                                    Request Early Access ⚡️
                                    <ArrowRightIcon className="size-4 transition-all group-hover:translate-x-1 duration-300" />
                                </Button>
                            </Link>
                        </div>
                    </Container>

                    {/* Video Section */}
                    <Container delay={0.3} className="relative w-full max-w-6xl">
                        <div className="relative backdrop-blur-lg mx-auto mt-10 p-2 border border-border rounded-xl lg:rounded-[32px]">
                            {/* Dashboard Glow Effects (kept as is) */}
                             <div
                                className="top-1/8 left-1/2 -z-10 absolute inset-0 bg-blue-500 w-1/2 h-1/4 transition-all -translate-x-1/2 -translate-y-1/2 duration-1000 ease-in-out"
                                style={{
                                    opacity: 0.8 - (glowIntensity * 0.3),
                                    filter: `blur(${8 + (glowIntensity * 3)}rem)`
                                }}
                            />
                            <div
                                className="top-1/8 left-1/2 -z-10 absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-400 w-3/4 h-1/2 transition-all -translate-x-1/2 -translate-y-1/2 duration-1000 ease-in-out"
                                style={{
                                    opacity: glowIntensity * 0.9,
                                    filter: `blur(${5 + (glowIntensity * 2)}rem)`,
                                    boxShadow: `0 0 ${100 + (glowIntensity * 40)}px ${50 + (glowIntensity * 20)}px rgba(37,99,235,${0.4 + (glowIntensity * 0.2)})`
                                }}
                            />
                            <div
                                className="hidden lg:block right-1/4 bottom-1/4 -z-20 absolute bg-blue-500 rounded-full w-1/3 h-1/3 transition-all duration-1000 ease-in-out"
                                style={{
                                    opacity: glowIntensity * 0.75,
                                    filter: `blur(${6 + (glowIntensity * 2)}rem)`,
                                    boxShadow: `0 0 ${70 + (glowIntensity * 25)}px ${35 + (glowIntensity * 10)}px rgba(59,130,246,${0.5 + (glowIntensity * 0.2)})`
                                }}
                            />

                            {/* Video Player Container */}
                            <div className="relative bg-background border border-border rounded-lg lg:rounded-[22px] overflow-hidden"> {/* Added overflow-hidden */}
                                <video
                                    ref={videoRef}
                                    src="/videos/blaze-demo.mp4" // <<<<<==== IMPORTANT: Replace with your actual video path
                                    width={1920} // Set appropriate dimensions or use CSS
                                    height={1080}
                                    loop // Make video loop
                                    muted // Start muted for autoplay compatibility
                                    playsInline // Important for iOS
                                    preload="metadata" // Load essential video info
                                    className="display-block rounded-lg lg:rounded-[20px] w-full h-auto" // Ensure video scales
                                    controls={isPlaying} // Show controls ONLY when playing
                                    onEnded={() => {
                                        // The 'loop' attribute handles restarting.
                                        // If loop needs manual help (unlikely), you could add:
                                        // if (videoRef.current) videoRef.current.play();
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>

                                {/* Play Button Overlay - Shown only when video is NOT playing */}
                                {!isPlaying && (
                             <button
                             aria-label="Play Video"
                             onClick={handlePlayPause}
                             className="group z-10 absolute inset-0 flex justify-center items-center bg-black/40 backdrop-blur-sm w-full h-full transition-opacity duration-300 ease-in-out cursor-pointer"
                           >
                            <div className="absolute inset-0 flex justify-center items-center rounded-2xl scale-[0.95] group-hover:scale-100 transition-all duration-200 ease-out">
                              <div className="flex justify-center items-center bg-gradient-to-r from-blue-600/20 to-cyan-500/20 backdrop-blur-xl rounded-full size-72">
                                <div className="relative flex justify-center items-center bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] rounded-full size-32 scale-100 group-hover:scale-[1.1] transition-all duration-200 ease-out">
                                  <PlayIcon
                                    className="fill-white size-16 text-white scale-100 group-hover:scale-105 transition-transform duration-200 ease-out"
                                    style={{
                                      filter: "drop-shadow(0 8px 6px rgb(0 0 0 / 0.1))"
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                           </button>
                                )}
                            </div>
                        </div>
                        {/* Gradient Fade at Bottom */}
                        <div className="bottom-0 z-10 absolute inset-x-0 bg-gradient-to-t from-background to-transparent w-full h-1/2 pointer-events-none"></div>
                    </Container>
                </div>
            </div>
        </div>
    )
};

export default Hero;