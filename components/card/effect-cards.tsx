// components/EffectCards.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CornerDownLeft, Cpu, BrainCircuit, Activity } from 'lucide-react'; // Added more icons

// --- Base Card Structure ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  cardRef?: React.RefObject<HTMLDivElement>;
  isHovered: boolean; // Pass hover state down
  style?: React.CSSProperties; // Add style prop to support custom styling
}

const BaseCard: React.FC<CardProps> = ({
  children,
  className = '',
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  cardRef,
  isHovered,
  style,
}) => {
  return (
    <div
      ref={cardRef}
      className={`relative flex flex-col items-start bg-gray-50 dark:bg-gray-950/80 backdrop-blur-sm mx-auto p-6 border border-black/10 dark:border-white/10 max-w-sm h-[30rem] overflow-hidden rounded-xl shadow-lg dark:shadow-black/20 transition-all duration-300 ease-in-out ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{
         // Add subtle perspective for potential 3D effects within children
         perspective: '1000px',
         ...style, // Merge custom styles passed from parent
      }}
    >
      {/* Corner Icons - Subtle glow/scale effect */}
      {[
        '-top-2 -left-2',
        '-bottom-2 -left-2 rotate-90',
        '-top-2 -right-2 -rotate-90',
        '-bottom-2 -right-2 rotate-180',
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-5 h-5 transition-all duration-300 ease-in-out flex items-center justify-center text-gray-400 dark:text-gray-600 ${
            isHovered ? 'scale-150 text-cyan-500 dark:text-cyan-400 opacity-100' : 'opacity-50'
          }`}
          style={{ transformOrigin: 'center center' }} // Ensure scaling is centered
        >
           <CornerDownLeft className="w-3 h-3" strokeWidth={1.5} />
        </div>
      ))}
      {children}
    </div>
  );
};


// --- Card 1: Laptop Particle Flow ---

interface FlowParticleProps {
  id: number;
  isHovered: boolean;
}

const FlowParticle: React.FC<FlowParticleProps> = ({ id, isHovered }) => {
  const duration = Math.random() * 1.5 + 1.0; // 1.0s to 2.5s
  const delay = Math.random() * 1.0; // 0s to 1.0s delay

  // Reset animation by changing key when hover state changes *from* hovered *to* not hovered
  // Or simply rely on the animation getting cut off when opacity goes to 0
  const animationState = isHovered ? 'running' : 'paused';

  return (
    <div
      key={id} // Key helps React reset if needed, though CSS handles start/stop
      className="top-1/2 left-full absolute bg-cyan-500 opacity-0 rounded-full w-1 h-0.5"
      style={{
        transform: `translateY(${Math.random() * 60 - 30}px)`, // Random vertical start within a range
        animation: isHovered
          ? `particleFlow ${duration}s linear ${delay}s infinite`
          : 'none', // Apply animation only when hovered
        // animationPlayState: animationState, // Control play state
      }}
    />
  );
};

