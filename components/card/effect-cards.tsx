// components/EffectCards.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CornerDownLeft, Cpu, BrainCircuit, Activity } from 'lucide-react';

// --- Base Card Structure (Slightly Refined) ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  isHovered: boolean;
  style?: React.CSSProperties;
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
      ref={cardRef as React.RefObject<HTMLDivElement>}
      className={`
        relative flex flex-col items-start
        bg-white dark:bg-neutral-900/80 backdrop-blur-sm  // Slightly transparent dark bg
        border border-neutral-200/60 dark:border-neutral-800/50 // Fainter borders
        max-w-sm h-[30rem] rounded-xl shadow-md shadow-neutral-200/30 dark:shadow-black/30 // Softer shadow
        transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
        overflow-hidden group
        ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{
        perspective: '1000px',
        ...style,
      }}
    >
      {/* Fainter Corner Accents */}
      {[
        'top-2 left-2', 'bottom-2 left-2 rotate-90',
        'top-2 right-2 -rotate-90', 'bottom-2 right-2 rotate-180',
      ].map((pos, i) => (
        <div
          key={i}
          className={`
            absolute ${pos} w-2.5 h-2.5
            transition-all duration-300 ease-out text-neutral-300 dark:text-neutral-700
            group-hover:opacity-80 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 opacity-20
          `}
        > <CornerDownLeft className="w-1.5 h-1.5" strokeWidth={2} /> </div>
      ))}

      {/* Subtle Hover Glow (Moved inside, less intense) */}
      <div className="z-0 absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className={`
            absolute -inset-4 z-0 transition-opacity duration-400 ease-out
            bg-gradient-radial from-cyan-500/0 via-cyan-500/5 to-cyan-500/0
            dark:from-cyan-400/0 dark:via-cyan-400/5 dark:to-cyan-400/0
            opacity-0 group-hover:opacity-100 blur-xl
          `}/>
      </div>

      {/* Main Content Area */}
      <div className="z-10 relative flex flex-col p-6 w-full h-full">
         {children}
      </div>
    </div>
  );
};


// --- Card 1: Laptop Particle Ingress/Egress (Horizontal Flow) ---

interface FlowParticleProps {
  id: number;
  isHovered: boolean;
  laptopScreenCenterX: number;
  laptopScreenCenterY: number;
  containerWidth: number;
  // No containerHeight needed if strictly horizontal
}

const FlowParticle: React.FC<FlowParticleProps> = ({
  id, isHovered, laptopScreenCenterX, laptopScreenCenterY, containerWidth
}) => {
  const duration = Math.random() * 1.0 + 1.8; // 1.8s to 2.8s (slightly slower/smoother)
  const delay = Math.random() * duration * 0.7;
  const size = Math.random() * 1.2 + 0.8; // 0.8px to 2.0px (even smaller)

  // Determine start side (left or right)
  const startSide = Math.random() > 0.5 ? 'right' : 'left';
  const startX = startSide === 'right' ? containerWidth + 20 : -20; // Start off-screen horizontal
  const startYOffset = (Math.random() - 0.5) * 60; // Vertical spread +/- 30px around center
  const startY = laptopScreenCenterY + startYOffset;

  // End position on the opposite side
  const endX = startSide === 'right' ? -20 : containerWidth + 20;
  const endYOffset = (Math.random() - 0.5) * 40; // Slightly different vertical spread on exit
  const endY = laptopScreenCenterY + endYOffset;

  // Mid point (center of the laptop screen)
  const midX = laptopScreenCenterX;
  const midY = laptopScreenCenterY;

  // Adjust horizontal control points for a more direct path
  const controlX1 = startX * 0.4 + midX * 0.6;
  const controlY1 = startY * 0.6 + midY * 0.4; // Curve slightly towards center vertically
  const controlX2 = endX * 0.4 + midX * 0.6;
  const controlY2 = endY * 0.6 + midY * 0.4;

  const keyframes = `
    @keyframes particleFlowHoriz_${id} {
      0% {
        transform: translate(${startX}px, ${startY}px) scale(0.5);
        opacity: 0;
      }
      15% {
         opacity: 0.6;
         transform: translate(${controlX1}px, ${controlY1}px) scale(0.8);
      }
      50% {
        transform: translate(${midX}px, ${midY}px) scale(1); // Hit center
        opacity: 1;
      }
      85% {
        opacity: 0.6;
        transform: translate(${controlX2}px, ${controlY2}px) scale(0.8);
      }
      100% {
        transform: translate(${endX}px, ${endY}px) scale(0.5);
        opacity: 0;
      }
    }
  `;

  const style: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0,
    width: `${size}px`, height: `${size}px`, borderRadius: '50%',
    // Brighter particle color for visibility
    backgroundColor: 'var(--particle-color, #06b6d4)',
    opacity: 0,
    // Use a smoother easing function
    animation: isHovered
      ? `particleFlowHoriz_${id} ${duration}s cubic-bezier(0.45, 0.05, 0.55, 0.95) ${delay}s infinite`
      : 'none',
    // Softer blend mode
    mixBlendMode: 'lighten', // Often looks cleaner than 'screen'
    willChange: 'transform, opacity',
  };

  return (
    <>
      <style>{keyframes}</style>
      <div style={style} />
    </>
  );
};

const Card1: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const laptopScreenRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ screenX: 100, screenY: 100, containerW: 200 });

  useEffect(() => {
    const calculateDims = () => {
      if (laptopScreenRef.current && particleContainerRef.current && cardRef.current) {
        const screenRect = laptopScreenRef.current.getBoundingClientRect();
        const containerRect = particleContainerRef.current.getBoundingClientRect();

        const screenX = screenRect.left - containerRect.left + screenRect.width / 2;
        const screenY = screenRect.top - containerRect.top + screenRect.height / 2; // Center Y still needed

        setDimensions({
          screenX: screenX,
          screenY: screenY, // Pass Y center for vertical alignment
          containerW: containerRect.width,
        });
      }
    };
    calculateDims();
    window.addEventListener('resize', calculateDims);
    return () => window.removeEventListener('resize', calculateDims);
  }, []);

  // Cleaner hover style
  const cardHoverStyle: React.CSSProperties = {
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease-out',
    transform: isHovered ? 'scale(1.02)' : 'scale(1)', // Removed rotation for simplicity
    boxShadow: isHovered
      ? '0 12px 24px -8px rgba(0, 180, 220, 0.1), 0 6px 12px -6px rgba(0, 180, 220, 0.08)' // Refined shadow
      : '0 4px 8px -4px rgba(0, 0, 0, 0.05)', // Subtler base shadow
  };

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cardHoverStyle}
      className="dark:[--particle-color:#67e8f9]" // Lighter cyan for dark mode particles
    >
      <div className="flex flex-col justify-between w-full h-full">
        {/* Top Section: Laptop Graphic */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48 overflow-visible">
          {/* Particle Container - Needs to span horizontally */}
          <div
            ref={particleContainerRef}
            className="z-0 absolute inset-x-[-50px] inset-y-0 pointer-events-none" // Wider horizontally
          >
            {isHovered && Array.from({ length: 25 }).map((_, i) => ( // Fewer particles
              <FlowParticle
                key={i} id={i} isHovered={isHovered}
                laptopScreenCenterX={dimensions.screenX}
                laptopScreenCenterY={dimensions.screenY} // Pass Y center
                containerWidth={dimensions.containerW}
              />
            ))}
          </div>

          {/* Laptop Visual (Simplified) */}
          <div className="z-10 relative flex flex-col items-center">
            {/* Laptop Screen */}
            <div
              ref={laptopScreenRef}
              className={`
                relative w-44 h-28 bg-neutral-900 dark:bg-black // Slightly smaller
                border border-neutral-300 dark:border-neutral-700/80 rounded-t-md
                transition-all duration-400 ease-out overflow-hidden
              `}
              style={{
                transform: isHovered ? 'scale(1.03)' : 'scale(1)', // Simpler scale transform
                boxShadow: isHovered
                  ? 'inset 0 0 15px rgba(6, 182, 212, 0.1)'
                  : 'inset 0 0 3px rgba(0,0,0,0.1)',
              }}
            >
              {/* Inner Screen Glow (More subtle) */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 dark:from-cyan-400/5 via-transparent to-cyan-600/10 dark:to-cyan-400/10 opacity-0 group-hover:opacity-60 blur-[2px] transition-opacity duration-500 ease-out" />
              {/* Removed Scanline */}
            </div>
            {/* Laptop Base (Simpler) */}
            <div className={`w-52 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-b-sm transition-transform duration-400 ease-out ${isHovered ? 'scaleX(1.015)' : ''}`} />
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div className="flex flex-col flex-grow justify-end">
          <Cpu className="mb-2.5 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-medium text-neutral-900 dark:text-white text-base"> {/* Slightly smaller title */}
            Blaze Deep Research
          </h2>
          <p className="mb-4 font-normal text-neutral-500 dark:text-neutral-400/80 text-sm leading-relaxed"> {/* Slightly lighter text */}
            Advanced agentic capabilities for unparalleled insights and application performance.
          </p>
          <p className="inline-block bg-cyan-50/80 dark:bg-cyan-900/30 px-2.5 py-0.5 border border-cyan-100 dark:border-cyan-900/50 dark:group-hover:border-cyan-700/80 group-hover:border-cyan-200 rounded-full font-medium text-cyan-700 dark:text-cyan-300 text-xs transition-colors duration-300">
            Agentic Engine
          </p>
        </div>
      </div>
    </BaseCard>
  );
};


// --- Card 2: Ripple Effect (Simplified & Cleaner) ---

interface Ripple { id: number; x: number; y: number; size: number; color: string; duration: number; }

const Card2: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastRippleTime = useRef(0);
  const rippleCleanupTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => { return () => { rippleCleanupTimers.current.forEach(clearTimeout); }; }, []);

  const addRipple = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastRippleTime.current < 80) return; // Slower ripple creation
    lastRippleTime.current = now;

    const size = Math.random() * 40 + 80; // 80px to 120px (Smaller max size)
    const duration = 1.0 + Math.random() * 0.6; // 1.0s to 1.6s (Slightly slower)
    const colors = ['#06b6d480', '#22d3ee70', '#0891b290']; // Cyan shades with alpha
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newRipple: Ripple = { id: now, x, y, size, color, duration };
    setRipples(prev => [...prev.slice(-8), newRipple]); // Keep only max 8 ripples

    const timer = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      rippleCleanupTimers.current = rippleCleanupTimers.current.filter(t => t !== timer);
    }, duration * 1000);
    rippleCleanupTimers.current.push(timer);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    addRipple(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Cleaner hover style
  const cardHoverStyle: React.CSSProperties = {
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease-out',
      transform: isHovered ? 'scale(1.02)' : 'scale(1)', // No rotation
      boxShadow: isHovered
        ? '0 12px 24px -8px rgba(0, 180, 220, 0.1), 0 6px 12px -6px rgba(0, 180, 220, 0.08)'
        : '0 4px 8px -4px rgba(0, 0, 0, 0.05)',
  };

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)} // Keep simple leave
      onMouseMove={isHovered ? handleMouseMove : undefined}
      style={cardHoverStyle}
      className="bg-white dark:bg-neutral-900/80" // Match other cards
    >
      {/* Ripple Container - Behind Content */}
      <div className="z-0 absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="absolute rounded-full"
            style={{
              left: ripple.x, top: ripple.y,
              width: `${ripple.size}px`, height: `${ripple.size}px`,
              transform: 'translate(-50%, -50%) scale(0)',
              // Just border, no background fill for cleaner look
              border: `1px solid ${ripple.color}`,
              animation: `rippleExpandFade ${ripple.duration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      {/* Content Area - Above Ripples */}
      <div className="z-10 relative flex flex-col justify-between w-full h-full">
         {/* Top Section: Simplified Graphic */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48">
           <div className={`relative flex items-center justify-center transition-transform duration-400 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}>
             {/* Central node */}
            <div className={`relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600 transition-all duration-400 ease-out shadow-lg ${isHovered ? 'shadow-cyan-400/20 scale-105' : 'shadow-cyan-500/10'}`}>
              <Activity className="w-6 h-6 text-white/90" strokeWidth={1.5} />
            </div>
            {/* Removed Orbital rings */}
            {/* Simpler Pulsing background glow */}
            <div className="absolute bg-cyan-400/5 dark:bg-cyan-400/10 blur-xl rounded-full w-32 h-32 transition-all duration-600 ease-out pointer-events-none" style={{
                transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                opacity: isHovered ? 0.6 : 0, // Less intense opacity
                animation: isHovered ? 'pulseSimple 3s ease-in-out infinite alternate' : 'none'
            }}/>
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div className="flex flex-col flex-grow justify-end">
          <Activity className="mb-2.5 w-5 h-5 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-medium text-neutral-900 dark:text-white text-base">
            Neural Mapping
          </h2>
          <p className="mb-4 font-normal text-neutral-500 dark:text-neutral-400/80 text-sm leading-relaxed">
            Visualize network activity and signal propagation in real-time.
          </p>
          <p className="inline-block bg-cyan-50/80 dark:bg-cyan-900/30 px-2.5 py-0.5 border border-cyan-100 dark:border-cyan-900/50 dark:group-hover:border-cyan-700/80 group-hover:border-cyan-200 rounded-full font-medium text-cyan-700 dark:text-cyan-300 text-xs transition-colors duration-300">
            Real-time Visualization
          </p>
        </div>
      </div>

      {/* Define Keyframes */}
      <style>{`
        @keyframes rippleExpandFade { /* Just border expanding and fading */
          from { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          to   { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes pulseSimple { /* Simple pulse animation */
          from { opacity: 0.4; transform: scale(1.4); }
          to   { opacity: 0.7; transform: scale(1.5); }
        }
      `}</style>
    </BaseCard>
  );
};


// --- Card 3: AI Neuron Effect (Simplified & Cleaner) ---

const Card3: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const center = useRef({ x: 150, y: 150 }); // Estimate

  // Fewer, simpler synapses
  const [synapses] = useState(() => Array.from({ length: 7 }).map(() => ({ // Reduced count
      angle: Math.random() * 360,
      baseLength: 50 + Math.random() * 35, // 50-85px
      pulseSpeed: 2 + Math.random() * 2,   // 2 - 4s cycle
      color: `hsla(${240 + Math.random() * 50}, 80%, 70%, 0.7)` // Indigo/Purple range, fixed alpha
  })));

  const updateCenter = () => {
      if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          // Center slightly higher for visual balance
          center.current = { x: rect.width / 2, y: rect.height * 0.40 };
      }
  };

  useEffect(() => {
      updateCenter();
      window.addEventListener('resize', updateCenter);
      return () => window.removeEventListener('resize', updateCenter);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => { setIsHovered(true); updateCenter(); };

  // Calculate tilt and intensity (Less intense effects)
  const displacementX = mousePos.x - center.current.x;
  const displacementY = mousePos.y - center.current.y;
  const distance = Math.sqrt(displacementX ** 2 + displacementY ** 2);
  const maxPossibleDistance = Math.max(center.current.x, center.current.y) * 1.2;
  const intensity = isHovered ? Math.min(1, distance / maxPossibleDistance) * 0.7 : 0; // Reduced max intensity

  const rotateX = isHovered ? (-displacementY / center.current.y) * 8 * intensity : 0; // Reduced tilt sensitivity
  const rotateY = isHovered ? (displacementX / center.current.x) * 8 * intensity : 0;

   // Cleaner hover style
  const cardHoverStyle: React.CSSProperties = {
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease-out',
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${1 + intensity * 0.03})`, // Less scale
      boxShadow: isHovered
        ? `0 ${8 + intensity * 15}px ${20 + intensity * 30}px -10px rgba(99, 102, 241, ${0.1 + intensity * 0.15})` // Subtler shadow
        : '0 4px 8px -4px rgba(0, 0, 0, 0.05)',
  };

  return (
    <BaseCard
      cardRef={cardRef}
      isHovered={isHovered}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={cardHoverStyle}
      className="bg-white dark:bg-neutral-900/80" // Match other cards
    >
      <div className="z-10 relative flex flex-col justify-between w-full h-full">
        {/* Top Section: Simplified Neuron Visualization */}
        <div className="relative flex justify-center items-center mb-6 w-full h-48">
          <div className="absolute inset-0 flex justify-center items-center" style={{ perspective: '600px' }}>
              {/* Neural Core (Simpler) */}
              <div
                  className="relative flex justify-center items-center bg-gradient-to-br from-indigo-400 dark:from-indigo-500 via-purple-500 dark:via-purple-600 to-fuchsia-500 dark:to-fuchsia-600 rounded-full w-14 h-14 transition-all duration-400 ease-out" // Slightly smaller
                  style={{
                      transform: `scale(${1 + intensity * 0.08})`, // Less core scaling
                      boxShadow: `0 0 ${5 + intensity * 15}px 0px hsla(255, 60%, 70%, ${0.2 + intensity * 0.3})`, // Less intense glow
                      // Removed core pulse animation for simplicity
                  }}
              >
                  <BrainCircuit
                      className="w-7 h-7 text-white/90 transition-transform duration-500 ease-out" // Smaller icon
                      strokeWidth={1.3}
                      style={{ transform: `scale(${1 + intensity * 0.05})` }} // Simple scale on icon
                  />
              </div>

              {/* Simplified Synapses */}
              {synapses.map((synapse, i) => {
                  const currentAngle = synapse.angle + intensity * 15 * (i % 2 === 0 ? 1 : -1);
                  const currentLength = synapse.baseLength + intensity * 10; // Less length change
                  const opacity = 0.4 + intensity * 0.4; // Less opacity change
                  const thickness = 0.8 + intensity * 0.5; // Thinner lines

                  return (
                      <div
                          key={i}
                          className="top-1/2 left-1/2 absolute origin-left pointer-events-none"
                          style={{
                              width: `${currentLength}px`, height: `${thickness}px`,
                              transform: `translate(-50%, -50%) rotate(${currentAngle}deg) translateX(${7 * (1 + intensity * 0.08)}px)`, // Adjusted offset from core
                              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                              transformOrigin: 'center left',
                          }}
                      >
                          {/* Simple Synapse Line (No gradient or complex pulse) */}
                          <div
                              className="rounded-full w-full h-full"
                              style={{
                                  backgroundColor: synapse.color,
                                  opacity: opacity,
                                  // Simple fade pulse instead of complex gradient/blur pulse
                                  animation: isHovered ? `pulseSynapseSimple ${synapse.pulseSpeed}s ease-in-out infinite alternate` : 'none',
                              }}
                          />
                      </div>
                  );
              })}
              {/* Removed Background Field */}
          </div>
        </div>

        {/* Bottom Section: Text Content */}
        <div className="flex flex-col flex-grow justify-end">
          <BrainCircuit className="mb-2.5 w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5}/>
          <h2 className="mb-1.5 font-medium text-neutral-900 dark:text-white text-base">
            Blaze Genetic AI
          </h2>
          <p className="mb-4 font-normal text-neutral-500 dark:text-neutral-400/80 text-sm leading-relaxed">
            Adaptive AI core leveraging genetic algorithms for advanced deep research.
          </p>
          <p className="inline-block bg-indigo-50/80 dark:bg-indigo-900/30 px-2.5 py-0.5 border border-indigo-100 dark:border-indigo-900/50 dark:group-hover:border-indigo-700/80 group-hover:border-indigo-200 rounded-full font-medium text-indigo-700 dark:text-indigo-300 text-xs transition-colors duration-300">
            Genetic AI Core
          </p>
        </div>
      </div>

       {/* Define Keyframes */}
      <style>{`
        @keyframes pulseSynapseSimple { /* Simple opacity pulse */
          from { opacity: ${0.3 + intensity * 0.3}; }
          to   { opacity: ${0.5 + intensity * 0.5}; }
        }
      `}</style>
    </BaseCard>
  );
};


// --- Main Export ---

const EffectCards: React.FC = () => {
  return (
    <div className="relative bg-neutral-100/50 dark:bg-black py-20 min-h-screen overflow-x-clip">
       {/* Very subtle background noise/texture */}
       <div
        className="z-0 absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\' viewBox=\'0 0 4 4\'%3E%3Cpath fill=\'%239C92AC\' fill-opacity=\'0.1\' d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\'%3E%3C/path%3E%3C/svg%3E")' }}
       />
       {/* Background gradient */}
       <div className="z-0 absolute inset-0 bg-gradient-to-b from-white dark:from-black via-neutral-50/80 dark:via-neutral-950/90 to-neutral-100 dark:to-neutral-900" />

      <div className="z-10 relative gap-8 md:gap-6 lg:gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-auto px-4 md:px-6 max-w-6xl"> {/* Adjusted max-width and gaps */}
        <Card1 />
        <Card2 />
        <Card3 />
      </div>
       {/* Global Styles (Keep ripple/particle keyframes specific to components now) */}
       <style global jsx>{`
          body {
            /* Optional: Smoother font rendering */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .bg-gradient-radial {
             background-image: radial-gradient(circle, var(--tw-gradient-stops));
          }
       `}</style>
    </div>
  );
};

export default EffectCards;