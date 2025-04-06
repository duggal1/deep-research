// components/EffectCards.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CornerDownLeft, Cpu, BrainCircuit, Activity } from 'lucide-react';

// --- Base Card Structure ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  cardRef?: React.RefObject<HTMLDivElement>;
  isHovered: boolean;
}

const BaseCard: React.FC<CardProps> = ({
  children,
  className = '',
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  cardRef,
  isHovered,
}) => {
  return (
    <div
      ref={cardRef}
      className={`relative flex flex-col items-start bg-white dark:bg-black mx-auto p-6 border border-neutral-200 dark:border-neutral-800 max-w-sm h-[30rem] overflow-hidden rounded-lg shadow-subtle dark:shadow-subtle-dark transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{
         perspective: '1200px', // Enhance perspective for 3D effects
      }}
    >
      {/* Subtle Corner Accents */}
      {[
        'top-1 left-1',
        'bottom-1 left-1 rotate-90',
        'top-1 right-1 -rotate-90',
        'bottom-1 right-1 rotate-180',
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-4 h-4 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center text-neutral-300 dark:text-neutral-700 ${
            isHovered ? 'scale-125 opacity-100 text-cyan-500 dark:text-cyan-400' : 'opacity-50'
          }`}
          style={{ transformOrigin: 'center center' }}
        >
           <CornerDownLeft className="w-2.5 h-2.5" strokeWidth={1.5} />
        </div>
      ))}
      <div className="z-10 relative flex flex-col w-full h-full"> {/* Ensure content is above corners */}
         {children}
      </div>
    </div>
  );
};


// --- Card 1: Laptop Particle Ingress/Egress ---

interface FlowParticleProps {
  id: number;
  isHovered: boolean;
  laptopWidth: number; // Pass laptop width for animation calculations
}

const FlowParticle: React.FC<FlowParticleProps> = ({ id, isHovered, laptopWidth }) => {
  const duration = Math.random() * 1.8 + 1.2; // 1.2s to 3.0s
  const delay = Math.random() * 1.5; // 0s to 1.5s delay
  const verticalOffset = Math.random() * 50 - 25; // Random vertical start within a range (-25px to +25px)

  // Dynamically set CSS variables for the keyframe animation
  const style: React.CSSProperties = {
    '--particle-y-offset': `${verticalOffset}px`,
    '--laptop-width': `${laptopWidth}px`,
     animation: isHovered
       ? `particleFlowInOut ${duration}s linear ${delay}s infinite`
       : 'none',
  } as React.CSSProperties; // Type assertion needed for CSS variables


  return (
    <div
      key={id}
      className="top-1/2 left-0 absolute opacity-0 rounded-full w-1 h-1 particle" // Start left, base styles
      style={style}
    />
  );
};

const Card1: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLDivElement>(null);
  const [laptopWidth, setLaptopWidth] = useState(208); // Default width (w-52 = 13rem = 208px)

  useEffect(() => {
    // Update laptop width if needed (e.g., on resize)
    if (laptopRef.current) {
      setLaptopWidth(laptopRef.current.offsetWidth);
    }
    // Could add resize listener here if layout is dynamic
  }, []);

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
       style={{
         transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth standard easing
         transform: isHovered ? `perspective(1200px) rotateY(6deg) rotateX(-3deg) scale(1.04)` : 'none',
       }}
    >
      {/* Content Area */}
      <div className="flex flex-col justify-between pt-10 w-full h-full"> {/* Increased top padding */}
        {/* Top Section: Laptop Graphic */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48">
          {/* Laptop Base - Simplified */}
          <div className={`absolute bottom-1 w-60 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-b-sm transition-transform duration-300 ease-out ${isHovered ? 'translate-y-0.5' : ''}`} />
          {/* Laptop Screen Area - More pronounced 3D tilt */}
          <div
            ref={laptopRef}
            className={`relative w-52 h-36 border border-neutral-300 dark:border-neutral-700 rounded-t-md bg-black overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-inner-light dark:shadow-inner-dark ${isHovered ? 'scale-[1.03]' : ''}`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isHovered
                ? 'perspective(1000px) rotateY(12deg) rotateX(2deg)' // Increased tilt
                : 'perspective(1000px) rotateY(0deg) rotateX(0deg)', // Ensure perspective is always there for smooth transition
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Inner Screen Surface (where particles appear) */}
            <div className={`absolute inset-px bg-black rounded-sm`}> {/* Inset slightly */}
                {/* Particle Container */}
                <div className="absolute inset-0 overflow-hidden">
                  {isHovered && Array.from({ length: 30 }).map((_, i) => ( // More particles
                    <FlowParticle key={i} id={i} isHovered={isHovered} laptopWidth={laptopWidth} />
                  ))}
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div className="px-2"> {/* Add slight horizontal padding */}
           <Cpu className="mb-3 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base"> {/* Slightly bolder/larger title */}
            Blaze Deep Research
          </h2>
           <p className="mb-5 font-normal text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed"> {/* Standard font weight */}
             Supercharge your app with advanced agentic capabilities and unparalleled insights.
           </p>
          <p className="inline-block bg-cyan-400/10 dark:bg-cyan-400/10 px-3 py-1 border border-neutral-200 dark:border-neutral-700 rounded-full font-normal text-cyan-700 dark:text-cyan-300 text-xs">
            Advanced Agentic Engine
          </p>
        </div>
      </div>
    </BaseCard>
  );
};