const Card1: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group" // Add group for group-hover utilities if needed elsewhere
      // Apply tilt effect directly here if needed, or keep it on the inner element
       style={{
         transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', // Smoother transition
         transform: isHovered ? `perspective(1000px) rotateY(5deg) rotateX(-2deg) scale(1.03)` : 'none',
       }}
    >
      {/* Content Area */}
      <div className="flex flex-col justify-between pt-8 w-full h-full">
        {/* Top Section: Laptop Graphic */}
        <div className="relative flex justify-center items-center mb-4 w-full h-48">
          {/* Laptop Base */}
          <div className={`absolute bottom-0 w-60 h-2 bg-gray-300 dark:bg-gray-700 rounded-b-md transition-transform duration-300 ease-out ${isHovered ? 'translate-y-1' : ''}`} />
          {/* Laptop Screen Area */}
          <div
            className={`relative w-52 h-36 border border-black/20 dark:border-white/20 rounded-t-md bg-gray-900 dark:bg-black overflow-hidden transition-all duration-300 ease-out ${isHovered ? 'scale-[1.03]' : ''}`}
            style={{
              transformStyle: 'preserve-3d',
              // Subtle 3D tilt for the screen itself on hover
              transform: isHovered ? 'perspective(800px) rotateY(8deg)' : 'none',
            }}
          >
            {/* Inner Screen Glow */}
            <div className={`absolute inset-1 bg-black dark:bg-gray-950 rounded transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
                {/* Particle Container */}
                <div className="absolute inset-0 overflow-hidden">
                 {/* Generate particles - only render/animate when hovered */}
                  {isHovered && Array.from({ length: 25 }).map((_, i) => (
                    <FlowParticle key={i} id={i} isHovered={isHovered} />
                  ))}
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div>
           <Cpu className="mb-3 w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          <h2 className="mb-1 font-medium text-black dark:text-white text-lg">
            Blaze Deep Research
          </h2>
           <p className="mb-4 font-light text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
             Supercharge your app with advanced agentic capabilities and unparalleled insights.
           </p>
          <p className="inline-block bg-cyan-500/10 px-3 py-1 border dark:border-white/10 border-black/10 rounded-full font-light text-cyan-700 dark:text-cyan-300 text-xs">
            Advanced Agentic Engine
          </p>
        </div>
      </div>
    </BaseCard>
  );
};


// --- Card 2: Ripple Effect ---

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const Card2: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For throttling

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    // Basic throttle: Don't add if a timeout is already pending
    if (rippleTimeoutRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = { id: Date.now() + Math.random(), x, y }; // More unique ID
    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation (adjust timing based on CSS)
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 800); // Match CSS animation duration

    // Set throttle timeout
    rippleTimeoutRef.current = setTimeout(() => {
      rippleTimeoutRef.current = null;
    }, 50); // Throttle interval (e.g., 50ms)
  };

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) {
        clearTimeout(rippleTimeoutRef.current);
      }
    };
  }, []);

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        // Optional: Clear remaining ripples on mouse leave
        // setRipples([]);
      }}
      onMouseMove={isHovered ? addRipple : undefined}
       className="bg-gradient-to-br from-sky-50 dark:from-sky-950 to-cyan-100 dark:to-cyan-950/70" // Subtle gradient bg
       style={{
         transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', // Smoother transition
         transform: isHovered ? `scale(1.03)` : 'none', // Simple scale for this one
       }}
    >
       {/* Ripple Container */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="absolute bg-cyan-500/20 dark:bg-cyan-400/20 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: '1px', // Start small
              height: '1px',
              transform: 'translate(-50%, -50%)', // Center on cursor
              animation: 'ripple 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards' // Use 'forwards' to hold end state if needed
            }}
          />
        ))}
      </div>

      {/* Content Area (ensure it's above ripples) */}
       <div className="z-10 relative flex flex-col justify-between pt-8 w-full h-full">
         {/* Top Section: Abstract Graphic / Icon */}
         <div className="flex justify-center items-center mb-4 w-full h-48">
           <div className={`relative w-40 h-40 rounded-full border border-cyan-500/20 flex items-center justify-center transition-all duration-500 ease-out ${isHovered ? 'scale-110 border-cyan-500/40' : 'scale-100'}`}>
             <Activity className={`w-16 h-16 text-cyan-600 dark:text-cyan-400 transition-all duration-500 ${isHovered ? 'opacity-100 scale-105' : 'opacity-70'}`} strokeWidth={1}/>
             {/* Optional: Add subtle inner/outer rings */}
              <div className={`absolute inset-4 rounded-full border border-cyan-500/10 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}/>
           </div>
         </div>

         {/* Bottom Section: Text Content */}
         <div>
           <Activity className="mb-3 w-6 h-6 text-cyan-600 dark:text-cyan-400" />
           <h2 className="mb-1 font-medium text-black dark:text-white text-lg">
             Neural Mapping
           </h2>
           <p className="mb-4 font-light text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
             Interactive network visualization with real-time pattern detection. Move cursor to observe signal propagation.
           </p>
           <p className="inline-block bg-cyan-500/10 px-3 py-1 border dark:border-white/10 border-black/10 rounded-full font-light text-cyan-700 dark:text-cyan-300 text-xs">
             Real-time Pattern Detection
           </p>
         </div>
       </div>
    </BaseCard>
  );
};


// --- Card 3: AI Genetic/Neuron Effect ---

