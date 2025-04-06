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
      className={`relative flex flex-col items-start bg-white dark:bg-black mx-auto p-6 border border-neutral-200 dark:border-neutral-800 max-w-sm h-[30rem] overflow-hidden rounded-lg shadow-subtle dark:shadow-subtle-dark transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{
         perspective: '1200px', // Enhance perspective for 3D effects
         ...style, // Merge custom styles passed from parent
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
  // SUPER FAST particles with minimal variation
  const duration = Math.random() * 0.6 + 0.6; // 0.6s to 1.2s (much faster)
  const delay = Math.random() * 0.8; // 0s to 0.8s delay (quicker start)
  const verticalOffset = Math.random() * 40 - 20; // Vertical range (-20px to +20px)

  // Vary particle sizes for more visual interest
  const size = Math.random() * 1.5 + 0.8; // 0.8px to 2.3px

  // Dynamically set CSS variables for the keyframe animation
  const style: React.CSSProperties = {
    '--particle-y-offset': `${verticalOffset}px`,
    '--laptop-width': `${laptopWidth}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Base color
    animation: isHovered
      ? `particleFlowInOut ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s infinite`
      : 'none',
  } as React.CSSProperties; // Type assertion needed for CSS variables

  return (
    <div
      key={id}
      className="top-1/2 right-0 absolute opacity-0 rounded-full particle" // Start right
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
    // Update laptop width if needed
    if (laptopRef.current) {
      setLaptopWidth(laptopRef.current.offsetWidth);
    }
  }, []);

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
      style={{
        transition: 'transform 0.4s ease-out',
        transform: isHovered ? 'scale(1.02)' : 'none',
      }}
    >
      {/* Content Area */}
      <div className="flex flex-col justify-between pt-10 w-full h-full"> {/* Increased top padding */}
        {/* Top Section: Laptop Graphic */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48">
          {/* Laptop Base with enhanced hover effect */}
          <div
            className={`absolute bottom-1 w-60 h-1.5 bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-700 rounded-b-sm transition-all duration-300 ease-out ${isHovered ? 'translate-y-1 scale-x-[1.02]' : ''}`}
            style={{
              boxShadow: isHovered ? '0 2px 8px -2px rgba(6, 182, 212, 0.2)' : 'none',
              transformOrigin: 'center top',
            }}
          />

          {/* Laptop Screen Area */}
          <div
            ref={laptopRef}
            className="relative bg-black border border-neutral-300 dark:border-neutral-700 rounded-t-md w-52 h-36 overflow-hidden"
            style={{
              transformStyle: 'preserve-3d',
              transform: isHovered
                ? 'perspective(800px) rotateY(15deg) rotateX(5deg) scale(1.05)'
                : 'perspective(800px) rotateY(0deg) rotateX(0deg)',
              transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: isHovered
                ? '0 10px 30px -10px rgba(0, 0, 0, 0.3), 0 0 15px -5px rgba(6, 182, 212, 0.4)'
                : 'none',
            }}
          >
            {/* Inner Screen Surface with glow effect */}
            <div className="absolute inset-0 bg-black">
              {/* Screen glow effect */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-500/10"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.4s ease-out',
                  filter: 'blur(4px)',
                }}
              />

              {/* Particle Container */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Generate MORE particles when hovered */}
                {isHovered && Array.from({ length: 30 }).map((_, i) => (
                  <FlowParticle key={i} id={i} isHovered={isHovered} laptopWidth={laptopWidth} />
                ))}
              </div>

              {/* Subtle screen reflection */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent"
                style={{
                  opacity: isHovered ? 0.3 : 0,
                  transition: 'opacity 0.4s ease-out',
                  height: '30%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div className="px-2"> {/* Add slight horizontal padding */}
          <Cpu className="mb-3 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base transition-transform group-hover:translate-x-0.5 duration-300 transform">
            Blaze Deep Research
          </h2>
          <p className="mb-5 font-normal text-neutral-600 dark:group-hover:text-neutral-300 dark:text-neutral-400 group-hover:text-neutral-700 text-sm leading-relaxed transition-opacity duration-300">
            Supercharge your app with advanced agentic capabilities and unparalleled insights.
          </p>
          <p className="inline-block bg-cyan-400/10 dark:bg-cyan-400/10 dark:group-hover:bg-cyan-400/15 group-hover:bg-cyan-400/15 px-3 py-1 border border-neutral-200 dark:border-neutral-700 dark:group-hover:border-cyan-800 group-hover:border-cyan-200 rounded-full font-normal text-cyan-700 dark:text-cyan-300 text-xs transition-all duration-300">
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
  size: number;
  color: string; // Add color variation
  speed: number; // Add speed variation
}

const Card2: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastRippleTime = useRef(0); // For throttling
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Add automatic ripples when hovered but not moving
  useEffect(() => {
    if (!isHovered || !cardRef.current) return;

    // Create automatic ripples at current mouse position
    const interval = setInterval(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Create ripple at last known mouse position
      const x = mousePos.x;
      const y = mousePos.y;

      // Only add auto-ripple if we have a valid position inside the card
      if (x > 0 && y > 0 && x < rect.width && y < rect.height) {
        addRipple(x, y, true); // true = auto-generated (smaller)
      }
    }, 800); // Every 800ms

    return () => clearInterval(interval);
  }, [isHovered, mousePos]);

  const addRipple = (x: number, y: number, isAuto = false) => {
    const now = Date.now();

    // More aggressive throttling for manual ripples, less for auto
    const throttleTime = isAuto ? 200 : 30;
    if (now - lastRippleTime.current < throttleTime) return;

    lastRippleTime.current = now;
    if (!cardRef.current) return;

    // Size variation - auto ripples are smaller
    const baseSize = isAuto ? 30 : 80;
    const sizeVariation = isAuto ? 10 : 40;
    const size = Math.random() * sizeVariation + baseSize;

    // Speed variation - auto ripples are slower
    const speed = isAuto ?
      0.8 + Math.random() * 0.4 : // 0.8-1.2s
      0.6 + Math.random() * 0.3;  // 0.6-0.9s

    // Color variation - subtle differences in cyan hue
    const hues = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490'];
    const color = hues[Math.floor(Math.random() * hues.length)];

    const newRipple: Ripple = {
      id: now + Math.random(),
      x,
      y,
      size,
      color,
      speed
    };

    setRipples(prev => [...prev.slice(-20), newRipple]); // Keep max 20 ripples

    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, speed * 1000 + 100); // Match animation duration + buffer
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update mouse position for auto-ripples
    setMousePos({ x, y });

    // Add manual ripple
    addRipple(x, y);
  };

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        // Clear all ripples when mouse leaves
        setTimeout(() => setRipples([]), 300);
      }}
      onMouseMove={isHovered ? handleMouseMove : undefined}
      className="group bg-gradient-to-br from-cyan-50/80 dark:from-cyan-950/30 via-white dark:via-black to-blue-50/80 dark:to-blue-950/30"
      style={{
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: isHovered ? `scale(1.05)` : 'scale(1)',
        boxShadow: isHovered
          ? '0 20px 40px -20px rgba(6, 182, 212, 0.15), 0 10px 20px -15px rgba(6, 182, 212, 0.1)'
          : '0 5px 10px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Ripple Container */}
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              transform: 'translate(-50%, -50%) scale(0)',
              borderRadius: '50%',
              border: `1px solid ${ripple.color}20`, // Very transparent border
              background: 'transparent', // No fill, just border and glow
              animation: `rippleSleek ${ripple.speed}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
            }}
          />
        ))}
      </div>

      {/* Content Area (ensure it's above ripples) */}
      <div className="z-10 relative flex flex-col justify-between px-2 pt-10 w-full h-full">
        {/* Top Section: Interactive Neural Network Visualization */}
        <div className="flex justify-center items-center mb-6 w-full h-48">
          <div
            className={`relative flex items-center justify-center transition-all duration-500 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
          >
            {/* Central node */}
            <div
              className={`relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600 transition-all duration-500 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
              style={{
                boxShadow: isHovered
                  ? '0 0 20px 0 rgba(6, 182, 212, 0.3), 0 0 8px 0 rgba(6, 182, 212, 0.5)'
                  : '0 0 10px 0 rgba(6, 182, 212, 0.2)'
              }}
            >
              <Activity
                className="w-8 h-8 text-white/90 transition-transform duration-500"
                strokeWidth={1.5}
                style={{
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                }}
              />
            </div>

            {/* Orbital rings */}
            {[28, 44, 60].map((size, i) => (
              <div
                key={i}
                className="absolute border border-cyan-300/20 dark:border-cyan-400/20 rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transform: isHovered ? `rotate(${i % 2 === 0 ? 45 : -45}deg) scale(1.1)` : 'rotate(0deg) scale(1)',
                  opacity: isHovered ? 0.8 : 0.4
                }}
              />
            ))}

            {/* Pulsing background glow */}
            <div
              className="absolute bg-cyan-400/5 dark:bg-cyan-400/10 blur-xl rounded-full w-32 h-32 transition-all duration-500"
              style={{
                transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                opacity: isHovered ? 1 : 0,
                animation: isHovered ? 'pulse 3s ease-in-out infinite alternate' : 'none'
              }}
            />
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div>
          <Activity className="mb-3 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base transition-transform group-hover:translate-x-0.5 duration-300 transform">
            Neural Mapping
          </h2>
          <p className="mb-5 font-normal text-neutral-600 dark:group-hover:text-neutral-300 dark:text-neutral-400 group-hover:text-neutral-700 text-sm leading-relaxed transition-opacity duration-300">
            Interactive network visualization with real-time pattern detection. Move cursor to observe signal propagation.
          </p>
          <p className="inline-block bg-cyan-400/10 dark:bg-cyan-400/10 dark:group-hover:bg-cyan-400/15 group-hover:bg-cyan-400/15 px-3 py-1 border border-neutral-200 dark:border-neutral-700 dark:group-hover:border-cyan-800 group-hover:border-cyan-200 rounded-full font-normal text-cyan-700 dark:text-cyan-300 text-xs transition-all duration-300">
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
  const [synapses, setSynapses] = useState<{ angle: number; length: number; pulse: number }[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize synapses and calculate center
  useEffect(() => {
    if (!isInitialized) {
      // Create random synapses
      const newSynapses = Array.from({ length: 8 }).map(() => ({
        angle: Math.random() * 360,
        length: 40 + Math.random() * 40, // 40-80px
        pulse: Math.random() * 3 + 1 // 1-4s pulse cycle
      }));
      setSynapses(newSynapses);
      setIsInitialized(true);
    }

    // Calculate center
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      center.current = { x: rect.width / 2, y: rect.height / 2 };
    }

    // Add resize handler
    const handleResize = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        center.current = { x: rect.width / 2, y: rect.height / 2 };
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInitialized]);

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Calculate displacement and intensity for effects
  const displacementX = mousePos.x - center.current.x;
  const displacementY = mousePos.y - center.current.y;
  const distance = Math.sqrt(displacementX ** 2 + displacementY ** 2);
  const maxDistance = Math.sqrt(center.current.x ** 2 + center.current.y ** 2);
  const intensity = isHovered ? Math.min(1, distance / (maxDistance * 0.7)) : 0; // More sensitive

  // Calculate tilt angles based on mouse position
  const rotateX = isHovered ? (-displacementY / (center.current.y * 0.1)) * intensity : 0; // More responsive
  const rotateY = isHovered ? (displacementX / (center.current.x * 0.1)) * intensity : 0;

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
      className="group bg-gradient-to-br from-indigo-50/90 dark:from-indigo-950/30 via-white dark:via-black to-purple-50/90 dark:to-purple-950/30"
      style={{
        transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${1 + intensity * 0.06})`, // More dramatic scale
        boxShadow: isHovered
          ? `0 ${10 + intensity * 20}px ${20 + intensity * 40}px -15px rgba(99, 102, 241, ${0.1 + intensity * 0.3})` // More dramatic shadow with indigo tint
          : '0 5px 10px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Content Area */}
      <div className="z-10 relative flex flex-col justify-between px-2 pt-10 w-full h-full">
        {/* Top Section: Advanced Neural Network Visualization */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48">
          {/* Neural Core - Pulsating with intensity */}
          <div
            className="relative flex justify-center items-center bg-gradient-radial from-indigo-400 dark:from-indigo-500 via-purple-500 dark:via-purple-600 to-blue-500 dark:to-blue-600 rounded-full w-20 h-20 transition-all duration-500 ease-out"
            style={{
              transform: `scale(${1 + intensity * 0.15})`, // More dramatic pulse
              boxShadow: `0 0 ${10 + intensity * 30}px 0px rgba(129, 140, 248, ${0.2 + intensity * 0.4})`, // Stronger glow
              animation: isHovered ? `pulse ${2 + intensity * 2}s ease-in-out infinite alternate` : 'none', // Dynamic pulse speed
            }}
          >
            <BrainCircuit
              className="w-10 h-10 text-white/90 transition-all duration-500"
              strokeWidth={1.2}
              style={{
                transform: `scale(${1 + intensity * 0.1}) rotate(${intensity * 15}deg)`, // Subtle rotation with intensity
                filter: `drop-shadow(0 0 ${2 + intensity * 3}px rgba(255, 255, 255, 0.8))`, // Icon glow
              }}
            />
          </div>

          {/* Dynamic Neural Synapses */}
          {synapses.map((synapse, i) => {
            // Calculate dynamic properties based on hover and intensity
            const angle = synapse.angle + (isHovered ? intensity * 30 * (i % 2 === 0 ? 1 : -1) : 0);
            const length = synapse.length + (isHovered ? intensity * 20 : 0);
            const pulseSpeed = synapse.pulse - (isHovered ? intensity * 1.5 : 0); // Faster when hovered
            const opacity = isHovered ? 0.2 + intensity * 0.7 : 0.1;
            const thickness = 1 + (isHovered ? intensity * 1 : 0); // Thicker with intensity

            return (
              <div
                key={i}
                className="absolute origin-center pointer-events-none" // Start from center
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`, // Rotate around center
                  width: `${length}px`, // Set length
                  height: `${thickness}px`, // Dynamic thickness
                  transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                {/* The visible line part with gradient */}
                <div
                  className="top-1/2 left-0 absolute bg-gradient-to-r from-transparent via-indigo-300/80 dark:via-indigo-400/80 to-transparent w-full h-full"
                  style={{
                    opacity: opacity,
                    transform: 'translateY(-50%)',
                    animation: isHovered ? `pulse ${pulseSpeed}s ease-in-out infinite alternate` : 'none',
                  }}
                />

                {/* Endpoint node with glow */}
                <div
                  className="top-1/2 right-0 absolute bg-indigo-300 dark:bg-indigo-400 rounded-full -translate-y-1/2"
                  style={{
                    width: `${2 + intensity * 2}px`,
                    height: `${2 + intensity * 2}px`,
                    opacity: opacity * 1.2,
                    boxShadow: isHovered ? `0 0 ${3 + intensity * 5}px rgba(129, 140, 248, ${0.3 + intensity * 0.5})` : 'none',
                  }}
                />
              </div>
            );
          })}

          {/* Background Neural Field - Subtle grid pattern */}
          <div
            className="absolute opacity-20 rounded-full w-full h-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, transparent 50%, rgba(129, 140, 248, 0.03) 100%),
                          linear-gradient(to right, transparent 95%, rgba(129, 140, 248, 0.05) 100%) 0 0 / 20px 20px,
                          linear-gradient(to bottom, transparent 95%, rgba(129, 140, 248, 0.05) 100%) 0 0 / 20px 20px`,
              transform: `scale(${isHovered ? 1.1 : 1}) rotate(${isHovered ? intensity * 10 : 0}deg)`,
              opacity: isHovered ? 0.3 : 0.1,
              transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </div>

        {/* Bottom Section: Text Content with Interactive Hover Effects */}
        <div>
          <BrainCircuit
            className="mb-3 w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-all duration-300"
            strokeWidth={1.5}
            style={{
              transform: isHovered ? 'translateX(3px)' : 'none',
            }}
          />
          <h2 className="mb-1.5 font-semibold text-black dark:text-white text-base transition-transform group-hover:translate-x-0.5 duration-300 transform">
            Blaze Genetic AI
          </h2>
          <p className="mb-5 font-normal text-neutral-600 dark:group-hover:text-neutral-300 dark:text-neutral-400 group-hover:text-neutral-700 text-sm leading-relaxed transition-opacity duration-300">
            Advanced genetic deep research engine with adaptive, self-organizing neural pathways.
          </p>
          <p className="inline-block bg-indigo-400/10 dark:bg-indigo-400/10 dark:group-hover:bg-indigo-500/15 group-hover:bg-indigo-500/15 px-3 py-1 border border-neutral-200 dark:border-neutral-700 dark:group-hover:border-indigo-800 group-hover:border-indigo-200 rounded-full font-normal text-indigo-700 dark:text-indigo-300 text-xs transition-all duration-300">
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
    // Elegant background with subtle pattern
    <div className="bg-gradient-to-br from-gray-50 dark:from-gray-950 via-white dark:via-black to-gray-100 dark:to-gray-900 py-16 min-h-screen">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10 pointer-events-none" />

      <div className="z-10 relative gap-12 grid md:grid-cols-3 mx-auto p-8 max-w-7xl"> {/* Increased gap for more breathing room */}
        <Card1 />
        <Card2 />
        <Card3 />
      </div>
    </div>
  );
};

export default EffectCards;

// Add necessary CSS keyframes and utilities in a global stylesheet