// --- Card 2: Ripple Effect --- Refined Sleekness

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number; // Add size for variation
}

const Card2: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastRippleTime = useRef(0); // For throttling

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastRippleTime.current < 40) { // Throttle: 40ms interval
        return;
    }
    lastRippleTime.current = now;

    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.random() * 60 + 40; // Random size between 40 and 100

    const newRipple: Ripple = { id: now + Math.random(), x, y, size };
    setRipples(prev => [...prev.slice(-15), newRipple]); // Keep max 15 ripples for performance

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 900); // Match CSS animation duration + buffer
  };

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={isHovered ? addRipple : undefined}
      className="group" // Use group for potential child hover styles
       style={{
         transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
         transform: isHovered ? `scale(1.04)` : 'scale(1)', // Subtle scale
         boxShadow: isHovered
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' // Slightly enhanced shadow on hover
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // Default subtle shadow (Tailwind md)
          // Dark mode shadow handled by BaseCard's dark:shadow-subtle-dark for consistency, can override here if needed
       }}
    >
       {/* Ripple Container */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"> {/* Match border radius */}
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            // Softer ripple color, increased border radius effect
            className="absolute bg-cyan-500/10 dark:bg-cyan-400/10 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              transform: 'translate(-50%, -50%) scale(0)', // Center on cursor, start small
              animation: 'rippleSleek 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' // Smoother easing
            }}
          />
        ))}
      </div>

      {/* Content Area (ensure it's above ripples) */}
       <div className="z-10 relative flex flex-col justify-between px-2 pt-10 w-full h-full">
         {/* Top Section: Minimalist Icon Focus */}
         <div className="flex justify-center items-center mb-6 w-full h-48">
           <div className={`relative flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isHovered ? 'scale-110' : 'scale-100'}`}>
             <Activity
                className={`w-14 h-14 text-cyan-500/80 dark:text-cyan-400/80 transition-colors duration-300`}
                strokeWidth={1.2} // Thinner stroke
             />
             {/* Subtle background glow on hover */}
             <div
                className={`absolute w-24 h-24 bg-cyan-500/5 dark:bg-cyan-400/5 rounded-full blur-lg transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
             />
           </div>
         </div>

         {/* Bottom Section: Text Content */}
         <div>
           <Activity className="mb-3 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
           <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base">
             Neural Mapping
           </h2>
           <p className="mb-5 font-normal text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
             Interactive network visualization with real-time pattern detection. Move cursor to observe signal propagation.
           </p>
           <p className="inline-block bg-cyan-400/10 dark:bg-cyan-400/10 px-3 py-1 border border-neutral-200 dark:border-neutral-700 rounded-full font-normal text-cyan-700 dark:text-cyan-300 text-xs">
             Real-time Pattern Detection
           </p>
         </div>
       </div>
    </BaseCard>
  );
};


// --- Card 3: AI Genetic/Neuron Effect --- Refined Sleekness

const Card3: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 0, y: 0 });

  // Calculate center only once or when needed
  useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      center.current = { x: rect.width / 2, y: rect.height / 2 };
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const displacementX = mousePos.x - center.current.x;
  const displacementY = mousePos.y - center.current.y;
  // Normalize intensity based on distance from center, clamp between 0 and 1
  const distance = Math.sqrt(displacementX ** 2 + displacementY ** 2);
  const maxDistance = Math.sqrt(center.current.x ** 2 + center.current.y ** 2);
  const intensity = isHovered ? Math.min(1, distance / (maxDistance * 0.8)) : 0; // Ramp up sensitivity

  // Calculate subtle tilt, making it less extreme
  const rotateX = isHovered ? (-displacementY / (center.current.y * 0.15)) * intensity : 0; // Adjust divisor for sensitivity
  const rotateY = isHovered ? (displacementX / (center.current.x * 0.15)) * intensity : 0;

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => {
          setIsHovered(true);
          // Recalculate center on enter in case of layout shifts
          if (cardRef.current) {
              const rect = cardRef.current.getBoundingClientRect();
              center.current = { x: rect.width / 2, y: rect.height / 2 };
          }
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className="group"
       style={{
         transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)', // Faster transform transition
         transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${1 + intensity * 0.04})`, // Apply dynamic tilt and scale
         boxShadow: isHovered
            ? `0 ${5 + intensity * 15}px ${15 + intensity * 30}px -10px rgba(100, 116, 239, ${intensity * 0.25})` // Dynamic shadow based on intensity
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // Default subtle shadow
       }}
    >
      {/* Content Area */}
       <div className="z-10 relative flex flex-col justify-between px-2 pt-10 w-full h-full">
         {/* Top Section: Neuron Graphic */}
         <div className="relative flex justify-center items-center mb-6 w-full h-48">
           {/* Neuron Core - Subtle Pulse & Glow */}
           <div
              className="relative flex justify-center items-center bg-gradient-radial from-indigo-500 dark:from-indigo-600 via-purple-500 dark:via-purple-600 to-blue-500 dark:to-blue-600 rounded-full w-20 h-20 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                 transform: `scale(${1 + intensity * 0.08})`, // Subtle core pulse
                 boxShadow: `0 0 ${5 + intensity * 20}px 0px rgba(129, 140, 248, ${0.1 + intensity * 0.3})`, // Softer, more contained glow
              }}
           >
              <BrainCircuit className="w-9 h-9 text-white/90" strokeWidth={1.2}/> {/* Slightly smaller/thinner icon */}
           </div>

            {/* Connecting Synapses/Lines - Thinner and Subtler */}
            {[...Array(7)].map((_, i) => { // 7 lines for asymmetry
              const angle = (i * (360 / 7)) + (intensity * 45); // Rotate dynamically
              const length = 55 + (i % 3) * 10 + intensity * 15; // Vary length, expand slightly
              const opacity = 0.1 + intensity * 0.6; // Fade in more subtly

              return (
                  <div
                    key={i}
                    className="absolute origin-center pointer-events-none" // Start from center
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotate(${angle}deg) `, // Rotate around center
                      width: `${length}px`, // Set length
                      height: `1px`, // Thinner line
                      transition: 'all 0.3s ease-out',
                    }}
                 >
                     {/* The visible line part, positioned to extend outwards */}
                     <div
                        className="top-1/2 left-0 absolute bg-gradient-to-r from-transparent via-indigo-300/80 dark:via-indigo-400/80 to-transparent w-full h-full"
                        style={{ opacity: opacity, transform: 'translateY(-50%)' }}
                     />
                    {/* Optional endpoint dot - very small */}
                    <div
                        className="top-1/2 right-0 absolute bg-indigo-300 dark:bg-indigo-400 rounded-full w-1 h-1 -translate-y-1/2"
                        style={{ opacity: opacity * 0.8 }} // Slightly less opaque dot
                    />
                 </div>
              );
            })}
         </div>

         {/* Bottom Section: Text Content */}
         <div>
           <BrainCircuit className="mb-3 w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5}/>
           <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base">
             Blaze Genetic AI
           </h2>
           <p className="mb-5 font-normal text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
             Advanced genetic deep research engine with adaptive, self-organizing neural pathways.
           </p>
           <p className="inline-block bg-indigo-400/10 dark:bg-indigo-400/10 px-3 py-1 border border-neutral-200 dark:border-neutral-700 rounded-full font-normal text-indigo-700 dark:text-indigo-300 text-xs">
             Genetic AI Core
           </p>
         </div>
       </div>
    </BaseCard>
  );
};


// --- Main Export ---

const EffectCards: React.FC = () => {
  return (
    // Ensure parent container allows scrolling if needed and has a base bg
    <div className="bg-neutral-100 dark:bg-neutral-900 py-16 min-h-screen">
        <div className="gap-10 grid md:grid-cols-3 mx-auto p-8 max-w-7xl"> {/* Increased gap */}
          <Card1 />
          <Card2 />
          <Card3 />
        </div>
    </div>
  );
};

export default EffectCards;

// Add necessary CSS keyframes and utilities in a global stylesheet