const Card3: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const centerPos = useRef({ x: 0, y: 0 }); // Store center coordinates

  useEffect(() => {
    // Calculate center on mount or resize (basic example)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      centerPos.current = { x: rect.width / 2, y: rect.height / 2 };
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  // Calculate displacement from center for effects
  const displacementX = mousePos.x - centerPos.current.x;
  const displacementY = mousePos.y - centerPos.current.y;
  const maxDisplacement = Math.sqrt(centerPos.current.x**2 + centerPos.current.y**2); // Approx diagonal length
  const intensity = isHovered ? Math.min(1, Math.sqrt(displacementX**2 + displacementY**2) / (maxDisplacement * 0.8)) : 0; // Normalized intensity (0 to 1), ramp up faster

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => {
          setIsHovered(true);
           // Update center in case of layout shifts before hover
           if (cardRef.current) {
              const rect = cardRef.current.getBoundingClientRect();
              centerPos.current = { x: rect.width / 2, y: rect.height / 2 };
           }
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className="bg-gradient-to-br from-purple-50 dark:from-gray-950 via-indigo-50 dark:via-indigo-950/40 to-blue-100 dark:to-blue-950/60"
       style={{
         transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease-out', // Smoother transition
         transform: isHovered ? `perspective(1200px) rotateY(${displacementX / 30}deg) rotateX(${-displacementY / 30}deg) scale(1.03)` : 'none',
         boxShadow: isHovered ? `0 10px 30px -10px rgba(100, 116, 239, ${intensity * 0.4})` : '0 5px 15px -5px rgba(0,0,0,0.1)', // Dynamic shadow based on intensity
       }}
    >
      {/* Content Area */}
       <div className="z-10 relative flex flex-col justify-between pt-8 w-full h-full">
         {/* Top Section: Neuron Graphic */}
         <div className="relative flex justify-center items-center mb-4 w-full h-48">
           {/* Neuron Core */}
           <div
              className="relative flex justify-center items-center bg-gradient-radial from-indigo-400 dark:from-indigo-500 via-indigo-500 dark:via-indigo-600 to-purple-600 dark:to-purple-700 rounded-full w-24 h-24 transition-all duration-300 ease-out"
              style={{
                 transform: `scale(${1 + intensity * 0.1})`, // Pulse size with intensity
                 boxShadow: `0 0 ${15 + intensity * 25}px 0px rgba(129, 140, 248, ${0.3 + intensity * 0.5})`, // Glow effect
              }}
           >
              <BrainCircuit className="w-10 h-10 text-white/80" strokeWidth={1.5}/>
           </div>

            {/* Connecting Synapses/Lines - Example */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) + (intensity * 30); // Rotate slightly based on intensity
              const length = 60 + (i % 2) * 15 + intensity * 10; // Vary length, expand slightly
              const opacity = 0.3 + intensity * 0.7; // Fade in with intensity

              return (
                  <div
                    key={i}
                    className="absolute bg-transparent w-px h-px origin-center" // Start from center
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `rotate(${angle}deg) translateX(${length / 2}px)`, // Position midpoint
                      width: `${length}px`, // Set length
                      height: `2px`, // Thickness
                      borderRadius: '1px',
                      background: `linear-gradient(to right, transparent, rgba(165, 180, 252, ${opacity * 0.8}), transparent)`, // Fading line
                      transition: 'all 0.3s ease-out',
                      transformOrigin: 'left center', // Rotate from the center origin
                    }}
                 >
                    {/* Optional endpoint dot */}
                    <div className="top-1/2 right-0 absolute bg-indigo-300 dark:bg-indigo-400 rounded-full w-1.5 h-1.5 -translate-y-1/2" style={{ opacity: opacity }}></div>
                 </div>
              );
            })}
         </div>

         {/* Bottom Section: Text Content */}
         <div>
           <BrainCircuit className="mb-3 w-6 h-6 text-indigo-600 dark:text-indigo-400" />
           <h2 className="mb-1 font-medium text-black dark:text-white text-lg">
             Blaze Genetic AI
           </h2>
           <p className="mb-4 font-light text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
             Advanced genetic deep research engine with adaptive, self-organizing neural pathways.
           </p>
           <p className="inline-block bg-indigo-500/10 px-3 py-1 border dark:border-white/10 border-black/10 rounded-full font-light text-indigo-700 dark:text-indigo-300 text-xs">
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
    <div className="bg-white dark:bg-black py-12 min-h-screen"> {/* Ensure parent has bg */}
        <div className="gap-8 grid md:grid-cols-3 mx-auto p-8 max-w-7xl">
          <Card1 />
          <Card2 />
          <Card3 />
        </div>
    </div>
  );
};

export default EffectCards;